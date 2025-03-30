import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { connectShopify, syncShopifyData, testConnections } from '../utils/api';

const ConnectShopify = () => {
  const [storeUrl, setStoreUrl] = useState('');
  const [storeApiKey, setApiKey] = useState('');
  const [storeApiSecret, setApiSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const navigate = useNavigate();

  // Check server connections on component mount
  React.useEffect(() => {
    const checkServers = async () => {
      try {
        const connections = await testConnections();
        if (!connections.backend) {
          setConnectionError("Cannot connect to the backend server. Please ensure it is running.");
        }
      } catch (err) {
        setConnectionError("Failed to check server status. Please try again.");
      }
    };
    
    checkServers();
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault();
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      // Validate inputs
      if (!storeUrl || !storeApiKey || !storeApiSecret || !accessToken) {
        setConnectionError("All fields are required to connect your store.");
        setIsConnecting(false);
        return;
      }
      
      // Format store URL if needed
      let formattedStoreUrl = storeUrl;
      if (!formattedStoreUrl.includes('.myshopify.com') && !formattedStoreUrl.startsWith('http')) {
        formattedStoreUrl = `${formattedStoreUrl}.myshopify.com`;
      }
      
      // Prepare credentials for the API call
      const credentials = {
        shopName: formattedStoreUrl,
        apiKey: storeApiKey,
        apiSecret: storeApiSecret,
        accessToken: accessToken
      };
      
      // Call the API to connect to Shopify
      const response = await connectShopify(credentials);
      
      if (response.success) {
        setConnectionSuccess(true);
        
        // Start syncing data
        await syncData();
        
        // Redirect to home page after successful connection and sync
        setTimeout(() => {
          navigate('/home');
        }, 2000);
      } else {
        setConnectionError(response.error || "Failed to connect to Shopify. Please check your credentials.");
      }
    } catch (err) {
      console.error("Connection error:", err);
      setConnectionError("An error occurred while connecting to Shopify. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };
  
  const syncData = async () => {
    setIsSyncing(true);
    try {
      await syncShopifyData();
      // Success is handled by the redirect in handleConnect
    } catch (err) {
      console.error("Sync error:", err);
      setConnectionError("Connected successfully, but failed to sync data. You can try syncing later.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-center">
          <h1 className="text-2xl font-bold text-center text-black">CONNECT YOUR SHOPIFY STORE</h1>
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
        
        {/* Error message */}
        {connectionError && (
          <div className="p-3 bg-red-100 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{connectionError}</p>
          </div>
        )}
        
        {/* Success message */}
        {connectionSuccess && (
          <div className="p-3 bg-green-100 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              {isSyncing ? "Successfully connected! Syncing data..." : "Successfully connected to your Shopify store!"}
            </p>
          </div>
        )}
        
        <form onSubmit={handleConnect} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="Store URL (e.g., your-store.myshopify.com)"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-5"
                required
                disabled={isConnecting || connectionSuccess}
              />
              <input
                type="text"
                value={storeApiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Shopify API key"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-5"
                required
                disabled={isConnecting || connectionSuccess}
              />
              <input
                type="password"
                value={storeApiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Shopify API secret"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-5"
                required
                disabled={isConnecting || connectionSuccess}
              />
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Shopify Access Token"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isConnecting || connectionSuccess}
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isConnecting || connectionSuccess}
            className={`w-full flex justify-center px-6 py-4 mt-3 font-semibold text-white transition-all duration-200 rounded-md sm:mt-8 ${
              isConnecting || connectionSuccess 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:bg-blue-700'
            }`}
          >
            {isConnecting ? 'Connecting...' : connectionSuccess ? 'Connected!' : 'Connect Store'}
            {!isConnecting && !connectionSuccess && (
              <svg className="w-6 h-6 ml-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
          
          {!connectionSuccess && (
            <div className="text-center mt-4">
              <Link to="/home" className="text-sm text-blue-600 hover:underline">
                Skip for now
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ConnectShopify;