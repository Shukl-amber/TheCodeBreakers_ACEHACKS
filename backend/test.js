import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/Product.js';
import Order from './src/models/Order.js';
import InventoryAnalytics from './src/models/InventoryAnalytics.js';
import analyticsService from './src/services/analyticsService.js';
import shopifyService from './src/services/shopifyService.js';
import logger from './src/utils/logger.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB successfully');
    return true;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    return false;
  }
}

// Test MongoDB connection
async function testDatabaseConnection() {
  logger.info('Testing database connection...');
  const connected = await connectToDatabase();
  if (connected) {
    logger.info('✅ Database connection successful');
  } else {
    logger.error('❌ Database connection failed');
  }
  return connected;
}

// Test Shopify connection
async function testShopifyConnection() {
  logger.info('Testing Shopify API connection...');
  try {
    const shop = await shopifyService.checkConnection();
    logger.info(`✅ Shopify connection successful. Connected to shop: ${shop.name}`);
    return true;
  } catch (error) {
    logger.error('❌ Shopify connection failed', error);
    return false;
  }
}

// Test data models by counting documents
async function testDataModels() {
  logger.info('Testing data models...');
  try {
    const productCount = await Product.countDocuments();
    const orderCount = await Order.countDocuments();
    const analyticsCount = await InventoryAnalytics.countDocuments();
    
    logger.info(`Products in database: ${productCount}`);
    logger.info(`Orders in database: ${orderCount}`);
    logger.info(`Inventory analytics entries: ${analyticsCount}`);
    
    return { productCount, orderCount, analyticsCount };
  } catch (error) {
    logger.error('Error testing data models', error);
    return null;
  }
}

// Test product sync functionality
async function testProductSync() {
  logger.info('Testing product sync functionality...');
  try {
    const beforeCount = await Product.countDocuments();
    const syncResult = await shopifyService.syncProducts();
    const afterCount = await Product.countDocuments();
    
    logger.info(`Before sync: ${beforeCount} products`);
    logger.info(`After sync: ${afterCount} products`);
    logger.info(`Sync result: ${syncResult.success ? 'Success' : 'Failed'}`);
    
    return syncResult;
  } catch (error) {
    logger.error('Error testing product sync', error);
    return { success: false, error: error.message };
  }
}

// Test analytics service
async function testAnalyticsService() {
  logger.info('Testing analytics service functionality...');
  try {
    // Test inventory analytics update
    const updateResult = await analyticsService.updateInventoryAnalytics();
    logger.info(`Analytics update result: ${updateResult.success ? 'Success' : 'Failed'}`);
    
    // Test data preparation for AI
    const dataResult = await analyticsService.prepareInventoryDataForAI();
    logger.info(`Data preparation for AI: ${dataResult.success ? 'Success' : 'Failed'} (${dataResult.data?.length || 0} items prepared)`);
    
    return { updateResult, dataResult };
  } catch (error) {
    logger.error('Error testing analytics service', error);
    return { success: false, error: error.message };
  }
}

// Run test scenario
async function runTestScenario() {
  logger.info('====== STARTING TEST SCENARIO ======');
  
  // Step 1: Test database connection
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    logger.error('Cannot proceed with tests. Database connection failed.');
    return;
  }
  
  // Step 2: Test Shopify connection
  const shopifyConnected = await testShopifyConnection();
  if (!shopifyConnected) {
    logger.warn('Shopify connection failed, but continuing with other tests...');
  }
  
  // Step 3: Check existing data
  logger.info('Checking existing data in database...');
  const existingData = await testDataModels();
  
  // Step 4: Test product sync if Shopify is connected
  if (shopifyConnected) {
    await testProductSync();
  } else {
    logger.warn('Skipping product sync test due to failed Shopify connection');
  }
  
  // Step 5: Test analytics service
  await testAnalyticsService();
  
  // Step 6: Verify data after tests
  logger.info('Verifying data after tests...');
  const finalData = await testDataModels();
  
  logger.info('====== TEST SCENARIO COMPLETED ======');
  
  // Clean up
  await mongoose.connection.close();
  logger.info('Database connection closed');
}

// Run tests
runTestScenario();