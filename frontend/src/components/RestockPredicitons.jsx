const RestockPredictions = () => {
  // Sample recommendations data
  const recommendations = [
    { id: 1, name: 'Blue Hoodie', icon: '👕', stock: 20, suggestion: 'Restock in 3 Days' },
    { id: 2, name: 'Red T-shirt', icon: '👕', stock: 10, suggestion: 'Order 8 More Units' },
    { id: 3, name: 'Black Jeans', icon: '👖', stock: 50, suggestion: 'No Restock Needed' },
  ];

//   const handleAcceptSuggestion = () => {
//     console.log('Accept suggestions clicked');
//     // Implement accept suggestion functionality
//   };

//   const handleRequestManualAnalysis = () => {
//     console.log('Request manual analysis clicked');
//     // Implement manual analysis request
//   };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          <span className="mr-2">🔮</span>
          AI Restock Recommendations
        </h2>
      </div>

      {/* Recommendations Table */}
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
                🔮 AI Suggestion
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {recommendations.map((item) => (
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
                        : 'bg-blue-100 text-blue-800'
                  }`}>
                    {item.suggestion}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      {/* <div className="mt-6 flex flex-col md:flex-row justify-end space-y-3 md:space-y-0 md:space-x-3">
        <button 
          onClick={handleAcceptSuggestion}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Accept Suggestion
        </button>
        
      </div> */}
    </div>
  );
};

export default RestockPredictions;