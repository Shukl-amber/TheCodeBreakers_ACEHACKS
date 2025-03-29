import express from 'express';
import * as shopifyController from '../controllers/shopifyController.js';

const router = express.Router();

// Connect to Shopify store
router.post('/connect', shopifyController.connectShopify);

// Sync products from Shopify
router.get('/sync/products', shopifyController.syncProducts);

// Sync orders from Shopify
router.get('/sync/orders', shopifyController.syncOrders);

// Fetch all synced products
router.get('/products', shopifyController.getProducts);

// Fetch all synced orders
router.get('/orders', shopifyController.getOrders);

// Sync all data (products and orders)
router.get('/sync/all', shopifyController.syncAllData);

export default router;