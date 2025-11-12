const puppeteer = require('puppeteer');
const db = require('../models');
const logger = require('../utils/logger');
const llmService = require('./llmService');

let browser = null;

const initBrowser = async () => {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--single-process'
      ]
    });
  }
  return browser;
};

const scrapePrice = async (listingId) => {
  try {
    const listing = await db.Listing.findByPk(listingId);

    if (!listing || listing.status !== 'active') {
      return;
    }

    const browser = await initBrowser();
    const page = await browser.newPage();

    try {
      // Set timeout and user agent
      await page.setDefaultTimeout(parseInt(process.env.SCRAPER_TIMEOUT) || 30000);
      await page.setUserAgent(process.env.SCRAPER_USER_AGENT || 'Mozilla/5.0');

      // Navigate to URL
      await page.goto(listing.url, { waitUntil: 'networkidle2' });

      // Use LLM to extract price information from the page
      const pageContent = await page.content();
      const priceData = await llmService.extractPriceFromHTML(pageContent, listing.url);

      if (priceData && priceData.price) {
        const oldPrice = listing.currentPrice;
        const newPrice = parseFloat(priceData.price);

        // Calculate price change
        let priceChange = null;
        let percentageChange = null;
        if (oldPrice) {
          priceChange = newPrice - oldPrice;
          percentageChange = ((priceChange / oldPrice) * 100).toFixed(2);
        }

        // Update listing
        listing.currentPrice = newPrice;
        listing.currency = priceData.currency || listing.currency;
        listing.imageUrl = priceData.imageUrl || listing.imageUrl;
        listing.scrapedAt = new Date();
        listing.nextScrapeAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // Next scrape in 6 hours

        // Update price history
        if (oldPrice && oldPrice !== newPrice) {
          listing.priceChangePercentage = percentageChange;

          // Update lowest and highest prices
          if (!listing.lowestPrice || newPrice < listing.lowestPrice) {
            listing.lowestPrice = newPrice;
            listing.lowestPriceDate = new Date();
          }
          if (!listing.highestPrice || newPrice > listing.highestPrice) {
            listing.highestPrice = newPrice;
            listing.highestPriceDate = new Date();
          }
        }

        await listing.save();

        // Record price history
        await db.PriceHistory.create({
          listingId: listing.id,
          price: newPrice,
          currency: listing.currency,
          priceChange: priceChange,
          percentageChange: percentageChange,
          availability: priceData.availability
        });

        // Check if price drop exceeds notification threshold
        if (percentageChange && percentageChange < -(listing.notificationThreshold || 10)) {
          // Trigger price alerts
          const alerts = await db.Alert.findAll({
            where: {
              listingId: listing.id,
              alertType: 'price_drop',
              isActive: true
            }
          });

          for (const alert of alerts) {
            // Send notification (email, push, etc.)
            await sendPriceAlert(alert, listing, percentageChange);
            alert.lastTriggered = new Date();
            alert.notificationSent = true;
            await alert.save();
          }
        }

        logger.info(`Price scraped for listing ${listing.id}: $${newPrice}`);
      }
    } finally {
      await page.close();
    }
  } catch (error) {
    logger.error(`Error scraping listing ${listingId}:`, error);
    throw error;
  }
};

const sendPriceAlert = async (alert, listing, percentageChange) => {
  try {
    // TODO: Implement email notification service
    logger.info(`Price alert triggered for user ${alert.userId} on listing ${listing.id}: ${percentageChange}% change`);
  } catch (error) {
    logger.error('Error sending price alert:', error);
  }
};

const closeBrowser = async () => {
  if (browser) {
    await browser.close();
    browser = null;
  }
};

module.exports = {
  scrapePrice,
  initBrowser,
  closeBrowser
};
