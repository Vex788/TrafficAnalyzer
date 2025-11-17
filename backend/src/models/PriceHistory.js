const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PriceHistory = sequelize.define('PriceHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    listingId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Listings',
        key: 'id'
      }
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD'
    },
    priceChange: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    percentageChange: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    availability: {
      type: DataTypes.STRING,
      allowNull: true
    },
    scrapedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    indexes: [
      { fields: ['listingId'] },
      { fields: ['scrapedAt'] },
      { fields: ['listingId', 'scrapedAt'] }
    ]
  });

  PriceHistory.associate = (models) => {
    PriceHistory.belongsTo(models.Listing, { foreignKey: 'listingId' });
  };

  return PriceHistory;
};
