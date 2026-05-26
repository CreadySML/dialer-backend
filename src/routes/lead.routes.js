const express = require("express");
const {
  createLead,
  listLeads,
  listCallbacks,
  assignLead,
  bulkAssignLeads,
  updateLeadStatus,
} = require("../controllers/leadController");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.post("/", requireRole("superadmin", "manager"), createLead);
router.get("/", listLeads);
router.get("/callbacks", listCallbacks);

router.post("/bulk-assign", requireRole("superadmin", "manager"), bulkAssignLeads);
router.patch("/:id/assign", requireRole("superadmin", "manager"), assignLead);
router.patch("/:id/status", updateLeadStatus);

module.exports = router;
