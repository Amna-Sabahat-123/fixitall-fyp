const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
  fullName: {
    type: String, 
    minLength: 3,
    trim: true
  },
  email: String,
  phone: Number,
  password: String
});

module.exports = mongoose.model('Owner', ownerSchema);
