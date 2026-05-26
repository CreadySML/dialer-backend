const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * LeadActivity — local workflow state for a lead.
 * One row per lead that has been acted upon (lazy creation on first assign).
 * Joined with Lead via leadId. The Lead row itself stays untouched
 * (so it works when Lead is later swapped for a foreign table).
 */
const LeadActivity = sequelize.define(
  "LeadActivity",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    leadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      // No DB-level FK — Lead points to a foreign table (offerleads_fdw)
      // which does not support foreign-key constraints. Integrity is
      // enforced application-side via getOrCreateActivity().
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      references: { model: "users", key: "id" },
    },
    stage: {
      type: DataTypes.ENUM(
        "new",
        "contacted",
        "interested",
        "not_interested",
        "follow_up",
        "converted",
        "rejected"
      ),
      defaultValue: "new",
    },
    disposition: {
      type: DataTypes.STRING(120),
    },
    remarks: {
      type: DataTypes.TEXT,
    },
    nextFollowUpAt: {
      type: DataTypes.DATE,
    },
    lastContactedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "lead_activity",
    timestamps: true,
    indexes: [
      { fields: ["assignedTo"] },
      { fields: ["stage"] },
    ],
  }
);

module.exports = LeadActivity;
