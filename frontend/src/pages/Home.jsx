import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
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

      {/* Quick Stats Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">📌 Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-md text-center">
            <p className="text-sm text-gray-600">Total Products</p>
            <p className="text-2xl font-bold text-blue-600">{dashboardData.totalProducts}</p>
          </div>
          <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-md text-center">
            <p className="text-sm text-gray-600">Low Stock Items</p>
            <p className="text-2xl font-bold text-yellow-600">{dashboardData.lowStockItems}</p>
          </div>
          <div className="p-3 bg-red-50 border border-red-100 rounded-md text-center">
            <p className="text-sm text-gray-600">Out-of-Stock</p>
            <p className="text-2xl font-bold text-red-600">{dashboardData.OutOfStock}</p>
          </div>
        </div>
      </div>

      {/* Restock Suggestions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">⚠️ Restock Suggestions</h2>
        <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
          {restockSuggestions.length > 0 ? (
            restockSuggestions.map((item) => (
              <div key={item.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`w-3 h-3 rounded-full bg-${item.color}-500 mr-2`}></span>
                  <span className="font-medium">{item.name}</span>
                </div>
                <span className="text-sm text-gray-600">
                  {item.daysUntilStockout 
                    ? `Stock out in ${item.daysUntilStockout} days` 
                    : `Needs ${item.units} more units`}
                </span>
                <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                  Restock
                </button>
              </div>
            ))
          ) : connectionStatus.llmServer ? (
            <div className="p-4 text-center text-gray-500">
              No restock recommendations at this time
            </div>
          ) : (
            <div className="p-4 text-center text-yellow-600">
              <p>LLM Server is not connected</p>
              <p className="text-sm text-gray-500 mt-1">Connect to the LLM server to get AI-powered restock recommendations</p>
            </div>
          )}
        </div>
        
        {/* Inventory Trends Chart */}
        <div className="mb-6 mt-6">
          <h2 className="text-lg font-semibold mb-3">📈 Inventory Trends</h2>
          <div className="h-64 w-full border border-gray-200 rounded-md p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={inventoryTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="stock" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {!dashboardData.inventoryTrends.length && (
            <div className="mt-2 text-center text-xs text-gray-500">
              <em>Sample data shown. Connect to backend for real-time inventory trends.</em>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;