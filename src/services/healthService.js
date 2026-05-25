const { sequelize } = require("../models");

async function checkDatabase() {
  try {
    await sequelize.authenticate();
    return { status: "connected" };
  } catch (err) {
    return { status: "disconnected", error: err.message };
  }
}

async function getServiceHealth() {
  const db = await checkDatabase();
  return {
    service: "lms-backend",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: db,
  };
}

module.exports = { getServiceHealth, checkDatabase };
