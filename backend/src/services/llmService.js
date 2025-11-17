const { OpenAI } = require('openai');
const db = require('../models');
const logger = require('../utils/logger');

let openai = null;

const initOpenAI = () => {
  if (!openai && process.env.LLM_PROVIDER === 'openai') {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
};

const extractPriceFromHTML = async (htmlContent, url) => {
  try {
    const openai = initOpenAI();

    if (!openai) {
      logger.warn('OpenAI not configured, using fallback price extraction');
      return extractPriceFallback(htmlContent);
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [{
        role: 'user',
        content: `Extract the product price, currency, and availability from this HTML content.
                 URL: ${url}

                 HTML:
                 ${htmlContent.substring(0, 5000)}

                 Return a JSON object with: price (number), currency (string, e.g., USD), availability (in stock/out of stock), imageUrl (URL if available)
                 If not found, return null values.`
      }],
      temperature: 0.3,
      max_tokens: 200
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return null;
  } catch (error) {
    logger.error('Error extracting price with LLM:', error);
    return extractPriceFallback(htmlContent);
  }
};

const extractPriceFallback = (htmlContent) => {
  // Fallback: simple regex patterns for common price formats
  const priceMatch = htmlContent.match(/\$?\d+[.,]\d{2}|\d+[.,]\d{2}\s*(?:USD|EUR|GBP)/i);

  if (priceMatch) {
    const price = parseFloat(priceMatch[0].replace(/[^\d.]/g, ''));
    return {
      price,
      currency: 'USD',
      availability: 'unknown'
    };
  }

  return null;
};

const generateListingInsights = async (listing) => {
  try {
    const openai = initOpenAI();

    if (!openai) {
      return {
        recommendation: 'LLM service not configured',
        priceAnalysis: null,
        predictedTrend: null
      };
    }

    const priceHistory = listing.PriceHistories || [];
    const priceData = priceHistory.map(h => ({
      date: h.scrapedAt,
      price: h.price
    }));

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [{
        role: 'user',
        content: `Analyze this product listing and provide insights:

                 Title: ${listing.title}
                 Current Price: $${listing.currentPrice}
                 Lowest Price: $${listing.lowestPrice}
                 Highest Price: $${listing.highestPrice}
                 Price History: ${JSON.stringify(priceData)}

                 Provide:
                 1. Price trend analysis (is it going up/down/stable?)
                 2. Whether it's a good time to buy
                 3. Predicted price movement (next 7 days)
                 4. Recommendation (buy now / wait / pass)`
      }],
      temperature: 0.7,
      max_tokens: 500
    });

    return {
      recommendation: response.choices[0].message.content,
      priceAnalysis: {
        current: listing.currentPrice,
        lowest: listing.lowestPrice,
        highest: listing.highestPrice,
        trend: listing.priceChangePercentage
      }
    };
  } catch (error) {
    logger.error('Error generating listing insights:', error);
    return null;
  }
};

const generateSystemRecommendations = async () => {
  try {
    const openai = initOpenAI();

    if (!openai) {
      return {
        recommendations: ['LLM service not configured']
      };
    }

    // Gather system metrics
    const totalUsers = await db.User.count();
    const totalListings = await db.Listing.count();
    const activeListings = await db.Listing.count({
      where: { status: 'active' }
    });

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const recentActions = await db.UserAction.count({
      where: { createdAt: { [db.Sequelize.Op.gte]: last7Days } }
    });

    const avgSessionDuration = await db.Analytics.findOne({
      attributes: [
        [db.sequelize.fn('AVG', db.sequelize.col('avgSessionDuration')), 'avg']
      ],
      raw: true
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [{
        role: 'user',
        content: `As a platform optimization expert, analyze these metrics and provide 5-7 specific recommendations to improve traffic and user engagement:

                 - Total Users: ${totalUsers}
                 - Total Listings: ${totalListings}
                 - Active Listings: ${activeListings}
                 - Recent Actions (7 days): ${recentActions}
                 - Avg Session Duration: ${avgSessionDuration?.avg || 0} seconds

                 Focus on:
                 1. User engagement strategies
                 2. Feature improvements
                 3. Performance optimizations
                 4. Retention tactics
                 5. Monetization opportunities (if applicable)`
      }],
      temperature: 0.8,
      max_tokens: 1000
    });

    return {
      recommendations: response.choices[0].message.content,
      metrics: {
        totalUsers,
        totalListings,
        activeListings,
        recentActions,
        avgSessionDuration: avgSessionDuration?.avg
      }
    };
  } catch (error) {
    logger.error('Error generating system recommendations:', error);
    return {
      recommendations: ['Unable to generate recommendations at this time'],
      error: error.message
    };
  }
};

const generateUserSegmentation = async () => {
  try {
    const openai = initOpenAI();

    if (!openai) {
      return null;
    }

    // Analyze user behavior patterns
    const userGroups = await db.sequelize.query(`
      SELECT
        u.id,
        u.email,
        COUNT(ua.id) as action_count,
        COUNT(DISTINCT l.id) as listing_count,
        AVG(EXTRACT(EPOCH FROM (ua.createdAt - ua.createdAt)) / 1000) as avg_session_duration
      FROM "Users" u
      LEFT JOIN "UserActions" ua ON u.id = ua.userId
      LEFT JOIN "Listings" l ON u.id = l.userId
      GROUP BY u.id
      ORDER BY action_count DESC
      LIMIT 50
    `, { type: db.sequelize.QueryTypes.SELECT });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [{
        role: 'user',
        content: `Segment these users into meaningful groups based on their behavior:
                 ${JSON.stringify(userGroups.slice(0, 20))}

                 Provide:
                 1. User segments identified
                 2. Characteristics of each segment
                 3. Engagement strategies for each segment`
      }],
      temperature: 0.7,
      max_tokens: 800
    });

    return {
      segmentation: response.choices[0].message.content,
      userCount: userGroups.length
    };
  } catch (error) {
    logger.error('Error generating user segmentation:', error);
    return null;
  }
};

module.exports = {
  extractPriceFromHTML,
  generateListingInsights,
  generateSystemRecommendations,
  generateUserSegmentation
};
