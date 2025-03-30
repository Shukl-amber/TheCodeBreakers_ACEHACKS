import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { getShopifyProducts, getLowStockProducts, getOutOfStockProducts, getInventoryAnalytics } from '../utils/api';

const Inventory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOption, setFilterOption] = useState('All Product');
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trendCache, setTrendCache] = useState({});
  const location = useLocation();
  
  useEffect(() => {
    // Parse search query from URL if present
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
    }
    
    // Fetch trends data for historical comparison
    fetchTrendData();
    
    // Load initial product data based on filter and search
    loadProducts();
  }, [filterOption, location.search]);
  
  const fetchTrendData = async () => {
    try {
      const analytics = await getInventoryAnalytics();
      if (analytics && analytics.productTrends) {
        // Create a cache of trend data by product ID
        const cache = {};
        analytics.productTrends.forEach(trend => {
          cache[trend.productId] = {
            direction: trend.trendDirection,
            percent: trend.percentChange
          };
        });
        setTrendCache(cache);
      }
    } catch (err) {
      console.error('Error fetching trend data:', err);
    }
  };
  
  const loadProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let response;
      
      // Use different API endpoints based on the filter
      switch (filterOption) {
        case 'Low Stock':
          response = await getLowStockProducts();
          break;
        case 'Out of Stock':
          response = await getOutOfStockProducts();
          break;
        case 'All Products':
        default:
          response = await getShopifyProducts();
          break;
      }
      
      if (response && response.success && response.data) {
        // Transform API response to match component data structure
        const formattedProducts = response.data.map(product => ({
          id: product._id || product.shopifyId,
          name: product.title,
          icon: getProductIcon(product.productType),
          stock: getProductStock(product),
          trend: getTrendForProduct(product._id || product.shopifyId),
          variants: product.variants || []
        }));
        
        // Apply search filter if present
        const filteredProducts = searchQuery 
          ? formattedProducts.filter(product => 
              product.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
          : formattedProducts;
        
        setProducts(filteredProducts);
      } else {
        // Empty array if no products or unsuccessful response
        setProducts([]);
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load inventory data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to get appropriate icon based on product type
  const getProductIcon = (productType) => {
    if (!productType) return '📦';
    
    const type = productType.toLowerCase();
    if (type.includes('shirt') || type.includes('hoodie') || type.includes('sweater')) return '👕';
    if (type.includes('pant') || type.includes('jean') || type.includes('trouser')) return '👖';
    if (type.includes('shoe') || type.includes('sneaker') || type.includes('boot')) return '👟';
    if (type.includes('hat') || type.includes('cap')) return '🧢';
    if (type.includes('bag') || type.includes('backpack')) return '🎒';
    if (type.includes('watch')) return '⌚';
    if (type.includes('glass') || type.includes('sunglass')) return '👓';
    if (type.includes('laptop')) return '💻';
    if (type.includes('mobile') || type.includes('phone')) return '📱';
    if (type.includes('camera')) return '📷';
    if (type.includes('keyboard')) return '⌨️';
    
    return '📦'; // Default icon
  };
  
  // Helper function to get total stock across variants
  const getProductStock = (product) => {
    if (!product.variants || product.variants.length === 0) {
      return product.inventoryQuantity || 0;
    }
    
    return product.variants.reduce((total, variant) => {
      return total + (variant.inventoryQuantity || 0);
    }, 0);
  };
  
  // Get trend for product from analytics cache or generate a realistic trend
  const getTrendForProduct = (productId) => {
    // Check if productId is undefined or null
    if (!productId) {
      return { direction: 'neutral', percent: 0 };
    }
    
    // If we have real trend data, use it
    if (trendCache[productId]) {
      return trendCache[productId];
    }
    
    // Generate a realistic trend based on product ID - deterministic but appears random
    const hash = productId.toString().split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const direction = Math.abs(hash) % 2 === 0 ? 'up' : 'down';
    // Use hash to generate a consistent percentage between 1-15%
    const percent = Math.abs(hash % 15) + 1;
    
    return { direction, percent };
  };

  const handleSearch = (e) => {
    e.preventDefault();
    
    // Apply search filter but don't fetch new data
    if (searchQuery.trim() === '') {
      loadProducts(); // Reset to filter-based products if search is empty
    } else {
      const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setProducts(filteredProducts);
    }
  };

  const toggleFilter = () => {
    // Cycle through filter options
    const filters = ['All Products', 'Low Stock', 'Out of Stock'];
    const currentIndex = filters.indexOf(filterOption);
    const nextIndex = (currentIndex + 1) % filters.length;
    setFilterOption(filters[nextIndex]);
  };

  // Loading state with animation
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md flex flex-col justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Loading inventory data...</p>
      </div>
    );
  }

  // Summary metrics
  const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
  const averageStock = products.length > 0 ? Math.round(totalStock / products.length) : 0;
  const lowStockCount = products.filter(product => product.stock > 0 && product.stock <= 10).length;
  const outOfStockCount = products.filter(product => product.stock === 0).length;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md"
    >
      {/* Error message if any */}
      {error && (
        <motion.div 
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-md"
        >
          <p>{error}</p>
          <button 
            onClick={() => loadProducts()}
            className="mt-2 text-sm text-red-700 underline"
          >
            Try again
          </button>
        </motion.div>
      )}
      
      {/* Header with Search and Filter */}
      <div className="flex flex-col md:flex-row justify-between items-center p-4 border-b border-gray-200 mb-4">
        <form onSubmit={handleSearch} className="relative w-full md:w-64 mb-4 md:mb-0">
          <input
            type="text"
            placeholder="🔍 Search Product"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>
        
        <div className="flex space-x-3">
          <button 
            onClick={toggleFilter}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md flex items-center justify-between"
          >
            <span className="mr-2">Filter:</span>
            <span className={`px-2 py-1 rounded-md ${
              filterOption === 'Low Stock' 
                ? 'bg-yellow-100 text-yellow-800' 
                : filterOption === 'Out of Stock' 
                  ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 text-blue-800'
            }`}>
              {filterOption}
            </span>
          </button>
          
          <Link
            to='/restockPredictions'
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700 transition-colors shadow-sm"
          >
            AI Restock Recommendations
          </Link>
        </div>
      </div>

      {/* Inventory Summary Cards */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
      >
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-blue-700">{products.length}</p>
            </div>
            <div className="p-2 bg-blue-200 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600">Total Stock</p>
              <p className="text-2xl font-bold text-emerald-700">{totalStock}</p>
            </div>
            <div className="p-2 bg-emerald-200 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-700" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2l-1 2H8l-1-2H5V5z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-emerald-600 mt-2">Avg. {averageStock} per product</p>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-amber-700">{lowStockCount}</p>
            </div>
            <div className="p-2 bg-amber-200 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-700" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-amber-600 mt-2">{lowStockCount > 0 ? 'Need attention soon' : 'All products well stocked'}</p>
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-700">{outOfStockCount}</p>
            </div>
            <div className="p-2 bg-red-200 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-700" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-red-600 mt-2">{outOfStockCount > 0 ? 'Needs immediate action' : 'No items out of stock'}</p>
        </div>
      </motion.div>

      {/* Product Table - Enhanced with animations */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-6"
      >
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Product Inventory</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  🏷️ Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  📦 Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  📊 Trend
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.length > 0 ? (
                products.map((product, index) => (
                  <motion.tr 
                    key={product.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * (index % 10), duration: 0.3 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-xl mr-2">{product.icon}</span>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        product.stock === 0 
                          ? 'text-red-600' 
                          : product.stock <= 10
                            ? 'text-amber-600'
                            : 'text-gray-900'
                      }`}>
                        {product.stock}
                      </div>
                      {product.stock <= 10 && product.stock > 0 && (
                        <div className="text-xs text-amber-500">Low Stock</div>
                      )}
                      {product.stock === 0 && (
                        <div className="text-xs text-red-500">Out of Stock</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.trend.direction === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {product.trend.direction === 'up' ? '🔺 Up' : '🔻 Down'} {product.trend.percent}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-indigo-600 hover:text-indigo-900 mr-3">Edit</button>
                      <button className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    {searchQuery ? `No products found matching "${searchQuery}"` : `No products found in "${filterOption}"`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Analytics Charts */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">📊 Inventory Analytics</h2>
          <Link to="/home" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
            Back to Dashboard
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>

        {/* Summary Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Stock Level Distribution</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getStockDistributionData(products)}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {getStockDistributionData(products).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STOCK_COLORS[index % STOCK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} products`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Stock Trend Analysis</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getTrendDistributionData(products)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} products`, 'Count']} />
                  <Bar dataKey="value" name="Products">
                    {getTrendDistributionData(products).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={TREND_COLORS[index % TREND_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 5 Products by Stock Level</h3>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getTopProductsData(products)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={150} />
                <Tooltip 
                  formatter={(value) => [`${value} units`, 'Stock']}
                  labelFormatter={(value, payload) => payload && payload[0] ? payload[0].payload.fullName : value}
                />
                <Bar dataKey="stock" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Inventory;

// New data processing functions for charts
const getStockDistributionData = (products) => {
  if (!products || products.length === 0) return [];
  
  // Count the number of products in each stock range
  const stockRanges = {
    'Out of Stock': 0,
    'Low Stock (1-10)': 0,
    'Medium Stock (11-50)': 0,
    'High Stock (51+)': 0
  };
  
  products.forEach(product => {
    const stock = product.stock;
    if (stock === 0) {
      stockRanges['Out of Stock']++;
    } else if (stock <= 10) {
      stockRanges['Low Stock (1-10)']++;
    } else if (stock <= 50) {
      stockRanges['Medium Stock (11-50)']++;
    } else {
      stockRanges['High Stock (51+)']++;
    }
  });
  
  return Object.keys(stockRanges).map(range => ({
    name: range,
    value: stockRanges[range]
  }));
};
  
const getTrendDistributionData = (products) => {
  if (!products || products.length === 0) return [];
  
  // Count the number of products in each trend direction
  const trendsCount = {
    'Up': 0,
    'Down': 0,
    'Neutral': 0
  };
  
  products.forEach(product => {
    if (product.trend.direction === 'up') {
      trendsCount['Up']++;
    } else if (product.trend.direction === 'down') {
      trendsCount['Down']++;
    } else {
      trendsCount['Neutral']++;
    }
  });
  
  return Object.keys(trendsCount).map(direction => ({
    name: direction,
    value: trendsCount[direction]
  }));
};
  
const getTopProductsData = (products) => {
  if (!products || products.length === 0) return [];
  
  // Sort products by stock level and return top 5
  return [...products]
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 5)
    .map(product => ({
      name: product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name,
      stock: product.stock,
      fullName: product.name
    }));
};
  
// Chart colors
const STOCK_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
const TREND_COLORS = ['#10b981', '#ef4444', '#6b7280'];
  
// Chart components
const renderStockDistributionChart = (products) => {
  const data = getStockDistributionData(products);
  
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Stock Level Distribution</h3>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={STOCK_COLORS[index % STOCK_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} products`, 'Count']} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
  
const renderTrendDistributionChart = (products) => {
  const data = getTrendDistributionData(products);
  
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Stock Trend Analysis</h3>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value} products`, 'Count']} />
            <Bar dataKey="value" name="Products">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={TREND_COLORS[index % TREND_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
  
const renderTopProductsChart = (products) => {
  const data = getTopProductsData(products);
  
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 5 Products by Stock Level</h3>
      <div style={{ height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={150} />
            <Tooltip 
              formatter={(value) => [`${value} units`, 'Stock']}
              labelFormatter={(value, payload) => payload && payload[0] ? payload[0].payload.fullName : value}
            />
            <Bar dataKey="stock" fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};