const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const db = require('../models');
const { authenticate } = require('../middleware/auth');

// Get user analytics dashboard
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get analytics data
    const analytics = await db.Analytics.findAll({
      where: {
        userId,
        date: { [Op.gte]: startDate }
      },
      order: [['date', 'ASC']]
    });

    // Get recent actions
    const recentActions = await db.UserAction.findAll({
      where: {
        userId,
        createdAt: { [Op.gte]: startDate }
      },
      include: [{
        model: db.Listing,
        attributes: ['id', 'title', 'currentPrice']
      }],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    // Get action breakdown
    const actionBreakdown = await db.UserAction.findAll({
      attributes: [
        'actionType',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      where: {
        userId,
        createdAt: { [Op.gte]: startDate }
      },
      group: ['actionType'],
      raw: true
    });

    // Get device breakdown
    const deviceBreakdown = await db.UserAction.findAll({
      attributes: [
        'deviceType',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      where: {
        userId,
        createdAt: { [Op.gte]: startDate }
      },
      group: ['deviceType'],
      raw: true
    });

    res.json({
      analytics,
      recentActions,
      actionBreakdown,
      deviceBreakdown
    });
  } catch (error) {
    next(error);
  }
});

// Get heatmap data for admin
router.get('/heatmap', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const actions = await db.UserAction.findAll({
      where: {
        userId,
        coordinates: { [Op.ne]: null }
      },
      attributes: ['coordinates', 'actionType'],
      limit: 1000
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

// Get click history
router.get('/click-history', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 100, offset = 0 } = req.query;

    const clickHistory = await db.UserAction.findAndCountAll({
      where: {
        userId,
        actionType: 'click'
      },
      include: [{
        model: db.Listing,
        attributes: ['id', 'title', 'currentPrice', 'url']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(clickHistory);
  } catch (error) {
    next(error);
  }
});

// Get hourly analytics
router.get('/hourly', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const hourlyData = await db.UserAction.findAll({
      attributes: [
        [db.sequelize.fn('DATE_TRUNC', 'hour', db.sequelize.col('createdAt')), 'hour'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      where: {
        userId,
        createdAt: { [Op.gte]: startDate }
      },
      group: [db.sequelize.fn('DATE_TRUNC', 'hour', db.sequelize.col('createdAt'))],
      order: [[db.sequelize.fn('DATE_TRUNC', 'hour', db.sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    res.json(hourlyData);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
