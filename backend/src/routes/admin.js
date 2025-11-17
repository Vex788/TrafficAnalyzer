const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const db = require('../models');
const { authenticate, isAdmin } = require('../middleware/auth');
const llmService = require('../services/llmService');
const logger = require('../utils/logger');

// Middleware to check admin status
router.use(authenticate);
router.use(isAdmin);

// Get all users
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const users = await db.User.findAndCountAll({
      where,
      attributes: { exclude: ['passwordHash'] },
      offset,
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
});

// Get user details
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await db.User.findByPk(req.params.id, {
      attributes: { exclude: ['passwordHash'] },
      include: [
        {
          model: db.Listing,
          attributes: ['id', 'title', 'currentPrice', 'status']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user statistics
    const actionCount = await db.UserAction.count({
      where: { userId: user.id }
    });

    const sessionCount = await db.UserSession.count({
      where: { userId: user.id, isActive: true }
    });

    res.json({
      user,
      actionCount,
      sessionCount
    });
  } catch (error) {
    next(error);
  }
});

// Update user role
router.put('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await db.User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log admin action
    await db.AdminLog.create({
      adminId: req.user.id,
      action: 'update_user_role',
      entityType: 'User',
      entityId: user.id,
      oldValues: { role: user.role },
      newValues: { role },
      ipAddress: req.ip
    });

    user.role = role;
    await user.save();

    logger.info(`Admin ${req.user.email} updated user ${user.email} role to ${role}`);

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Deactivate user
router.post('/users/:id/deactivate', async (req, res, next) => {
  try {
    const user = await db.User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.AdminLog.create({
      adminId: req.user.id,
      action: 'deactivate_user',
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.ip
    });

    user.isActive = false;
    await user.save();

    logger.info(`Admin ${req.user.email} deactivated user ${user.email}`);

    res.json({ message: 'User deactivated' });
  } catch (error) {
    next(error);
  }
});

// Get system analytics
router.get('/analytics/system', async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const totalUsers = await db.User.count();
    const activeUsers = await db.User.count({
      where: { isActive: true }
    });

    const totalListings = await db.Listing.count();
    const totalActions = await db.UserAction.count({
      where: { createdAt: { [Op.gte]: startDate } }
    });

    const topUsers = await db.User.findAll({
      attributes: [
        'id',
        'email',
        'username',
        [db.sequelize.fn('COUNT', db.sequelize.col('UserActions.id')), 'actionCount']
      ],
      include: [{
        model: db.UserAction,
        attributes: [],
        where: { createdAt: { [Op.gte]: startDate } },
        required: false
      }],
      group: ['User.id'],
      order: [[db.sequelize.literal('actionCount'), 'DESC']],
      limit: 10,
      raw: true
    });

    res.json({
      totalUsers,
      activeUsers,
      totalListings,
      totalActions,
      topUsers
    });
  } catch (error) {
    next(error);
  }
});

// Get admin activity logs
router.get('/logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (action) where.action = action;

    const logs = await db.AdminLog.findAndCountAll({
      where,
      include: [{
        model: db.User,
        as: 'admin',
        attributes: ['email', 'username']
      }],
      offset,
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json(logs);
  } catch (error) {
    next(error);
  }
});

// Get LLM recommendations for system improvements
router.get('/recommendations', async (req, res, next) => {
  try {
    const recommendations = await llmService.generateSystemRecommendations();

    await db.AdminLog.create({
      adminId: req.user.id,
      action: 'generated_recommendations',
      ipAddress: req.ip
    });

    res.json(recommendations);
  } catch (error) {
    next(error);
  }
});

// Get user heatmaps
router.get('/heatmaps/:userId', async (req, res, next) => {
  try {
    const actions = await db.UserAction.findAll({
      where: {
        userId: req.params.userId,
        coordinates: { [Op.ne]: null }
      },
      attributes: ['coordinates', 'actionType', 'createdAt'],
      limit: 5000
    });

    const heatmapData = actions.map(action => ({
      x: action.coordinates.x,
      y: action.coordinates.y,
      type: action.actionType,
      timestamp: action.createdAt
    }));

    res.json(heatmapData);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
