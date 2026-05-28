const userService = require("../services/userService");

async function createUser(req, res, next) {
  try {
    const user = await userService.createUser(req.user, req.body);
    res.status(201).json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const users = await userService.listUsers(req.user, req.query);
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const user = await userService.getUserById(req.user, req.params.id);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await userService.updateUser(req.user, req.params.id, req.body);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

module.exports = { createUser, listUsers, getUser, updateUser };
