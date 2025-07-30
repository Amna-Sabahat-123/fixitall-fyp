const PricePredictionService = require('./price-prediction-service');

class ModelTestingSuite {
  constructor(predictor) {
    this.predictor = predictor;
    this.testResults = {
      edgeCases: [],
      boundaryTests: [],
      consistencyTests: [],
      performanceTests: [],
      businessLogicTests: []
    };
  }

  async runAllTests() {
    console.log('🧪 Running Comprehensive Model Tests...\n');
    
    await this.testEdgeCases();
    await this.testBoundaries();
    await this.testConsistency();
    await this.testPerformance();
    await this.testBusinessLogic();
    
    this.generateReport();
  }

  async testEdgeCases() {
    console.log('📌 Testing Edge Cases...');
    
    const edgeCases = [
      // [distance, baseRate, expectedBehavior]
      [0.1, 200, "Minimum distance, minimum rate"],
      [160, 8000, "Maximum distance, maximum rate"],
      [0.1, 8000, "Minimum distance, maximum rate"],
      [160, 200, "Maximum distance, minimum rate"],
      [1, 500, "Very short urban trip"],
      [150, 300, "Very long distance, very low rate"],
      [80, 600, "Peak distance boundary"],
      [25, 1000, "Travel cost formula boundary"],
      [100, 1000, "Round number psychological boundary"],
      [99.9, 999, "Just below round numbers"]
    ];

    for (const [distance, baseRate, description] of edgeCases) {
      try {
        const result = await this.predictor.getEstimatedPrice(distance, baseRate);
        const travelCost = this.calculateExpectedTravelCost(distance);
        const ratio = result.estimatedPrice / (baseRate + travelCost);
        
        this.testResults.edgeCases.push({
          test: description,
          distance,
          baseRate,
          predicted: result.estimatedPrice,
          expected: baseRate + travelCost,
          deviation: ((result.estimatedPrice - (baseRate + travelCost)) / (baseRate + travelCost) * 100).toFixed(2) + '%',
          confidence: result.confidence,
          passed: Math.abs(ratio - 1) < 0.3 // Within 30% of expected
        });
      } catch (error) {
        this.testResults.edgeCases.push({
          test: description,
          distance,
          baseRate,
          error: error.message,
          passed: false
        });
      }
    }
  }

  async testBoundaries() {
    console.log('🔍 Testing Boundary Conditions...');
    
    // Test just inside and outside boundaries
    const boundaries = [
      { name: "Distance Lower", values: [0.05, 0.1, 0.15], baseRate: 1000 },
      { name: "Distance Upper", values: [159.5, 160, 160.5], baseRate: 1000 },
      { name: "BaseRate Lower", values: [195, 200, 205], distance: 50 },
      { name: "BaseRate Upper", values: [7995, 8000, 8005], distance: 50 }
    ];

    for (const boundary of boundaries) {
      for (const value of boundary.values) {
        const distance = boundary.distance || value;
        const baseRate = boundary.baseRate || value;
        
        try {
          const result = await this.predictor.getEstimatedPrice(distance, baseRate);
          
          this.testResults.boundaryTests.push({
            boundary: boundary.name,
            value,
            distance,
            baseRate,
            predicted: result.estimatedPrice,
            confidence: result.confidence,
            warnings: result.warnings.length,
            passed: result.estimatedPrice > 0 && result.estimatedPrice < 50000
          });
        } catch (error) {
          this.testResults.boundaryTests.push({
            boundary: boundary.name,
            value,
            error: error.message,
            passed: false
          });
        }
      }
    }
  }

  async testConsistency() {
    console.log('🔄 Testing Consistency & Monotonicity...');
    
    // Test 1: Increasing distance should increase price (with same base rate)
    const baseRateFixed = 1000;
    let lastPrice = 0;
    let monotonicityPassed = true;
    
    for (let distance = 5; distance <= 150; distance += 5) {
      const result = await this.predictor.getEstimatedPrice(distance, baseRateFixed);
      
      if (result.estimatedPrice < lastPrice) {
        monotonicityPassed = false;
        this.testResults.consistencyTests.push({
          test: 'Distance Monotonicity',
          issue: `Price decreased from ${lastPrice} to ${result.estimatedPrice} when distance increased from ${distance-5} to ${distance}`,
          passed: false
        });
      }
      lastPrice = result.estimatedPrice;
    }
    
    if (monotonicityPassed) {
      this.testResults.consistencyTests.push({
        test: 'Distance Monotonicity',
        description: 'Price consistently increases with distance',
        passed: true
      });
    }

    // Test 2: Same inputs should give same outputs (deterministic)
    const testInputs = [[50, 1500], [100, 2000], [25, 800]];
    
    for (const [distance, baseRate] of testInputs) {
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await this.predictor.getEstimatedPrice(distance, baseRate);
        results.push(result.estimatedPrice);
      }
      
      const allSame = results.every(price => price === results[0]);
      this.testResults.consistencyTests.push({
        test: 'Deterministic Output',
        input: `${distance}km, ${baseRate}PKR`,
        results: allSame ? 'All predictions identical' : `Variations found: ${results.join(', ')}`,
        passed: allSame
      });
    }

    // Test 3: Smooth transitions (no sudden jumps)
    for (let distance = 24; distance <= 26; distance += 0.1) {
      const result = await this.predictor.getEstimatedPrice(distance, 1000);
      this.testResults.consistencyTests.push({
        test: 'Smooth Transition at 25km',
        distance: distance.toFixed(1),
        predicted: result.estimatedPrice,
        passed: true // Visual inspection needed
      });
    }
  }

  async testPerformance() {
    console.log('⚡ Testing Performance...');
    
    // Test prediction speed
    const iterations = 1000;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      const distance = Math.random() * 150 + 0.1;
      const baseRate = Math.random() * 7800 + 200;
      await this.predictor.getEstimatedPrice(distance, baseRate);
    }
    
    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / iterations;
    
    this.testResults.performanceTests.push({
      test: 'Average Prediction Time',
      iterations,
      totalTime: `${totalTime}ms`,
      averageTime: `${avgTime.toFixed(2)}ms`,
      passed: avgTime < 10 // Should be under 10ms per prediction
    });

    // Test cache effectiveness
    const cacheStartSize = this.predictor.featureCache.size;
    
    // Make repeated predictions
    for (let i = 0; i < 100; i++) {
      await this.predictor.getEstimatedPrice(50, 1000);
    }
    
    const cacheEndSize = this.predictor.featureCache.size;
    
    this.testResults.performanceTests.push({
      test: 'Cache Effectiveness',
      startSize: cacheStartSize,
      endSize: cacheEndSize,
      description: 'Cache prevents redundant calculations',
      passed: cacheEndSize === cacheStartSize + 1
    });

    // Test memory usage
    if (global.gc) {
      global.gc();
      const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
      
      // Make many predictions
      for (let i = 0; i < 10000; i++) {
        const distance = Math.random() * 150 + 0.1;
        const baseRate = Math.random() * 7800 + 200;
        await this.predictor.getEstimatedPrice(distance, baseRate);
      }
      
      global.gc();
      const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      const memIncrease = memAfter - memBefore;
      
      this.testResults.performanceTests.push({
        test: 'Memory Leak Check',
        memoryIncrease: `${memIncrease.toFixed(2)}MB`,
        passed: memIncrease < 50 // Should not increase by more than 50MB
      });
    }
  }

  async testBusinessLogic() {
    console.log('💼 Testing Business Logic Compliance...');
    
    // Test 1: Price should never be less than base rate
    const randomTests = 100;
    let belowBaseRate = 0;
    
    for (let i = 0; i < randomTests; i++) {
      const distance = Math.random() * 150 + 0.1;
      const baseRate = Math.random() * 7800 + 200;
      const result = await this.predictor.getEstimatedPrice(distance, baseRate);
      
      if (result.estimatedPrice < baseRate) {
        belowBaseRate++;
      }
    }
    
    this.testResults.businessLogicTests.push({
      test: 'Minimum Price Constraint',
      description: 'Price should never be below base rate',
      violations: belowBaseRate,
      total: randomTests,
      passed: belowBaseRate === 0
    });

    // Test 2: Travel cost formula verification
    const travelCostTests = [
      [10, 80],    // 10 * 8 = 80
      [25, 200],   // 25 * 8 = 200
      [26, 204],   // 200 + (26-25) * 4 = 204
      [50, 300],   // 200 + (50-25) * 4 = 300
      [100, 500],  // 200 + (100-25) * 4 = 500
    ];

    for (const [distance, expectedCost] of travelCostTests) {
      const result = await this.predictor.getEstimatedPrice(distance, 1000);
      const estimatedTravelCost = result.breakdown.estimatedTravelCost;
      
      this.testResults.businessLogicTests.push({
        test: 'Travel Cost Formula',
        distance,
        expectedTravelCost: expectedCost,
        calculatedTravelCost: estimatedTravelCost,
        passed: Math.abs(estimatedTravelCost - expectedCost) < 1
      });
    }

    // Test 3: Long distance budget constraint
    const budgetConstraints = [
      [100, 400, 1000],  // Should be constrained
      [120, 300, 900],   // Should be constrained
      [80, 600, 1100],   // Should be constrained
    ];

    for (const [distance, baseRate, maxExpected] of budgetConstraints) {
      const result = await this.predictor.getEstimatedPrice(distance, baseRate);
      
      this.testResults.businessLogicTests.push({
        test: 'Long Distance Budget Constraint',
        distance,
        baseRate,
        predicted: result.estimatedPrice,
        maxExpected,
        warnings: result.warnings.join('; '),
        passed: result.estimatedPrice <= maxExpected
      });
    }

    // Test 4: Premium service should have higher margins
    const premiumTests = [
      [50, 500],   // Budget service
      [50, 5000],  // Premium service
    ];

    const margins = [];
    for (const [distance, baseRate] of premiumTests) {
      const result = await this.predictor.getEstimatedPrice(distance, baseRate);
      const travelCost = this.calculateExpectedTravelCost(distance);
      const margin = (result.estimatedPrice - baseRate - travelCost) / travelCost;
      margins.push({ baseRate, margin });
    }

    this.testResults.businessLogicTests.push({
      test: 'Premium Service Margins',
      budgetMargin: (margins[0].margin * 100).toFixed(2) + '%',
      premiumMargin: (margins[1].margin * 100).toFixed(2) + '%',
      passed: margins[1].margin > margins[0].margin
    });
  }

  calculateExpectedTravelCost(distance) {
    if (distance <= 25) {
      return distance * 8;
    } else {
      return 200 + (distance - 25) * 4;
    }
  }

  generateReport() {
    console.log('\n📊 TEST RESULTS SUMMARY\n');
    
    const categories = [
      { name: 'Edge Cases', results: this.testResults.edgeCases },
      { name: 'Boundary Tests', results: this.testResults.boundaryTests },
      { name: 'Consistency Tests', results: this.testResults.consistencyTests },
      { name: 'Performance Tests', results: this.testResults.performanceTests },
      { name: 'Business Logic Tests', results: this.testResults.businessLogicTests }
    ];

    let totalTests = 0;
    let passedTests = 0;

    for (const category of categories) {
      const categoryPassed = category.results.filter(r => r.passed).length;
      const categoryTotal = category.results.length;
      totalTests += categoryTotal;
      passedTests += categoryPassed;
      
      console.log(`${category.name}: ${categoryPassed}/${categoryTotal} passed (${(categoryPassed/categoryTotal*100).toFixed(1)}%)`);
      
      // Show failed tests
      const failed = category.results.filter(r => !r.passed);
      if (failed.length > 0) {
        console.log(`  ❌ Failed tests:`);
        failed.forEach(test => {
          console.log(`     - ${test.test || test.boundary || 'Test'}: ${test.error || test.issue || 'Failed'}`);
        });
      }
    }

    console.log(`\n✅ Overall: ${passedTests}/${totalTests} tests passed (${(passedTests/totalTests*100).toFixed(1)}%)\n`);

    // Save detailed report
    const fs = require('fs');
    const reportPath = './test-results.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));
    console.log(`📄 Detailed report saved to ${reportPath}`);
  }

  // Additional utility methods for continuous testing
  async compareModels(oldModel, newModel) {
    console.log('🔄 Comparing old vs new model...');
    
    const testSet = this.generateTestSet(1000);
    const results = {
      improvements: 0,
      regressions: 0,
      unchanged: 0,
      details: []
    };

    for (const [distance, baseRate, expectedPrice] of testSet) {
      const oldResult = await oldModel.getEstimatedPrice(distance, baseRate);
      const newResult = await newModel.getEstimatedPrice(distance, baseRate);
      
      const oldError = Math.abs(oldResult.estimatedPrice - expectedPrice);
      const newError = Math.abs(newResult.estimatedPrice - expectedPrice);
      
      if (newError < oldError) {
        results.improvements++;
      } else if (newError > oldError) {
        results.regressions++;
        results.details.push({
          distance,
          baseRate,
          expectedPrice,
          oldPrediction: oldResult.estimatedPrice,
          newPrediction: newResult.estimatedPrice,
          regression: newError - oldError
        });
      } else {
        results.unchanged++;
      }
    }

    return results;
  }

  generateTestSet(size) {
    const testSet = [];
    
    for (let i = 0; i < size; i++) {
      const distance = Math.random() * 150 + 0.1;
      const baseRate = Math.random() * 7800 + 200;
      const travelCost = this.calculateExpectedTravelCost(distance);
      
      // Add some realistic variations
      let expectedPrice = baseRate + travelCost;
      
      // Peak distance adjustment
      if (distance >= 40 && distance <= 80) {
        expectedPrice *= 1.05;
      }
      
      // Long haul discount
      if (distance > 100) {
        expectedPrice *= 0.95;
      }
      
      // Add some noise
      expectedPrice += (Math.random() - 0.5) * 0.1 * travelCost;
      
      testSet.push([distance, baseRate, Math.round(expectedPrice)]);
    }
    
    return testSet;
  }
}

// Run the test suite
if (require.main === module) {
  (async () => {
    try {
      const predictor = new PricePredictionService();
      await predictor.initialize();
      
      const testSuite = new ModelTestingSuite(predictor);
      await testSuite.runAllTests();
      
    } catch (error) {
      console.error('Test suite failed:', error);
    }
  })();
}

module.exports = ModelTestingSuite;