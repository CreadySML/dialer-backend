const { User } = require("../models");

async function seedSuperadmin() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME || "Super Admin";

  if (!email || !password) {
    console.warn("[SEED] SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD missing — skipping seed");
    return;
  }

  const existing = await User.findOne({ where: { role: "superadmin" } });
  if (existing) {
    console.log(`[SEED] Superadmin already exists (${existing.email})`);
    return;
  }

  const user = await User.create({
    name,
    email,
    password,
    role: "superadmin",
  });

  console.log(`[SEED] Superadmin created: ${user.email}`);
}

module.exports = seedSuperadmin;
