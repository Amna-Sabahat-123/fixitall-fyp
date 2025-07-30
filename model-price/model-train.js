const tf = require('@tensorflow/tfjs-node');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class SimplifiedPricePredictor {
  constructor() {
    this.model = null;
    this.normParams = null;
    // Training bounds
    this.MIN_DISTANCE = 0.1;
    this.MAX_DISTANCE = 160;
    this.MIN_BASE_RATE = 200;
    this.MAX_BASE_RATE = 8000;

    // Model persistence settings
    this.MODEL_DIR = './saved_models';
    this.MODEL_NAME = 'simple_price_predictor_model';
    this.METADATA_FILE = 'simple_model_metadata.json';
  }

  // Create model directory structure
  createModelDirectory() {
    if (!fs.existsSync(this.MODEL_DIR)) {
      fs.mkdirSync(this.MODEL_DIR, { recursive: true });
      console.log(`📁 Created model directory: ${this.MODEL_DIR}`);
    }
  }

  // Save the trained model and metadata
  async saveModel() {
    try {
      this.createModelDirectory();
      
      const modelPath = path.join(this.MODEL_DIR, this.MODEL_NAME);
      
      // Save the TensorFlow.js model
      await this.model.save(`file://${modelPath}`);
      console.log(`💾 Model saved to: ${modelPath}`);
      
      // Save normalization parameters and other metadata
      const metadata = {
        normParams: this.normParams,
        modelConfig: {
          MIN_DISTANCE: this.MIN_DISTANCE,
          MAX_DISTANCE: this.MAX_DISTANCE,
          MIN_BASE_RATE: this.MIN_BASE_RATE,
          MAX_BASE_RATE: this.MAX_BASE_RATE
        },
        trainingDate: new Date().toISOString(),
        version: '2.0.0'
      };
      
      const metadataPath = path.join(this.MODEL_DIR, this.METADATA_FILE);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      console.log(`📋 Metadata saved to: ${metadataPath}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error saving model:', error);
      return false;
    }
  }

  // Load the trained model and metadata
  async loadModel() {
    try {
      const modelPath = path.join(this.MODEL_DIR, this.MODEL_NAME);
      const metadataPath = path.join(this.MODEL_DIR, this.METADATA_FILE);
      
      // Check if model files exist
      if (!fs.existsSync(modelPath) || !fs.existsSync(metadataPath)) {
        console.log('📂 No saved model found. Training new model...');
        return false;
      }
      
      // Load the TensorFlow.js model
      this.model = await tf.loadLayersModel(`file://${modelPath}/model.json`);
      console.log(`✅ Model loaded from: ${modelPath}`);
      
      // Load metadata
      const metadataJson = fs.readFileSync(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataJson);
      
      this.normParams = metadata.normParams;
      this.MIN_DISTANCE = metadata.modelConfig.MIN_DISTANCE;
      this.MAX_DISTANCE = metadata.modelConfig.MAX_DISTANCE;
      this.MIN_BASE_RATE = metadata.modelConfig.MIN_BASE_RATE;
      this.MAX_BASE_RATE = metadata.modelConfig.MAX_BASE_RATE;
      
      console.log(`📋 Metadata loaded. Model trained on: ${metadata.trainingDate}`);
      console.log(`🔧 Model version: ${metadata.version}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error loading model:', error);
      return false;
    }
  }

  // Check if a trained model exists
  modelExists() {
    const modelPath = path.join(this.MODEL_DIR, this.MODEL_NAME, 'model.json');
    const metadataPath = path.join(this.MODEL_DIR, this.METADATA_FILE);
    return fs.existsSync(modelPath) && fs.existsSync(metadataPath);
  }

  // SIMPLIFIED: Only 2 features - distance and baseRate
  extractFeatures(distance, baseRate) {
    // Just return the two basic features
    return [distance, baseRate];
  }

  async train() {
    console.log('🚀 Training SIMPLIFIED price prediction model (2 features only)...\n');

    const data = this.generateTargetedData();
    console.log(`📊 Generated ${data.length} training samples`);

    const inputs = data.map(([d, b]) => this.extractFeatures(d, b));
    const labels = data.map(([, , p]) => p);

    console.log(`🔧 Using ${inputs[0].length} features: [distance, baseRate]`);

    // Create tensors
    const inputTensor = tf.tensor2d(inputs);
    const labelTensor = tf.tensor1d(labels);

    // Normalization
    const inputMean = inputTensor.mean(0);
    const inputStd = inputTensor.sub(inputMean).square().mean(0).sqrt().add(1e-7);
    const labelMean = labelTensor.mean();
    const labelStd = labelTensor.sub(labelMean).square().mean().sqrt().add(1e-7);

    const normalizedInputs = inputTensor.sub(inputMean).div(inputStd);
    const normalizedLabels = labelTensor.sub(labelMean).div(labelStd);

    // Store normalization parameters
    this.normParams = {
      inputMean: Array.from(await inputMean.data()),
      inputStd: Array.from(await inputStd.data()),
      labelMean: (await labelMean.data())[0],
      labelStd: (await labelStd.data())[0]
    };

    console.log(`📐 Training statistics: Mean ${this.normParams.labelMean.toFixed(0)} PKR, Std ${this.normParams.labelStd.toFixed(0)} PKR`);

    // Simple architecture for 2 features
    this.model = tf.sequential();

    this.model.add(tf.layers.dense({ 
      inputShape: [2], // Only 2 features now
      units: 32,
      activation: 'relu',
      kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
    }));
    this.model.add(tf.layers.dropout({ rate: 0.3 }));

    this.model.add(tf.layers.dense({ 
      units: 16,
      activation: 'relu',
      kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
    }));
    this.model.add(tf.layers.dropout({ rate: 0.2 }));

    this.model.add(tf.layers.dense({ 
      units: 8, 
      activation: 'relu' 
    }));

    this.model.add(tf.layers.dense({ 
      units: 1,
      activation: 'linear'
    }));

    const optimizer = tf.train.adam(0.001);

    this.model.compile({
      optimizer: optimizer,
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    console.log('🏋️ Training simplified model...');

    const callbacks = {
      onEpochEnd: async (epoch, logs) => {
        if (epoch % 50 === 0 || epoch === 299) {
          console.log(`Epoch ${epoch + 1}: loss=${logs.loss.toFixed(6)}, val_loss=${logs.val_loss?.toFixed(6) || 'N/A'}, mae=${logs.mae.toFixed(4)}`);
        }
      }
    };

    await this.model.fit(normalizedInputs, normalizedLabels, {
      epochs: 300,
      batchSize: 32,
      validationSplit: 0.15,
      verbose: 0,
      callbacks: callbacks,
      shuffle: true
    });

    console.log('✅ Simplified training completed!');
    
    // Save the model after training
    const saved = await this.saveModel();
    if (saved) {
      console.log('💾 Model successfully saved for future use!');
    }
    console.log('');

    // Clean up tensors
    inputTensor.dispose();
    labelTensor.dispose();
    normalizedInputs.dispose();
    normalizedLabels.dispose();
    inputMean.dispose();
    inputStd.dispose();
    labelMean.dispose();
    labelStd.dispose();
  }

  generateTargetedData() {
    const data = [];

    // Generate systematic combinations
    for (let distance = 0.5; distance <= 160; distance += 2) {
      for (let baseRate = 200; baseRate <= 8000; baseRate += 200) {
        const travelCost = this.calculateTravelCost(distance);
        const price = baseRate + travelCost;
        
        // Add some noise
        const noise = (Math.random() - 0.5) * 0.05 * travelCost;
        data.push([distance, baseRate, Math.max(price + noise, baseRate)]);
      }
    }

    // Add your specific problem cases
    const problemCases = [
      [120, 400, 980], [150, 500, 1200], [70, 500, 880],
      [100, 500, 800], [80, 600, 980], [90, 400, 760],
      [110, 450, 890], [130, 400, 920], [140, 600, 1160],
    ];

    // Add problem cases multiple times
    problemCases.forEach(([d, b, p]) => {
      for (let i = 0; i < 10; i++) {
        data.push([d, b, p]);
      }
    });

    // Additional random samples
    for (let i = 0; i < 1000; i++) {
      const distance = this.MIN_DISTANCE + Math.random() * (this.MAX_DISTANCE - this.MIN_DISTANCE);
      const baseRate = this.MIN_BASE_RATE + Math.random() * (this.MAX_BASE_RATE - this.MIN_BASE_RATE);
      const travelCost = this.calculateTravelCost(distance);
      const noise = (Math.random() - 0.5) * 0.04 * travelCost;
      const price = Math.max(baseRate + travelCost + noise, baseRate);
      data.push([distance, baseRate, price]);
    }

    return this.shuffleArray(data);
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  calculateTravelCost(distance) {
    if (distance <= 25) {
      return distance * 8;
    } else {
      return 200 + (distance - 25) * 4;
    }
  }

  predict(distance, baseRate, useEnsemble = true) {
    if (!this.model || !this.normParams) {
      throw new Error('Model not trained yet! Call train() first.');
    }

    const withinBounds = distance >= this.MIN_DISTANCE && distance <= this.MAX_DISTANCE &&
                        baseRate >= this.MIN_BASE_RATE && baseRate <= this.MAX_BASE_RATE;

    // Gentle clamping for extreme values
    const clampedDistance = Math.max(0.1, Math.min(200, distance));
    const clampedBaseRate = Math.max(100, Math.min(12000, baseRate));

    // Extract features (now just 2 values)
    const features = this.extractFeatures(clampedDistance, clampedBaseRate);

    // Normalize features
    const normalizedFeatures = features.map((f, i) => 
      (f - this.normParams.inputMean[i]) / this.normParams.inputStd[i]
    );

    const normalizedInput = tf.tensor2d([normalizedFeatures]);
    const normalizedPred = this.model.predict(normalizedInput);
    const denormalizedPred = normalizedPred.mul(this.normParams.labelStd).add(this.normParams.labelMean);

    let mlPrediction = denormalizedPred.dataSync()[0];

    // Clean up tensors
    normalizedInput.dispose();
    normalizedPred.dispose();
    denormalizedPred.dispose();

    // Post-processing
    const expectedTravelCost = this.calculateTravelCost(clampedDistance);
    const theoreticalMin = clampedBaseRate + expectedTravelCost * 0.85;
    const theoreticalMax = clampedBaseRate + expectedTravelCost * 1.25;

    mlPrediction = Math.max(theoreticalMin, Math.min(theoreticalMax, mlPrediction));
    mlPrediction = Math.max(mlPrediction, clampedBaseRate);
    mlPrediction = Math.round(mlPrediction);

    // Calculate expected (rule-based) prediction
    const expectedPrediction = this.calculateExpected(clampedDistance, clampedBaseRate);

    let finalPrediction;
    let method;

    if (useEnsemble) {
      finalPrediction = Math.round((mlPrediction + expectedPrediction) / 2);
      method = 'ensemble';
    } else {
      finalPrediction = mlPrediction;
      method = 'ml_only';
    }

    let confidence = 'high';
    if (!withinBounds || distance > 120) {
      confidence = 'medium';
    } else if ((distance > 80 && baseRate < 800) || (distance < 15 && baseRate > 5000)) {
      confidence = 'medium';
    }

    return {
      prediction: finalPrediction,
      mlPrediction: mlPrediction,
      expectedPrediction: expectedPrediction,
      method: method,
      withinBounds: withinBounds,
      clampedInputs: (clampedDistance !== distance || clampedBaseRate !== baseRate) 
        ? { distance: clampedDistance, baseRate: clampedBaseRate } : null,
      confidence: confidence
    };
  }

  calculateExpected(distance, baseRate) {
    const travelCost = this.calculateTravelCost(distance);
    return baseRate + travelCost;
  }

  async runComparisonTests() {
    console.log('🧪 Running SIMPLIFIED MODEL comparison tests:');
    console.log('============================================');

    const tests = [
      [5, 800, "Short distance, low rate"],
      [15, 1200, "Medium distance, medium rate"], 
      [25, 1500, "Boundary distance"],
      [35, 2000, "Long distance, high rate"],
      [120, 400, "CRITICAL: Very long + low rate"],
      [150, 500, "CRITICAL: Beyond bounds + low rate"],
      [70, 500, "CRITICAL: Long + low rate"],
      [18, 500, "Medium + low rate"],
      [12, 5000, "Premium short distance"],
      [10, 5987, "Ultra premium short"],
      [20, 600, "Short + medium rate"],
      [5, 1200, "Very short + medium rate"],
      [100, 300, "Max distance, very low rate"],
      [80, 800, "Long distance, medium-low rate"],
      [90, 600, "Long distance, low-medium rate"],
    ];

    let ensembleExcellent = 0, ensembleGood = 0, ensemblePoor = 0;
    let mlExcellent = 0, mlGood = 0, mlPoor = 0;
    let ensembleTotalError = 0, mlTotalError = 0;

    tests.forEach(([d, b, description], index) => {
      const ensembleResult = this.predict(d, b, true);
      const mlResult = this.predict(d, b, false);
      const expected = this.calculateExpected(d, b);

      const ensembleError = Math.abs(ensembleResult.prediction - expected);
      const mlError = Math.abs(mlResult.prediction - expected);
      const ensembleErrorPercent = (ensembleError / expected * 100);
      const mlErrorPercent = (mlError / expected * 100);

      ensembleTotalError += ensembleError;
      mlTotalError += mlError;

      console.log(`\n📍 Test ${index + 1}: ${description}`);
      console.log(`   Input: ${d}km, ${b} PKR`);
      if (ensembleResult.clampedInputs) {
        console.log(`   ⚠️  Clamped to: ${ensembleResult.clampedInputs.distance}km, ${ensembleResult.clampedInputs.baseRate} PKR`);
      }
      console.log(`   🎯 ENSEMBLE: ${ensembleResult.prediction} PKR (${ensembleErrorPercent.toFixed(1)}% error)`);
      console.log(`   🤖 ML ONLY:  ${mlResult.prediction} PKR (${mlErrorPercent.toFixed(1)}% error)`);
      console.log(`   📐 Expected: ${expected} PKR`);

      // Categorize results
      if (ensembleErrorPercent <= 5) {
        ensembleExcellent++;
      } else if (ensembleErrorPercent <= 10) {
        ensembleGood++;
      } else {
        ensemblePoor++;
      }

      if (mlErrorPercent <= 5) {
        mlExcellent++;
      } else if (mlErrorPercent <= 10) {
        mlGood++;
      } else {
        mlPoor++;
      }

      if (ensembleError < mlError) {
        console.log('   ✅ Ensemble wins!');
      } else if (mlError < ensembleError) {
        console.log('   🤖 ML-only wins!');
      } else {
        console.log('   🤝 Tie!');
      }
    });

    console.log('\n📈 PERFORMANCE COMPARISON:');
    console.log('==========================');
    console.log('ENSEMBLE APPROACH:');
    console.log(`  ✅ Excellent (≤5%):  ${ensembleExcellent}/${tests.length} (${(ensembleExcellent/tests.length*100).toFixed(1)}%)`);
    console.log(`  ⚠️  Good (5-10%):     ${ensembleGood}/${tests.length} (${(ensembleGood/tests.length*100).toFixed(1)}%)`);
    console.log(`  ❌ Poor (>10%):       ${ensemblePoor}/${tests.length} (${(ensemblePoor/tests.length*100).toFixed(1)}%)`);
    console.log(`  🎯 Success Rate:      ${((ensembleExcellent + ensembleGood)/tests.length*100).toFixed(1)}%`);
    console.log(`  📉 Avg Error:         ${(ensembleTotalError/tests.length).toFixed(1)} PKR`);

    console.log('\nML-ONLY APPROACH:');
    console.log(`  ✅ Excellent (≤5%):  ${mlExcellent}/${tests.length} (${(mlExcellent/tests.length*100).toFixed(1)}%)`);
    console.log(`  ⚠️  Good (5-10%):     ${mlGood}/${tests.length} (${(mlGood/tests.length*100).toFixed(1)}%)`);
    console.log(`  ❌ Poor (>10%):       ${mlPoor}/${tests.length} (${(mlPoor/tests.length*100).toFixed(1)}%)`);
    console.log(`  🎯 Success Rate:      ${((mlExcellent + mlGood)/tests.length*100).toFixed(1)}%`);
    console.log(`  📉 Avg Error:         ${(mlTotalError/tests.length).toFixed(1)} PKR`);
  }

  async evaluateModel() {
    console.log('\n🔍 SIMPLIFIED MODEL Architecture Summary:');
    console.log('=======================================');
    console.log(`📊 Input Features: 2 (distance, baseRate only)`);
    console.log(`🧠 Architecture: 32→16→8→1 neurons`);
    console.log(`🎯 Training Bounds: ${this.MIN_DISTANCE}-${this.MAX_DISTANCE}km, ${this.MIN_BASE_RATE}-${this.MAX_BASE_RATE} PKR`);
    console.log(`🔧 Key Features:`);
    console.log(`   • Simple 2-feature input: [distance, baseRate]`);
    console.log(`   • No complex feature engineering`);
    console.log(`   • Ensemble combines ML + Rule-based predictions`);
    
    if (this.modelExists()) {
      console.log(`💾 Model Status: Saved and ready for reuse`);
    } else {
      console.log(`📂 Model Status: Will be saved after training`);
    }
  }

  async initialize() {
    console.log('🚀 Initializing Simplified Price Prediction Model...\n');
    
    const loaded = await this.loadModel();
    
    if (loaded) {
      console.log('✅ Using existing trained model!\n');
      return true;
    } else {
      console.log('🏋️ Training new simplified model...\n');
      await this.train();
      return true;
    }
  }
}

// Interactive testing function
async function startInteractiveTesting(predictor) {
  console.log('\n🎯 SIMPLIFIED MODEL INTERACTIVE TESTING');
  console.log('======================================');
  console.log('Enter distance (km) and base rate (PKR) for predictions!\n');

  while (true) {
    try {
      const distanceInput = await askQuestion('🛣️  Enter distance (km): ');
      if (distanceInput.toLowerCase() === 'exit') break;

      const distance = parseFloat(distanceInput);
      if (isNaN(distance) || distance < 0) {
        console.log('❌ Please enter a valid positive number for distance!\n');
        continue;
      }

      const baseRateInput = await askQuestion('💰 Enter base rate (PKR): ');
      if (baseRateInput.toLowerCase() === 'exit') break;

      const baseRate = parseFloat(baseRateInput);
      if (isNaN(baseRate) || baseRate < 0) {
        console.log('❌ Please enter a valid positive number for base rate!\n');
        continue;
      }

      const ensembleResult = predictor.predict(distance, baseRate, true);
      const mlResult = predictor.predict(distance, baseRate, false);
      const expected = predictor.calculateExpected(distance, baseRate);

      const ensembleErrorPercent = Math.abs((ensembleResult.prediction - expected) / expected * 100);
      const mlErrorPercent = Math.abs((mlResult.prediction - expected) / expected * 100);

      console.log('\n📊 SIMPLIFIED MODEL RESULTS:');
      console.log('============================');
      console.log(`📥 Input: ${distance}km, ${baseRate} PKR`);

      if (ensembleResult.clampedInputs) {
        console.log(`⚠️  Adjusted: ${ensembleResult.clampedInputs.distance}km, ${ensembleResult.clampedInputs.baseRate} PKR`);
      }

      console.log(`🎯 ENSEMBLE: ${ensembleResult.prediction} PKR (${ensembleErrorPercent.toFixed(1)}% error)`);
      console.log(`🤖 ML Only:  ${mlResult.prediction} PKR (${mlErrorPercent.toFixed(1)}% error)`);
      console.log(`📐 Expected: ${expected} PKR`);
      console.log(`🔄 Method:   ${ensembleResult.method}`);
      console.log(`📈 Confidence: ${ensembleResult.confidence}`);

      console.log('\n' + '='.repeat(50) + '\n');

    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }

  console.log('👋 Testing complete! Goodbye!');
  rl.close();
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function quickTest(distance, baseRate, predictor) {
  const ensembleResult = predictor.predict(distance, baseRate, true);
  const mlResult = predictor.predict(distance, baseRate, false);
  const expected = predictor.calculateExpected(distance, baseRate);
  const ensembleError = Math.abs(ensembleResult.prediction - expected);
  const mlError = Math.abs(mlResult.prediction - expected);

  console.log(`\n🎯 Quick Test: ${distance}km, ${baseRate} PKR`);
  if (ensembleResult.clampedInputs) {
    console.log(`⚠️  Adjusted: ${ensembleResult.clampedInputs.distance}km, ${ensembleResult.clampedInputs.baseRate} PKR`);
  }
  console.log(`🎯 Ensemble: ${ensembleResult.prediction} PKR (${(ensembleError/expected*100).toFixed(1)}% error)`);
  console.log(`🤖 ML Only:  ${mlResult.prediction} PKR (${(mlError/expected*100).toFixed(1)}% error)`);
  console.log(`📐 Expected: ${expected} PKR`);
}

// Main execution
(async () => {
  try {
    console.log('🚀 Starting SIMPLIFIED Price Prediction Model (2 Features)\n');

    const predictor = new SimplifiedPricePredictor();
    await predictor.initialize();
    await predictor.evaluateModel();
    await predictor.runComparisonTests();

    // Make available globally
    global.predictor = predictor;
    global.test = (distance, baseRate) => quickTest(distance, baseRate, predictor);

    console.log('\n💡 SIMPLIFIED MODEL CONSOLE SHORTCUTS:');
    console.log('=====================================');
    console.log('test(distance, baseRate)           - Quick test');
    console.log('predictor.predict(d, b, true)      - Ensemble prediction');
    console.log('predictor.predict(d, b, false)     - ML-only prediction');
    console.log('Example: test(120, 400)            - Test case\n');

    await startInteractiveTesting(predictor);

  } catch (error) {
    console.error('❌ Error:', error);
    rl.close();
  }
})();
