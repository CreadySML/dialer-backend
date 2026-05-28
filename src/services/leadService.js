const { Op, fn, col } = require("sequelize");
const { Lead, LeadActivity, User } = require("../models");

const VALID_STAGES = [
  "new",
  "contacted",
  "interested",
  "not_interested",
  "follow_up",
  "converted",
  "rejected",
];

// Call-center industry-standard dispositions.
// Keep in sync with frontend DISPOSITION_OPTIONS in leads/page.jsx
const VALID_DISPOSITIONS = [
  // Connected
  "interested",
  "not_interested",
  "callback",
  "already_taken",
  "wrong_person",
  // Not Connected
  "rnr",
  "switched_off",
  "busy",
  "wrong_number",
  "invalid_number",
  // Other
  "language_barrier",
  "do_not_call",
];

/**
 * Flatten Lead + LeadActivity into a single object so the frontend API
 * contract stays unchanged. Activity fields default to "unassigned/new".
 */
function flattenLead(lead) {
  const obj = lead.toJSON ? lead.toJSON() : lead;
  const a = obj.activity || {};
  const { activity, ...rest } = obj;

  const composedName =
    rest.name ||
    [rest.firstName, rest.lastName].filter(Boolean).join(" ").trim() ||
    "Unknown";

  return {
    ...rest,
    name: composedName,
    assignedTo: a.assignedTo || null,
    stage: a.stage || "new",
    disposition: a.disposition || null,
    remarks: a.remarks || null,
    nextFollowUpAt: a.nextFollowUpAt || null,
    lastContactedAt: a.lastContactedAt || null,
    agent: a.agent || null,
    activityId: a.id || null,
  };
}

async function createLead() {
  // Leads are sourced from the foreign table `offerleads_fdw` (managed by the
  // upstream system). Local creation is disabled.
  const err = new Error(
    "Leads come from the external source system. Manual creation is disabled."
  );
  err.status = 405;
  throw err;
}

// Columns we actually display in the list — keeps the foreign-table SELECT lean.
const LEAD_LIST_ATTRS = [
  "id",
  "name",
  "firstName",
  "lastName",
  "phone",
  "email",
  "pincode",
  "loanPurpose",
  "loanAmount",
  "monthlyIncome",
  "createdAt",
];

/**
 * Build where clauses from query filters.
 * Returns separate lead-side and activity-side where clauses so callers can
 * decide how to combine them (we avoid cross-DB JOINs by splitting queries).
 */
function buildLeadFilters(viewer, filters = {}) {
  const leadWhere = {};
  const activityWhere = {};

  if (filters.pincode) leadWhere.pincode = { [Op.iLike]: `%${filters.pincode}%` };
  if (filters.loanPurpose) leadWhere.loanPurpose = { [Op.iLike]: `%${filters.loanPurpose}%` };
  if (filters.utmSource) leadWhere.utmSource = { [Op.iLike]: `%${filters.utmSource}%` };
  if (filters.profile) leadWhere.profile = { [Op.iLike]: `%${filters.profile}%` };

  // Free-text search across name / phone / email / first / last
  if (filters.search) {
    const q = `%${filters.search.trim()}%`;
    leadWhere[Op.or] = [
      { name: { [Op.iLike]: q } },
      { firstName: { [Op.iLike]: q } },
      { lastName: { [Op.iLike]: q } },
      { phone: { [Op.iLike]: q } },
      { email: { [Op.iLike]: q } },
    ];
  }

  if (filters.minLoanAmount || filters.maxLoanAmount) {
    const range = {};
    if (filters.minLoanAmount) range[Op.gte] = Number(filters.minLoanAmount);
    if (filters.maxLoanAmount) range[Op.lte] = Number(filters.maxLoanAmount);
    leadWhere.loanAmount = range;
  }

  if (filters.minSalary || filters.maxSalary) {
    const range = {};
    if (filters.minSalary) range[Op.gte] = Number(filters.minSalary);
    if (filters.maxSalary) range[Op.lte] = Number(filters.maxSalary);
    leadWhere.monthlyIncome = range;
  }

  if (filters.stage) activityWhere.stage = filters.stage;
  if (filters.disposition) activityWhere.disposition = filters.disposition;
  if (filters.assignedTo) activityWhere.assignedTo = filters.assignedTo;
  if (viewer.role === "agent") activityWhere.assignedTo = viewer.id;

  return { leadWhere, activityWhere };
}

/**
 * Resolve the set of lead IDs matching an activity-side filter.
 * Local table — fast, indexed lookup. Returns null when no activity filter
 * is applied, signalling the caller to skip the ID-narrowing step.
 */
async function resolveLeadIdsByActivity(activityWhere) {
  if (!activityWhere || Object.keys(activityWhere).length === 0) return null;
  const rows = await LeadActivity.findAll({
    where: activityWhere,
    attributes: ["leadId"],
    raw: true,
  });
  return rows.map((r) => r.leadId);
}

/**
 * Fetch activity rows + agent for a small set of lead IDs (current page).
 * Local-only query, fast.
 */
async function fetchActivitiesForLeadIds(leadIds) {
  if (!leadIds || leadIds.length === 0) return new Map();
  const rows = await LeadActivity.findAll({
    where: { leadId: leadIds },
    include: [{ model: User, as: "agent", attributes: ["id", "name", "email", "role"] }],
  });
  return new Map(rows.map((r) => [r.leadId, r.toJSON()]));
}

async function listLeads(viewer, filters = {}) {
  const page = Math.max(1, parseInt(filters.page || "1", 10) || 1);
  const pageSize = Math.min(
    500,
    Math.max(1, parseInt(filters.pageSize || "50", 10) || 50)
  );
  const offset = (page - 1) * pageSize;

  const { leadWhere, activityWhere } = buildLeadFilters(viewer, filters);

  // Step 1: If any activity-side filter exists (stage / assignedTo / agent role),
  // resolve matching lead IDs from local lead_activity first (fast).
  const idsFromActivity = await resolveLeadIdsByActivity(activityWhere);
  if (idsFromActivity !== null) {
    if (idsFromActivity.length === 0) {
      return { leads: [], total: 0, page, pageSize, totalPages: 1 };
    }
    leadWhere.id = idsFromActivity;
  }

  // Step 2: Foreign-table query — count + page in parallel.
  // ORDER BY + WHERE + LIMIT push down to remote; no JOIN involved → fast.
  const [count, leadRows] = await Promise.all([
    Lead.count({ where: leadWhere }),
    Lead.findAll({
      where: leadWhere,
      attributes: LEAD_LIST_ATTRS,
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset,
    }),
  ]);

  // Step 3: Local lookup of activity rows for the current page only.
  const activityMap = await fetchActivitiesForLeadIds(leadRows.map((l) => l.id));

  // Step 4: Stage counts for pills strip (local table, fast).
  // Agent → scoped to own activities. Manager/superadmin → global.
  const stageScope = viewer.role === "agent" ? { assignedTo: viewer.id } : {};
  const stageRows = await LeadActivity.findAll({
    where: stageScope,
    attributes: ["stage", [fn("COUNT", col("id")), "count"]],
    group: ["stage"],
    raw: true,
  });
  const stageCounts = {};
  VALID_STAGES.forEach((s) => { stageCounts[s] = 0; });
  stageRows.forEach((r) => { stageCounts[r.stage] = Number(r.count); });

  // Step 5: Per-agent lead counts (for workload distribution UI).
  const assignedRows = await LeadActivity.findAll({
    where: stageScope,
    attributes: ["assignedTo", [fn("COUNT", col("id")), "count"]],
    group: ["assignedTo"],
    raw: true,
  });
  const assignedToCounts = {};
  assignedRows.forEach((r) => {
    if (r.assignedTo != null) assignedToCounts[r.assignedTo] = Number(r.count);
  });

  return {
    leads: leadRows.map((l) =>
      flattenLead({ ...l.toJSON(), activity: activityMap.get(l.id) })
    ),
    total: count,
    stageCounts,
    assignedToCounts,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  };
}

/**
 * Upsert helper: get-or-create LeadActivity for a leadId.
 */
async function getOrCreateActivity(leadId) {
  let activity = await LeadActivity.findOne({ where: { leadId } });
  if (!activity) activity = await LeadActivity.create({ leadId });
  return activity;
}

async function assignLead(actor, leadId, agentId) {
  const lead = await Lead.findByPk(leadId);
  if (!lead) {
    const err = new Error("Lead not found");
    err.status = 404;
    throw err;
  }

  const agent = await User.findByPk(agentId);
  if (!agent || agent.role !== "agent" || !agent.isActive) {
    const err = new Error("Target agent not found or not active");
    err.status = 400;
    throw err;
  }

  if (actor.role === "manager" && agent.createdBy !== actor.id) {
    const err = new Error("You can only assign to agents you created");
    err.status = 403;
    throw err;
  }

  const activity = await getOrCreateActivity(leadId);
  activity.assignedTo = agent.id;
  await activity.save();

  const updated = await Lead.findByPk(leadId, {
    include: [
      {
        model: LeadActivity,
        as: "activity",
        include: [{ model: User, as: "agent", attributes: ["id", "name", "email", "role"] }],
      },
    ],
  });
  return flattenLead(updated);
}

async function updateLeadStatus(actor, leadId, payload) {
  const { stage, disposition, remarks, nextFollowUpAt } = payload;

  if (stage && !VALID_STAGES.includes(stage)) {
    const err = new Error(`Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}`);
    err.status = 400;
    throw err;
  }

  if (
    disposition !== undefined &&
    disposition !== null &&
    disposition !== "" &&
    !VALID_DISPOSITIONS.includes(disposition)
  ) {
    const err = new Error(
      `Invalid disposition. Must be one of: ${VALID_DISPOSITIONS.join(", ")}`
    );
    err.status = 400;
    throw err;
  }

  const lead = await Lead.findByPk(leadId);
  if (!lead) {
    const err = new Error("Lead not found");
    err.status = 404;
    throw err;
  }

  const activity = await getOrCreateActivity(leadId);

  if (actor.role === "agent" && activity.assignedTo !== actor.id) {
    const err = new Error("You can only update leads assigned to you");
    err.status = 403;
    throw err;
  }

  if (stage) activity.stage = stage;
  if (disposition !== undefined) activity.disposition = disposition;
  if (remarks !== undefined) activity.remarks = remarks;
  if (nextFollowUpAt !== undefined) activity.nextFollowUpAt = nextFollowUpAt;
  activity.lastContactedAt = new Date();

  await activity.save();

  const updated = await Lead.findByPk(leadId, {
    include: [
      {
        model: LeadActivity,
        as: "activity",
        include: [{ model: User, as: "agent", attributes: ["id", "name", "email", "role"] }],
      },
    ],
  });
  return flattenLead(updated);
}

/**
 * Bulk-assign leads. Accept EITHER:
 *   - leadIds: explicit selection (used by checkbox flow)
 *   - filters: query criteria → resolves to ALL matching leads across pages
 *
 * And one of:
 *   - agentId: single target agent
 *   - distribute: true → round-robin across actor's active agents
 */
async function bulkAssignLeads(actor, { leadIds, filters, agentId, distribute }) {
  const hasIds = Array.isArray(leadIds) && leadIds.length > 0;
  const hasFilters = filters && typeof filters === "object";

  if (!hasIds && !hasFilters) {
    const err = new Error("Either leadIds or filters is required");
    err.status = 400;
    throw err;
  }
  if (!distribute && !agentId) {
    const err = new Error("Either agentId or distribute=true is required");
    err.status = 400;
    throw err;
  }

  let leads;
  if (hasIds) {
    leads = await Lead.findAll({ where: { id: leadIds }, attributes: ["id"] });
  } else {
    // Split-query path (avoids cross-DB JOIN, same as listLeads):
    // narrow by activity first if needed, then fetch matching lead IDs.
    const { leadWhere, activityWhere } = buildLeadFilters(actor, filters);
    const idsFromActivity = await resolveLeadIdsByActivity(activityWhere);
    if (idsFromActivity !== null) {
      if (idsFromActivity.length === 0) {
        const err = new Error("No leads matched the criteria");
        err.status = 404;
        throw err;
      }
      leadWhere.id = idsFromActivity;
    }
    leads = await Lead.findAll({
      where: leadWhere,
      attributes: ["id"],
    });
  }

  if (leads.length === 0) {
    const err = new Error("No leads matched the criteria");
    err.status = 404;
    throw err;
  }

  let assignments = [];

  if (distribute) {
    const where = { role: "agent", isActive: true };
    if (actor.role === "manager") where.createdBy = actor.id;
    const agents = await User.findAll({ where, order: [["id", "ASC"]] });
    if (agents.length === 0) {
      const err = new Error("No active agents available to distribute to");
      err.status = 400;
      throw err;
    }
    assignments = leads.map((lead, i) => ({
      lead,
      agentId: agents[i % agents.length].id,
    }));
  } else {
    const agent = await User.findByPk(agentId);
    if (!agent || agent.role !== "agent" || !agent.isActive) {
      const err = new Error("Target agent not found or not active");
      err.status = 400;
      throw err;
    }
    if (actor.role === "manager" && agent.createdBy !== actor.id) {
      const err = new Error("You can only assign to agents you created");
      err.status = 403;
      throw err;
    }
    assignments = leads.map((lead) => ({ lead, agentId: agent.id }));
  }

  // Upsert activity rows in parallel
  await Promise.all(
    assignments.map(async ({ lead, agentId: targetAgentId }) => {
      const activity = await getOrCreateActivity(lead.id);
      activity.assignedTo = targetAgentId;
      await activity.save();
    })
  );

  const distribution = assignments.reduce((acc, { agentId: a }) => {
    acc[a] = (acc[a] || 0) + 1;
    return acc;
  }, {});

  return {
    requested: hasIds ? leadIds.length : leads.length,
    assigned: assignments.length,
    matchedByFilter: hasFilters ? leads.length : undefined,
    skippedOwnership: 0,
    distribution,
  };
}

/**
 * List leads queued for callback / follow-up.
 * Surfaces activities where disposition='callback' OR stage='follow_up'.
 * Returned sorted by nextFollowUpAt asc (nulls last). Frontend buckets them
 * into overdue / today / tomorrow / upcoming / unscheduled.
 */
async function listCallbacks(viewer, filters = {}) {
  // Show every row from lead_activity — i.e. any lead that has been
  // assigned / touched / dispositioned. Frontend buckets by nextFollowUpAt
  // (overdue / today / tomorrow / upcoming / unscheduled).
  //
  // Supports filters via buildLeadFilters (shared with listLeads):
  //   activity-side: stage, disposition, assignedTo
  //   lead-side:     pincode, loanPurpose, loan/salary ranges
  const { leadWhere, activityWhere } = buildLeadFilters(viewer, filters);

  // If lead-side filters are set, narrow leadIds via foreign table first
  let leadIdFilter = null;
  if (Object.keys(leadWhere).length > 0) {
    const matched = await Lead.findAll({
      where: leadWhere,
      attributes: ["id"],
      raw: true,
    });
    leadIdFilter = matched.map((m) => m.id);
    if (leadIdFilter.length === 0) return { items: [], total: 0 };
  }

  const where = { ...activityWhere };
  if (leadIdFilter) where.leadId = leadIdFilter;

  const activities = await LeadActivity.findAll({
    where,
    include: [{ model: User, as: "agent", attributes: ["id", "name", "email", "role"] }],
    // Stable order by creation time — updates don't reshuffle rows.
    order: [["createdAt", "DESC"]],
  });

  if (activities.length === 0) return { items: [], total: 0 };

  const leadIds = activities.map((a) => a.leadId);
  const leads = await Lead.findAll({
    where: { id: leadIds },
    attributes: LEAD_LIST_ATTRS,
  });
  const leadMap = new Map(leads.map((l) => [l.id, l]));

  const items = activities
    .map((a) => {
      const lead = leadMap.get(a.leadId);
      if (!lead) return null;
      return flattenLead({ ...lead.toJSON(), activity: a.toJSON() });
    })
    .filter(Boolean);

  return { items, total: items.length };
}

module.exports = {
  createLead,
  listLeads,
  listCallbacks,
  assignLead,
  bulkAssignLeads,
  updateLeadStatus,
  VALID_STAGES,
  VALID_DISPOSITIONS,
};
