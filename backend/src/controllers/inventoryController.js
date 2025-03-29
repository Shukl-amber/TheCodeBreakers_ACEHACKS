import Product from '../models/Product.js';
import InventoryAnalytics from '../models/InventoryAnalytics.js';

// Get inventory dashboard data
export const getDashboardData = async (req, res) => {
  try {
    // Get total product count
    const totalProducts = await Product.countDocuments();
    
    // Get total variant count
    const products = await Product.find();
    const totalVariants = products.reduce((sum, product) => sum + product.variants.length, 0);
    
    // Get low stock products count
    const lowStockAnalytics = await InventoryAnalytics.countDocuments({ stockStatus: 'Low Stock' });
    
    // Get out of stock products count
    const outOfStockAnalytics = await InventoryAnalytics.countDocuments({ stockStatus: 'Out of Stock' });
    
    // Get inventory value
    let totalInventoryValue = 0;
    for (const product of products) {
      for (const variant of product.variants) {
        totalInventoryValue += variant.price * variant.inventoryQuantity;
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        totalVariants,
        lowStockCount: lowStockAnalytics,
        outOfStockCount: outOfStockAnalytics,
        totalInventoryValue: parseFloat(totalInventoryValue.toFixed(2)),
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
};

// Get low stock products
export const getLowStockProducts = async (req, res) => {
  try {
    // Find inventory analytics with low stock status
    const lowStockAnalytics = await InventoryAnalytics.find({ stockStatus: 'Low Stock' })
      .sort({ lastUpdated: -1 });
    
    // Map to include product details
    const lowStockProducts = [];
    for (const analytics of lowStockAnalytics) {
      const product = await Product.findOne({ shopifyId: analytics.shopifyProductId });
      
      if (product) {
        const variant = product.variants.find(v => 
          v.shopifyVariantId === analytics.variantId
        );
        
        if (variant) {
          lowStockProducts.push({
            productId: product._id,
            shopifyProductId: product.shopifyId,
            variantId: variant.shopifyVariantId,
            title: product.title,
            variant: variant.title,
            sku: variant.sku,
            currentStock: variant.inventoryQuantity,
            lowStockThreshold: analytics.lowStockThreshold,
            price: variant.price
          });
        }
      }
    }
    
    res.status(200).json({
      success: true,
      count: lowStockProducts.length,
      data: lowStockProducts
    });
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock products',
      error: error.message
    });
  }
};

// Get out of stock products
export const getOutOfStockProducts = async (req, res) => {
  try {
    // Find inventory analytics with out of stock status
    const outOfStockAnalytics = await InventoryAnalytics.find({ stockStatus: 'Out of Stock' })
      .sort({ lastUpdated: -1 });
    
    // Map to include product details
    const outOfStockProducts = [];
    for (const analytics of outOfStockAnalytics) {
      const product = await Product.findOne({ shopifyId: analytics.shopifyProductId });
      
      if (product) {
        const variant = product.variants.find(v => 
          v.shopifyVariantId === analytics.variantId
        );
        
        if (variant) {
          outOfStockProducts.push({
            productId: product._id,
            shopifyProductId: product.shopifyId,
            variantId: variant.shopifyVariantId,
            title: product.title,
            variant: variant.title,
            sku: variant.sku,
            price: variant.price,
            lastInStock: analytics.historicalQuantities
              .filter(hq => hq.quantity > 0)
              .sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date || null
          });
        }
      }
    }
    
    res.status(200).json({
      success: true,
      count: outOfStockProducts.length,
      data: outOfStockProducts
    });
  } catch (error) {
    console.error('Error fetching out of stock products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch out of stock products',
      error: error.message
    });
  }
};

// Get specific product inventory details
export const getProductInventory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find product by ID or Shopify ID
    const product = await Product.findOne({
      $or: [
        { _id: id },
        { shopifyId: id }
      ]
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Get inventory analytics for each variant
    const variantAnalytics = [];
    for (const variant of product.variants) {
      const analytics = await InventoryAnalytics.findOne({
        shopifyProductId: product.shopifyId,
        variantId: variant.shopifyVariantId
      });
      
      if (analytics) {
        variantAnalytics.push({
          variantId: variant.shopifyVariantId,
          variantTitle: variant.title,
          sku: variant.sku,
          price: variant.price,
          currentStock: variant.inventoryQuantity,
          stockStatus: analytics.stockStatus,
          lowStockThreshold: analytics.lowStockThreshold,
          historicalData: analytics.historicalQuantities
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 30), // Last 30 data points
          salesVelocity: analytics.salesVelocity || null,
          restockRecommendations: analytics.restockRecommendations || null
        });
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        product: {
          id: product._id,
          shopifyId: product.shopifyId,
          title: product.title,
          description: product.description,
          vendor: product.vendor,
          productType: product.productType,
          tags: product.tags,
          variantsCount: product.variants.length,
          lastUpdated: product.lastUpdated
        },
        inventory: variantAnalytics
      }
    });
  } catch (error) {
    console.error('Error fetching product inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product inventory',
      error: error.message
    });
  }
};