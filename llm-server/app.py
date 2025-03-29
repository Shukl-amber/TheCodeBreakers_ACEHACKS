from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import logging
from dotenv import load_dotenv
from prediction_engine import PredictionEngine
from shopify_data_connector import ShopifyDataConnector

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

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0'
    })

@app.route('/api/predictions/restock', methods=['GET', 'POST'])
def get_restock_recommendations():
    """Generate restock recommendations for inventory items"""
    try:
        if request.method == 'POST':
            # Get data from request
            data = request.json
            
            if not data:
                logger.error("No data received in request")
                return jsonify({
                    'error': 'No data received',
                    'success': False
                }), 400
                
            logger.info(f"Received request for restock predictions with {len(data)} items")
            
            # Process through prediction engine
            predictions = engine.generate_restock_predictions(data)
        else:
            # GET method fetches data from backend API and generates predictions
            logger.info("Fetching inventory data from backend API and generating predictions")
            predictions = engine.generate_restock_predictions()
        
        logger.info(f"Generated {len(predictions)} restock predictions")
        
        return jsonify({
            'success': True,
            'predictions': predictions
        })
        
    except Exception as e:
        logger.exception("Error in restock predictions")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/api/predictions/simulate', methods=['GET', 'POST'])
def run_simulations():
    """Run inventory simulations with different scenarios"""
    try:
        if request.method == 'POST':
            # Get data from request
            data = request.json
            
            if not data or 'items' not in data:
                logger.error("Invalid data received for simulations")
                return jsonify({
                    'error': 'Invalid data format',
                    'success': False
                }), 400
                
            items = data['items']
            scenarios = data.get('scenarios', [])
        else:
            # GET method fetches data from backend API
            logger.info("Fetching inventory data from backend API for simulations")
            items = connector.get_inventory_for_predictions()
            scenarios = []  # Will use default scenarios
        
        logger.info(f"Running simulations on {len(items)} items with {len(scenarios)} scenarios")
        
        # Run simulations through prediction engine
        results = engine.run_inventory_simulations(items, scenarios)
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        logger.exception("Error in inventory simulations")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/api/insights/inventory', methods=['GET'])
def get_inventory_insights():
    """Generate AI-powered inventory insights"""
    try:
        logger.info("Generating inventory insights with Gemini")
        
        # Generate insights using Gemini
        insights = engine.generate_insights_with_gemini()
        
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

@app.route('/api/connector/test', methods=['GET'])
def test_connector():
    """Test connection to backend API"""
    try:
        logger.info("Testing connection to backend API")
        
        # Try to fetch some data
        inventory_data = connector.get_inventory_data()
        
        if 'error' in inventory_data:
            return jsonify({
                'success': False,
                'error': inventory_data['error'],
                'message': 'Failed to connect to backend API'
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'Successfully connected to backend API',
            'productCount': len(inventory_data.get('products', []))
        })
        
    except Exception as e:
        logger.exception("Error testing backend API connection")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Exception occurred while testing connection'
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5050))
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    
    logger.info(f"Starting LLM server on port {port}, debug mode: {debug_mode}")
    
    app.run(host='0.0.0.0', port=port, debug=debug_mode)