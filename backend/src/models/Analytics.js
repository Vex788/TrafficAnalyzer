const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Analytics = sequelize.define('Analytics', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    totalViews: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    totalClicks: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    totalActions: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    uniqueListings: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    avgSessionDuration: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    bounceRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    deviceBreakdown: {
      type: DataTypes.JSONB,
      defaultValue: { mobile: 0, tablet: 0, desktop: 0 }
    },
    topPages: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    topListings: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    hourlyBreakdown: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    actionTypeBreakdown: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    indexes: [
      { fields: ['userId'] },
      { fields: ['date'] },
      { fields: ['userId', 'date'] }
    ]
  });

  Analytics.associate = (models) => {
    Analytics.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return Analytics;
};
