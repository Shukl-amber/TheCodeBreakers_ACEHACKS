import express from 'express';
import * as analyticsController from '../controllers/analyticsController.js';

const router = express.Router();

/**
 * @route   GET /api/analytics/inventory
 * @desc    Get inventory analytics data
 * @access  Private
 */
router.get('/inventory', analyticsController.getInventoryAnalytics);

/**
 * @route   GET /api/analytics/restock-recommendations
 * @desc    Get AI-powered restock recommendations
 * @access  Private
 */
router.get('/restock-recommendations', analyticsController.getRestockRecommendations);

/**
 * @route   POST /api/analytics/inventory-simulations
 * @desc    Run inventory simulations with different scenarios
 * @access  Private
 */
router.post('/inventory-simulations', analyticsController.runInventorySimulations);

/**
 * @route   GET /api/analytics/sales-forecast
 * @desc    Get sales forecast for a specific period
 * @access  Private
 */
router.get('/sales-forecast', analyticsController.getSalesForecast);

/**
 * @route   GET /api/analytics/sample-data
 * @desc    Get sample data for development/testing
 * @access  Private
 */
router.get('/sample-data', analyticsController.getSampleData);

export default router;