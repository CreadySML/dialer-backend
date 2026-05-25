const leadService = require("../services/leadService");

async function createLead(req, res, next) {
  try {
    const lead = await leadService.createLead(req.user, req.body);
    res.status(201).json({ success: true, lead });
  } catch (err) {
    next(err);
  }
}

async function listLeads(req, res, next) {
  try {
    const leads = await leadService.listLeads(req.user, req.query);
    res.json({ success: true, count: leads.length, leads });
  } catch (err) {
    next(err);
  }
}

async function assignLead(req, res, next) {
  try {
    const { agentId } = req.body;
    if (!agentId) {
      return res.status(400).json({ success: false, message: "agentId is required" });
    }
    const lead = await leadService.assignLead(req.user, req.params.id, agentId);
    res.json({ success: true, lead });
  } catch (err) {
    next(err);
  }
}

async function updateLeadStatus(req, res, next) {
  try {
    const lead = await leadService.updateLeadStatus(req.user, req.params.id, req.body);
    res.json({ success: true, lead });
  } catch (err) {
    next(err);
  }
}

module.exports = { createLead, listLeads, assignLead, updateLeadStatus };
