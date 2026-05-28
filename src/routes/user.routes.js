const express = require("express");
const { createUser, listUsers, getUser, updateUser } = require("../controllers/userController");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.post("/", requireRole("superadmin", "manager"), createUser);
router.get("/", listUsers);
router.get("/:id", getUser);
router.patch("/:id", requireRole("superadmin", "manager"), updateUser);

module.exports = router;
