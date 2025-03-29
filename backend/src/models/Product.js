import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  shopifyId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  vendor: {
    type: String
  },
  productType: {
    type: String
  },
  tags: [String],
  variants: [{
    shopifyVariantId: String,
    title: String,
    sku: String,
    price: Number,
    inventoryQuantity: Number,
    inventoryItem: {
      shopifyInventoryItemId: String
    }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Product = mongoose.model('Product', ProductSchema);

export default Product;