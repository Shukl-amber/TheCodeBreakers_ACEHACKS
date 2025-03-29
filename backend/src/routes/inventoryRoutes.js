import express from 'express';
import * as inventoryController from '../controllers/inventoryController.js';

const router = express.Router();

// Get inventory dashboard data
router.get('/dashboard', inventoryController.getDashboardData);

// Get low stock products
router.get('/low-stock', inventoryController.getLowStockProducts);

// Get out of stock products
router.get('/out-of-stock', inventoryController.getOutOfStockProducts);

// Get specific product inventory details
router.get('/product/:id', inventoryController.getProductInventory);

export default router;