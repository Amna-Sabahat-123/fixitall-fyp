

const express = require('express');
const router = express.Router();
const path = require('path');
const tf = require('@tensorflow/tfjs-node');
const haversine = require('haversine-distance');
const quickBookModel = require('../models/quickBookModal');
const serviceProviderModel = require('../models/serviceProvider-model');
const mongoose = require('mongoose');

let model;

// Fix the model path to match your actual files
const modelPath = path.join(__dirname, '../../../model-price/saved_models/simple_price_predicto_model/model.json');

(async () => {
  try {
    // Try to load your trained model
    model = await tf.loadLayersModel(`file://${modelPath}`);
    console.log('✅ Your trained model loaded successfully!');

    await mongoose.connect('mongodb://127.0.0.1:27017/FixItAll');
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ Could not load your trained model:', err.message);
    console.log('📂 Using fallback calculations instead');
    
    await mongoose.connect('mongodb://127.0.0.1:27017/FixItAll');
    console.log('✅ Connected to MongoDB');
  }
})();

// Improved travel cost calculation with better pricing
function calculateTravelCost(distance) {
  if (distance <= 5) {
    // Short distance: 10 PKR per km (increased from 8)
    return distance * 10;
  } else if (distance <= 25) {
    // Medium distance: 8 PKR per km
    return 50 + ((distance - 5) * 8);
  } else {
    // Long distance: Base + 6 PKR per km (increased from 4)
    return 210 + ((distance - 25) * 6);
  }
}

// Use your ACTUAL trained model or improved fallback
function predictEnsemble(distance, baseRate) {
  if (model) {
    // 🚀 USE YOUR TRAINED MODEL (2 inputs: distance, baseRate)
    try {
      // Create input tensor with your 2 parameters
      const inputTensor = tf.tensor2d([[distance, baseRate]]);
      
      // Get prediction from YOUR trained model
      const prediction = model.predict(inputTensor);
      const modelPrediction = prediction.dataSync()[0];
      
      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();
      
      console.log(`🎯 Model prediction for ${distance}km, ${baseRate} PKR: ${Math.round(modelPrediction)} PKR`);
      
      return {
        ensemble: Math.round(modelPrediction),
        ml: Math.round(modelPrediction),
        expected: baseRate + calculateTravelCost(distance),
        usingModel: true
      };
      
    } catch (modelError) {
      console.error('❌ Model prediction failed:', modelError);
      // Fall back to calculation
    }
  }
  
  // IMPROVED fallback calculation
  const travelCost = calculateTravelCost(distance);
  let basePrediction = baseRate + travelCost;
  
  // Add premium for problematic cases (very long + very cheap)
  if (distance > 15 && baseRate < 800) {
    const longDistancePremium = (distance - 15) * 5; // Extra 5 PKR per km beyond 15km
    basePrediction += longDistancePremium;
    console.log(`💰 Added long distance premium: ${longDistancePremium} PKR`);
  }
  
  // Ensure minimum reasonable pricing
  const minimumPrice = Math.max(
    baseRate + (distance * 8), // Minimum 8 PKR per km
    baseRate + 50 // Minimum 50 PKR travel cost
  );
  
  const finalPrediction = Math.max(basePrediction, minimumPrice);
  
  console.log(`📊 Improved calculation for ${distance}km, ${baseRate} PKR: ${Math.round(finalPrediction)} PKR`);
  
  return {
    ensemble: Math.round(finalPrediction),
    ml: Math.round(finalPrediction),
    expected: Math.round(basePrediction),
    usingModel: false
  };
}

function calculateDistanceKm(userCoords, provider) {
  const providerCoords = {
    latitude: provider.location.coordinates[1],
    longitude: provider.location.coordinates[0],
  };
  const distanceMeters = haversine(userCoords, providerCoords);
  return distanceMeters / 1000;
}

// 🧾 Confirm Booking Route (unchanged)
router.post('/confirm', async (req, res) => {
  console.log("📌 CONFIRM ROUTE REACHED in file:", __filename);
  try {
    const { fullName, email, phone, location, latitude, longitude, serviceCategory, desc, availableTime } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).send('📍 Mark the location on the map before booking.');
    }

    const existing = await quickBookModel.findOne({ email, serviceCategory, availableTime });
    if (existing) {
      return res.status(400).send('Booking already exists for the given time.');
    }

    const newBooking = new quickBookModel({
      fullName,
      email,
      phone,
      location,
      latitude,
      longitude,
      serviceCategory,
      desc,
      availableTime,
      isConfirmed: true
    });

    await newBooking.save();

    return res.redirect(`/quickBook/providers?lat=${latitude}&lng=${longitude}&category=${serviceCategory}`);
  } catch (err) {
    console.error('❌ Error in /confirm:', err.message);
    res.status(500).send('Server error.');
  }
});

// 👨‍🔧 Get Providers + ENSEMBLE Prediction (SIMPLE VERSION)
router.get('/providers', async (req, res) => {
  try {
    const { lat, lng, category } = req.query;
    console.log("📥 Incoming query params:", { lat, lng, category });

    if (!lat || !lng || !category) {
      return res.status(400).send('Missing required query params.');
    }

    const providers = await serviceProviderModel.find({ serviceCategory: category });

    if (!providers || providers.length === 0) {
      console.log("⚠️ No providers found for category:", category);
    }

    const predictions = [];
    
    // Simple loop through providers
    for (const provider of providers) {
      const baseRate = provider.baseRate;

      // ✅ Skip provider if baseRate is invalid
      if (!baseRate || typeof baseRate !== 'number') {
        console.warn(`⚠️ Skipping provider ${provider._id}: Invalid baseRate`);
        continue;
      }

      const distanceKm = calculateDistanceKm(
        { latitude: parseFloat(lat), longitude: parseFloat(lng) },
        provider
      );

      // 🎯 Get prediction using YOUR TRAINED MODEL
      const prediction = predictEnsemble(distanceKm, baseRate);

      // Enhanced debug logging with provider name fix
      console.log(`🔍 DEBUG - ${provider.name || provider.fullName || 'Unknown Provider'}:`);
      console.log(`   Distance: ${distanceKm.toFixed(2)}km`);
      console.log(`   Base Rate: ${baseRate} PKR`);
      console.log(`   Using Model: ${prediction.usingModel ? 'YES ✅' : 'NO (Improved Fallback) ⚠️'}`);
      console.log(`   Final Prediction: ${prediction.ensemble} PKR`);
      console.log(`   Travel Cost: ${calculateTravelCost(distanceKm).toFixed(2)} PKR`);

      predictions.push({
        ...provider.toObject(),
        estimatedBudget: prediction.ensemble,
        budgetDisplay: `${prediction.usingModel ? 'MODEL' : 'ENSEMBLE'}: ${prediction.ensemble} PKR`,
        distanceKm: distanceKm.toFixed(2),
        usingTrainedModel: prediction.usingModel,
        breakdown: {
          baseRate: baseRate,
          travelCost: calculateTravelCost(distanceKm),
          prediction: prediction.ensemble,
          method: prediction.usingModel ? 'Trained Model' : 'Fallback Calculation'
        }
      });
    }

    // Sort by cheapest first
    predictions.sort((a, b) => a.estimatedBudget - b.estimatedBudget);

    console.log(`✅ Generated ${predictions.length} ENSEMBLE predictions`);

    res.render('providers', {
      user: req.session.user || null,
      providers: predictions,
      category
    });

  } catch (err) {
    console.error('❌ Error in /quickBook/providers:', err.message, err.stack);
    res.status(500).send('Server error.');
  }
});

// 🔍 Simple test route
router.get('/test', (req, res) => {
  const { distance = 10, baseRate = 1000 } = req.query;
  
  const dist = parseFloat(distance);
  const rate = parseFloat(baseRate);
  
  const result = predictEnsemble(dist, rate);
  
  res.json({
    input: { distance: dist, baseRate: rate },
    result: result,
    display: `ENSEMBLE: ${result.ensemble} PKR`
  });
});

module.exports = router;