const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  
  description: String,
  lowStockThreshold: {
    type: Number,
    default: 5 // Default threshold if not specified
  },
  isLowStock: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
