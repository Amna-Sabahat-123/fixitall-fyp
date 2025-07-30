const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const compression = require('compression');
const PricePredictionService = require('./price-prediction-service');

class PricePredictionAPI {
  constructor(port = 3000) {
    this.app = express();
    this.port = port;
    this.priceService = new PricePredictionService();
    this.metrics = {
      requests: 0,
      predictions: 0,
      errors: 0,
      avgResponseTime: 0,
      confidenceDistribution: {
        high: 0,
        medium: 0,
        low: 0
      }
    };
  }

  async initialize() {
    // Initialize the prediction service
    console.log('🚀 Initializing Price Prediction Service...');
    const initialized = await this.priceService.initialize();
    
    if (!initialized) {
      throw new Error('Failed to initialize price prediction service');
    }
    
    // Setup middleware
    this.setupMiddleware();
    
    // Setup routes
    this.setupRoutes();
    
    // Error handling
    this.setupErrorHandling();
    
    // Start server
    this.server = this.app.listen(this.port, () => {
      console.log(`✅ API Server running on port ${this.port}`);
      console.log(`📊 Health check: http://localhost:${this.port}/health`);
      console.log(`📈 Metrics: http://localhost:${this.port}/metrics`);
    });
    
    // Graceful shutdown
    this.setupGracefulShutdown();
  }

  setupMiddleware() {
    // Security headers
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true
    }));
    
    // Compression
    this.app.use(compression());
    
    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req, res, next) => {
      req.startTime = Date.now();
      this.metrics.requests++;
      next();
    });
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    
    this.app.use('/api/', limiter);
    
    // Stricter rate limit for predictions
    const predictionLimiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 20, // 20 predictions per minute
      message: 'Too many prediction requests, please try again later.'
    });
    
    this.app.use('/api/estimate-price', predictionLimiter);
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'price-prediction-api',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    });
    
    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      res.json({
        ...this.metrics,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        modelVersion: '2.0.0'
      });
    });
    
    // Main prediction endpoint
    this.app.post('/api/estimate-price', async (req, res) => {
      try {
        const { distance, baseRate } = req.body;
        
        // Input validation
        const validation = this.validateInputs(distance, baseRate);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            error: validation.error,
            details: validation.details
          });
        }
        
        // Get prediction
        const startTime = Date.now();
        const result = await this.priceService.getEstimatedPrice(distance, baseRate);
        const responseTime = Date.now() - startTime;
        
        // Update metrics
        this.updateMetrics(result, responseTime);
        
        // Log prediction for monitoring
        this.logPrediction({
          distance,
          baseRate,
          prediction: result.estimatedPrice,
          confidence: result.confidence,
          responseTime
        });
        
        // Send response
        res.json({
          success: true,
          data: {
            estimatedPrice: result.estimatedPrice,
            confidence: result.confidence,
            breakdown: result.breakdown,
            warnings: result.warnings,
            responseTime: `${responseTime}ms`
          },
          metadata: {
            modelVersion: '2.0.0',
            timestamp: new Date().toISOString()
          }
        });
        
      } catch (error) {
        this.metrics.errors++;
        console.error('Prediction error:', error);
        
        res.status(500).json({
          success: false,
          error: 'Failed to calculate price estimate',
          message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });
    
    // Batch prediction endpoint
    this.app.post('/api/estimate-price-batch', async (req, res) => {
      try {
        const { requests } = req.body;
        
        if (!Array.isArray(requests) || requests.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid request format. Expected array of {distance, baseRate} objects.'
          });
        }
        
        if (requests.length > 100) {
          return res.status(400).json({
            success: false,
            error: 'Batch size too large. Maximum 100 requests per batch.'
          });
        }
        
        const results = [];
        const startTime = Date.now();
        
        for (const request of requests) {
          try {
            const validation = this.validateInputs(request.distance, request.baseRate);
            if (!validation.valid) {
              results.push({
                success: false,
                error: validation.error,
                input: request
              });
              continue;
            }
            
            const result = await this.priceService.getEstimatedPrice(
              request.distance,
              request.baseRate
            );
            
            results.push({
              success: true,
              input: request,
              output: {
                estimatedPrice: result.estimatedPrice,
                confidence: result.confidence
              }
            });
          } catch (error) {
            results.push({
              success: false,
              error: 'Prediction failed',
              input: request
            });
          }
        }
        
        const totalTime = Date.now() - startTime;
        
        res.json({
          success: true,
          data: results,
          metadata: {
            totalRequests: requests.length,
            successfulPredictions: results.filter(r => r.success).length,
            failedPredictions: results.filter(r => !r.success).length,
            totalResponseTime: `${totalTime}ms`,
            avgResponseTime: `${(totalTime / requests.length).toFixed(2)}ms`
          }
        });
        
      } catch (error) {
        console.error('Batch prediction error:', error);
        res.status(500).json({
          success: false,
          error: 'Batch prediction failed'
        });
      }
    });
    
    // Model information endpoint
    this.app.get('/api/model-info', (req, res) => {
      res.json({
        modelVersion: '2.0.0',
        features: [
          'distance', 'baseRate', 'travelCost', 'distanceSquared',
          'baseRateSquared', 'sqrtDistance', 'sqrtBaseRate', 'logDistance',
          'logBaseRate', 'baseToTravel', 'premiumRatio', 'interaction',
          'and more...'
        ],
        inputRanges: {
          distance: {
            min: this.priceService.MIN_DISTANCE,
            max: this.priceService.MAX_DISTANCE,
            unit: 'km'
          },
          baseRate: {
            min: this.priceService.MIN_BASE_RATE,
            max: this.priceService.MAX_BASE_RATE,
            unit: 'PKR'
          }
        },
        performance: this.priceService.modelMetrics || 'Not available'
      });
    });
    
    // Validation endpoint (useful for frontend)
    this.app.post('/api/validate-inputs', (req, res) => {
      const { distance, baseRate } = req.body;
      const validation = this.validateInputs(distance, baseRate);
      
      res.json({
        valid: validation.valid,
        errors: validation.valid ? [] : [validation.error],
        warnings: validation.warnings || [],
        details: validation.details
      });
    });
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        availableEndpoints: [
          'POST /api/estimate-price',
          'POST /api/estimate-price-batch',
          'POST /api/validate-inputs',
          'GET /api/model-info',
          'GET /health',
          'GET /metrics'
        ]
      });
    });
    
    // Global error handler
    this.app.use((err, req, res, next) => {
      console.error('Unhandled error:', err);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      // Stop accepting new requests
      this.server.close(() => {
        console.log('HTTP server closed');
      });
      
      // Wait for ongoing requests to complete (max 30 seconds)
      setTimeout(() => {
        console.log('Forcing shutdown...');
        process.exit(1);
      }, 30000);
      
      // Cleanup
      try {
        // Save any pending metrics
        await this.saveMetrics();
        console.log('Metrics saved');
        
        // Cleanup TensorFlow resources
        if (this.priceService.model) {
          this.priceService.model.dispose();
          console.log('Model resources released');
        }
        
        console.log('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  validateInputs(distance, baseRate) {
    const errors = [];
    const warnings = [];
    const details = {};
    
    // Check if inputs exist
    if (distance === undefined || distance === null) {
      errors.push('Distance is required');
    }
    if (baseRate === undefined || baseRate === null) {
      errors.push('Base rate is required');
    }
    
    // Check if inputs are numbers
    const distanceNum = Number(distance);
    const baseRateNum = Number(baseRate);
    
    if (isNaN(distanceNum)) {
      errors.push('Distance must be a number');
    }
    if (isNaN(baseRateNum)) {
      errors.push('Base rate must be a number');
    }
    
    if (errors.length > 0) {
      return {
        valid: false,
        error: errors.join(', '),
        details
      };
    }
    
    // Check ranges
    if (distanceNum <= 0) {
      errors.push('Distance must be positive');
    }
    if (baseRateNum <= 0) {
      errors.push('Base rate must be positive');
    }
    
    if (distanceNum < this.priceService.MIN_DISTANCE) {
      warnings.push(`Distance ${distanceNum}km is below minimum trained range (${this.priceService.MIN_DISTANCE}km)`);
      details.distanceWarning = 'below_minimum';
    }
    if (distanceNum > this.priceService.MAX_DISTANCE) {
      warnings.push(`Distance ${distanceNum}km is above maximum trained range (${this.priceService.MAX_DISTANCE}km)`);
      details.distanceWarning = 'above_maximum';
    }
    if (baseRateNum < this.priceService.MIN_BASE_RATE) {
      warnings.push(`Base rate ${baseRateNum} PKR is below minimum trained range (${this.priceService.MIN_BASE_RATE} PKR)`);
      details.baseRateWarning = 'below_minimum';
    }
    if (baseRateNum > this.priceService.MAX_BASE_RATE) {
      warnings.push(`Base rate ${baseRateNum} PKR is above maximum trained range (${this.priceService.MAX_BASE_RATE} PKR)`);
      details.baseRateWarning = 'above_maximum';
    }
    
    return {
      valid: errors.length === 0,
      error: errors.join(', '),
      warnings,
      details
    };
  }

  updateMetrics(result, responseTime) {
    this.metrics.predictions++;
    
    // Update confidence distribution
    this.metrics.confidenceDistribution[result.confidence]++;
    
    // Update average response time
    const totalResponseTime = this.metrics.avgResponseTime * (this.metrics.predictions - 1) + responseTime;
    this.metrics.avgResponseTime = totalResponseTime / this.metrics.predictions;
  }

  logPrediction(data) {
    // In production, this would log to a monitoring service
    if (process.env.NODE_ENV === 'development') {
      console.log('Prediction:', {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  async saveMetrics() {
    // In production, this would save to a database or monitoring service
    const fs = require('fs');
    const metricsFile = './api-metrics.json';
    
    try {
      fs.writeFileSync(metricsFile, JSON.stringify({
        metrics: this.metrics,
        savedAt: new Date().toISOString()
      }, null, 2));
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }
}

// Start the server
if (require.main === module) {
  const port = process.env.PORT || 3000;
  const apiServer = new PricePredictionAPI(port);
  
  apiServer.initialize().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = PricePredictionAPI;