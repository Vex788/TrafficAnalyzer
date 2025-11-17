const express = require('express');
const router = express.Router();
const db = require('../models');
const { authenticate } = require('../middleware/auth');
const scraperService = require('../services/scraperService');
const llmService = require('../services/llmService');

// Create listing
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, description, url, category, notificationThreshold } = req.body;

    if (!title || !url) {
      return res.status(400).json({
        error: 'Title and URL are required'
      });
    }

    const listing = await db.Listing.create({
      userId: req.user.id,
      title,
      description,
      url,
      category,
      notificationThreshold: notificationThreshold || 10,
      nextScrapeAt: new Date()
    });

    // Trigger initial scrape
    scraperService.scrapePrice(listing.id).catch(err => {
      console.error('Scrape error:', err);
    });

    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
});

// Get user listings
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, category } = req.query;
    const where = { userId: req.user.id };

    if (status) where.status = status;
    if (category) where.category = category;

    const listings = await db.Listing.findAll({
      where,
      include: [
        {
          model: db.PriceHistory,
          limit: 10,
          order: [['scrapedAt', 'DESC']]
        }
      ],
      order: [['updatedAt', 'DESC']]
    });

    res.json(listings);
  } catch (error) {
    next(error);
  }
});

// Get listing details
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const listing = await db.Listing.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [
        {
          model: db.PriceHistory,
          order: [['scrapedAt', 'DESC']],
          limit: 100
        }
      ]
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(listing);
  } catch (error) {
    next(error);
  }
});

// Update listing
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { title, description, category, status, notificationThreshold } = req.body;

    const listing = await db.Listing.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    await listing.update({
      title,
      description,
      category,
      status,
      notificationThreshold
    });

    res.json(listing);
  } catch (error) {
    next(error);
  }
});

// Delete listing
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const listing = await db.Listing.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    await listing.destroy();
    res.json({ message: 'Listing deleted' });
  } catch (error) {
    next(error);
  }
});

// Get price history
router.get('/:id/price-history', authenticate, async (req, res, next) => {
  try {
    const listing = await db.Listing.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const priceHistory = await db.PriceHistory.findAll({
      where: { listingId: req.params.id },
      order: [['scrapedAt', 'ASC']]
    });

    res.json(priceHistory);
  } catch (error) {
    next(error);
  }
});

// Manually trigger price scrape
router.post('/:id/scrape', authenticate, async (req, res, next) => {
  try {
    const listing = await db.Listing.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    scraperService.scrapePrice(req.params.id).catch(err => {
      console.error('Scrape error:', err);
    });

    res.json({ message: 'Scrape triggered' });
  } catch (error) {
    next(error);
  }
});

// Track user action on listing
router.post('/:id/track-action', async (req, res, next) => {
  try {
    const { actionType, coordinates, sessionId, deviceType, browserName, osName } = req.body;

    const action = await db.UserAction.create({
      listingId: req.params.id,
      userId: req.user?.id,
      actionType,
      coordinates,
      sessionId,
      deviceType,
      browserName,
      osName,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json(action);
  } catch (error) {
    next(error);
  }
});

// Get LLM insights for listing
router.get('/:id/insights', authenticate, async (req, res, next) => {
  try {
    const listing = await db.Listing.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [{
        model: db.PriceHistory,
        limit: 30,
        order: [['scrapedAt', 'DESC']]
      }]
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const insights = await llmService.generateListingInsights(listing);
    res.json(insights);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
