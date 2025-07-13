const mongoose = require("mongoose");

const serviceProviderSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  agreement: { type: Boolean, default: false },
  baseRate: { type: Number, required: true },
  serviceCategory: { type: String, required: true },
  description: { type: String },
  address: { type: String, required: true }, // This assumes you're saving location name as address

  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },

  userType: {
    type: String,
    enum: ['service_provider'],
    default: 'service_provider'
  },

  availability: [
    {
      day: {
        type: String,
        enum: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday'
        ],
        required: true
      },
      from: {
        type: String,
        required: true
      },
      to: {
        type: String,
        required: true
      }
    }
  ]
});

// Add geospatial index for location
serviceProviderSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("ServiceProvider", serviceProviderSchema);
