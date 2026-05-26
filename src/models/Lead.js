const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * Lead — points to the FOREIGN TABLE `offerleads_fdw`.
 *
 * Read-only from our side. Sequelize sync is overridden to no-op so it
 * never tries to ALTER / CREATE the foreign table. All workflow state
 * (assignment, stage, disposition) lives in LeadActivity, joined via leadId.
 *
 * Field mapping: JS camelCase  ↔  DB snake_case via the `field` option.
 */
const Lead = sequelize.define(
  "Lead",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true },

    name: { type: DataTypes.STRING(255) },
    firstName: { type: DataTypes.STRING(120), field: "first_name" },
    lastName: { type: DataTypes.STRING(120), field: "last_name" },

    phone: { type: DataTypes.STRING(20) },
    email: { type: DataTypes.STRING(150) },
    gender: { type: DataTypes.STRING(20) },
    dob: { type: DataTypes.DATEONLY },

    pincode: { type: DataTypes.STRING(10) },
    panNo: { type: DataTypes.STRING(20), field: "pan_no" },

    profile: { type: DataTypes.STRING(80) },
    monthlyIncome: { type: DataTypes.INTEGER, field: "monthly_income" },

    loanPurpose: { type: DataTypes.STRING(120), field: "loan_purpose" },
    loanAmount: { type: DataTypes.INTEGER, field: "loan_amount" },

    utmSource: { type: DataTypes.STRING(120), field: "utm_source" },
    utmMedium: { type: DataTypes.STRING(120), field: "utm_medium" },
    utmCampaign: { type: DataTypes.STRING(120), field: "utm_campaign" },
    utmContent: { type: DataTypes.STRING(120), field: "utm_content" },
    utmTerm: { type: DataTypes.STRING(120), field: "utm_term" },

    mvApplyStatus: { type: DataTypes.STRING(60), field: "mv_apply_status" },
    kbApplyStatus: { type: DataTypes.STRING(60), field: "kb_apply_status" },
    viewAllClickedAt: { type: DataTypes.DATE, field: "view_all_clicked_at" },
    mrn: { type: DataTypes.STRING(80) },

    // Large JSON payloads — excluded from default selects (defaultScope below)
    lenderResponse: { type: DataTypes.JSON, field: "lender_response" },
    shownOffers: { type: DataTypes.JSON, field: "shown_offers" },
    responseTrack: { type: DataTypes.JSON, field: "response_track" },
  },
  {
    tableName: "offerleads_fdw",
    timestamps: true,
    paranoid: true,
    defaultScope: {
      attributes: {
        exclude: ["lenderResponse", "shownOffers", "responseTrack"],
      },
    },
    scopes: {
      withRawPayloads: { attributes: { include: ["lenderResponse", "shownOffers", "responseTrack"] } },
    },
  }
);

Lead.sync = async () => {};

module.exports = Lead;
