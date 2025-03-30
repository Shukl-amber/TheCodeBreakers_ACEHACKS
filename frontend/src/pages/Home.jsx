import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, AreaChart, Area
} from 'recharts';
import { Link } from 'react-router-dom';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';
import { getDashboardData, getRestockRecommendations, getInventoryAnalytics, testConnections } from '../utils/api';

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardData, setDashboardData] = useState({
    totalProducts: 0,
    lowStockItems: 0,
    predictedOutOfStock: 0,
    inventoryTrends: []
  });
  const [restockSuggestions, setRestockSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState({ backend: false, llmServer: false });
  const [error, setError] = useState(null);
  
console.log(connectionStatus);


  useEffect(() => {
    // Check connection to backend and LLM server
    const checkConnections = async () => {
      try {
        const status = await testConnections();
        setConnectionStatus(status);
        
        if (!status.backend) {
          setError('Cannot connect to backend server. Please ensure it is running.');
          setIsLoading(false);
          return;
        }
        
        if (!status.llmServer) {
          console.warn('LLM server connection failed. Some AI features may be unavailable.');
        }
        
        // If backend is connected, fetch data
        await fetchDashboardData();
        await fetchInventoryTrends();
        await fetchRestockRecommendations();
        
        setIsLoading(false);
      } catch (err) {
        setError('Failed to connect to servers. Please check your network connection.');
        setIsLoading(false);
      }
    };
    
    checkConnections();
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      const data = await getDashboardData();
      
      if (!data) {
        console.error('Invalid dashboard data received');
        return;
      }
      
      console.log('Dashboard data received:', data); // Add logging to inspect the response
      
      setDashboardData(prevState => ({
        ...prevState,
        totalProducts: data.data.totalProducts || 0,
        lowStockItems: data.data.lowStockCount || 0,
        OutOfStock: data.data.outOfStockCount || 0,
      }));
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(`Failed to fetch dashboard data: ${err.message || 'Unknown error'}`);
    }
  };
  
  const fetchInventoryTrends = async () => {
    try {
      const analytics = await getInventoryAnalytics();
      console.log('Inventory analytics received:', analytics); // Add logging
      
      if (analytics && analytics.inventoryHistory) {
        // Transform inventory history data for the chart
        const trendData = analytics.inventoryHistory.map(item => ({
          name: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          stock: item.totalStock
        }));
        
        console.log('Formatted trend data:', trendData); // Log the transformed data
        
        setDashboardData(prevState => ({
          ...prevState,
          inventoryTrends: trendData
        }));
      } else {
        console.warn('No inventory history data available');
      }
    } catch (err) {
      console.error('Error fetching inventory trends:', err);
      // Keep the empty trends array, will use fallback in render
    }
  };
  
  const fetchRestockRecommendations = async () => {
    try {
      if (!connectionStatus.llmServer) {
        console.warn('LLM server not connected, skipping restock recommendations');
        return;
      }
      
      const response = await getRestockRecommendations();
      
      if (response && response.predictions && response.predictions.length > 0) {
        // Transform API response to match component data structure
        const formattedSuggestions = response.predictions.map((item, index) => ({
          id: index + 1,
          name: item.name || item.productName || 'Product ' + (index + 1),
          units: item.recommendedOrderQuantity || 0,
          color: item.urgency === 'high' ? 'red' : (item.urgency === 'medium' ? 'orange' : 'blue'),
          urgency: item.urgency || 'medium',
          daysUntilStockout: item.daysUntilStockout
        }));
        
        setRestockSuggestions(formattedSuggestions);
      }
    } catch (err) {
      console.error('Error fetching restock recommendations:', err);
      // We'll leave the restock suggestions empty, the UI will show "No recommendations"
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // Navigate to inventory page with search query
    window.location.href = `/inventory?search=${encodeURIComponent(searchQuery)}`;
  };

  // If still loading or there's an error
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md flex justify-center items-center h-64">
        <p className="text-gray-600">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-center">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Generate current month-based inventory trend data if backend doesn't provide it
  const inventoryTrendData = dashboardData.inventoryTrends.length > 0 
    ? dashboardData.inventoryTrends 
    : (() => {
        // Generate last 7 days with random but realistic looking data
        const today = new Date();
        return Array(7).fill(0).map((_, index) => {
          const date = new Date();
          date.setDate(today.getDate() - (6 - index));
          return { 
            name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            stock: 75 + Math.floor(Math.random() * 50) 
          };
        });
      })();

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      {/* Connection status indicator */}
      <div className="mb-4 flex justify-end">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <span className={`w-2 h-2 rounded-full ${connectionStatus.backend ? 'bg-green-500' : 'bg-red-500'} mr-1`}></span>
            <span>Backend</span>
          </div>
          <div className="flex items-center">
            <span className={`w-2 h-2 rounded-full ${connectionStatus.llmServer ? 'bg-green-500' : 'bg-red-500'} mr-1`}></span>
            <span>LLM Server</span>
          </div>
        </div>
      </div>

      {/* Header with Search and Navigation */}
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
            <Link to="/inventory" className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'>Inventory</Link>
        </div>
      </div>

      {/* Quick Stats Section - Enhanced with animations */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <h2 className="text-lg font-semibold mb-3">📌 Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div 
            whileHover={{ scale: 1.03 }}
            className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg shadow-sm text-center"
          >
            <div className="flex items-center justify-center text-blue-500 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Products</p>
            <CountUp 
              end={dashboardData.totalProducts} 
              duration={2} 
              separator="," 
              className="text-3xl font-bold text-blue-600"
            />
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.03 }}
            className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg shadow-sm text-center"
          >
            <div className="flex items-center justify-center text-amber-500 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 mb-1">Low Stock Items</p>
            <CountUp 
              end={dashboardData.lowStockItems} 
              duration={2} 
              separator="," 
              className="text-3xl font-bold text-amber-600"
            />
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.03 }}
            className="p-4 bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg shadow-sm text-center"
          >
            <div className="flex items-center justify-center text-red-500 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 mb-1">Out-of-Stock</p>
            <CountUp 
              end={dashboardData.OutOfStock} 
              duration={2} 
              separator="," 
              className="text-3xl font-bold text-red-600"
            />
          </motion.div>
        </div>
      </motion.div>

      {/* New Advanced Analytics Section */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-6"
      >
        <h2 className="text-lg font-semibold mb-3">🔍 Advanced Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stock Distribution by Category */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Stock Distribution</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'In Stock', value: dashboardData.totalProducts - dashboardData.lowStockItems - dashboardData.OutOfStock },
                      { name: 'Low Stock', value: dashboardData.lowStockItems },
                      { name: 'Out of Stock', value: dashboardData.OutOfStock },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    <Cell fill="#4ade80" />
                    <Cell fill="#fbbf24" />
                    <Cell fill="#f87171" />
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} items`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sales & Inventory Forecast */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Sales & Inventory Forecast</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={inventoryTrendData.map((item, index) => ({
                    ...item,
                    forecast: item.stock * (1 + Math.sin(index * 0.5) * 0.1),
                    sales: Math.floor(item.stock * 0.2 * (1 + Math.cos(index * 0.5) * 0.2))
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="stock" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="forecast" stackId="2" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="sales" stackId="3" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Restock Suggestions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">⚠️ Restock Suggestions</h2>
          <Link to="/restock" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
            View All Recommendations
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {restockSuggestions.length > 0 ? (
            <div>
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500">
                  <div className="col-span-5">PRODUCT</div>
                  <div className="col-span-3">STATUS</div>
                  <div className="col-span-2">QUANTITY</div>
                  <div className="col-span-2">ACTION</div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {restockSuggestions.slice(0, 5).map((item) => (
                  <motion.div 
                    key={item.id} 
                    className="px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-gray-50"
                    whileHover={{ backgroundColor: "rgba(243, 244, 246, 1)" }}
                  >
                    <div className="col-span-5 flex items-center">
                      <span className={`w-3 h-3 rounded-full bg-${item.color}-500 mr-2`}></span>
                      <span className="font-medium text-gray-800 truncate">{item.name}</span>
                    </div>
                    <div className="col-span-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.urgency === 'high' 
                          ? 'bg-red-100 text-red-800' 
                          : item.urgency === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {item.daysUntilStockout 
                          ? `Stock out in ${item.daysUntilStockout}d` 
                          : item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)}
                      </span>
                    </div>
                    <div className="col-span-2 text-gray-800 font-medium">
                      {item.units} units
                    </div>
                    <div className="col-span-2">
                      <button className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm rounded-md hover:from-blue-700 hover:to-indigo-700 transition-colors shadow-sm">
                        Restock
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
              {restockSuggestions.length > 5 && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-center text-sm text-gray-500">
                  Showing 5 of {restockSuggestions.length} items
                </div>
              )}
            </div>
          ) : connectionStatus.llmServer ? (
            <div className="p-8 text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-700 font-medium">Inventory Levels Look Good</p>
              <p className="text-gray-500 text-sm mt-1">No restock recommendations at this time</p>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-yellow-600 font-medium">LLM Server Not Connected</p>
              <p className="text-gray-500 text-sm mt-1">Connect to the LLM server to get AI-powered restock recommendations</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 border border-yellow-300 text-yellow-700 rounded-md hover:bg-yellow-50 transition-colors"
              >
                Retry Connection
              </button>
            </div>
          )}
        </div>
        
        {/* Enhanced Inventory Trends Chart */}
        <div className="mb-6 mt-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">📈 Inventory Trends</h2>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md">Weekly</button>
              <button className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-md">Monthly</button>
              <button className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-md">Yearly</button>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={inventoryTrendData}>
                  <defs>
                    <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`${value} units`, 'Stock Level']}
                  />
                  <Area type="monotone" dataKey="stock" stroke="#3B82F6" fillOpacity={1} fill="url(#colorStock)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          {!dashboardData.inventoryTrends.length && (
            <div className="mt-2 text-center text-xs text-gray-500">
              <em>Sample data shown. Connect to backend for real-time inventory trends.</em>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Home;