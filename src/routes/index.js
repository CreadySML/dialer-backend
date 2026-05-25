const express = require("express");
const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const leadRoutes = require("./lead.routes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/leads", leadRoutes);

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "LMS Dialer API",
    version: "0.1.0",
    endpoints: {
      health: "GET /api/health",
      auth: {
        login: "POST /api/auth/login",
        me: "GET /api/auth/me",
      },
      users: {
        create: "POST /api/users (superadmin → manager, manager → agent)",
        list: "GET /api/users?role=manager",
        get: "GET /api/users/:id",
      },
      leads: {
        create: "POST /api/leads (superadmin, manager)",
        list: "GET /api/leads?stage=new&city=Delhi",
        assign: "PATCH /api/leads/:id/assign  body: { agentId }",
        updateStatus: "PATCH /api/leads/:id/status  body: { stage, disposition, remarks }",
      },
    },
  });
});

module.exports = router;
