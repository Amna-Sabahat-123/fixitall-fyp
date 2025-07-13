const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: String,
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: Number,
  password: String,
  location: String,
  orders: {
    type: Array,
    default: []
  },
  userType: {
    type: String,
    enum: ['customer', 'service_provider']
  },
  agreement: {
    type: Boolean,
  }
});

module.exports = mongoose.model('User', userSchema);
