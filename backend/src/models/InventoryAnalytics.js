import mongoose from 'mongoose';

const InventoryAnalyticsSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  shopifyProductId: {
    type: String,
    required: true
  },
  variantId: String,
  title: String,
  sku: String,
  historicalQuantities: [{
    date: Date,
    quantity: Number
  }],
  salesVelocity: {
    daily: Number,
    weekly: Number,
    monthly: Number,
    lastUpdated: Date
  },
  restockRecommendations: {
    recommendedQuantity: Number,
    recommendedDate: Date,
    confidence: Number,
    reasoning: String,
    lastUpdated: Date
  },
  lowStockThreshold: {
    type: Number,
    default: 5
  },
  stockStatus: {
    type: String, 
    enum: ['In Stock', 'Low Stock', 'Out of Stock'],
    default: 'In Stock'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const InventoryAnalytics = mongoose.model('InventoryAnalytics', InventoryAnalyticsSchema);

export default InventoryAnalytics;