/**
 * API utility for connecting to backend and LLM server
 * Provides methods for all API endpoints needed by the frontend
 */

// Backend and LLM server base URLs
const BACKEND_URL = 'http://localhost:5000';
const LLM_SERVER_URL = 'http://localhost:5050';

/**
 * Helper function to handle API calls
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise} - Promise with JSON response
 */
const fetchApi = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// BACKEND API ENDPOINTS

// Shopify Connection APIs
export const connectShopify = (credentials) => {
  return fetchApi(`${BACKEND_URL}/api/shopify/connect`, {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
};

export const syncShopifyData = () => {
  return fetchApi(`${BACKEND_URL}/api/shopify/sync/all`);
};

export const getShopifyProducts = () => {
  return fetchApi(`${BACKEND_URL}/api/shopify/products`);
};

export const getShopifyOrders = () => {
  return fetchApi(`${BACKEND_URL}/api/shopify/orders`);
};

// Inventory APIs
export const getDashboardData = () => {
  return fetchApi(`${BACKEND_URL}/api/inventory/dashboard`);
};

export const getLowStockProducts = () => {
  return fetchApi(`${BACKEND_URL}/api/inventory/low-stock`);
};

export const getOutOfStockProducts = () => {
  return fetchApi(`${BACKEND_URL}/api/inventory/out-of-stock`);
};

export const getProductInventory = (productId) => {
  return fetchApi(`${BACKEND_URL}/api/inventory/product/${productId}`);
};

// Analytics APIs
export const getInventoryAnalytics = () => {
  return fetchApi(`${BACKEND_URL}/api/analytics/inventory`);
};

export const getSalesForecast = (period = '30d', productId = null) => {
  const params = new URLSearchParams();
  params.append('period', period);
  if (productId) params.append('productId', productId);
  
  return fetchApi(`${BACKEND_URL}/api/analytics/sales-forecast?${params}`);
};

// LLM SERVER API ENDPOINTS

// AI Prediction APIs
export const getRestockRecommendations = () => {
  return fetchApi(`${LLM_SERVER_URL}/api/predictions/restock`);
};

export const runInventorySimulations = (parameters) => {
  return fetchApi(`${LLM_SERVER_URL}/api/predictions/simulate`, {
    method: 'POST',
    body: JSON.stringify(parameters),
  });
};

export const getAIInsights = () => {
  return fetchApi(`${LLM_SERVER_URL}/api/insights/inventory`);
};

// Generate report using Gemini AI
export const generateGeminiReport = (data) => {
  return fetchApi(`${LLM_SERVER_URL}/api/reports/generate`, {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
};

// Test connection to both servers
export const testConnections = async () => {
  try {
    const backendConnection = await fetch(`${BACKEND_URL}/`);
    const llmServerConnection = await fetch(`${LLM_SERVER_URL}/health`);
    
    return {
      backend: backendConnection.ok,
      llmServer: llmServerConnection.ok,
    };
  } catch (error) {
    console.error('Connection test failed:', error);
    return {
      backend: false,
      llmServer: false,
      error: error.message,
    };
  }
};

export default {
  connectShopify,
  syncShopifyData,
  getShopifyProducts,
  getShopifyOrders,
  getDashboardData,
  getLowStockProducts,
  getOutOfStockProducts,
  getProductInventory,
  getInventoryAnalytics,
  getSalesForecast,
  getRestockRecommendations,
  runInventorySimulations,
  getAIInsights,
  generateGeminiReport,
  testConnections,
};