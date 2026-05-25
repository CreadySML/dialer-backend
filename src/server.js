require("dotenv").config();

const app = require("./app");
const { sequelize } = require("./models");
const seedSuperadmin = require("./utils/seedSuperadmin");
const seedDummyLeads = require("./utils/seedDummyLeads");

const PORT = process.env.PORT || 5001;

async function start() {
  let dbReady = false;
  try {
    await sequelize.authenticate();
    console.log("[DB] PostgreSQL connection established");

    if (process.env.NODE_ENV === "development") {
      await sequelize.sync({ alter: true });
      console.log("[DB] Models synced (alter mode)");
    }
    dbReady = true;
  } catch (err) {
    console.warn(`[DB] Connection failed: ${err.message}`);
    console.warn("[DB] Server will still start; fix DB connection then restart.");
  }

  if (dbReady) {
    try {
      await seedSuperadmin();
      await seedDummyLeads();
    } catch (err) {
      console.warn(`[SEED] Failed: ${err.message}`);
    }
  }

  app.listen(PORT, () => {
    console.log(`[SERVER] Running on http://localhost:${PORT}`);
    console.log(`[SERVER] API base:    http://localhost:${PORT}/api`);
    console.log(`[SERVER] Health:      http://localhost:${PORT}/api/health`);
  });
}

start();
