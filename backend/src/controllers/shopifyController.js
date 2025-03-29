import shopify from '../config/shopifyConfig.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import InventoryAnalytics from '../models/InventoryAnalytics.js';

// Connect to Shopify store
export const connectShopify = async (req, res) => {
  try {
    // Verify connection to Shopify API
    const shop = await shopify.shop.get();
    
    res.status(200).json({
      success: true,
      message: 'Successfully connected to Shopify store',
      data: {
        shop: shop.name,
        domain: shop.domain,
        email: shop.email
      }
    });
  } catch (error) {
    console.error('Error connecting to Shopify:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to Shopify store',
      error: error.message
    });
  }
};

// Sync products from Shopify
export const syncProducts = async (req, res) => {
  try {
    let params = { limit: 250 };
    let allProducts = [];
    let hasNextPage = true;
    
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
        await InventoryAnalytics.findOneAndUpdate(
          { 
            shopifyProductId: savedProduct.shopifyId,
            variantId: variant.shopifyVariantId 
          },
          { 
            $setOnInsert: {
              productId: savedProduct._id,
              title: savedProduct.title,
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
      }
      
      savedProducts.push(savedProduct);
    }
    
    res.status(200).json({
      success: true,
      message: `Successfully synced ${savedProducts.length} products from Shopify`,
      count: savedProducts.length
    });
  } catch (error) {
    console.error('Error syncing products from Shopify:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync products from Shopify',
      error: error.message
    });
  }
};

// Sync orders from Shopify
export const syncOrders = async (req, res) => {
  try {
    let params = { 
      limit: 250,
      status: 'any'
    };
    let allOrders = [];
    let hasNextPage = true;
    
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
    
    res.status(200).json({
      success: true,
      message: `Successfully synced ${savedOrders.length} orders from Shopify`,
      count: savedOrders.length
    });
  } catch (error) {
    console.error('Error syncing orders from Shopify:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync orders from Shopify',
      error: error.message
    });
  }
};

// Get all synced products
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

// Get all synced orders
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// Sync all data (products and orders)
export const syncAllData = async (req, res) => {
  try {
    // We'll use Promise.all to run both sync operations in parallel
    const [productsResult, ordersResult] = await Promise.all([
      syncProductsHelper(),
      syncOrdersHelper()
    ]);
    
    res.status(200).json({
      success: true,
      message: 'Successfully synced all data from Shopify',
      data: {
        products: productsResult,
        orders: ordersResult
      }
    });
  } catch (error) {
    console.error('Error syncing all data from Shopify:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync all data from Shopify',
      error: error.message
    });
  }
};

// Helper function to sync products (used by syncAllData)
async function syncProductsHelper() {
  let params = { limit: 250 };
  let allProducts = [];
  let hasNextPage = true;
  
  while (hasNextPage) {
    const products = await shopify.product.list(params);
    allProducts = allProducts.concat(products);
    
    hasNextPage = products.length === 250;
    if (hasNextPage && products.length > 0) {
      params.since_id = products[products.length - 1].id;
    }
  }
  
  const savedProducts = [];
  for (const shopifyProduct of allProducts) {
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
    
    const savedProduct = await Product.findOneAndUpdate(
      { shopifyId: product.shopifyId },
      product,
      { new: true, upsert: true }
    );
    
    // Update inventory analytics
    for (const variant of savedProduct.variants) {
      await InventoryAnalytics.findOneAndUpdate(
        { 
          shopifyProductId: savedProduct.shopifyId,
          variantId: variant.shopifyVariantId 
        },
        { 
          $setOnInsert: {
            productId: savedProduct._id,
            title: savedProduct.title,
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
    }
    
    savedProducts.push(savedProduct);
  }
  
  return {
    count: savedProducts.length,
    message: `Successfully synced ${savedProducts.length} products`
  };
}

// Helper function to sync orders (used by syncAllData)
async function syncOrdersHelper() {
  let params = { 
    limit: 250,
    status: 'any'
  };
  let allOrders = [];
  let hasNextPage = true;
  
  while (hasNextPage) {
    const orders = await shopify.order.list(params);
    allOrders = allOrders.concat(orders);
    
    hasNextPage = orders.length === 250;
    if (hasNextPage && orders.length > 0) {
      params.since_id = orders[orders.length - 1].id;
    }
  }
  
  const savedOrders = [];
  for (const shopifyOrder of allOrders) {
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
    
    const savedOrder = await Order.findOneAndUpdate(
      { shopifyId: order.shopifyId },
      order,
      { new: true, upsert: true }
    );
    
    savedOrders.push(savedOrder);
  }
  
  return {
    count: savedOrders.length,
    message: `Successfully synced ${savedOrders.length} orders`
  };
}