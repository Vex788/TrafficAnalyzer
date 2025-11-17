const { DataTypes } = require('sequelize');
const bcryptjs = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      lowercase: true,
      validate: {
        isEmail: true
      }
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'superadmin'),
      defaultValue: 'user'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastLoginIp: {
      type: DataTypes.STRING,
      allowNull: true
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    twoFactorSecret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        emailNotifications: true,
        priceAlerts: true,
        theme: 'light',
        language: 'en'
      }
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lockoutUntil: {
      type: DataTypes.DATE,
      allowNull: true
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
      { fields: ['email'] },
      { fields: ['username'] },
      { fields: ['role'] },
      { fields: ['isActive'] }
    ]
  });

  // Hash password before saving
  User.beforeCreate(async (user) => {
    user.passwordHash = await bcryptjs.hash(user.passwordHash, parseInt(process.env.BCRYPT_ROUNDS) || 10);
  });

  User.beforeUpdate(async (user) => {
    if (user.changed('passwordHash')) {
      user.passwordHash = await bcryptjs.hash(user.passwordHash, parseInt(process.env.BCRYPT_ROUNDS) || 10);
    }
  });

  // Add password comparison method
  User.prototype.comparePassword = async function(password) {
    return bcryptjs.compare(password, this.passwordHash);
  };

  User.associate = (models) => {
    User.hasMany(models.Listing, { foreignKey: 'userId' });
    User.hasMany(models.UserAction, { foreignKey: 'userId' });
    User.hasMany(models.UserSession, { foreignKey: 'userId' });
    User.hasMany(models.Alert, { foreignKey: 'userId' });
  };

  return User;
};
