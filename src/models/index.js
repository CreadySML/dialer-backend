const sequelize = require("../config/database");

const User = require("./User");
const Team = require("./Team");
const TeamMember = require("./TeamMember");
const Lead = require("./Lead");

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

User.hasMany(Lead, { foreignKey: "assignedTo", as: "assignedLeads" });
Lead.belongsTo(User, { foreignKey: "assignedTo", as: "agent" });

User.hasMany(Lead, { foreignKey: "createdBy", as: "ownedLeads" });
Lead.belongsTo(User, { foreignKey: "createdBy", as: "owner" });

Team.hasMany(Lead, { foreignKey: "teamId", as: "leads" });
Lead.belongsTo(Team, { foreignKey: "teamId", as: "team" });

module.exports = {
  sequelize,
  User,
  Team,
  TeamMember,
  Lead,
};
