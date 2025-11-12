const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Initialize Sequelize connection
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      connectTimeout: 10000,
      application_name: 'trafficanalyzer'
    }
  }
);

// Import models
const User = require('./User');
const Listing = require('./Listing');
const PriceHistory = require('./PriceHistory');
const UserAction = require('./UserAction');
const UserSession = require('./UserSession');
const AdminLog = require('./AdminLog');
const SystemSettings = require('./SystemSettings');
const Alert = require('./Alert');
const Analytics = require('./Analytics');

// Initialize models
const db = {
  sequelize,
  Sequelize,
  User: User(sequelize),
  Listing: Listing(sequelize),
  PriceHistory: PriceHistory(sequelize),
  UserAction: UserAction(sequelize),
  UserSession: UserSession(sequelize),
  AdminLog: AdminLog(sequelize),
  SystemSettings: SystemSettings(sequelize),
  Alert: Alert(sequelize),
  Analytics: Analytics(sequelize)
};

// Define associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
