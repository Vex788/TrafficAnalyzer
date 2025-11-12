const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserAction = sequelize.define('UserAction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    listingId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Listings',
        key: 'id'
      }
    },
    actionType: {
      type: DataTypes.ENUM(
        'view',
        'click',
        'add_to_watchlist',
        'remove_from_watchlist',
        'purchase',
        'share',
        'compare',
        'scroll',
        'search'
      ),
      allowNull: false
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    referer: {
      type: DataTypes.STRING,
      allowNull: true
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    deviceType: {
      type: DataTypes.ENUM('mobile', 'tablet', 'desktop'),
      allowNull: true
    },
    browserName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    osName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    pageUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    coordinates: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'x, y coordinates for heatmap tracking'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional action metadata'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Time spent in milliseconds'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    indexes: [
      { fields: ['userId'] },
      { fields: ['listingId'] },
      { fields: ['actionType'] },
      { fields: ['createdAt'] },
      { fields: ['userId', 'createdAt'] },
      { fields: ['sessionId'] }
    ]
  });

  UserAction.associate = (models) => {
    UserAction.belongsTo(models.User, { foreignKey: 'userId' });
    UserAction.belongsTo(models.Listing, { foreignKey: 'listingId' });
  };

  return UserAction;
};
