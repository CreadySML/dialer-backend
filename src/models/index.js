const sequelize = require("../config/database");

const User = require("./User");
const Team = require("./Team");
const TeamMember = require("./TeamMember");
const Lead = require("./Lead");
const LeadActivity = require("./LeadActivity");

User.hasMany(Team, { foreignKey: "managerId", as: "managedTeams" });
Team.belongsTo(User, { foreignKey: "managerId", as: "manager" });

Team.belongsToMany(User, {
  through: TeamMember,
  foreignKey: "teamId",
  otherKey: "userId",
  as: "members",
});
User.belongsToMany(Team, {
  through: TeamMember,
  foreignKey: "userId",
  otherKey: "teamId",
  as: "teams",
});

User.hasMany(User, { foreignKey: "createdBy", as: "createdUsers" });
User.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

Lead.hasOne(LeadActivity, { foreignKey: "leadId", as: "activity", constraints: false });
LeadActivity.belongsTo(Lead, { foreignKey: "leadId", as: "lead", constraints: false });

User.hasMany(LeadActivity, { foreignKey: "assignedTo", as: "assignedActivities" });
LeadActivity.belongsTo(User, { foreignKey: "assignedTo", as: "agent" });

module.exports = {
  sequelize,
  User,
  Team,
  TeamMember,
  Lead,
  LeadActivity,
};
