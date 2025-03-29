import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ConnectShopify = () => {
  const [storeUrl, setStoreUrl] = useState('');
  const [storeApiToken, setApiToken] = useState('');
  const [storeApiSecret, setApiSecret] = useState('');

  const handleConnect = (e) => {
    e.preventDefault();
    // Handle connection logic here
    console.log('Connecting to store:', storeUrl);
    // In a real implementation, you would redirect to Shopify OAuth flow
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-center">
          <h1 className="text-2xl font-bold text-center text-black">LOGIN / CONNECT STORE</h1>
        </div>
        
        <div className="flex items-center justify-center py-4">
          <svg className="w-10 h-10" viewBox="0 0 109 124" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M74.7 14.8C74.6 14.4 74.4 14.1 74.1 13.9C73.8 13.7 73.5 13.6 73.1 13.7C73.1 13.7 67.1 15.2 67.1 15.2C67.1 15.2 63 11.1 62.5 10.6C62 10.1 61 9.7 59.7 9.8L58.2 9.9C58.2 9.9 56.7 7.5 54.9 6.2C52.5 4.4 50 4.3 48.1 4.4C46.2 4.5 44.7 5.4 43.7 6.2C42.7 7 41 8.8 39.5 11.8C38.5 13.8 34.6 25.5 34.6 25.5L74.7 14.8ZM59.8 18.3C59.8 18.3 56.6 19.3 53.3 20.3C51.8 14.1 49.8 8.5 46.6 8.5C46.2 8.5 45.8 8.6 45.4 8.7C43.3 5.8 41 6.1 38.4 7.7C35.8 9.3 34.8 15.7 34.7 16.4C28.5 18.2 24.4 19.4 24.4 19.4C22.2 20 22.1 20.1 21.8 22.2C21.6 23.8 15 98.6 15 98.6L71.1 110.1L95.5 102.9C95.5 102.9 74.4 19.4 74.2 18.5C74 17.6 73.4 17.5 73.2 17.5C72.7 17.4 69 18.2 64.9 19.1C63.1 17 60.9 18.1 59.8 18.3Z" fill="#95BF47"/>
            <path d="M73.1 13.7C72.7 13.8 72.4 14.1 72.2 14.4C67.1 15.4 59.4 17 59.4 17C57.5 17.3 56.1 17.6 55.1 17.8C53.3 11.6 51.2 6 48 6C47.6 6 47.3 6.1 46.9 6.2C44.8 3.3 42.4 3.6 39.9 5.2C37.3 6.8 35.9 13.2 35.8 13.9C29.6 15.7 25.5 16.9 25.5 16.9C23.3 17.5 23.2 17.6 22.9 19.7C22.7 21.3 16 96.1 16 96.1L72.1 107.6L96.5 100.4C96.5 100.4 75.4 16.9 75.2 16C75 15.1 74.3 15 74.1 15C73.8 14.9 73.5 14.8 73.1 13.7Z" fill="#5E8E3E"/>
            <path d="M59.3 37.4L55.6 49.9C55.6 49.9 52.2 48.3 48.1 48.3C42.1 48.3 41.9 51.9 41.9 52.8C41.9 57.9 53.4 59.8 53.4 71.8C53.4 81.1 47.4 87.3 38.9 87.3C28.9 87.3 23.9 81.1 23.9 81.1L26.4 72.3C26.4 72.3 31.6 76.6 35.8 76.6C38.7 76.6 39.9 74.1 39.9 72.1C39.9 65.1 30.4 65.3 30.4 54.7C30.4 45.9 36.8 35.6 49.9 35.6C56.2 35.6 59.3 37.4 59.3 37.4Z" fill="white"/>
          </svg>
        </div>
        
        <div className="text-center text-gray-700">
          Connect your Shopify store to manage inventory.
        </div>
        
        <form onSubmit={handleConnect} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="Store URL"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-5"
                required
              />
              <input
                type="text"
                value={storeApiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Store API key"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-5"
                required
              />
              <input
                type="text"
                value={storeApiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Store API secret  "
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
            <Link to="/home" class="w-full flex justify-center px-6 py-4 mt-3 font-semibold text-white transition-all duration-200 bg-blue-600 rounded-md sm:mt-16 hover:bg-blue-700 focus:bg-blue-700">
                    Register Store
                    <svg class="w-6 h-6 ml-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
            </Link>
        </form>
      </div>
    </div>
  );
};

export default ConnectShopify;