const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Listing = sequelize.define('Listing', {
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
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    currentPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    originalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD'
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    scrapedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nextScrapeAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'sold', 'unavailable'),
      defaultValue: 'active'
    },
    priceChangePercentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    lowestPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    lowestPriceDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    highestPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    highestPriceDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notificationThreshold: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 10,
      comment: 'Percentage drop to trigger notification'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
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
      { fields: ['status'] },
      { fields: ['url'] },
      { fields: ['userId', 'status'] },
      { fields: ['nextScrapeAt'] }
    ]
  });

  Listing.associate = (models) => {
    Listing.belongsTo(models.User, { foreignKey: 'userId' });
    Listing.hasMany(models.PriceHistory, { foreignKey: 'listingId' });
  };

  return Listing;
};
