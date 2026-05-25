require("dotenv").config();
const { sequelize } = require("../models");

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection OK");
    process.exit(0);
  } catch (err) {
    console.error("Database connection FAILED:", err.message);
    process.exit(1);
  }
})();
