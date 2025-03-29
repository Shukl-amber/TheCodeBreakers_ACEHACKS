import Product from '../models/Product.js';
import Order from '../models/Order.js';
import InventoryAnalytics from '../models/InventoryAnalytics.js';

// Get inventory data for items that need restocking
export const getRestockRecommendations = async (req, res) => {
  try {
    // Find products that need restocking (either low stock or out of stock)
    const analytics = await InventoryAnalytics.find({
      $or: [
        { stockStatus: 'Low Stock' },
        { stockStatus: 'Out of Stock' }
      ]
    }).sort({ lastUpdated: -1 });
    
    // Get full product details for each item
    const restockItems = [];
    for (const item of analytics) {
      const product = await Product.findOne({ shopifyId: item.shopifyProductId });
      
      if (product) {
        const variant = product.variants.find(v => v.shopifyVariantId === item.variantId);
        
        if (variant) {
          restockItems.push({
            productId: product._id,
            shopifyProductId: product.shopifyId,
            variantId: variant.shopifyVariantId,
            title: product.title,
            variant: variant.title,
            sku: variant.sku,
            currentStock: variant.inventoryQuantity,
            lowStockThreshold: item.lowStockThreshold,
            stockStatus: item.stockStatus,
            price: variant.price,
            // Include any existing recommendations from external processing
            recommendation: item.restockRecommendations,
            salesVelocity: item.salesVelocity
          });
        }
      }
    }
    
    res.status(200).json({
      success: true,
      count: restockItems.length,
      data: restockItems
    });
  } catch (error) {
    console.error('Error fetching restock items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restock items',
      error: error.message
    });
  }
};

// Get sales trends
export const getSalesTrends = async (req, res) => {
  try {
    // Get date range from query params or default to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (req.query.days ? parseInt(req.query.days) : 30));
    
    // Find orders within date range
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ createdAt: 1 });
    
    // Aggregate sales by day
    const dailySales = {};
    const productSales = {};
    
    for (const order of orders) {
      // Format date as YYYY-MM-DD for grouping
      const dateStr = order.createdAt.toISOString().split('T')[0];
      
      // Initialize if not exists
      if (!dailySales[dateStr]) {
        dailySales[dateStr] = {
          date: dateStr,
          orderCount: 0,
          revenue: 0,
          units: 0
        };
      }
      
      // Add order to daily aggregation
      dailySales[dateStr].orderCount += 1;
      dailySales[dateStr].revenue += order.totalPrice;
      
      // Process line items for product sales and units
      for (const item of order.lineItems) {
        dailySales[dateStr].units += item.quantity;
        
        // Track product sales
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            productId: item.productId,
            title: item.title,
            totalQuantity: 0,
            totalRevenue: 0
          };
        }
        
        productSales[item.productId].totalQuantity += item.quantity;
        productSales[item.productId].totalRevenue += (item.price * item.quantity);
      }
    }
    
    // Convert to array and ensure all dates in range are included
    const salesByDay = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      salesByDay.push(
        dailySales[dateStr] || { 
          date: dateStr, 
          orderCount: 0, 
          revenue: 0, 
          units: 0 
        }
      );
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    res.status(200).json({
      success: true,
      data: {
        totalOrders: orders.length,
        totalRevenue: Object.values(dailySales).reduce((sum, day) => sum + day.revenue, 0),
        totalUnits: Object.values(dailySales).reduce((sum, day) => sum + day.units, 0),
        salesByDay,
        topProducts: Object.values(productSales)
          .sort((a, b) => b.totalQuantity - a.totalQuantity)
          .slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Error fetching sales trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales trends',
      error: error.message
    });
  }
};

// Get top-selling products
export const getTopSellingProducts = async (req, res) => {
  try {
    // Get date range from query params or default to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (req.query.days ? parseInt(req.query.days) : 30));
    
    // Find orders within date range
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Aggregate product sales
    const productSales = {};
    
    for (const order of orders) {
      for (const item of order.lineItems) {
        const key = item.productId ? item.productId : `variant_${item.variantId}`;
        
        if (!productSales[key]) {
          productSales[key] = {
            productId: item.productId,
            variantId: item.variantId,
            title: item.title,
            variantTitle: item.variantTitle,
            sku: item.sku,
            totalQuantity: 0,
            totalRevenue: 0,
            orderCount: 0
          };
        }
        
        productSales[key].totalQuantity += item.quantity;
        productSales[key].totalRevenue += (item.price * item.quantity);
        productSales[key].orderCount += 1;
      }
    }
    
    // Sort products by quantity sold
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.totalQuantity - a.totalQuantity);
    
    // Get current inventory for each product
    for (const product of topProducts) {
      if (product.productId) {
        const inventoryProduct = await Product.findOne({ shopifyId: product.productId });
        
        if (inventoryProduct) {
          const variant = product.variantId 
            ? inventoryProduct.variants.find(v => v.shopifyVariantId === product.variantId)
            : inventoryProduct.variants[0];
            
          if (variant) {
            product.currentStock = variant.inventoryQuantity;
            product.stockStatus = variant.inventoryQuantity <= 0 ? 'Out of Stock' :
                                 variant.inventoryQuantity <= 5 ? 'Low Stock' : 'In Stock';
          }
        }
      }
    }
    
    res.status(200).json({
      success: true,
      count: topProducts.length,
      data: {
        dateRange: {
          startDate,
          endDate
        },
        products: topProducts
      }
    });
  } catch (error) {
    console.error('Error fetching top-selling products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top-selling products',
      error: error.message
    });
  }
};

// Get slow-moving products
export const getSlowMovingProducts = async (req, res) => {
  try {
    // Get date range from query params or default to last 90 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (req.query.days ? parseInt(req.query.days) : 90));
    
    // Get all current products
    const products = await Product.find();
    
    // Find orders within date range
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Create map of product sales
    const productSales = {};
    
    // Add all products with zero sales as baseline
    for (const product of products) {
      for (const variant of product.variants) {
        const key = `${product.shopifyId}_${variant.shopifyVariantId}`;
        
        productSales[key] = {
          productId: product.shopifyId,
          variantId: variant.shopifyVariantId,
          title: product.title,
          variantTitle: variant.title,
          sku: variant.sku,
          price: variant.price,
          currentStock: variant.inventoryQuantity,
          totalQuantity: 0,
          totalRevenue: 0,
          orderCount: 0,
          daysSinceLastOrder: null,
          lastOrderDate: null
        };
      }
    }
    
    // Aggregate sales from orders
    for (const order of orders) {
      for (const item of order.lineItems) {
        if (item.productId && item.variantId) {
          const key = `${item.productId}_${item.variantId}`;
          
          if (productSales[key]) {
            productSales[key].totalQuantity += item.quantity;
            productSales[key].totalRevenue += (item.price * item.quantity);
            productSales[key].orderCount += 1;
            
            // Update last order date if needed
            const orderDate = new Date(order.createdAt);
            if (!productSales[key].lastOrderDate || orderDate > productSales[key].lastOrderDate) {
              productSales[key].lastOrderDate = orderDate;
            }
          }
        }
      }
    }
    
    // Calculate days since last order for each product
    for (const key in productSales) {
      if (productSales[key].lastOrderDate) {
        const timeDiff = endDate - productSales[key].lastOrderDate;
        productSales[key].daysSinceLastOrder = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      }
    }
    
    // Filter for slow-moving products (in stock but low or no sales)
    const slowMovingProducts = Object.values(productSales)
      .filter(p => p.currentStock > 0) // Only include in-stock products
      .filter(p => p.totalQuantity === 0 || p.totalQuantity < 5) // Low sales volume
      .sort((a, b) => {
        // Sort by sales quantity, then by inventory quantity (highest first)
        if (a.totalQuantity === b.totalQuantity) {
          return b.currentStock - a.currentStock;
        }
        return a.totalQuantity - b.totalQuantity;
      });
    
    res.status(200).json({
      success: true,
      count: slowMovingProducts.length,
      data: {
        dateRange: {
          startDate,
          endDate,
          days: Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24))
        },
        products: slowMovingProducts
      }
    });
  } catch (error) {
    console.error('Error fetching slow-moving products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch slow-moving products',
      error: error.message
    });
  }
};

// Generate inventory health report
export const getInventoryHealthReport = async (req, res) => {
  try {
    // Get all products and their inventory analytics
    const products = await Product.find();
    const inventoryAnalytics = await InventoryAnalytics.find();
    
    // Calculate inventory statistics
    const totalProducts = products.length;
    let totalVariants = 0;
    let totalInventoryValue = 0;
    let totalInventoryCount = 0;
    
    // Count by status
    const statusCounts = {
      'In Stock': 0,
      'Low Stock': 0,
      'Out of Stock': 0
    };
    
    // Group products by type
    const productsByType = {};
    
    // Process all products
    for (const product of products) {
      // Count variants
      totalVariants += product.variants.length;
      
      // Group by product type
      if (!productsByType[product.productType]) {
        productsByType[product.productType] = {
          type: product.productType || 'Uncategorized',
          count: 0,
          variantCount: 0,
          totalValue: 0,
          averagePrice: 0
        };
      }
      
      productsByType[product.productType].count += 1;
      productsByType[product.productType].variantCount += product.variants.length;
      
      // Process variants
      for (const variant of product.variants) {
        // Calculate inventory value
        const value = variant.price * variant.inventoryQuantity;
        totalInventoryValue += value;
        totalInventoryCount += variant.inventoryQuantity;
        
        productsByType[product.productType].totalValue += value;
        
        // Get status from analytics
        const analytics = inventoryAnalytics.find(a => 
          a.shopifyProductId === product.shopifyId && 
          a.variantId === variant.shopifyVariantId
        );
        
        if (analytics) {
          statusCounts[analytics.stockStatus]++;
        } else {
          // Default if no analytics
          const status = variant.inventoryQuantity <= 0 ? 'Out of Stock' :
                        variant.inventoryQuantity <= 5 ? 'Low Stock' : 'In Stock';
          statusCounts[status]++;
        }
      }
    }
    
    // Calculate average values for product types
    for (const type in productsByType) {
      if (productsByType[type].variantCount > 0) {
        productsByType[type].averagePrice = productsByType[type].totalValue / productsByType[type].variantCount;
      }
    }
    
    // Overall statistics
    const stats = {
      totalProducts,
      totalVariants,
      totalInventoryValue,
      totalInventoryCount,
      averageValuePerVariant: totalVariants > 0 ? totalInventoryValue / totalVariants : 0,
      statusCounts,
      productsByType: Object.values(productsByType)
        .sort((a, b) => b.count - a.count)
    };
    
    res.status(200).json({
      success: true,
      data: {
        reportDate: new Date(),
        stats
      }
    });
  } catch (error) {
    console.error('Error generating inventory health report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate inventory health report',
      error: error.message
    });
  }
};

// Generate sales performance report
export const getSalesPerformanceReport = async (req, res) => {
  try {
    // Get date range from query params or default to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (req.query.days ? parseInt(req.query.days) : 30));
    
    // Find orders within date range
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ createdAt: 1 });
    
    // Aggregations for report
    const dailySales = [];
    const productSales = {};
    let totalRevenue = 0;
    let totalOrders = orders.length;
    let totalUnits = 0;
    
    // Daily aggregation setup
    const dailyMap = {};
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dailyMap[dateStr] = {
        date: dateStr,
        orderCount: 0,
        revenue: 0,
        units: 0
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Process each order
    for (const order of orders) {
      const dateStr = order.createdAt.toISOString().split('T')[0];
      
      if (dailyMap[dateStr]) {
        dailyMap[dateStr].orderCount += 1;
        dailyMap[dateStr].revenue += order.totalPrice;
        
        // Process line items
        for (const item of order.lineItems) {
          dailyMap[dateStr].units += item.quantity;
          totalUnits += item.quantity;
          totalRevenue += (item.price * item.quantity);
          
          // Track product performance
          const key = item.productId ? item.productId : `variant_${item.variantId}`;
          if (!productSales[key]) {
            productSales[key] = {
              productId: item.productId,
              title: item.title,
              totalQuantity: 0,
              totalRevenue: 0,
              orderCount: 0
            };
          }
          
          productSales[key].totalQuantity += item.quantity;
          productSales[key].totalRevenue += (item.price * item.quantity);
          productSales[key].orderCount += 1;
        }
      }
    }
    
    // Convert daily map to array
    for (const date in dailyMap) {
      dailySales.push(dailyMap[date]);
    }
    
    // Calculate averages
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const averageUnitsPerOrder = totalOrders > 0 ? totalUnits / totalOrders : 0;
    
    // Get top and bottom performers
    const productPerformance = Object.values(productSales);
    const topProducts = [...productPerformance]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);
    
    const bottomProducts = [...productPerformance]
      .filter(p => p.totalQuantity > 0) // Only include products with some sales
      .sort((a, b) => a.totalRevenue - b.totalRevenue)
      .slice(0, 10);
    
    res.status(200).json({
      success: true,
      data: {
        reportDate: new Date(),
        dateRange: {
          startDate,
          endDate,
          days: dailySales.length
        },
        summary: {
          totalRevenue,
          totalOrders,
          totalUnits,
          averageOrderValue,
          averageUnitsPerOrder
        },
        dailySales,
        topProducts,
        bottomProducts
      }
    });
  } catch (error) {
    console.error('Error generating sales performance report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate sales performance report',
      error: error.message
    });
  }
};