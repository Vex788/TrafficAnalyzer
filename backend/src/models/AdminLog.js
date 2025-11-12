const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AdminLog = sequelize.define('AdminLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    adminId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    oldValues: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    newValues: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('success', 'failure', 'pending'),
      defaultValue: 'success'
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    indexes: [
      { fields: ['adminId'] },
      { fields: ['action'] },
      { fields: ['createdAt'] },
      { fields: ['entityType', 'entityId'] }
    ]
  });

  AdminLog.associate = (models) => {
    AdminLog.belongsTo(models.User, { foreignKey: 'adminId', as: 'admin' });
  };

  return AdminLog;
};
