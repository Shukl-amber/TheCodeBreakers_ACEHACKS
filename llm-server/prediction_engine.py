import logging
import numpy as np
from datetime import datetime, timedelta
import json
import os
import random
from dotenv import load_dotenv
from shopify_data_connector import ShopifyDataConnector

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logging.warning("Google Generative AI module not found. Some features may be limited.")

# Load environment variables for API keys
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

class PredictionEngine:
    """Engine for generating inventory predictions and recommendations using AI"""
    
    def __init__(self):
        """Initialize the prediction engine"""
        self.api_key = os.environ.get('GEMINI_API_KEY')
        
        # Initialize data connector
        self.data_connector = ShopifyDataConnector()
        
        # Initialize Gemini if available and API key is provided
        if GEMINI_AVAILABLE and self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-pro')
            logger.info("Gemini model initialized successfully")
        else:
            self.model = None
            logger.warning("Gemini model not available. Using statistical methods instead.")

    def generate_restock_predictions(self, inventory_items=None):
        """
        Generate restock predictions for inventory items
        
        Args:
            inventory_items (list, optional): List of inventory items with sales history.
                                             If None, fetches from backend.
            
        Returns:
            list: List of predictions with restock recommendations
        """
        # If no data provided, fetch from backend
        if inventory_items is None:
            inventory_items = self.data_connector.get_inventory_for_predictions()
            logger.info(f"Fetched {len(inventory_items)} inventory items from backend")
            
        logger.info(f"Generating restock predictions for {len(inventory_items)} items")
        
        if not inventory_items:
            return []
            
        predictions = []
        
        for item in inventory_items:
            try:
                # Extract item data
                product_id = item.get('id')
                current_stock = item.get('quantity', 0)
                sales_history = item.get('salesHistory', [])
                lead_time = item.get('leadTime', 14)
                
                # Skip items without required data
                if not product_id:
                    continue
                    
                # Calculate sales velocity
                sales_velocity = self._calculate_sales_velocity(sales_history)
                
                # Calculate days until out of stock
                days_until_stockout = self._calculate_days_until_stockout(current_stock, sales_velocity)
                
                # Determine if restock is needed and calculate optimal quantity
                restock_needed = False
                restock_urgency = "low"
                recommended_quantity = 0
                confidence_score = 0.75  # Default confidence
                
                if days_until_stockout < lead_time * 1.5:
                    # Restock needed if stock will run out before 1.5x lead time
                    restock_needed = True
                    
                    if days_until_stockout < lead_time * 0.5:
                        restock_urgency = "high"
                    elif days_until_stockout < lead_time:
                        restock_urgency = "medium"
                    else:
                        restock_urgency = "low"
                        
                    # Calculate EOQ (Economic Order Quantity)
                    recommended_quantity = self._calculate_optimal_order_quantity(
                        sales_velocity, 
                        item.get('price', 10), 
                        item.get('orderCost', 25),
                        item.get('holdingCost', 0.2)
                    )
                    
                # Adjust for minimum viable order
                if recommended_quantity > 0 and recommended_quantity < 5:
                    recommended_quantity = 5
                    
                # Calculate optimal restock date
                restock_date = None
                if restock_needed:
                    # Schedule restock to arrive just before stockout
                    days_to_restock = max(0, days_until_stockout - lead_time * 0.3)
                    restock_date = (datetime.now() + timedelta(days=days_to_restock)).strftime("%Y-%m-%d")
                
                # Create prediction
                prediction = {
                    "productId": product_id,
                    "name": item.get('name', 'Unknown Product'),
                    "sku": item.get('sku', 'unknown'),
                    "currentStock": current_stock,
                    "avgDailySales": sales_velocity,
                    "daysUntilStockout": days_until_stockout,
                    "leadTime": lead_time,
                    "restockNeeded": restock_needed,
                    "restockUrgency": restock_urgency,
                    "recommendedOrderQuantity": int(recommended_quantity),
                    "restockDate": restock_date,
                    "confidenceScore": confidence_score
                }
                
                predictions.append(prediction)
                
            except Exception as e:
                logger.error(f"Error generating prediction for item {item.get('id')}: {str(e)}")
                continue
                
        logger.info(f"Generated {len(predictions)} restock predictions")
        
        # Send predictions to backend if we fetched the data from there
        if inventory_items is None:
            self.data_connector.send_predictions_to_backend(predictions)
            
        return predictions

    def run_inventory_simulations(self, items=None, scenarios=None):
        """
        Run inventory simulations for different scenarios
        
        Args:
            items (list, optional): List of inventory items. If None, fetches from backend.
            scenarios (list, optional): List of scenarios to simulate. If None, uses default scenarios.
            
        Returns:
            dict: Simulation results for each scenario
        """
        # If no items provided, fetch from backend
        if items is None:
            items = self.data_connector.get_inventory_for_predictions()
            logger.info(f"Fetched {len(items)} inventory items from backend")
        
        # If no scenarios provided, use default scenarios
        if scenarios is None or len(scenarios) == 0:
            scenarios = [
                {"name": "increased_demand", "demandChange": 0.2, "description": "20% increase in demand"},
                {"name": "decreased_demand", "demandChange": -0.2, "description": "20% decrease in demand"},
                {"name": "high_season", "demandChange": 0.5, "description": "Peak season (50% increase)"},
                {"name": "low_season", "demandChange": -0.3, "description": "Off season (30% decrease)"}
            ]
            
        logger.info(f"Running inventory simulations with {len(scenarios)} scenarios")
        
        results = {}
        
        # Create baseline data
        baseline = self._simulate_inventory(items, 0)
        results["baseline"] = baseline
        
        # Run simulations for each scenario
        for scenario in scenarios:
            scenario_name = scenario.get('name')
            demand_change = scenario.get('demandChange', 0)
            
            if not scenario_name:
                continue
                
            # Run simulation with modified demand
            scenario_results = self._simulate_inventory(items, demand_change)
            results[scenario_name] = scenario_results
            
        logger.info("Inventory simulations completed")
        return results

    def _calculate_sales_velocity(self, sales_history):
        """
        Calculate average daily sales velocity based on sales history
        
        Args:
            sales_history (list): List of sales records
            
        Returns:
            float: Average daily sales
        """
        if not sales_history:
            return 0
            
        # Get total quantity sold
        total_quantity = sum(sale.get('quantity', 0) for sale in sales_history)
        
        # Get date range
        dates = [sale.get('date') for sale in sales_history if sale.get('date')]
        
        if not dates:
            return 0
            
        try:
            # Parse dates
            date_objects = [datetime.strptime(date, "%Y-%m-%d") for date in dates]
            
            # Calculate date range
            min_date = min(date_objects)
            max_date = max(date_objects)
            date_range = (max_date - min_date).days + 1
            
            # Calculate average daily sales
            if date_range > 0:
                avg_daily_sales = total_quantity / date_range
            else:
                avg_daily_sales = total_quantity  # If all sales on same day
                
            return avg_daily_sales
            
        except (ValueError, TypeError) as e:
            logger.error(f"Error calculating sales velocity: {e}")
            return total_quantity / 30  # Assume 30-day period if dates invalid
    
    def _calculate_days_until_stockout(self, current_stock, sales_velocity):
        """
        Calculate days until stockout based on current stock and sales velocity
        
        Args:
            current_stock (int): Current inventory quantity
            sales_velocity (float): Daily sales rate
            
        Returns:
            float: Days until stockout
        """
        if sales_velocity <= 0:
            return 999  # Large number indicating no risk of stockout
            
        days = current_stock / sales_velocity
        return round(days, 1)
    
    def _calculate_optimal_order_quantity(self, daily_demand, unit_price, order_cost, holding_cost_rate):
        """
        Calculate Economic Order Quantity (EOQ)
        
        Args:
            daily_demand (float): Average daily demand
            unit_price (float): Price per unit
            order_cost (float): Fixed cost of placing an order
            holding_cost_rate (float): Inventory holding cost as percentage of item value
            
        Returns:
            int: Optimal order quantity
        """
        annual_demand = daily_demand * 365
        holding_cost = unit_price * holding_cost_rate
        
        if holding_cost <= 0:
            holding_cost = 0.1  # Default holding cost
            
        # EOQ formula: sqrt(2 * annual demand * order cost / holding cost)
        eoq = np.sqrt((2 * annual_demand * order_cost) / holding_cost)
        
        # Consider lead time buffer
        lead_time_demand = daily_demand * 14  # Assuming 14 days lead time
        
        # Return maximum of EOQ and lead time demand
        return max(int(eoq), int(lead_time_demand * 1.5))
    
    def _simulate_inventory(self, items, demand_change_rate):
        """
        Simulate inventory over time with modified demand
        
        Args:
            items (list): Inventory items
            demand_change_rate (float): Rate of change in demand 
                                      (0.1 = 10% increase, -0.2 = 20% decrease)
            
        Returns:
            dict: Simulation results
        """
        # Initialize results
        simulation_length = 90  # 90-day simulation
        total_revenue = 0
        total_profit = 0
        stockout_days = 0
        stockout_impact = 0
        
        item_results = []
        
        # Process each item
        for item in items:
            # Get item data
            sales_velocity = item.get('salesVelocity', 0)
            if isinstance(sales_velocity, dict):
                sales_velocity = sales_velocity.get('daily', 0)
                
            current_stock = item.get('quantity', 0)
            price = item.get('price', 10)
            cost = item.get('cost', price * 0.5)
            lead_time = item.get('leadTime', 14)
            
            # Apply demand change
            adjusted_sales_velocity = sales_velocity * (1 + demand_change_rate)
            
            # Initialize item simulation
            daily_stock = [current_stock]
            daily_revenue = [0]
            daily_profit = [0]
            stockout_occurred = False
            restock_ordered = False
            restock_arrival_day = -1
            restock_quantity = 0
            
            # Simulate each day
            for day in range(1, simulation_length):
                # Get previous day's stock
                previous_stock = daily_stock[-1]
                
                # Calculate sales for the day (limited by available stock)
                daily_sales = min(previous_stock, adjusted_sales_velocity)
                
                # Calculate revenue and profit
                day_revenue = daily_sales * price
                day_profit = daily_sales * (price - cost)
                
                daily_revenue.append(day_revenue)
                daily_profit.append(day_profit)
                
                # Check for stockout
                if daily_sales < adjusted_sales_velocity:
                    # Stockout occurred - couldn't fulfill all demand
                    stockout_days += 1
                    stockout_impact += (adjusted_sales_velocity - daily_sales) * price
                    stockout_occurred = True
                
                # Calculate end-of-day stock
                end_day_stock = previous_stock - daily_sales
                
                # Check if restock should arrive today
                if day == restock_arrival_day:
                    end_day_stock += restock_quantity
                    restock_ordered = False
                
                # Check if we should order restock
                if not restock_ordered and end_day_stock < adjusted_sales_velocity * lead_time:
                    # Order enough to cover 30 days of demand
                    restock_quantity = int(adjusted_sales_velocity * 30)
                    restock_arrival_day = day + lead_time
                    restock_ordered = True
                
                # Update daily stock
                daily_stock.append(end_day_stock)
                
                # Update totals
                total_revenue += day_revenue
                total_profit += day_profit
            
            # Add item results
            item_results.append({
                "id": item.get('id', 'unknown'),
                "name": item.get('name', 'Unknown Product'),
                "originalSalesVelocity": sales_velocity,
                "adjustedSalesVelocity": adjusted_sales_velocity,
                "endingStock": daily_stock[-1],
                "totalRevenue": sum(daily_revenue),
                "totalProfit": sum(daily_profit),
                "hadStockout": stockout_occurred,
                "stockTrace": daily_stock[::7]  # Save stock level every 7 days for visualization
            })
        
        # Return simulation results
        return {
            "totalRevenue": total_revenue,
            "totalProfit": total_profit,
            "stockoutDays": stockout_days,
            "stockoutImpact": stockout_impact,
            "items": item_results
        }
        
    def generate_insights_with_gemini(self, inventory_data, sales_data, external_data=None):
        """
        Generate inventory insights using Google's Gemini LLM
        
        Args:
            inventory_data (dict): Current inventory status
            sales_data (dict): Historical sales data
            external_data (dict, optional): External data like market trends
            
        Returns:
            dict: AI-generated insights and recommendations
        """
        try:
            # Configure Gemini
            if not self.gemini_api_key:
                logger.warning("No Gemini API key provided. Using fallback insights.")
                return self._get_fallback_insights(inventory_data, sales_data)
            
            # Import Gemini module conditionally to handle environments without it
            import google.generativeai as genai
            
            genai.configure(api_key=self.gemini_api_key)
            
            # Build prompt with inventory context
            prompt = self._build_gemini_prompt(inventory_data, sales_data, external_data)
            
            # Configure the model
            generation_config = {
                "temperature": 0.2,  # Low temperature for more deterministic responses
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 1024,
            }
            
            # Get the Gemini model
            model = genai.GenerativeModel(
                model_name="gemini-pro", 
                generation_config=generation_config
            )
            
            # Generate response
            response = model.generate_content(prompt)
            
            # Parse response and structure insights
            structured_insights = self._parse_gemini_response(response.text)
            
            # Add metadata to response
            result = {
                "insights": structured_insights,
                "generated": datetime.now().isoformat(),
                "source": "gemini-pro",
                "success": True
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating insights with Gemini: {str(e)}")
            return self._get_fallback_insights(inventory_data, sales_data)
    
    def _build_gemini_prompt(self, inventory_data, sales_data, external_data=None):
        """Build a prompt for Gemini with inventory context"""
        
        # Start with base prompt instructions
        prompt = """
        You are an expert inventory management AI assistant. Analyze the provided inventory and sales data 
        to generate actionable insights and recommendations. Focus on:
        
        1. Identifying products at risk of stockout
        2. Highlighting slow-moving inventory
        3. Recommending optimal restock quantities and timing
        4. Detecting sales trends and seasonal patterns
        5. Suggesting inventory optimization strategies
        
        Format your response as concise bullet points organized into clearly labeled sections. Include specific 
        product names and quantitative recommendations where relevant.
        
        DATA:
        """
        
        # Add inventory summary
        prompt += "\n\nINVENTORY SUMMARY:"
        total_items = len(inventory_data.get('items', []))
        prompt += f"\n- Total Products: {total_items}"
        
        # Add top products by stock value
        prompt += "\n\nTOP PRODUCTS BY STOCK VALUE:"
        items = sorted(
            inventory_data.get('items', []), 
            key=lambda x: x.get('quantity', 0) * x.get('price', 0),
            reverse=True
        )
        for item in items[:5]:  # Top 5 items
            name = item.get('name', 'Unknown')
            quantity = item.get('quantity', 0)
            price = item.get('price', 0)
            value = quantity * price
            prompt += f"\n- {name}: {quantity} units, ${value:.2f} total value"
        
        # Add sales velocity data
        prompt += "\n\nSALES VELOCITY DATA:"
        for item in items[:10]:  # Top 10 items
            name = item.get('name', 'Unknown')
            velocity = item.get('salesVelocity', {})
            if isinstance(velocity, dict):
                daily = velocity.get('daily', 0)
                monthly = velocity.get('monthly', 0)
                prompt += f"\n- {name}: {daily:.2f} units/day, {monthly:.2f} units/month"
            else:
                prompt += f"\n- {name}: {velocity:.2f} units/day"
        
        # Add stockout risks
        prompt += "\n\nSTOCKOUT RISK ITEMS:"
        stockout_risks = []
        for item in inventory_data.get('items', []):
            quantity = item.get('quantity', 0)
            velocity = item.get('salesVelocity', 0)
            if isinstance(velocity, dict):
                velocity = velocity.get('daily', 0)
            
            if velocity > 0:
                days_remaining = quantity / velocity
                if days_remaining < 14:  # Less than 2 weeks of inventory
                    stockout_risks.append((item, days_remaining))
        
        for item, days in sorted(stockout_risks, key=lambda x: x[1])[:5]:
            name = item.get('name', 'Unknown')
            prompt += f"\n- {name}: {days:.1f} days remaining"
        
        # Add external data if provided
        if external_data:
            prompt += "\n\nEXTERNAL MARKET DATA:"
            for key, value in external_data.items():
                prompt += f"\n- {key}: {value}"
        
        # Final instructions
        prompt += """
        
        Based on this data, provide:
        1. Key Insights - What patterns or issues do you observe?
        2. Restock Recommendations - Which products need attention and in what quantities?
        3. Inventory Optimization Strategies - How can overall inventory be improved?
        4. Sales Trend Analysis - What trends or patterns are emerging?
        
        Keep your response concise, specific, and actionable.
        """
        
        return prompt
    
    def _parse_gemini_response(self, response_text):
        """Parse and structure the raw Gemini response"""
        
        # Initialize structure
        structured_insights = {
            "key_insights": [],
            "restock_recommendations": [],
            "optimization_strategies": [],
            "sales_trends": [],
            "additional_recommendations": []
        }
        
        # Simple parsing based on sections
        current_section = "key_insights"  # Default section
        
        for line in response_text.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            # Check for section headers
            lower_line = line.lower()
            if "key insight" in lower_line or "insights" in lower_line:
                current_section = "key_insights"
                continue
            elif "restock" in lower_line or "replenish" in lower_line:
                current_section = "restock_recommendations"
                continue
            elif "optimization" in lower_line or "optimize" in lower_line:
                current_section = "optimization_strategies"
                continue
            elif "trend" in lower_line or "pattern" in lower_line or "sales" in lower_line:
                current_section = "sales_trends"
                continue
            elif "additional" in lower_line or "recommendation" in lower_line:
                current_section = "additional_recommendations"
                continue
                
            # Add content to the current section if it looks like a bullet point
            if line.startswith('-') or line.startswith('•') or line.startswith('*'):
                clean_line = line.lstrip('-•* ').strip()
                structured_insights[current_section].append(clean_line)
            elif structured_insights[current_section]:
                # Append to the last item if it's a continuation
                structured_insights[current_section][-1] += " " + line
        
        return structured_insights
    
    def _get_fallback_insights(self, inventory_data, sales_data):
        """Generate fallback insights when Gemini is unavailable"""
        insights = {
            "key_insights": [],
            "restock_recommendations": [],
            "optimization_strategies": [],
            "sales_trends": [],
            "additional_recommendations": []
        }
        
        # Process inventory items
        items = inventory_data.get('items', [])
        
        # Find items with low stock
        low_stock_items = []
        for item in items:
            quantity = item.get('quantity', 0)
            velocity = item.get('salesVelocity', 0)
            if isinstance(velocity, dict):
                velocity = velocity.get('daily', 0)
                
            if velocity > 0:
                days_remaining = quantity / velocity
                if days_remaining < 14:
                    low_stock_items.append((item, days_remaining))
        
        # Generate key insights
        if low_stock_items:
            insights["key_insights"].append(f"Found {len(low_stock_items)} products at risk of stockout within 14 days")
        
        # Top selling products
        top_sellers = sorted(
            [i for i in items if i.get('salesVelocity', 0) > 0],
            key=lambda x: x.get('salesVelocity', 0) if not isinstance(x.get('salesVelocity'), dict) 
                else x.get('salesVelocity', {}).get('daily', 0),
            reverse=True
        )
        
        if top_sellers:
            top_names = [item.get('name', 'Unknown Product') for item in top_sellers[:3]]
            insights["key_insights"].append(f"Your best-selling products are: {', '.join(top_names)}")
        
        # Restock recommendations
        for item, days in sorted(low_stock_items, key=lambda x: x[1])[:5]:
            name = item.get('name', 'Unknown')
            velocity = item.get('salesVelocity', 0)
            if isinstance(velocity, dict):
                velocity = velocity.get('daily', 0)
                
            restock_qty = max(int(velocity * 30), 10)  # 30 days supply or minimum 10 units
            insights["restock_recommendations"].append(
                f"{name} has {days:.1f} days of inventory left. Order {restock_qty} units to maintain 30 days of stock."
            )
        
        # Optimization strategies
        insights["optimization_strategies"].append(
            "Consider implementing an ABC inventory classification system to prioritize management efforts"
        )
        insights["optimization_strategies"].append(
            "Review your reorder points and safety stock levels for products with variable demand"
        )
        
        # Sales trends (simple)
        insights["sales_trends"].append(
            "Historical sales data analysis suggests continuing existing demand patterns"
        )
        
        # Additional recommendations
        insights["additional_recommendations"].append(
            "Consider setting up automated reorder notifications for critical products"
        )
        
        return {
            "insights": insights,
            "generated": datetime.now().isoformat(),
            "source": "fallback-system",
            "success": True
        }