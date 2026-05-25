const authService = require("../services/authService");

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const data = await authService.login(email, password);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ success: true, user: req.user });
}

module.exports = { login, me };
