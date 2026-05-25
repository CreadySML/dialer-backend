const { Lead, User } = require("../models");

const VALID_STAGES = [
  "new",
  "contacted",
  "interested",
  "not_interested",
  "follow_up",
  "converted",
  "rejected",
];

function buildScopeWhere(viewer) {
  if (viewer.role === "agent") return { assignedTo: viewer.id };
  return {};
}

async function createLead(creator, payload) {
  const { name, phone } = payload;
  if (!name || !phone) {
    const err = new Error("name and phone are required");
    err.status = 400;
    throw err;
  }

  const lead = await Lead.create({
    ...payload,
    createdBy: creator.id,
  });

  return lead;
}

async function listLeads(viewer, filters = {}) {
  const where = buildScopeWhere(viewer);

  if (filters.stage) where.stage = filters.stage;
  if (filters.assignedTo) where.assignedTo = filters.assignedTo;
  if (filters.city) where.city = filters.city;
  if (filters.product) where.product = filters.product;
  if (filters.source) where.source = filters.source;

  const leads = await Lead.findAll({
    where,
    include: [
      { model: User, as: "agent", attributes: ["id", "name", "email", "role"] },
      { model: User, as: "owner", attributes: ["id", "name", "email"] },
    ],
    order: [["createdAt", "DESC"]],
    limit: filters.limit ? parseInt(filters.limit, 10) : 200,
  });

  return leads;
}

async function assignLead(actor, leadId, agentId) {
  const lead = await Lead.findByPk(leadId, {
    include: [{ model: User, as: "agent" }],
  });
  if (!lead) {
    const err = new Error("Lead not found");
    err.status = 404;
    throw err;
  }

  if (actor.role === "manager" && lead.createdBy && lead.createdBy !== actor.id) {
    const err = new Error("This lead belongs to another manager");
    err.status = 403;
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

  lead.assignedTo = agent.id;
  await lead.save();

  return lead;
}

async function updateLeadStatus(actor, leadId, payload) {
  const { stage, disposition, remarks, nextFollowUpAt } = payload;

  if (stage && !VALID_STAGES.includes(stage)) {
    const err = new Error(`Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}`);
    err.status = 400;
    throw err;
  }

  const lead = await Lead.findByPk(leadId);
  if (!lead) {
    const err = new Error("Lead not found");
    err.status = 404;
    throw err;
  }

  if (actor.role === "agent" && lead.assignedTo !== actor.id) {
    const err = new Error("You can only update leads assigned to you");
    err.status = 403;
    throw err;
  }
  if (actor.role === "manager" && lead.createdBy && lead.createdBy !== actor.id) {
    const err = new Error("This lead belongs to another manager");
    err.status = 403;
    throw err;
  }

  if (stage) lead.stage = stage;
  if (disposition !== undefined) lead.disposition = disposition;
  if (remarks !== undefined) lead.remarks = remarks;
  if (nextFollowUpAt !== undefined) lead.nextFollowUpAt = nextFollowUpAt;
  lead.lastContactedAt = new Date();

  await lead.save();
  return lead;
}

module.exports = { createLead, listLeads, assignLead, updateLeadStatus, VALID_STAGES };
