require("dotenv").config();

const app = require("./app");
const { sequelize } = require("./models");
const seedSuperadmin = require("./utils/seedSuperadmin");

const PORT = process.env.PORT || 5001;

async function start() {
  let dbReady = false;
  try {
    await sequelize.authenticate();
    console.log("[DB] PostgreSQL connection established");

    if (process.env.NODE_ENV === "development") {
      // Drop legacy FK on lead_activity.leadId (left over from when Lead was a
      // regular local table). Lead now points to foreign table offerleads_fdw,
      // which cannot satisfy FK constraints — keeping this constraint blocks
      // every assignment insert. Safe to run repeatedly (IF EXISTS).
      try {
        await sequelize.query(
          'ALTER TABLE lead_activity DROP CONSTRAINT IF EXISTS "lead_activity_leadId_fkey"'
        );
      } catch (e) {
        console.warn(`[DB] Could not drop legacy FK: ${e.message}`);
      }

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
      // Leads now come from foreign table offerleads_fdw — no local seed needed
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
