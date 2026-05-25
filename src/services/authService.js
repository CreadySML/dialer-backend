const { User } = require("../models");
const { signToken } = require("../utils/jwt");

async function login(email, password) {
  if (!email || !password) {
    const err = new Error("Email and password are required");
    err.status = 400;
    throw err;
  }

  const user = await User.scope("withPassword").findOne({ where: { email } });
  if (!user || !user.isActive) {
    const err = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }

  const ok = await user.validatePassword(password);
  if (!ok) {
    const err = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }

  const token = signToken({ id: user.id, role: user.role });
  const safeUser = user.toJSON();
  delete safeUser.password;

  return { token, user: safeUser };
}

module.exports = { login };
