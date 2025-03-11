// Neural Network for hand pose classification
let nn;
const maxSamples = 1000;
const classes = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'];
let currentClass = 0;
let collecting = false;
let sampleCount = 0;

// Training data storage
const trainingData = {
  Do: [], Re: [], Mi: [], Fa: [], Sol: [], La: [], Ti: []
};

function setupCalibration() {
  // Create neural network with input nodes matching landmark data points
  nn = ml5.neuralNetwork({
    inputs: 63, // 21 landmarks × 3 coordinates
    outputs: classes.length,
    task: 'classification',
    debug: true
  });

  // Create calibration UI
  createCalibrationUI();
}

function createCalibrationUI() {
  const container = createElement('div');
  container.id('calibration-ui');
  container.style('position', 'absolute');
  container.style('top', '20px');
  container.style('left', '20px');
  container.style('background', 'rgba(0,0,0,0.8)');
  container.style('padding', '20px');
  container.style('border-radius', '10px');

  // Current class indicator
  createElement('h2', 'Calibration Mode')
    .parent(container)
    .style('color', 'white');

  createElement('p', 'Current Sign: ')
    .parent(container)
    .id('current-class')
    .style('color', 'white');

  // Sample counter
  createElement('p', 'Samples: 0/' + maxSamples)
    .parent(container)
    .id('sample-counter')
    .style('color', 'white');

  // Collection button
  const collectBtn = createButton('Start Collecting')
    .parent(container)
    .mousePressed(() => toggleCollection());

  // Train button
  createButton('Train Model')
    .parent(container)
    .mousePressed(() => trainModel());

  // Save button
  createButton('Save Model')
    .parent(container)
    .mousePressed(() => nn.save());
}

function toggleCollection() {
  collecting = !collecting;
  const btn = select('#calibration-ui button');
  btn.html(collecting ? 'Stop Collecting' : 'Start Collecting');
}

function collectSample(landmarks) {
  if (!collecting || sampleCount >= maxSamples) return;

  // Flatten landmarks into single array
  const inputs = landmarks.reduce((arr, point) => {
    return arr.concat([point[0], point[1], point[2]]);
  }, []);

  // Add to training data
  nn.addData(inputs, [classes[currentClass]]);
  trainingData[classes[currentClass]].push(inputs);
  
  sampleCount++;
  updateUI();

  // Move to next class if max samples reached
  if (sampleCount >= maxSamples) {
    nextClass();
  }
}

function nextClass() {
  sampleCount = 0;
  currentClass = (currentClass + 1) % classes.length;
  collecting = false;
  updateUI();
}

function updateUI() {
  select('#current-class').html('Current Sign: ' + classes[currentClass]);
  select('#sample-counter').html(`Samples: ${sampleCount}/${maxSamples}`);
  select('#calibration-ui button').html(collecting ? 'Stop Collecting' : 'Start Collecting');
}

function trainModel() {
  // Normalize the data
  nn.normalizeData();

  // Train the model
  nn.train({
    epochs: 50,
    batchSize: 32
  }, () => {
    console.log('Training complete');
    // Switch to prediction mode
    nn.classify(trainingData[classes[0]][0], handleResults);
  });
}

function handleResults(error, results) {
  if (error) {
    console.error(error);
    return;
  }
  // Results contain predicted class and confidence
  console.log(results);
} 