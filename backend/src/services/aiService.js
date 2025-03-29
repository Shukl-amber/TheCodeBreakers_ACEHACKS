import axios from 'axios';
import logger from '../utils/logger.js';
import Product from '../models/Product.js';
import InventoryAnalytics from '../models/InventoryAnalytics.js';
import Order from '../models/Order.js';

// Configure LLM server URL from environment or use default
const LLM_SERVER_URL = process.env.LLM_SERVER_URL || 'http://localhost:5050';

/**
 * AI Service for generating inventory predictions and recommendations
 */
class AIService {
  /**
   * Get restock recommendations for inventory items
   * @returns {Promise<Array>} Array of recommendations
   */
  async getRestockRecommendations() {
    try {
      logger.info('Fetching inventory data for AI analysis');
      
      // Get inventory data from database
      const inventoryData = await this._prepareInventoryData();
      
      if (!inventoryData || inventoryData.length === 0) {
        logger.warn('No inventory data available for AI analysis');
        return [];
      }
      
      logger.info(`Sending ${inventoryData.length} inventory items to LLM server for analysis`);
      
      // Call LLM server to get predictions
      const response = await axios.post(`${LLM_SERVER_URL}/api/predictions/restock`, inventoryData);
      
      if (!response.data || !response.data.predictions) {
        logger.error('Invalid response from LLM server');
        return [];
      }
      
      const predictions = response.data.predictions;
      logger.info(`Received ${predictions.length} predictions from LLM server`);
      
      // Save predictions to database
      await this._savePredictions(predictions);
      
      return predictions;
    } catch (error) {
      logger.error(`Error getting restock recommendations: ${error.message}`);
      // If LLM server is not available, return empty array instead of throwing error
      return [];
    }
  }
  
  /**
   * Run inventory simulations for different scenarios
   * @param {Object} parameters - Simulation parameters
   * @returns {Promise<Object>} Simulation results
   */
  async runInventorySimulations(parameters = {}) {
    try {
      logger.info('Running inventory simulations');
      
      // Get inventory data
      const inventoryData = await this._prepareInventoryData();
      
      if (!inventoryData || inventoryData.length === 0) {
        logger.warn('No inventory data available for simulation');
        return { results: {} };
      }
      
      // Define scenarios
      const scenarios = parameters.scenarios || [
        {
          name: 'baseline',
          demandChange: 0, 
          description: 'Current demand patterns'
        },
        {
          name: 'highGrowth',
          demandChange: 0.25,
          description: '25% increase in demand'
        },
        {
          name: 'lowGrowth',
          demandChange: -0.15,
          description: '15% decrease in demand'
        },
        {
          name: 'seasonal',
          demandChange: 0.5,
          description: '50% seasonal demand increase'
        }
      ];
      
      // Call LLM server with scenarios
      const response = await axios.post(`${LLM_SERVER_URL}/api/predictions/simulate`, {
        items: inventoryData,
        scenarios
      });
      
      if (!response.data || !response.data.results) {
        logger.error('Invalid response from LLM server for simulations');
        return { results: {} };
      }
      
      logger.info(`Received simulation results with ${Object.keys(response.data.results).length} scenarios`);
      return response.data;
    } catch (error) {
      logger.error(`Error running inventory simulations: ${error.message}`);
      // Return empty results rather than throwing if LLM server is unavailable
      return { results: {} };
    }
  }
  
  /**
   * Get AI-powered insights for inventory management
   * @returns {Promise<Object>} AI insights
   */
  async getAIInsights() {
    try {
      logger.info('Requesting AI insights from LLM server');
      
      // Prepare inventory and sales data
      const inventoryData = await this._prepareInventoryData();
      const salesData = await this._prepareSalesData();
      
      if (inventoryData.length === 0) {
        return { insights: ["Not enough inventory data for AI analysis"] };
      }
      
      // Create the endpoint for insights
      const endpoint = `${LLM_SERVER_URL}/api/predictions/insights`;
      
      // Call LLM server to get insights
      const response = await axios.post(endpoint, {
        inventory: inventoryData,
        sales: salesData
      }, {
        timeout: 30000 // Increased timeout for AI processing
      });
      
      if (!response.data || !response.data.insights) {
        logger.warn('Invalid response format from LLM server');
        return { 
          insights: ["Unable to generate insights - invalid response from AI server"]
        };
      }
      
      logger.info(`Received ${response.data.insights.length} insights from LLM server`);
      return response.data;
      
    } catch (error) {
      logger.error(`Error getting AI insights: ${error.message}`);
      return { 
        insights: [
          "Unable to connect to AI service",
          "Check that the LLM server is running and accessible"
        ]
      };
    }
  }
  
  /**
   * Get sample data for development or testing
   * @returns {Promise<Object>} Sample data
   */
  async getSampleData() {
    try {
      logger.info('Fetching sample data from LLM server');
      
      const response = await axios.get(`${LLM_SERVER_URL}/api/predictions/data-sample`);
      
      if (!response.data) {
        logger.error('Invalid response when fetching sample data');
        return {};
      }
      
      return response.data;
    } catch (error) {
      logger.error(`Error getting sample data: ${error.message}`);
      return { error: "Unable to fetch sample data", message: error.message };
    }
  }
  
  /**
   * Prepare inventory data for AI analysis
   * @private
   * @returns {Promise<Array>} Prepared inventory data
   */
  async _prepareInventoryData() {
    try {
      logger.info('Preparing inventory data for AI processing');
      
      // Get products with variants from database
      const products = await Product.find().lean();
      
      if (!products || products.length === 0) {
        logger.warn('No products found in database');
        return [];
      }
      
      // Get inventory analytics data
      const analyticsData = await InventoryAnalytics.find().lean();
      
      // Create a map for quick lookup
      const analyticsMap = new Map();
      analyticsData.forEach(item => {
        analyticsMap.set(item.variantId.toString(), item);
      });
      
      // Prepare data format for AI processing
      const prepared = [];
      
      // Process each product and its variants
      products.forEach(product => {
        const productVariants = product.variants || [];
        
        productVariants.forEach(variant => {
          const variantId = variant.id.toString();
          const analytics = analyticsMap.get(variantId);
          
          if (analytics) {
            // Get sales history data from analytics
            const salesHistory = analytics.salesHistory || [];
            
            // Prepare data structure for AI
            const preparedItem = {
              id: variantId,
              productId: product._id.toString(),
              name: `${product.title} - ${variant.title || 'Default'}`,
              sku: variant.sku || 'unknown',
              quantity: variant.inventoryQuantity || 0,
              price: variant.price || 0,
              cost: variant.cost || (variant.price * 0.5), // Estimated cost if not available
              category: product.productType || 'Uncategorized',
              tags: product.tags || [],
              vendor: product.vendor || 'Unknown',
              leadTime: analytics.leadTime || 14, // Default lead time in days
              reorderPoint: analytics.reorderPoint || 5,
              salesVelocity: analytics.salesVelocity?.daily || 0,
              salesHistory: salesHistory,
              orderCost: 25, // Default fixed order cost
              holdingCost: 0.2 // Default holding cost (20% of item value)
            };
            
            prepared.push(preparedItem);
          }
        });
      });
      
      logger.info(`Prepared data for ${prepared.length} product variants for AI processing`);
      
      return prepared;
    } catch (error) {
      logger.error(`Error preparing inventory data: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Prepare sales data for AI analysis
   * @private
   * @returns {Promise<Array>} Prepared sales data
   */
  async _prepareSalesData() {
    try {
      // Get recent orders from database
      const orders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      
      if (!orders || orders.length === 0) {
        logger.warn('No orders found in database');
        return [];
      }
      
      // Format order data for AI processing
      const salesData = orders.map(order => ({
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        date: order.createdAt,
        total: order.totalPrice,
        lineItems: (order.lineItems || []).map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price
        }))
      }));
      
      logger.info(`Prepared ${salesData.length} orders for AI analysis`);
      return salesData;
      
    } catch (error) {
      logger.error(`Error preparing sales data: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Save predictions to database
   * @private
   * @param {Array} predictions - AI generated predictions
   * @returns {Promise<void>}
   */
  async _savePredictions(predictions) {
    try {
      logger.info(`Saving ${predictions.length} predictions to database`);
      
      for (const prediction of predictions) {
        const variantId = prediction.productId;
        
        if (!variantId) {
          logger.warn('Prediction missing productId, skipping');
          continue;
        }
        
        // Find existing analytics record
        let analytics = await InventoryAnalytics.findOne({ variantId });
        
        if (!analytics) {
          logger.warn(`No analytics found for variant ${variantId}, skipping`);
          continue;
        }
        
        // Update with predictions
        analytics.salesVelocity = {
          daily: prediction.avgDailySales || 0,
          weekly: (prediction.avgDailySales || 0) * 7,
          monthly: (prediction.avgDailySales || 0) * 30
        };
        
        analytics.restockRecommendations = {
          recommendedQuantity: prediction.recommendedOrderQuantity || 0,
          recommendedDate: prediction.restockDate ? new Date(prediction.restockDate) : null,
          daysUntilOutOfStock: prediction.daysUntilStockout || 0,
          confidence: prediction.confidenceScore || 0,
          urgency: prediction.restockUrgency || 'low'
        };
        
        analytics.lastUpdated = new Date();
        
        await analytics.save();
      }
      
      logger.info('Successfully saved predictions to database');
    } catch (error) {
      logger.error(`Error saving predictions to database: ${error.message}`);
      // Don't throw error here, just log it
    }
  }
}

// Create and export a singleton instance
const aiService = new AIService();
export default aiService;
export { aiService };