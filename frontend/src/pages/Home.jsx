import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sample data for inventory trends chart
  const inventoryTrendData = [
    { name: 'Jan', stock: 85 },
    { name: 'Feb', stock: 95 },
    { name: 'Mar', stock: 110 },
    { name: 'Apr', stock: 120 },
    { name: 'May', stock: 105 },
    { name: 'Jun', stock: 95 },
    { name: 'Jul', stock: 120 },
  ];
  
  // Sample restock suggestions
  const restockSuggestions = [
    { id: 1, name: 'Blue Hoodie', units: 10, color: 'blue' },
    { id: 2, name: 'Red T-shirt', units: 8, color: 'orange' },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
    // Implement search functionality
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
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
            <p className="text-2xl font-bold text-blue-600">120</p>
          </div>
          <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-md text-center">
            <p className="text-sm text-gray-600">Low Stock Items</p>
            <p className="text-2xl font-bold text-yellow-600">5</p>
          </div>
          <div className="p-3 bg-red-50 border border-red-100 rounded-md text-center">
            <p className="text-sm text-gray-600">Predicted Out-of-Stock in 7 Days</p>
            <p className="text-2xl font-bold text-red-600">3</p>
          </div>
        </div>
      </div>

      {/* Restock Suggestions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">⚠️ Restock Suggestions</h2>
        <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
          {restockSuggestions.map((item) => (
            <div key={item.id} className="p-3 flex items-center justify-between">
              <div className="flex items-center">
                <span className={`w-3 h-3 rounded-full bg-${item.color}-500 mr-2`}></span>
                <span className="font-medium">{item.name}</span>
              </div>
              <span className="text-sm text-gray-600">Needs {item.units} more units</span>
              <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                Restock
              </button>
            </div>
          ))}
        </div>
        <br></br>
        {/* Inventory Trends Chart */}
      <div className="mb-6">
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
      </div>
      </div>
    </div>
  );
};

export default Home;