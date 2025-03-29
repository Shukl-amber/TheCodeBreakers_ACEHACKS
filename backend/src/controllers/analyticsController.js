import logger from '../utils/logger.js';
import * as aiService from '../services/aiService.js';
import * as analyticsService from '../services/analyticsService.js';

/**
 * Get inventory analytics
 */
export const getInventoryAnalytics = async (req, res) => {
  try {
    logger.info('Fetching inventory analytics data');
    const analytics = await analyticsService.getInventoryAnalytics();
    res.status(200).json(analytics);
  } catch (error) {
    logger.error(`Error fetching inventory analytics: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch inventory analytics' });
  }
};

/**
 * Get AI-powered restock recommendations
 */
export const getRestockRecommendations = async (req, res) => {
  try {
    logger.info('Fetching AI-powered restock recommendations');
    const recommendations = await aiService.getRestockRecommendations();
    res.status(200).json({
      success: true,
      data: recommendations,
      count: recommendations.length
    });
  } catch (error) {
    logger.error(`Error getting restock recommendations: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get restock recommendations',
      message: error.message 
    });
  }
};

/**
 * Run inventory simulations with different scenarios
 */
export const runInventorySimulations = async (req, res) => {
  try {
    logger.info('Running inventory simulations with AI');
    
    // Get scenario parameters from request body
    const parameters = req.body;
    
    // Run simulations
    const simulations = await aiService.runInventorySimulations(parameters);
    
    res.status(200).json({
      success: true,
      data: simulations
    });
  } catch (error) {
    logger.error(`Error running inventory simulations: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to run inventory simulations',
      message: error.message 
    });
  }
};

/**
 * Get sales forecast for a specific period
 */
export const getSalesForecast = async (req, res) => {
  try {
    logger.info('Generating sales forecast');
    
    // Get forecast parameters
    const { period = '30d', productId } = req.query;
    
    // Get forecast from analytics service
    const forecast = await analyticsService.getSalesForecast(period, productId);
    
    res.status(200).json({
      success: true,
      data: forecast
    });
  } catch (error) {
    logger.error(`Error getting sales forecast: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get sales forecast',
      message: error.message 
    });
  }
};

/**
 * Get sample data for development/testing
 */
export const getSampleData = async (req, res) => {
  try {
    logger.info('Fetching sample data from AI service');
    const sampleData = await aiService.getSampleData();
    res.status(200).json({
      success: true,
      data: sampleData
    });
  } catch (error) {
    logger.error(`Error fetching sample data: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch sample data',
      message: error.message 
    });
  }
};