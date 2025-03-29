import express from 'express';
import * as analyticsController from '../controllers/analyticsController.js';

const router = express.Router();

// Get restock recommendations
router.get('/recommendations', analyticsController.getRestockRecommendations);

// Get sales trends
router.get('/sales/trends', analyticsController.getSalesTrends);

// Get top-selling products
router.get('/sales/top-products', analyticsController.getTopSellingProducts);

// Get slow-moving products
router.get('/sales/slow-products', analyticsController.getSlowMovingProducts);

// Generate inventory health report
router.get('/report/inventory-health', analyticsController.getInventoryHealthReport);

// Generate sales performance report
router.get('/report/sales-performance', analyticsController.getSalesPerformanceReport);

export default router;