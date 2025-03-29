import shopify from '../config/shopifyConfig.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import InventoryAnalytics from '../models/InventoryAnalytics.js';
import logger from '../utils/logger.js';
import { ApiError } from '../utils/errorHandler.js';

/**
 * Check and validate Shopify API connection
 * @returns {Object} Shopify shop information
 */
export const checkConnection = async () => {
  try {
    const shop = await shopify.shop.get();
    logger.info(`Connected to Shopify shop: ${shop.name}`);
    return shop;
  } catch (error) {
    logger.error('Failed to connect to Shopify API', error);
    throw new ApiError(500, 'Failed to connect to Shopify API: ' + error.message);
  }
};

/**
 * Sync products from Shopify to the database
 * @returns {Object} Sync results
 */
export const syncProducts = async () => {
  try {
    let params = { limit: 250 };
    let allProducts = [];
    let hasNextPage = true;
    
    logger.info('Starting product sync from Shopify');
    
    // Paginate through all products
    while (hasNextPage) {
      const products = await shopify.product.list(params);
      allProducts = allProducts.concat(products);
      
      // Check if there are more pages
      hasNextPage = products.length === 250;
      if (hasNextPage && products.length > 0) {
        params.since_id = products[products.length - 1].id;
      }
    }
    
    logger.info(`Found ${allProducts.length} products in Shopify`);
    
    // Process and save each product
    const savedProducts = [];
    for (const shopifyProduct of allProducts) {
      // Convert Shopify product to our schema
      const product = {
        shopifyId: shopifyProduct.id.toString(),
        title: shopifyProduct.title,
        description: shopifyProduct.body_html,
        vendor: shopifyProduct.vendor,
        productType: shopifyProduct.product_type,
        tags: shopifyProduct.tags.split(',').map(tag => tag.trim()),
        variants: shopifyProduct.variants.map(variant => ({
          shopifyVariantId: variant.id.toString(),
          title: variant.title,
          sku: variant.sku,
          price: parseFloat(variant.price),
          inventoryQuantity: variant.inventory_quantity,
          inventoryItem: {
            shopifyInventoryItemId: variant.inventory_item_id.toString()
          }
        })),
        lastUpdated: new Date()
      };
      
      // Update or create the product
      const savedProduct = await Product.findOneAndUpdate(
        { shopifyId: product.shopifyId },
        product,
        { new: true, upsert: true }
      );
      
      // Update or create inventory analytics for this product
      for (const variant of savedProduct.variants) {
        await updateInventoryAnalytics(savedProduct, variant);
      }
      
      savedProducts.push(savedProduct);
    }
    
    logger.info(`Successfully synced ${savedProducts.length} products from Shopify`);
    
    return {
      success: true,
      count: savedProducts.length,
      message: `Successfully synced ${savedProducts.length} products from Shopify`
    };
  } catch (error) {
    logger.error('Error syncing products from Shopify', error);
    throw new ApiError(500, 'Error syncing products from Shopify: ' + error.message);
  }
};

/**
 * Sync orders from Shopify to the database
 * @param {Number} days - Number of days of orders to sync (default: all)
 * @returns {Object} Sync results
 */
export const syncOrders = async (days = null) => {
  try {
    let params = { 
      limit: 250,
      status: 'any'
    };
    
    // Add date filter if days parameter is provided
    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      params.created_at_min = startDate.toISOString();
    }
    
    let allOrders = [];
    let hasNextPage = true;
    
    logger.info(`Starting order sync from Shopify${days ? ` for last ${days} days` : ''}`);
    
    // Paginate through all orders
    while (hasNextPage) {
      const orders = await shopify.order.list(params);
      allOrders = allOrders.concat(orders);
      
      // Check if there are more pages
      hasNextPage = orders.length === 250;
      if (hasNextPage && orders.length > 0) {
        params.since_id = orders[orders.length - 1].id;
      }
    }
    
    logger.info(`Found ${allOrders.length} orders in Shopify`);
    
    // Process and save each order
    const savedOrders = [];
    for (const shopifyOrder of allOrders) {
      // Convert Shopify order to our schema
      const order = {
        shopifyId: shopifyOrder.id.toString(),
        orderNumber: shopifyOrder.name,
        email: shopifyOrder.email,
        createdAt: new Date(shopifyOrder.created_at),
        updatedAt: new Date(shopifyOrder.updated_at),
        processedAt: shopifyOrder.processed_at ? new Date(shopifyOrder.processed_at) : null,
        customer: shopifyOrder.customer ? {
          shopifyCustomerId: shopifyOrder.customer.id.toString(),
          firstName: shopifyOrder.customer.first_name,
          lastName: shopifyOrder.customer.last_name,
          email: shopifyOrder.customer.email
        } : null,
        financialStatus: shopifyOrder.financial_status,
        fulfillmentStatus: shopifyOrder.fulfillment_status,
        totalPrice: parseFloat(shopifyOrder.total_price),
        subtotalPrice: parseFloat(shopifyOrder.subtotal_price),
        totalDiscounts: parseFloat(shopifyOrder.total_discounts),
        totalTax: parseFloat(shopifyOrder.total_tax),
        currency: shopifyOrder.currency,
        lineItems: shopifyOrder.line_items.map(item => ({
          shopifyLineItemId: item.id.toString(),
          productId: item.product_id ? item.product_id.toString() : null,
          variantId: item.variant_id ? item.variant_id.toString() : null,
          title: item.title,
          variantTitle: item.variant_title,
          quantity: item.quantity,
          price: parseFloat(item.price),
          sku: item.sku
        })),
        shippingAddress: shopifyOrder.shipping_address ? {
          address1: shopifyOrder.shipping_address.address1,
          address2: shopifyOrder.shipping_address.address2,
          city: shopifyOrder.shipping_address.city,
          province: shopifyOrder.shipping_address.province,
          country: shopifyOrder.shipping_address.country,
          zip: shopifyOrder.shipping_address.zip
        } : null,
        lastUpdated: new Date()
      };
      
      // Update or create the order
      const savedOrder = await Order.findOneAndUpdate(
        { shopifyId: order.shopifyId },
        order,
        { new: true, upsert: true }
      );
      
      savedOrders.push(savedOrder);
    }
    
    logger.info(`Successfully synced ${savedOrders.length} orders from Shopify`);
    
    return {
      success: true,
      count: savedOrders.length,
      message: `Successfully synced ${savedOrders.length} orders from Shopify`
    };
  } catch (error) {
    logger.error('Error syncing orders from Shopify', error);
    throw new ApiError(500, 'Error syncing orders from Shopify: ' + error.message);
  }
};

/**
 * Update inventory analytics for a product variant
 * @param {Object} product - The product document
 * @param {Object} variant - The product variant
 * @returns {Object} Updated inventory analytics
 */
async function updateInventoryAnalytics(product, variant) {
  try {
    const analytics = await InventoryAnalytics.findOneAndUpdate(
      { 
        shopifyProductId: product.shopifyId,
        variantId: variant.shopifyVariantId 
      },
      { 
        $setOnInsert: {
          productId: product._id,
          title: product.title,
          sku: variant.sku,
          lowStockThreshold: 5
        },
        $push: {
          historicalQuantities: {
            date: new Date(),
            quantity: variant.inventoryQuantity
          }
        },
        $set: {
          stockStatus: variant.inventoryQuantity <= 0 ? 'Out of Stock' :
                      variant.inventoryQuantity <= 5 ? 'Low Stock' : 'In Stock',
          lastUpdated: new Date()
        }
      },
      { new: true, upsert: true }
    );
    
    return analytics;
  } catch (error) {
    logger.error(`Error updating inventory analytics for product ${product.shopifyId}, variant ${variant.shopifyVariantId}`, error);
    throw error;
  }
}

/**
 * Get a specific product from Shopify
 * @param {String} productId - Shopify Product ID
 * @returns {Object} Shopify product
 */
export const getShopifyProduct = async (productId) => {
  try {
    const product = await shopify.product.get(productId);
    return product;
  } catch (error) {
    logger.error(`Error fetching product ${productId} from Shopify`, error);
    throw new ApiError(404, `Product not found: ${productId}`);
  }
};

/**
 * Get inventory levels for a specific inventory item
 * @param {String} inventoryItemId - Shopify Inventory Item ID
 * @returns {Object} Inventory level information
 */
export const getInventoryLevel = async (inventoryItemId) => {
  try {
    const inventoryLevels = await shopify.inventoryLevel.list({
      inventory_item_ids: inventoryItemId
    });
    return inventoryLevels;
  } catch (error) {
    logger.error(`Error fetching inventory level for item ${inventoryItemId}`, error);
    throw new ApiError(500, `Error fetching inventory level: ${error.message}`);
  }
};

export default {
  checkConnection,
  syncProducts,
  syncOrders,
  getShopifyProduct,
  getInventoryLevel
};