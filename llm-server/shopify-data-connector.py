import requests
import json
import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

class ShopifyDataConnector:
    """Connector for fetching data from backend API"""
    
    def __init__(self):
        """Initialize the connector with backend API URL"""
        self.api_url = os.environ.get('BACKEND_API_URL', 'http://localhost:5000/api')
        logger.info(f"ShopifyDataConnector initialized with API URL: {self.api_url}")
    
    def get_inventory_data(self):
        """Fetch inventory data from backend"""
        try:
            url = f"{self.api_url}/inventory/all"
            logger.info(f"Fetching inventory data from: {url}")
            
            response = requests.get(url)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched {len(data.get('products', []))} inventory items")
            
            return data
        except Exception as e:
            logger.error(f"Error fetching inventory data: {str(e)}")
            return {"error": str(e), "products": []}
    
    def get_analytics_data(self):
        """Fetch analytics data from backend"""
        try:
            url = f"{self.api_url}/analytics/data"
            logger.info(f"Fetching analytics data from: {url}")
            
            response = requests.get(url)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched analytics data")
            
            return data
        except Exception as e:
            logger.error(f"Error fetching analytics data: {str(e)}")
            return {"error": str(e)}
    
    def get_inventory_for_predictions(self):
        """Fetch formatted inventory data for AI predictions"""
        try:
            url = f"{self.api_url}/analytics/inventory-for-ai"
            logger.info(f"Fetching formatted inventory data for AI predictions")
            
            response = requests.get(url)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched data for {len(data.get('items', []))} items")
            
            return data.get('items', [])
        except Exception as e:
            logger.error(f"Error fetching inventory data for predictions: {str(e)}")
            return []
    
    def send_predictions_to_backend(self, predictions):
        """Send AI predictions back to backend for storage"""
        try:
            url = f"{self.api_url}/analytics/save-predictions"
            logger.info(f"Sending {len(predictions)} predictions to backend")
            
            response = requests.post(url, json={"predictions": predictions})
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"Successfully sent predictions to backend")
            
            return result
        except Exception as e:
            logger.error(f"Error sending predictions to backend: {str(e)}")
            return {"error": str(e), "success": False}

if __name__ == "__main__":
    # If run directly, fetch and output inventory data as JSON
    connector = ShopifyDataConnector()
    inventory_data = connector.get_inventory_for_predictions()
    print(json.dumps(inventory_data))