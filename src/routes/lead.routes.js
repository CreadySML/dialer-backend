const express = require("express");
const {
  createLead,
  listLeads,
  assignLead,
  updateLeadStatus,
} = require("../controllers/leadController");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.post("/", requireRole("superadmin", "manager"), createLead);
router.get("/", listLeads);

router.patch("/:id/assign", requireRole("superadmin", "manager"), assignLead);
router.patch("/:id/status", updateLeadStatus);

module.exports = router;
