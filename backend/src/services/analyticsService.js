import Product from '../models/Product.js';
import Order from '../models/Order.js';
import InventoryAnalytics from '../models/InventoryAnalytics.js';
import logger from '../utils/logger.js';

/**
 * Calculate basic sales velocity for a product variant
 * This is a simplified version that just tracks quantity changes
 * @param {Object} analyticsItem - The inventory analytics item
 * @returns {Object} Basic sales velocity metrics
 */
export const calculateBasicSalesVelocity = async (analyticsItem) => {
  const historicalQuantities = analyticsItem.historicalQuantities || [];
  
  if (historicalQuantities.length < 2) {
    logger.debug('Not enough historical data for sales velocity calculation');
    return {
      daily: 0,
      weekly: 0,
      monthly: 0,
      lastUpdated: new Date()
    };
  }
  
  // Sort by date (newest first)
  const sortedQuantities = [...historicalQuantities]
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Calculate changes between consecutive readings
  let totalDecrease = 0;
  let totalDays = 0;
  
  for (let i = 0; i < sortedQuantities.length - 1; i++) {
    const current = sortedQuantities[i];
    const previous = sortedQuantities[i + 1];
    
    const decrease = previous.quantity - current.quantity;
    if (decrease > 0) {
      // Only count decreases (sales)
      totalDecrease += decrease;
      
      // Calculate days between readings
      const daysBetween = (new Date(current.date) - new Date(previous.date)) / (1000 * 60 * 60 * 24);
      totalDays += daysBetween;
    }
  }
  
  // Calculate daily velocity
  let dailyVelocity = 0;
  if (totalDays > 0) {
    dailyVelocity = totalDecrease / totalDays;
  }
  
  const result = {
    daily: dailyVelocity,
    weekly: dailyVelocity * 7,
    monthly: dailyVelocity * 30,
    lastUpdated: new Date()
  };
  
  logger.debug(`Calculated basic sales velocity for product: ${analyticsItem.shopifyProductId}`, result);
  
  return result;
};

/**
 * Update inventory analytics with the latest data
 * This should be run regularly to keep data fresh
 */
export const updateInventoryAnalytics = async () => {
  logger.info('Starting inventory analytics update');
  
  try {
    // Get all inventory analytics
    const analytics = await InventoryAnalytics.find();
    let updated = 0;
    
    for (const item of analytics) {
      // Calculate basic sales velocity
      const salesVelocity = await calculateBasicSalesVelocity(item);
      
      // Just update the sales velocity data for use by external AI processing
      item.salesVelocity = salesVelocity;
      await item.save();
      updated++;
    }
    
    logger.info(`Updated ${updated} inventory analytics items`);
    return { success: true, updated };
  } catch (error) {
    logger.error('Error updating inventory analytics', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get inventory analytics data for frontend display
 * @returns {Object} Formatted inventory analytics data for dashboard and charts
 */
export const getInventoryAnalytics = async () => {
  logger.info('Fetching inventory analytics data');
  
  try {
    // Get all products and their analytics
    const products = await Product.find();
    const analytics = await InventoryAnalytics.find();
    
    // Calculate total inventory levels over time (for trends)
    const inventoryHistoryMap = new Map();
    
    // Process each analytics entry to build inventory history
    analytics.forEach(item => {
      if (item.historicalQuantities && item.historicalQuantities.length > 0) {
        item.historicalQuantities.forEach(record => {
          const dateKey = new Date(record.date).toISOString().split('T')[0]; // YYYY-MM-DD
          const currentTotal = inventoryHistoryMap.get(dateKey) || 0;
          inventoryHistoryMap.set(dateKey, currentTotal + record.quantity);
        });
      }
    });
    
    // Convert to array and sort by date
    const inventoryHistory = Array.from(inventoryHistoryMap.entries())
      .map(([date, totalStock]) => ({ date, totalStock }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30); // Last 30 days
    
    // Calculate product trends for individual products
    const productTrends = products.map(product => {
      // Find analytics for this product's variants
      const productAnalytics = analytics.filter(a => a.shopifyProductId === product.shopifyId);
      
      // Calculate current stock
      const currentStock = product.variants.reduce((total, variant) => {
        return total + (variant.inventoryQuantity || 0);
      }, 0);
      
      // Get historical data if available
      let trendDirection = 'stable';
      let percentChange = 0;
      
      if (productAnalytics.length > 0) {
        // Use sales velocity to determine trend
        const avgDailySales = productAnalytics.reduce((sum, item) => {
          return sum + (item.salesVelocity?.daily || 0);
        }, 0);
        
        if (avgDailySales > 0) {
          // If we're selling product, trend is down
          trendDirection = 'down';
          // Calculate percent change based on 7 days of sales vs current stock
          const weekSales = avgDailySales * 7;
          percentChange = Math.min(Math.round((weekSales / currentStock) * 100), 100);
        }
      }
      
      return {
        productId: product.shopifyId,
        name: product.title,
        currentStock,
        trendDirection,
        percentChange
      };
    });
    
    // Get count of low stock items
    const lowStockCount = analytics.filter(item => item.stockStatus === 'low').length;
    
    // Calculate predicted out of stock in next 7 days
    const predictedOutOfStock = analytics.filter(item => {
      if (!item.salesVelocity || !item.salesVelocity.daily) return false;
      
      // Find the product and variant
      const product = products.find(p => p.shopifyId === item.shopifyProductId);
      if (!product) return false;
      
      const variant = product.variants.find(v => v.shopifyVariantId === item.variantId);
      if (!variant) return false;
      
      // Calculate days until stockout
      const currentStock = variant.inventoryQuantity || 0;
      const dailySales = item.salesVelocity.daily;
      
      // If daily sales is zero, won't go out of stock
      if (dailySales <= 0) return false;
      
      const daysUntilStockout = currentStock / dailySales;
      return daysUntilStockout <= 7; // Will be out of stock within 7 days
    }).length;
    
    return {
      success: true,
      totalProducts: products.length,
      lowStockItems: lowStockCount,
      predictedOutOfStock: predictedOutOfStock,
      inventoryHistory,
      productTrends
    };
  } catch (error) {
    logger.error('Error fetching inventory analytics', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Prepare inventory data for external AI processing
 * @returns {Array} Data formatted for AI processing
 */
export const prepareInventoryDataForAI = async () => {
  logger.info('Preparing inventory data for AI processing');
  
  try {
    const products = await Product.find();
    const orders = await Order.find().sort({ createdAt: -1 }).limit(500); // Get recent orders
    const analytics = await InventoryAnalytics.find();
    
    // Format data for AI processing
    const data = [];
    
    for (const product of products) {
      for (const variant of product.variants) {
        // Find analytics for this variant
        const variantAnalytics = analytics.find(a => 
          a.shopifyProductId === product.shopifyId && 
          a.variantId === variant.shopifyVariantId
        );
        
        if (variantAnalytics) {
          // Find orders for this variant
          const variantOrders = orders.filter(order => 
            order.lineItems.some(item => 
              item.productId === product.shopifyId && 
              item.variantId === variant.shopifyVariantId
            )
          );
          
          // Create data object for AI processing
          data.push({
            product: {
              id: product.shopifyId,
              title: product.title,
              vendor: product.vendor,
              productType: product.productType,
              tags: product.tags
            },
            variant: {
              id: variant.shopifyVariantId,
              title: variant.title,
              sku: variant.sku,
              price: variant.price,
              inventoryQuantity: variant.inventoryQuantity
            },
            analytics: {
              historicalQuantities: variantAnalytics.historicalQuantities,
              salesVelocity: variantAnalytics.salesVelocity,
              stockStatus: variantAnalytics.stockStatus,
              lowStockThreshold: variantAnalytics.lowStockThreshold
            },
            orders: variantOrders.map(order => ({
              orderId: order.shopifyId,
              orderDate: order.createdAt,
              lineItem: order.lineItems.find(item => 
                item.productId === product.shopifyId && 
                item.variantId === variant.shopifyVariantId
              )
            }))
          });
        }
      }
    }
    
    logger.info(`Prepared data for ${data.length} product variants for AI processing`);
    return { success: true, data };
  } catch (error) {
    logger.error('Error preparing inventory data for AI', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save AI-generated recommendations to the database
 * @param {Array} recommendations - Array of recommendations from AI processing
 * @returns {Object} Result of the update operation
 */
export const saveAIRecommendations = async (recommendations) => {
  logger.info(`Saving ${recommendations.length} AI-generated recommendations`);
  
  try {
    let updated = 0;
    
    for (const rec of recommendations) {
      if (rec.productId && rec.variantId && rec.recommendation) {
        // Find and update the analytics entry
        const updated = await InventoryAnalytics.findOneAndUpdate(
          {
            shopifyProductId: rec.productId,
            variantId: rec.variantId
          },
          {
            $set: {
              restockRecommendations: {
                recommendedQuantity: rec.recommendation.quantity,
                recommendedDate: new Date(),
                confidence: rec.recommendation.confidence || 0.7,
                reasoning: rec.recommendation.reasoning || 'AI-generated recommendation',
                lastUpdated: new Date()
              }
            }
          },
          { new: true }
        );
        
        if (updated) {
          updated++;
        }
      }
    }
    
    logger.info(`Successfully saved ${updated} AI recommendations`);
    return { success: true, updated };
  } catch (error) {
    logger.error('Error saving AI recommendations', error);
    return { success: false, error: error.message };
  }
};

export default {
  calculateBasicSalesVelocity,
  updateInventoryAnalytics,
  prepareInventoryDataForAI,
  saveAIRecommendations,
  getInventoryAnalytics
};