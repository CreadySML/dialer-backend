const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Lead = sequelize.define(
  "Lead",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      validate: { isEmail: true },
    },
    city: {
      type: DataTypes.STRING(100),
    },
    source: {
      type: DataTypes.STRING(80),
    },
    product: {
      type: DataTypes.STRING(100),
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
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
    assignedTo: {
      type: DataTypes.INTEGER,
      references: { model: "users", key: "id" },
    },
    createdBy: {
      type: DataTypes.INTEGER,
      references: { model: "users", key: "id" },
    },
    teamId: {
      type: DataTypes.INTEGER,
      references: { model: "teams", key: "id" },
    },
    nextFollowUpAt: {
      type: DataTypes.DATE,
    },
    lastContactedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "dummy_leads",
    timestamps: true,
    indexes: [
      { fields: ["phone"] },
      { fields: ["assignedTo"] },
      { fields: ["createdBy"] },
      { fields: ["teamId"] },
      { fields: ["stage"] },
    ],
  }
);

module.exports = Lead;
