import logging
import json
import os
from dotenv import load_dotenv

# Load environment variables for API keys
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

class PredictionEngine:
    """Simple engine for generating inventory predictions using Gemini API"""
    
    def __init__(self):
        """Initialize the prediction engine"""
        # API key for Gemini
        self.gemini_api_key = os.environ.get('GEMINI_API_KEY')
        if not self.gemini_api_key:
            logger.warning("No Gemini API key found. Set GEMINI_API_KEY in .env file.")
    
    def analyze_inventory_with_gemini(self, inventory_data, sales_data, simulation_context=None):
        """
        Simple function to analyze inventory data using Gemini API
        
        Args:
            inventory_data (dict): Current inventory data
            sales_data (dict): Recent sales data
            simulation_context (str, optional): Additional context for simulation
            
        Returns:
            dict: AI-generated insights
        """
        try:
            import google.genai as genai
            
            if not self.gemini_api_key:
                logger.error("Missing Gemini API key")
                return self._generate_fallback_response()
            
            # Configure the Gemini API
            genai.Client(api_key=self.gemini_api_key)
            model = client
            
            # Create simplified data to avoid token limits
            products = inventory_data.get('products', [])[:15]  # Limit to first 15 products
            orders = sales_data.get('orders', [])[:10]  # Limit to first 10 orders
            
            # Craft a simple prompt for Gemini
            context = f"Simulation: {simulation_context}" if simulation_context else ""
            
            prompt = f"""
            {context}
            
            You are an inventory analyst for an e-commerce store. Analyze this inventory and order data and provide insights.
            
            INVENTORY DATA (showing {len(products)} products):
            {json.dumps(products, indent=2)}
            
            ORDER DATA (showing {len(orders)} orders):
            {json.dumps(orders, indent=2)}
            
            Provide a JSON response with the following structure:
            {{
              "inventoryHealth": "Brief assessment of inventory health",
              "keyInsights": ["insight 1", "insight 2", "insight 3"],
              "actionItems": ["action 1", "action 2", "action 3"],
              "lowStockItems": ["item 1", "item 2"],
              "topSellingItems": ["item 1", "item 2"],
              "restock_recommendations": ["recommendation 1", "recommendation 2"]
            }}
            """
            
            # Generate response from Gemini
            response = model.generate_content(prompt)
            response_text = response.text
            
            # Try to parse the response as JSON
            try:
                # Find JSON content within response
                start = response_text.find('{')
                end = response_text.rfind('}') + 1
                if start >= 0 and end > start:
                    json_str = response_text[start:end]
                    insights = json.loads(json_str)
                else:
                    insights = json.loads(response_text)
                
                logger.info("Successfully parsed Gemini response")
                return insights
            
            except json.JSONDecodeError:
                logger.error("Failed to parse Gemini response as JSON")
                return {
                    "inventoryHealth": "Analysis available in raw text format only",
                    "keyInsights": ["Could not parse structured insights"],
                    "actionItems": ["Review raw response for recommendations"],
                    "rawResponse": response_text
                }
                
        except ImportError:
            logger.error("Google Generative AI module not found")
            return self._generate_fallback_response()
            
        except Exception as e:
            logger.exception(f"Error analyzing inventory with Gemini: {str(e)}")
            return self._generate_fallback_response()
    
    def _generate_fallback_response(self):
        """Generate a fallback response when Gemini API is unavailable"""
        return {
            "inventoryHealth": "Unable to analyze inventory with AI. API unavailable.",
            "keyInsights": [
                "AI analysis unavailable - check your API key configuration",
                "Consider checking items with quantity below 10 units",
                "Review recent order history manually for trends"
            ],
            "actionItems": [
                "Set up the Gemini API key in environment variables",
                "Monitor low stock items manually",
                "Review sales trends in dashboard"
            ],
            "lowStockItems": [],
            "topSellingItems": [],
            "restock_recommendations": []
        }