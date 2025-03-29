import os

from dotenv import load_dotenv
from google import genai


load_dotenv()


client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
response = client.models.generate_content(
    model="gemini-2.0-flash", contents=""" 
                            Generate fictional sales data for 10 products for a company that sells tech products. 
                            The data should be well structured and in json format.

                            Use ONLY the following field for each product and replace the {parameter with format specification} with randomized data that follows the provided specification:

                            {
                                "saleId": "{random alphanumeric}",
                                "date": "{random date in 2025}",
                                "product": "{random product name from a tech company}",
                                "category": "{category of the item corresponding to the {product} field}",
                                "quantity": {random number between 7-30},
                                "unitPrice": {random floating point number with 2 decimal places between 1 to 75},
                                "customerLocation": "{random city in India }",
                                "paymentMethod": "{random payment method from the following: credit card, upi, cash}",
                                "salesperson": "{random name and surname}",
                                "discountApplied": {random integer between 5 - 20},
                                "shippingCost": {random integer between 5 to 50},
                            },

                            """
)

print(response.text)
