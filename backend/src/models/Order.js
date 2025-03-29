import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  shopifyId: {
    type: String,
    required: true,
    unique: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  email: String,
  createdAt: Date,
  updatedAt: Date,
  processedAt: Date,
  customer: {
    shopifyCustomerId: String,
    firstName: String,
    lastName: String,
    email: String
  },
  financialStatus: String,
  fulfillmentStatus: String,
  totalPrice: Number,
  subtotalPrice: Number,
  totalDiscounts: Number,
  totalTax: Number,
  currency: String,
  lineItems: [{
    shopifyLineItemId: String,
    productId: String,
    variantId: String,
    title: String,
    variantTitle: String,
    quantity: Number,
    price: Number,
    sku: String
  }],
  shippingAddress: {
    address1: String,
    address2: String,
    city: String,
    province: String,
    country: String,
    zip: String
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Order = mongoose.model('Order', OrderSchema);

export default Order;