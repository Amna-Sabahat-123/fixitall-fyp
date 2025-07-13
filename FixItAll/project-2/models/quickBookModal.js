const mongoose = require('mongoose');

const quickBookSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  orders: {
    type: Array,
    default: []
  },
  availableTime: {
    type: Date,
    required: true
  },
  serviceCategory: { type: String, required: true },
  desc: {
    type: String,
    default: ''
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  budgetEstimate: {
    type: Number
  },
  status: {
    type: String,
    enum: ['upcoming', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  isConfirmed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('quickBook', quickBookSchema);
