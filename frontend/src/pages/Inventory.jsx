import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Inventory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOption, setFilterOption] = useState('Low Stock');
  
  // Sample product data
  const products = [
    { id: 1, name: 'Blue Hoodie', icon: '👕', stock: 20, trend: { direction: 'up', percent: 5 } },
    { id: 2, name: 'Red T-shirt', icon: '👕', stock: 10, trend: { direction: 'down', percent: 8 } },
    { id: 3, name: 'Black Jeans', icon: '👖', stock: 50, trend: { direction: 'up', percent: 3 } },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
    // Implement search functionality
  };

  const toggleFilter = () => {
    // Toggle between different filter options
    setFilterOption(filterOption === 'Low Stock' ? 'All Products' : 'Low Stock');
  };

//   const handleUpdateStock = () => {
//     console.log('Update stock clicked');
//     // Implement stock update functionality
//   };

//   const handleViewInsights = () => {
//     console.log('View insights clicked');
//     // Implement insights view functionality
//   };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
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
        
        <button 
          onClick={toggleFilter}
          className="px-4 py-2 bg-white border border-gray-300 rounded-md flex items-center justify-between w-full md:w-auto"
        >
          <span className='cursor-pointer'>Filter: {filterOption}</span>
          <span className="ml-2 cursor-pointer">⬇️</span>
        </button>
      </div>

      {/* Product Table */}
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-xl mr-2">{product.icon}</span>
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{product.stock}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    product.trend.direction === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {product.trend.direction === 'up' ? '🔺 Up' : '🔻 Down'} {product.trend.percent}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col md:flex-row justify-end space-y-3 md:space-y-0 md:space-x-3">
        <Link
            to='/home' 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Go Back
        </Link>
        <Link
            to='/restockPredictions'
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          Restock Predictions
        </Link>
      </div>
    </div>
  );
};

export default Inventory;