const { Op } = require("sequelize");
const { User } = require("../models");

const ROLE_CAN_CREATE = {
  superadmin: ["manager", "agent"],
  manager: ["agent"],
};

async function createUser(creator, payload) {
  const { name, email, password, role, phone } = payload;

  if (!name || !email || !password || !role) {
    const err = new Error("name, email, password, role are required");
    err.status = 400;
    throw err;
  }

  const allowed = ROLE_CAN_CREATE[creator.role] || [];
  if (!allowed.includes(role)) {
    const err = new Error(
      `Role '${creator.role}' cannot create user with role '${role}'`
    );
    err.status = 403;
    throw err;
  }

  const exists = await User.findOne({ where: { email } });
  if (exists) {
    const err = new Error("Email already in use");
    err.status = 409;
    throw err;
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    phone,
    createdBy: creator.id,
  });

  return user;
}

async function listUsers(viewer, filters = {}) {
  const where = {};

  if (filters.role) where.role = filters.role;

  if (viewer.role === "manager") {
    where.createdBy = viewer.id;
  } else if (viewer.role === "agent") {
    where.id = viewer.id;
  }

  return User.findAll({ where, order: [["createdAt", "DESC"]] });
}

async function getUserById(viewer, id) {
  const user = await User.findByPk(id);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  if (viewer.role === "manager" && user.createdBy !== viewer.id && user.id !== viewer.id) {
    const err = new Error("Not authorized to view this user");
    err.status = 403;
    throw err;
  }
  if (viewer.role === "agent" && user.id !== viewer.id) {
    const err = new Error("Not authorized");
    err.status = 403;
    throw err;
  }

  return user;
}

async function updateUser(actor, userId, payload) {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  // Permission rules:
  //  - superadmin: can edit anyone
  //  - manager:    can edit only users they created (own agents)
  //  - agent:      cannot edit (route also blocks them via requireRole)
  if (actor.role === "manager" && user.createdBy !== actor.id) {
    const err = new Error("You can only edit users you created");
    err.status = 403;
    throw err;
  }

  // Whitelist of mutable fields
  const updates = {};
  if (payload.name !== undefined && payload.name.trim() !== "") updates.name = payload.name.trim();
  if (payload.phone !== undefined) updates.phone = payload.phone;
  if (payload.password) updates.password = payload.password;

  // Email change — validate format + uniqueness
  if (payload.email !== undefined && payload.email.trim() !== "" && payload.email.trim() !== user.email) {
    const newEmail = payload.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      const err = new Error("Invalid email format");
      err.status = 400;
      throw err;
    }
    const taken = await User.findOne({
      where: { email: newEmail, id: { [Op.ne]: user.id } },
    });
    if (taken) {
      const err = new Error("This email is already used by another user");
      err.status = 409;
      throw err;
    }
    updates.email = newEmail;
  }
  if (payload.isActive !== undefined && actor.role === "superadmin") {
    updates.isActive = Boolean(payload.isActive);
  }
  // Manager can also toggle isActive for own users
  if (payload.isActive !== undefined && actor.role === "manager") {
    updates.isActive = Boolean(payload.isActive);
  }

  await user.update(updates);
  return user;
}

module.exports = { createUser, listUsers, getUserById, updateUser };
