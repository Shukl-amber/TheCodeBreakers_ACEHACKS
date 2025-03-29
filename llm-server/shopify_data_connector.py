import requests
import json
import logging
import os
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ShopifyDataConnector:
    """
    Connector to fetch Shopify data from the backend server
    """
    
    def __init__(self, backend_url=None):
        """
        Initialize the connector
        
        Args:
            backend_url (str, optional): URL of the backend server
        """
        self.backend_url = backend_url or os.environ.get('BACKEND_URL', 'http://localhost:5000')
        logger.info(f"Initialized ShopifyDataConnector with backend URL: {self.backend_url}")
    
    def get_inventory_data(self):
        """
        Fetch inventory data from the backend
        
        Returns:
            dict: Inventory data including products and their sales history
        """
        try:
            # Make API request to backend
            endpoint = f"{self.backend_url}/api/inventory"
            logger.info(f"Fetching inventory data from {endpoint}")
            
            response = requests.get(endpoint, timeout=30)
            response.raise_for_status()
            
            # Parse response
            data = response.json()
            logger.info(f"Successfully fetched data for {len(data.get('products', []))} products")
            
            # Enrich data with sales history if not included
            if data.get('products') and not any('salesHistory' in p for p in data['products']):
                self._enrich_with_sales_history(data['products'])
                
            return data
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to fetch inventory data: {str(e)}"
            logger.error(error_msg)
            return {"error": error_msg, "products": []}
    
    def get_order_data(self, days=90):
        """
        Fetch order data from the backend
        
        Args:
            days (int): Number of days to fetch data for
            
        Returns:
            dict: Order data including order history
        """
        try:
            # Calculate date range
            end_date = datetime.now().strftime('%Y-%m-%d')
            start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
            
            # Make API request to backend
            endpoint = f"{self.backend_url}/api/orders"
            params = {
                'startDate': start_date,
                'endDate': end_date
            }
            
            logger.info(f"Fetching order data from {endpoint} for period {start_date} to {end_date}")
            
            response = requests.get(endpoint, params=params, timeout=30)
            response.raise_for_status()
            
            # Parse response
            data = response.json()
            logger.info(f"Successfully fetched {len(data.get('orders', []))} orders")
            return data
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to fetch order data: {str(e)}"
            logger.error(error_msg)
            return {"error": error_msg, "orders": []}
    
    def get_inventory_for_predictions(self):
        """
        Fetch inventory data specifically formatted for prediction engine
        
        Returns:
            list: List of inventory items with sales history and metadata
        """
        try:
            # Get inventory data
            inventory_data = self.get_inventory_data()
            if 'error' in inventory_data:
                logger.error(f"Failed to fetch inventory data: {inventory_data['error']}")
                return []
                
            products = inventory_data.get('products', [])
            
            # Format products for prediction engine
            formatted_items = []
            for product in products:
                # Skip products with missing essential data
                if not product.get('id'):
                    continue
                    
                # Calculate sales velocity if not present
                sales_velocity = product.get('salesVelocity', {})
                if not sales_velocity.get('daily'):
                    sales_history = product.get('salesHistory', [])
                    if sales_history:
                        # Calculate total quantity
                        total_quantity = sum(sale.get('quantity', 0) for sale in sales_history)
                        
                        # Get date range
                        dates = [sale.get('date') for sale in sales_history if sale.get('date')]
                        if dates:
                            try:
                                date_objects = [datetime.strptime(date, "%Y-%m-%d") for date in dates]
                                min_date = min(date_objects)
                                max_date = max(date_objects)
                                date_range = (max_date - min_date).days + 1
                                
                                # Calculate daily velocity
                                daily_velocity = total_quantity / max(date_range, 1)
                            except (ValueError, TypeError):
                                daily_velocity = total_quantity / 30  # Assume 30 days
                        else:
                            daily_velocity = 0
                    else:
                        daily_velocity = 0
                        
                    sales_velocity = {
                        'daily': daily_velocity,
                        'weekly': daily_velocity * 7,
                        'monthly': daily_velocity * 30
                    }
                
                # Format the item
                formatted_item = {
                    'id': product.get('id'),
                    'name': product.get('title', 'Unknown Product'),
                    'sku': product.get('sku', 'unknown'),
                    'quantity': product.get('inventory_quantity', 0),
                    'price': product.get('price', 0),
                    'cost': product.get('cost', 0),
                    'leadTime': product.get('leadTime', 14),
                    'salesHistory': product.get('salesHistory', []),
                    'salesVelocity': sales_velocity,
                    'orderCost': product.get('orderCost', 25),  # Default ordering cost
                    'holdingCost': product.get('holdingCost', 0.2)  # Default holding cost rate (20%)
                }
                
                formatted_items.append(formatted_item)
                
            logger.info(f"Formatted {len(formatted_items)} inventory items for predictions")
            return formatted_items
            
        except Exception as e:
            logger.error(f"Error formatting inventory data for predictions: {e}")
            return []
    
    def send_predictions_to_backend(self, predictions):
        """
        Send generated predictions back to the backend
        
        Args:
            predictions (list): List of prediction objects
            
        Returns:
            dict: Response from the backend
        """
        try:
            # Create payload
            payload = {
                'predictions': predictions,
                'generatedAt': datetime.now().isoformat()
            }
            
            # Make API request to backend
            endpoint = f"{self.backend_url}/api/analytics/predictions"
            logger.info(f"Sending {len(predictions)} predictions to {endpoint}")
            
            response = requests.post(
                endpoint, 
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            response.raise_for_status()
            
            # Parse response
            data = response.json()
            logger.info(f"Successfully sent predictions to backend: {data.get('message', 'No message')}")
            return data
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to send predictions to backend: {str(e)}"
            logger.error(error_msg)
            return {"error": error_msg}
            
    def _enrich_with_sales_history(self, products):
        """
        Enrich product data with sales history
        
        Args:
            products (list): List of product objects
        """
        try:
            # Fetch order data
            order_data = self.get_order_data(90)
            if 'error' in order_data:
                logger.warning("Could not fetch order data for sales history enrichment")
                return
                
            orders = order_data.get('orders', [])
            
            # Create a map of product ID to sales history
            product_sales = {}
            
            for order in orders:
                order_date = datetime.fromisoformat(order.get('created_at', '').replace('Z', '+00:00'))
                line_items = order.get('line_items', [])
                
                for item in line_items:
                    product_id = item.get('product_id')
                    if not product_id:
                        continue
                        
                    quantity = item.get('quantity', 0)
                    
                    if product_id not in product_sales:
                        product_sales[product_id] = []
                        
                    product_sales[product_id].append({
                        'date': order_date.strftime('%Y-%m-%d'),
                        'quantity': quantity
                    })
            
            # Add sales history to products
            for product in products:
                product_id = product.get('id')
                if product_id in product_sales:
                    product['salesHistory'] = sorted(
                        product_sales[product_id],
                        key=lambda x: x['date']
                    )
                else:
                    product['salesHistory'] = []
                    
            logger.info(f"Enriched {len([p for p in products if 'salesHistory' in p])} products with sales history")
            
        except Exception as e:
            logger.error(f"Error enriching products with sales history: {e}")