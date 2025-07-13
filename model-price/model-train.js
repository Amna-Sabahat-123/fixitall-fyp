const tf = require('@tensorflow/tfjs');

// Realistic input: [distance in km, baseRate in PKR]
const rawInputs = [
  [1, 600],
  [5, 700],
  [10, 800],
  [15, 900],
  [20, 1000],
  [25, 1200],
  [30, 1500],
  [35, 1800],
  [40, 2000],
  [50, 2000] // capped test
];

// Apply travel cost: max 200 PKR, using scaled cost = (distance / 25) × 200
const rawLabels = rawInputs.map(([distance, baseRate]) => {
  const travelCost = Math.min((distance / 25) * 200, 200); // max cap at 200
  return baseRate + travelCost;
});

// Define normalization boundaries
const inputMin = tf.tensor2d([[1, 600]]);
const inputMax = tf.tensor2d([[50, 2000]]);
const labelMin = Math.min(...rawLabels);
const labelMax = Math.max(...rawLabels);

// Normalize inputs and labels
const inputs = tf.tensor2d(rawInputs).sub(inputMin).div(inputMax.sub(inputMin));
const labels = tf.tensor1d(rawLabels).sub(labelMin).div(labelMax - labelMin);

// Build model
const model = tf.sequential();
model.add(tf.layers.dense({ inputShape: [2], units: 8, activation: 'relu' }));
model.add(tf.layers.dense({ units: 1 }));

model.compile({
  optimizer: tf.train.adam(),
  loss: 'meanSquaredError'
});

(async () => {
  await model.fit(inputs, labels, {
    epochs: 150,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        console.log(`Epoch ${epoch + 1}: loss=${logs.loss.toFixed(4)}`);
      }
    }
  });

  await model.save('file://model');
  console.log('✅ Model saved to /model');
})();
