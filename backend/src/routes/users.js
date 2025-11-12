const express = require('express');
const router = express.Router();
const db = require('../models');
const { authenticate } = require('../middleware/auth');

// Get user profile
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const user = await db.User.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash'] }
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const { firstName, lastName, preferences } = req.body;

    await req.user.update({
      firstName,
      lastName,
      preferences: preferences || req.user.preferences
    });

    res.json({
      message: 'Profile updated',
      user: req.user
    });
  } catch (error) {
    next(error);
  }
});

// Get user dashboard statistics
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const listingsCount = await db.Listing.count({
      where: { userId, status: 'active' }
    });

    const totalActions = await db.UserAction.count({
      where: { userId }
    });

    const topListings = await db.Listing.findAll({
      where: { userId },
      include: [{
        model: db.UserAction,
        attributes: [],
        required: false
      }],
      attributes: {
        include: [[db.sequelize.fn('COUNT', db.sequelize.col('UserActions.id')), 'actionCount']]
      },
      group: ['Listing.id'],
      order: [[db.sequelize.literal('actionCount'), 'DESC']],
      limit: 10
    });

    const recentPriceDrops = await db.Listing.findAll({
      where: { userId },
      order: [['updatedAt', 'DESC']],
      limit: 10
    });

    res.json({
      listingsCount,
      totalActions,
      topListings,
      recentPriceDrops
    });
  } catch (error) {
    next(error);
  }
});

// Get user sessions
router.get('/sessions', authenticate, async (req, res, next) => {
  try {
    const sessions = await db.UserSession.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    res.json(sessions);
  } catch (error) {
    next(error);
  }
});

// Logout all sessions
router.post('/logout-all', authenticate, async (req, res, next) => {
  try {
    await db.UserSession.update(
      { isActive: false },
      { where: { userId: req.user.id } }
    );

    res.json({ message: 'All sessions logged out' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
