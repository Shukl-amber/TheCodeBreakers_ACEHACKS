import requests
import json
import logging
import os
from datetime import datetime, timedelta
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
    """
    Connector to fetch Shopify data from the backend server
    """
    
    def __init__(self):
        """
        Initialize the connector
        """
        self.backend_url = os.environ.get('BACKEND_URL', 'http://localhost:5000')
        self.api_base = f"{self.backend_url}/api"
        logger.info(f"Initialized ShopifyDataConnector with backend URL: {self.backend_url}")
    
    def get_inventory_data(self):
        """
        Fetch inventory data from the backend
        
        Returns:
            dict: Inventory data including products and their sales history
        """
        try:
            endpoint = f"{self.api_base}/inventory/dashboard"
            logger.info(f"Fetching inventory data from {endpoint}")
            
            response = requests.get(endpoint, timeout=30)
            response.raise_for_status()
            
            # Parse response
            data = response.json()
            logger.info(f"Successfully fetched inventory dashboard data")
            return data
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to fetch inventory data: {str(e)}"
            logger.error(error_msg)
            return {"error": error_msg, "products": []}
    
    def get_order_data(self, days=90):
        """
        Fetch order data from the backend
        
        Returns:
            dict: Order data including order history
        """
        try:
            # Calculate date range
            end_date = datetime.now().strftime('%Y-%m-%d')
            start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
            
            endpoint = f"{self.api_base}/shopify/orders"
            
            logger.info(f"Fetching order data from {endpoint}")
            
            response = requests.get(endpoint, timeout=30)
            response.raise_for_status()
            
            # Parse response
            data = response.json()
            logger.info(f"Successfully fetched order data")
            return data
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to fetch order data: {str(e)}"
            logger.error(error_msg)
            return {"error": error_msg, "orders": []}
            
    def get_sales_data(self, days=90):
        """
        Fetch sales data from the backend
        
        Args:
            days (int): Number of days of sales history to fetch
            
        Returns:
            dict: Sales data including product sales history
        """
        try:
            # Calculate date range
            end_date = datetime.now().strftime('%Y-%m-%d')
            start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
            
            endpoint = f"{self.api_base}/analytics/sales"
            
            logger.info(f"Fetching sales data from {endpoint}")
            
            response = requests.get(endpoint, timeout=30)
            response.raise_for_status()
            
            # Parse response
            data = response.json()
            logger.info(f"Successfully fetched sales data")
            return data
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to fetch sales data: {str(e)}"
            logger.error(error_msg)
            # If we can't get sales data, we can use order data as a fallback
            logger.info("Using order data as fallback for sales data")
            return self.get_order_data(days)
    
    def get_analytics_data(self):
        """Fetch analytics data from backend"""
        try:
            endpoint = f"{self.api_base}/analytics/data"
            logger.info(f"Fetching analytics data from: {endpoint}")
            
            response = requests.get(endpoint)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched analytics data")
            
            return data
        except Exception as e:
            error_msg = f"Error fetching analytics data: {str(e)}"
            logger.error(error_msg)
            return {"error": error_msg}
            
    def get_inventory_for_predictions(self):
        """Fetch formatted inventory data for AI predictions"""
        try:
            endpoint = f"{self.api_base}/analytics/inventory-for-ai"
            logger.info(f"Fetching formatted inventory data for AI predictions")
            
            response = requests.get(endpoint)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched data for {len(data.get('items', []))} items")
            
            return data.get('items', [])
        except Exception as e:
            error_msg = f"Error fetching inventory data for predictions: {str(e)}"
            logger.error(error_msg)
            return []
            
    def send_predictions_to_backend(self, predictions):
        """Send AI predictions back to backend for storage"""
        try:
            endpoint = f"{self.api_base}/analytics/save-predictions"
            logger.info(f"Sending {len(predictions)} predictions to backend")
            
            response = requests.post(endpoint, json={"predictions": predictions})
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"Successfully sent predictions to backend")
            
            return result
        except Exception as e:
            error_msg = f"Error sending predictions to backend: {str(e)}"
            logger.error(error_msg)
            return {"error": error_msg, "success": False}
    
    def get_mock_data(self):
        """
        Generate mock data when backend is unavailable
        
        Returns:
            dict: Mock inventory and sales data
        """
        logger.info("Generating mock data for analysis")
        
        # Mock products
        products = [
            {
                "id": "prod1",
                "title": "T-Shirt",
                "inventory_quantity": 25,
                "price": 19.99,
                "sales_history": [5, 7, 4, 6, 8]
            },
            {
                "id": "prod2",
                "title": "Hoodie",
                "inventory_quantity": 12,
                "price": 49.99, 
                "sales_history": [3, 2, 4, 1, 2]
            },
            {
                "id": "prod3", 
                "title": "Jeans",
                "inventory_quantity": 8,
                "price": 59.99,
                "sales_history": [2, 3, 1, 2, 0]
            },
            {
                "id": "prod4",
                "title": "Sneakers",
                "inventory_quantity": 5,
                "price": 89.99,
                "sales_history": [1, 2, 1, 0, 1]
            }
        ]
        
        # Mock orders
        orders = [
            {"id": "ord1", "date": "2023-03-15", "total": 89.97, "items": [{"product_id": "prod1", "quantity": 2}, {"product_id": "prod3", "quantity": 1}]},
            {"id": "ord2", "date": "2023-03-16", "total": 49.99, "items": [{"product_id": "prod2", "quantity": 1}]},
            {"id": "ord3", "date": "2023-03-18", "total": 139.98, "items": [{"product_id": "prod3", "quantity": 2}, {"product_id": "prod1", "quantity": 1}]}
        ]
        
        return {
            "inventory": {"products": products},
            "orders": {"orders": orders}
        }