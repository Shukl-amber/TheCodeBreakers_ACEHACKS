import logging
import json
import os
from dotenv import load_dotenv
import google.genai as genai
from google.genai import types
from datetime import datetime

# Load environment variables for API keys
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

class PredictionEngine:
    """Engine for generating inventory predictions using the Gemini API"""

    def __init__(self):
        """Initialize the prediction engine"""
        # API key for Gemini
        self.gemini_api_key = os.environ.get('GEMINI_API_KEY')
        if not self.gemini_api_key:
            logger.warning("No Gemini API key found. Set GEMINI_API_KEY in .env file.")
        else:
            # Initialize the Gen AI client
            self.client = genai.Client(api_key=self.gemini_api_key)

    def analyze_inventory_with_gemini(self, inventory_data, sales_data, simulation_context=None):
        """
        Analyze inventory data using the Gemini API

        Args:
            inventory_data (dict/list): Inventory data from backend
            sales_data (dict/list): Sales/order data from backend
            simulation_context (str, optional): Additional context for simulation

        Returns:
            dict: AI-generated insights in structured JSON format matching frontend expectations
        """
        if not self.gemini_api_key:
            logger.error("Missing Gemini API key")
            return self._generate_fallback_response()

        # Debug logging - Print input data
        logger.info(f"Analyzing inventory data: {len(inventory_data) if isinstance(inventory_data, list) else 'dict'}")
        logger.info(f"With sales data: {len(sales_data) if isinstance(sales_data, list) else 'dict'}")
        
        # Print a sample of the inventory data (first 2 items) for debugging
        debug_inventory = inventory_data[:2] if isinstance(inventory_data, list) else inventory_data
        logger.info(f"DEBUG - Sample inventory data sent to Gemini: {json.dumps(debug_inventory, indent=2)}")
        
        # Print a sample of the sales data (first 2 items) for debugging
        debug_sales = sales_data[:2] if isinstance(sales_data, list) else sales_data
        logger.info(f"DEBUG - Sample sales data sent to Gemini: {json.dumps(debug_sales, indent=2)}")

        # Create context for the prompt
        context = f"Simulation: {simulation_context}" if simulation_context else ""
        current_date = datetime.now().strftime("%Y-%m-%d")

        # Send the raw data from backend directly to Gemini without transformations
        # This preserves all the detailed information prepared by the backend
        prompt = f"""
        {context}
        
        You are an advanced inventory management AI for a Shopify e-commerce store. Your task is to analyze inventory and sales data to provide actionable insights and predictions.

        Today's date: {current_date}

        # INVENTORY DATA FROM BACKEND:
        {json.dumps(inventory_data, indent=2)}

        # ORDER/SALES DATA FROM BACKEND:
        {json.dumps(sales_data, indent=2)}

        Based on the data provided, create a detailed inventory analysis with the following:
        
        1. Identify products with low stock levels that need to be restocked
        2. Calculate expected days until stockout for each product based on sales velocity
        3. Make specific restocking recommendations with quantities
        4. Assign urgency levels (high, medium, low) to each product
        5. Identify top-selling products based on order history
        
        Your response MUST be a valid JSON object with the following structure exactly matching these field names:
        {{
          "inventoryHealth": "Brief overall inventory health assessment in one sentence",
          "keyInsights": ["insight 1", "insight 2", "insight 3"],
          "actionItems": ["action 1", "action 2", "action 3"],
          "lowStockItems": [
            {{ 
              "id": "product_id", 
              "title": "product_name", 
              "currentStock": 5, 
              "recommendedRestock": 15,
              "daysUntilStockout": 7,
              "priority": "HIGH"
            }}
          ],
          "topSellingItems": [
            {{ 
              "id": "product_id", 
              "title": "product_name", 
              "salesVelocity": "5 units/week",
              "recommendedStock": 20
            }}
          ],
          "restock_recommendations": [
            {{ 
              "productId": "product_id",
              "name": "product_name", 
              "currentStock": 5,
              "recommendedOrderQuantity": 15,
              "restockUrgency": "high",
              "daysUntilStockout": 7,
              "category": "product_category",
              "avgDailySales": 0.7,
              "confidenceScore": 0.85,
              "reason": "High demand product with low inventory"
            }}
          ],
          "salesTrends": {{
            "trending_up": ["product 1", "product 2"],
            "trending_down": ["product 3", "product 4"],
            "seasonal_items": ["product 5", "product 6"]
          }}
        }}

        IMPORTANT:
        1. Ensure all numeric values are actual numbers, not strings
        2. The "restock_recommendations" field MUST include "name", "currentStock", "recommendedOrderQuantity", "restockUrgency", "daysUntilStockout", and "category" fields as these are required by the frontend
        3. For urgency, use only "high", "medium", or "low" values
        4. Your response must be properly formatted JSON only with no explanatory text
        """

        # Generate response from Gemini
        try:
            response = self.client.models.generate_content(
                model='gemini-2.0-flash',
                contents=prompt,
                
            )
            
            response_text = response.text
            logger.info("Received response from Gemini API")
            
            # Debug logging - Print raw response from Gemini
            logger.info(f"DEBUG - Raw response from Gemini: {response_text[:1000]}...")  # First 1000 chars

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
                
                # Debug logging - Print structured insights
                logger.info(f"DEBUG - Parsed JSON structure: {list(insights.keys())}")
                if "restock_recommendations" in insights:
                    logger.info(f"DEBUG - Sample recommendation: {json.dumps(insights['restock_recommendations'][0] if insights['restock_recommendations'] else {}, indent=2)}")
                
                # Transform response to match the expected frontend structure exactly
                self._validate_and_normalize_response(insights)
                
                # Debug logging - Print normalized insights
                logger.info(f"DEBUG - After normalization - Sample recommendation: {json.dumps(insights['restock_recommendations'][0] if insights['restock_recommendations'] else {}, indent=2)}")
                
                return insights

            except json.JSONDecodeError:
                logger.error("Failed to parse Gemini response as JSON")
                return {
                    "inventoryHealth": "Analysis available in raw text format only",
                    "keyInsights": ["Could not parse structured insights"],
                    "actionItems": ["Review raw response for recommendations"],
                    "rawResponse": response_text,
                    "lowStockItems": [],
                    "topSellingItems": [],
                    "restock_recommendations": []
                }
                
        except Exception as e:
            logger.error(f"Error calling Gemini API: {str(e)}")
            return self._generate_fallback_response()

    def _validate_and_normalize_response(self, insights):
        """
        Validate and normalize the response to match frontend expectations
        
        Args:
            insights (dict): The parsed insights from Gemini
        """
        # Ensure required fields exist
        required_fields = [
            "inventoryHealth", "keyInsights", "actionItems",
            "lowStockItems", "topSellingItems", "restock_recommendations", "salesTrends"
        ]
        
        for field in required_fields:
            if field not in insights:
                if field in ["inventoryHealth"]:
                    insights[field] = "No data available"
                elif field in ["salesTrends"]:
                    insights[field] = {
                        "trending_up": [],
                        "trending_down": [],
                        "seasonal_items": []
                    }
                else:
                    insights[field] = []
        
        # Create at least one recommendation if none exist
        if not insights.get("restock_recommendations") or len(insights["restock_recommendations"]) == 0:
            logger.warning("No restock recommendations in Gemini response, creating fallback recommendation")
            insights["restock_recommendations"] = [
                {
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
                }
            ]
            
        # Ensure all restock recommendations have required fields
        for item in insights.get("restock_recommendations", []):
            # Convert field names to match frontend expectations if needed
            if "title" in item and "name" not in item:
                item["name"] = item["title"]
            
            if "product_type" in item and "category" not in item:
                item["category"] = item["product_type"]
                
            if "recommended_restock" in item and "recommendedOrderQuantity" not in item:
                item["recommendedOrderQuantity"] = item["recommended_restock"]
                
            if "urgency" in item and "restockUrgency" not in item:
                item["restockUrgency"] = item["urgency"]
                
            # Ensure all required fields exist with defaults if missing
            required_item_fields = {
                "productId": item.get("id", "") or "",
                "name": item.get("name", "Unknown Product"),
                "currentStock": item.get("currentStock", 0),
                "recommendedOrderQuantity": item.get("recommendedOrderQuantity", 10),
                "restockUrgency": item.get("restockUrgency", "medium"),
                "daysUntilStockout": item.get("daysUntilStockout", 14),
                "category": item.get("category", "general"),
                "avgDailySales": item.get("avgDailySales", 0),
                "confidenceScore": item.get("confidenceScore", 0.5)
            }
            
            for field, default_value in required_item_fields.items():
                if field not in item:
                    item[field] = default_value
                    
        # Ensure there's at least one item in other arrays
        if not insights.get("lowStockItems") or len(insights["lowStockItems"]) == 0:
            insights["lowStockItems"] = [{"id": "default", "title": "Sample Low Stock Item", "currentStock": 3, "recommendedRestock": 10, "daysUntilStockout": 5, "priority": "MEDIUM"}]
            
        if not insights.get("topSellingItems") or len(insights["topSellingItems"]) == 0:
            insights["topSellingItems"] = [{"id": "default", "title": "Sample Top Seller", "salesVelocity": "10 units/week", "recommendedStock": 30}]
            
        # Ensure there are at least 3 insights and action items
        while len(insights.get("keyInsights", [])) < 3:
            insights["keyInsights"].append(f"Sample insight {len(insights['keyInsights']) + 1}")
            
        while len(insights.get("actionItems", [])) < 3:
            insights["actionItems"].append(f"Sample action item {len(insights['actionItems']) + 1}")

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
            "restock_recommendations": [],
            "salesTrends": {
                "trending_up": [],
                "trending_down": [],
                "seasonal_items": []
            }
        }
