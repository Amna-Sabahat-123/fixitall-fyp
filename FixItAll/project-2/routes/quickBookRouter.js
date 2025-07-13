const express = require('express');
const router = express.Router();
const path = require('path');
const quickBookModel = require('../models/quickBookModal');
const serviceProviderModel = require('../models/serviceProvider-model');


// ✅ Route: Confirm Booking
router.post('/confirm', async (req, res) => {
  try {
    console.log(req.body);
    const { fullName, email, phone, location, latitude, longitude, serviceCategory, desc, availableTime } = req.body;

    const existing = await quickBookModel.findOne({ email, serviceCategory, availableTime });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Booking already exists for the given time.' });
    }

    const newBooking = new quickBookModel({
      fullName,
      email,
      phone,
      location,
      latitude,  // ✅ add this
      longitude, // ✅ add this
      serviceCategory,
      desc,
      availableTime,
      isConfirmed: true
    });


    await newBooking.save();
    res.json({ success: true, message: 'Booking confirmed successfully!' });

  } catch (err) {
    console.error('❌ Error in /confirm:', err.message, err.stack);
    if (!latitude || !longitude) {
  return res.status(400).json({ success: false, message: 'Mark the location on the map first.' });
}

  }
});

// ✅ NEW Route: Get Service Providers by Category
router.get('/providers', async (req, res) => {
  try {
    const category = req.query.category;
    if (!category) {
      return res.status(400).json({ success: false, message: 'Missing category.' });
    }

    const providers = await serviceProviderModel.find({ serviceCategory: category });

    res.json({
      success: true,
      providers
    });
  } catch (err) {
    console.error('Error fetching providers:', err);
    res.status(500).json({ success: false, message: 'Server error while fetching providers.' });
  }
});

module.exports = router;
