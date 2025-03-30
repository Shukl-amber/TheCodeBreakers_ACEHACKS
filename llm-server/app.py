from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import logging
from dotenv import load_dotenv
from prediction_engine import PredictionEngine
from shopify_data_connector import ShopifyDataConnector
from google import genai

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('llm-server.log')
    ]
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize prediction engine and data connector
engine = PredictionEngine()
connector = ShopifyDataConnector()

# Initialize Gemini client
gemini_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0'
    })

@app.route('/api/predictions/restock', methods=['GET'])
def get_restock_predictions():
    """Generate AI-powered restock recommendations"""
    try:
        logger.info("Generating restock recommendations with Gemini")
        
        # Get inventory and sales data from the connector
        inventory_data = connector.get_inventory_data()
        sales_data = connector.get_sales_data()
        
        # Check if we got data successfully
        if 'error' in inventory_data or 'error' in sales_data:
            # If backend data fetch failed, use mock data
            logger.warning("Using mock data for restock recommendations due to backend connectivity issues")
            mock_data = connector.get_mock_data()
            inventory_data = mock_data["inventory"]
            sales_data = mock_data["orders"]
        
        # Generate insights using the prediction engine
        insights = engine.analyze_inventory_with_gemini(inventory_data, sales_data)
        
        # Extract restock recommendations from insights
        restock_recommendations = insights.get('restock_recommendations', [])
        low_stock_alert = insights.get('lowStockItems', [])
        
        # Create summary from insights
        restock_summary = insights.get('inventoryHealth', 'No summary available')
        
        logger.info(f"Generated {len(restock_recommendations)} restock recommendations")
        
        # Make sure we have at least one recommendation even if there's none
        if not restock_recommendations or len(restock_recommendations) == 0:
            logger.warning("No recommendations generated, creating fallback recommendation")
            restock_recommendations = [{
                "productId": "fallback-1",
                "name": "Sample Product",
                "currentStock": 5,
                "recommendedOrderQuantity": 10,
                "restockUrgency": "medium",
                "daysUntilStockout": 7,
                "category": "general",
                "avgDailySales": 0.7,
                "confidenceScore": 0.85,
                "reason": "Low inventory sample"
            }]
        
        return jsonify({
            'success': True,
            'predictions': restock_recommendations,  # This must be named 'predictions' for the frontend
            'low_stock_alert': low_stock_alert,
            'restock_summary': restock_summary
        })
        
    except Exception as e:
        logger.exception(f"Error generating restock predictions: {str(e)}")
        # Return a fallback response to avoid breaking the frontend
        return jsonify({
            'success': False,
            'message': f"Error generating predictions: {str(e)}",
            'predictions': [{
                "productId": "error-1",
                "name": "Error Occurred",
                "currentStock": 0,
                "recommendedOrderQuantity": 0,
                "restockUrgency": "high",
                "daysUntilStockout": 0,
                "category": "general",
                "reason": f"Error: {str(e)}"
            }]
        }), 500

# Simplified inventory insights endpoint that uses any available data or mock data
@app.route('/api/insights/inventory', methods=['GET'])
def get_inventory_insights():
    """Generate AI-powered inventory insights using any available data or mock data"""
    try:
        logger.info("Generating inventory insights with Gemini")
        
        # First try to get data from backend
        inventory_data = connector.get_inventory_data()
        order_data = connector.get_order_data()
        
        # Check if we got data successfully
        if 'error' in inventory_data or 'error' in order_data:
            # If backend data fetch failed, use mock data
            logger.warning("Using mock data for insights due to backend connectivity issues")
            mock_data = connector.get_mock_data()
            inventory_data = mock_data["inventory"]
            order_data = mock_data["orders"]
        
        logger.info("Successfully prepared data for Gemini analysis")
        
        # Generate insights using Gemini
        insights = engine.analyze_inventory_with_gemini(inventory_data, order_data)
        
        return jsonify({
            'success': True,
            'insights': insights
        })
        
    except Exception as e:
        logger.exception("Error generating inventory insights")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/api/insights/inventory-basic', methods=['POST'])
def get_basic_inventory_insights():
    """Accept inventory data directly in request body and return insights"""
    try:
        # Get data from request
        data = request.json
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided in request body'
            }), 400
            
        inventory_data = data.get('inventory', {})
        order_data = data.get('orders', {})
        
        logger.info(f"Received direct inventory data with {len(inventory_data.get('products', []))} products")
        
        # Generate insights using Gemini
        insights = engine.analyze_inventory_with_gemini(inventory_data, order_data)
        
        return jsonify({
            'success': True,
            'insights': insights
        })
        
    except Exception as e:
        logger.exception("Error generating inventory insights from direct data")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

# New routes to match frontend expectations - /api/prediction/ endpoints
@app.route('/api/prediction/inventory', methods=['GET'])
def get_inventory_prediction():
    """Generate AI-powered inventory predictions and insights"""
    try:
        logger.info("Generating inventory predictions with Gemini via /api/prediction/inventory")
        
        # Get data from backend
        inventory_data = connector.get_inventory_data()
        order_data = connector.get_order_data()
        
        # Check if we got data successfully
        if 'error' in inventory_data or 'error' in order_data:
            # If backend data fetch failed, use mock data
            logger.warning("Using mock data for predictions due to backend connectivity issues")
            mock_data = connector.get_mock_data()
            inventory_data = mock_data["inventory"]
            order_data = mock_data["orders"]
        
        # Generate insights using Gemini
        insights = engine.analyze_inventory_with_gemini(inventory_data, order_data)
        
        return jsonify({
            'success': True,
            'predictions': insights
        })
        
    except Exception as e:
        logger.exception("Error generating inventory predictions")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/api/prediction/analyze', methods=['POST'])
def analyze_data():
    """Endpoint for analyzing custom data with predictions"""
    try:
        # Get data from request
        data = request.json
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided in request body'
            }), 400
            
        inventory_data = data.get('inventory', {})
        order_data = data.get('orders', {})
        
        logger.info(f"Received data for analysis via /api/prediction/analyze")
        
        # Generate insights using Gemini
        insights = engine.analyze_inventory_with_gemini(inventory_data, order_data)
        
        return jsonify({
            'success': True,
            'predictions': insights
        })
        
    except Exception as e:
        logger.exception("Error analyzing data for predictions")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/api/predictions/simulate', methods=['POST'])
def simulate_inventory():
    """Endpoint for simulating inventory scenarios"""
    try:
        # Get parameters from request
        params = request.json
        
        if not params:
            return jsonify({
                'success': False,
                'error': 'No simulation parameters provided in request body'
            }), 400
        
        logger.info(f"Received request for inventory simulation")
        
        # Get inventory and order data
        inventory_data = connector.get_inventory_data()
        order_data = connector.get_order_data()
        
        # Check if we got data successfully
        if 'error' in inventory_data or 'error' in order_data:
            # If backend data fetch failed, use mock data
            logger.warning("Using mock data for simulation due to backend connectivity issues")
            mock_data = connector.get_mock_data()
            inventory_data = mock_data["inventory"]
            order_data = mock_data["orders"]
        
        # Combine with simulation parameters
        simulation_data = {
            'inventory': inventory_data,
            'orders': order_data,
            'parameters': params
        }
        
        # Generate simulation results using Gemini
        insights = engine.analyze_inventory_with_gemini(
            simulation_data['inventory'], 
            simulation_data['orders'],
            simulation_context=f"Simulate inventory with these parameters: {json.dumps(params)}"
        )
        
        return jsonify({
            'success': True,
            'simulation_results': insights
        })
        
    except Exception as e:
        logger.exception("Error simulating inventory scenarios")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/api/reports/generate', methods=['POST'])
def generate_report():
    """Generate a formatted report using Gemini AI"""
    try:
        # Get data from request
        request_data = request.json
        
        if not request_data or 'data' not in request_data:
            return jsonify({
                'success': False,
                'error': 'No data provided in request body'
            }), 400
        
        logger.info("Generating inventory report with Gemini")
        
        # Format the data for Gemini
        data = request_data['data']
        content_str = json.dumps(data, indent=2)
        
        # Generate report with Gemini
        prompt = f"""
        Generate a well formatted sales data report that contains a summary of the provided calculated data
        such as profit or percentages, number of products sold, number of products left in inventory etc.

        Tabulate the result in a well formatted table with the following headings {{Product, Total Quantity Sold, Gross Revenue, Predicted Sales for Next Week, Number of items to Restock}}.

        Ensure to use Rupees as the currency and prepend the rupee sign where every necessary
        Only provide the Report in your response
        """
        
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash", 
            contents=prompt + content_str
        )
        
        # Extract the report content
        report_content = response.text
        
        # Save report locally for debugging purposes
        with open('last_report.md', 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        logger.info("Successfully generated inventory report with Gemini")
        
        return jsonify({
            'success': True,
            'reportContent': report_content
        })
        
    except Exception as e:
        logger.exception(f"Error generating report: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to generate report'
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5050))
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    
    logger.info(f"Starting LLM server on port {port}, debug mode: {debug_mode}")
    
    app.run(host='0.0.0.0', port=port, debug=debug_mode)