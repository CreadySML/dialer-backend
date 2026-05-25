const healthService = require("../services/healthService");

async function getHealth(req, res, next) {
  try {
    const data = await healthService.getServiceHealth();
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getHealth };
