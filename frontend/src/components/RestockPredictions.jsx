import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRestockRecommendations, runInventorySimulations, getShopifyProducts, testConnections } from '../utils/api';

const RestockPredictions = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [simulationStatus, setSimulationStatus] = useState('idle'); // 'idle', 'running', 'completed', 'failed'
  const [connectionStatus, setConnectionStatus] = useState({ backend: false, llmServer: false });
  const [products, setProducts] = useState([]);
  
  useEffect(() => {
    checkConnections();
  }, []);
  
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
        setError('LLM server is not connected. AI recommendations are unavailable.');
        loadProductsForFallback();
      } else {
        // If LLM server is connected, load real recommendations
        loadRecommendations();
      }
    } catch (err) {
      console.error('Connection check failed:', err);
      setError('Failed to connect to servers. Please check your network connection.');
      setIsLoading(false);
    }
  };
  
  const loadProductsForFallback = async () => {
    try {
      // If LLM server is unavailable, load products from backend to show empty state
      const response = await getShopifyProducts();
      if (response && response.success && response.data) {
        setProducts(response.data);
      }
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load fallback products:', err);
      setIsLoading(false);
    }
  };
  
  const loadRecommendations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await getRestockRecommendations();
      
      if (response && response.success && response.predictions && response.predictions.length > 0) {
        // Transform API response to match component data structure
        const formattedRecommendations = response.predictions.map((item, index) => ({
          id: index + 1,
          name: item.name || item.productName || `Product ${index + 1}`,
          icon: getProductIcon(item.category || item.productType || 'general'),
          stock: item.currentStock || 0,
          suggestion: formatSuggestion(item),
          urgency: item.urgency || 'medium',
          details: item
        }));
        
        setRecommendations(formattedRecommendations);
      } else {
        // If no predictions but LLM is connected, show empty state
        setRecommendations([]);
        console.log('No recommendations available from LLM server');
      }
    } catch (err) {
      console.error('Error fetching restock recommendations:', err);
      setError('Failed to load AI recommendations. Please try again.');
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to get icon based on product category
  const getProductIcon = (category) => {
    if (!category) return '📦';
    
    const type = category.toLowerCase();
    if (type.includes('shirt') || type.includes('hoodie') || type.includes('sweater') || type.includes('apparel')) return '👕';
    if (type.includes('pant') || type.includes('jean') || type.includes('trouser')) return '👖';
    if (type.includes('shoe') || type.includes('sneaker') || type.includes('boot')) return '👟';
    if (type.includes('hat') || type.includes('cap')) return '🧢';
    if (type.includes('bag') || type.includes('backpack')) return '🎒';
    if (type.includes('watch')) return '⌚';
    if (type.includes('glass') || type.includes('sunglass')) return '👓';
    if (type.includes('laptop') || type.includes('computer')) return '💻';
    if (type.includes('mobile') || type.includes('phone')) return '📱';
    if (type.includes('camera')) return '📷';
    if (type.includes('keyboard')) return '⌨️';
    if (type.includes('electronics')) return '🔌';
    
    return '📦'; // Default icon
  };
  
  // Helper function to format suggestion based on API response
  const formatSuggestion = (item) => {
    if (!item) return 'No data';
    
    if (item.recommendedOrderQuantity && item.recommendedOrderQuantity > 0) {
      return `Order ${item.recommendedOrderQuantity} More Units`;
    }
    
    if (item.daysUntilStockout !== undefined) {
      return item.daysUntilStockout <= 0 
        ? 'Stock Out! Order Immediately' 
        : `Restock in ${item.daysUntilStockout} Days`;
    }
    
    if (item.restockUrgency === 'high' || item.urgency === 'high') {
      return 'Restock Soon';
    }
    
    if (item.restockUrgency === 'medium' || item.urgency === 'medium') {
      return 'Monitor Stock Levels';
    }
    
    return 'No Restock Needed';
  };
  
  const runSimulation = async () => {
    if (!connectionStatus.llmServer) {
      setError('Cannot run simulation: LLM server is not connected');
      return;
    }
    
    try {
      setSimulationStatus('running');
      setError(null);
      
      // Prepare parameters for the simulation
      const parameters = {
        scenarios: [
          {
            name: 'baseline',
            demandChange: 0,
            description: 'Current demand patterns'
          },
          {
            name: 'highDemand',
            demandChange: 0.25,
            description: '25% increase in demand'
          },
          {
            name: 'seasonalPeak',
            demandChange: 0.5,
            description: '50% increase during seasonal peak'
          }
        ],
        timeframe: {
          days: 30,
          startDate: new Date().toISOString()
        }
      };
      
      // Call the LLM server to run simulations
      const result = await runInventorySimulations(parameters);
      
      if (result && result.success && result.results) {
        console.log('Simulation results:', result.results);
        setSimulationStatus('completed');
        
        // Refresh recommendations after simulation
        await loadRecommendations();
      } else {
        setSimulationStatus('failed');
        setError('Simulation completed but no results were returned.');
      }
    } catch (err) {
      console.error('Error running inventory simulations:', err);
      setSimulationStatus('failed');
      setError('Failed to run simulation. Please try again.');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md flex justify-center items-center h-64">
        <p className="text-gray-600">Loading AI recommendations...</p>
      </div>
    );
  }

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
      
      {/* Error message if any */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-md">
          <p>{error}</p>
          {connectionStatus.llmServer && (
            <button 
              onClick={() => loadRecommendations()}
              className="mt-2 text-sm text-red-700 underline"
            >
              Try again
            </button>
          )}
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between p-4 border-b border-gray-200 mb-4">
        <h2 className="text-lg font-semibold flex items-center mb-3 md:mb-0">
          <span className="mr-2">🔮</span>
          AI Restock Recommendations
        </h2>
        
        <div className="flex space-x-3">
          <button
            onClick={runSimulation}
            disabled={simulationStatus === 'running' || !connectionStatus.llmServer}
            className={`px-4 py-2 rounded-md ${
              simulationStatus === 'running' || !connectionStatus.llmServer
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            } transition-colors`}
          >
            {simulationStatus === 'running' ? 'Running Simulation...' : 'Run New Simulation'}
          </button>
          
          <Link
            to='/inventory'
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Back to Inventory
          </Link>
        </div>
      </div>

      {/* Simulation status */}
      {simulationStatus === 'completed' && (
        <div className="mb-4 p-3 bg-green-100 border border-green-200 text-green-700 rounded-md">
          <p className="font-medium">Simulation completed successfully!</p>
          <p className="text-sm">Recommendations have been updated based on simulation results.</p>
        </div>
      )}

      {/* Recommendations Table */}
      <div className="overflow-x-auto">
        {connectionStatus.llmServer ? (
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
                  🔮 AI Suggestion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  🚨 Urgency
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recommendations.length > 0 ? (
                recommendations.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-xl mr-2">{item.icon}</span>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.stock}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.suggestion.includes('No Restock') 
                          ? 'bg-green-100 text-green-800' 
                          : item.suggestion.includes('Restock in') 
                            ? 'bg-yellow-100 text-yellow-800'
                            : item.suggestion.includes('Stock Out')
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.suggestion}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.urgency === 'high' 
                          ? 'bg-red-100 text-red-800' 
                          : item.urgency === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {item.urgency === 'high' ? 'High' : item.urgency === 'medium' ? 'Medium' : 'Low'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    No restock recommendations available. Run a simulation to generate recommendations.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center">
            <div className="text-amber-500 text-xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">LLM Server Not Connected</h3>
            <p className="text-gray-600">
              AI-powered restock recommendations require connection to the LLM server.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Please ensure the LLM server is running and refresh the page.
            </p>
            <button
              onClick={() => checkConnections()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-md">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">ℹ️ About AI Recommendations</h3>
        <p className="text-xs text-blue-600">
          These recommendations are generated by our AI system based on historical inventory data, sales patterns, and current stock levels. 
          The system predicts future demand and suggests optimal restock quantities and timing to minimize stockouts while optimizing inventory costs.
        </p>
      </div>
    </div>
  );
};

export default RestockPredictions;