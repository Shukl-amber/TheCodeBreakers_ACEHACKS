import '@shopify/shopify-api/adapters/node';
import { shopifyApi, ApiVersion, Session } from '@shopify/shopify-api';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the Shopify API
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY || 'dummy-key', // Required but won't be used with access token
  apiSecretKey: process.env.SHOPIFY_API_SECRET || 'dummy-secret', // Required but won't be used with access token
  scopes: ['read_products', 'write_products', 'read_orders', 'write_orders', 'read_inventory', 'write_inventory'],
  hostName: process.env.SHOPIFY_SHOP_NAME?.replace('.myshopify.com', '') || 'dummy-shop',
  apiVersion: ApiVersion.October23,
  isEmbeddedApp: false
});

// Create a REST client that uses the access token
const shopName = process.env.SHOPIFY_SHOP_NAME;
const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

// Create a session for REST API calls
const session = new Session({
  shop: shopName,
  accessToken: accessToken,
  isOnline: false,
});

// Create a function to get a REST client
const getRestClient = () => {
  return new shopify.clients.Rest({ session });
};

// Helper functions to maintain compatibility with existing code
const shopifyClient = {
  shop: {
    get: async () => {
      const client = getRestClient();
      const response = await client.get({ path: 'shop' });
      return response.body.shop;
    }
  },
  product: {
    list: async (params) => {
      const client = getRestClient();
      const response = await client.get({
        path: 'products',
        query: params
      });
      return response.body.products;
    },
    get: async (productId) => {
      const client = getRestClient();
      const response = await client.get({
        path: `products/${productId}`
      });
      return response.body.product;
    }
  },
  order: {
    list: async (params) => {
      const client = getRestClient();
      const response = await client.get({
        path: 'orders',
        query: params
      });
      return response.body.orders;
    }
  },
  inventoryLevel: {
    list: async (params) => {
      const client = getRestClient();
      const response = await client.get({
        path: 'inventory_levels',
        query: params
      });
      return response.body.inventory_levels;
    }
  }
};

export default shopifyClient;