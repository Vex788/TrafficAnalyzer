const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Alert = sequelize.define('Alert', {
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
      allowNull: false,
      references: {
        model: 'Listings',
        key: 'id'
      }
    },
    alertType: {
      type: DataTypes.ENUM('price_drop', 'price_increase', 'back_in_stock', 'out_of_stock'),
      allowNull: false
    },
    threshold: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    thresholdPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastTriggered: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notificationSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    notificationMethod: {
      type: DataTypes.ENUM('email', 'push', 'both'),
      defaultValue: 'email'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    indexes: [
      { fields: ['userId'] },
      { fields: ['listingId'] },
      { fields: ['isActive'] },
      { fields: ['userId', 'isActive'] }
    ]
  });

  Alert.associate = (models) => {
    Alert.belongsTo(models.User, { foreignKey: 'userId' });
    Alert.belongsTo(models.Listing, { foreignKey: 'listingId' });
  };

  return Alert;
};
