// Neural Network for hand pose classification
let nn;
const maxSamples = 1000;
const classes = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"];
let currentClass = 0;
let collecting = false;
let sampleCount = 0;

// Training data storage
const trainingData = {
  Do: [],
  Re: [],
  Mi: [],
  Fa: [],
  Sol: [],
  La: [],
  Ti: [],
};

function setupCalibration() {
  // Create neural network with input nodes matching landmark data points
  nn = ml5.neuralNetwork({
    inputs: 63, // 21 landmarks × 3 coordinates
    outputs: classes.length,
    task: "classification",
    debug: true,
  });

  // Create calibration UI
  createCalibrationUI();
}

function createCalibrationUI() {
  const container = createElement("div");
  container.id("calibration-ui");

  // Initial positioning - will be updated from sketch.js
  container.style("position", "absolute");
  container.style("top", "0");
  container.style("left", "50%");
  container.style("transform", "translateX(-50%)"); // Center horizontally
  container.style("background", "rgba(0,0,0,0.8)");
  container.style("padding", "20px");
  container.style("border-radius", "10px");
  container.style("width", "80%");
  container.style("max-width", "800px");
  container.style("display", "none"); // Hidden by default
  container.style("z-index", "100");

  // Current class indicator
  createElement("h2", "Calibration Mode")
    .parent(container)
    .style("color", "white")
    .style("margin-top", "0");

  createElement("p", "Current Sign: ")
    .parent(container)
    .id("current-class")
    .style("color", "white");

  // Sample counter
  createElement("p", "Samples: 0/" + maxSamples)
    .parent(container)
    .id("sample-counter")
    .style("color", "white");

  // Create buttons row
  const buttonRow = createElement("div")
    .parent(container)
    .style("display", "flex")
    .style("gap", "10px")
    .style("justify-content", "center")
    .style("margin-top", "15px");

  // Collection button
  const collectBtn = createButton("Start Collecting")
    .parent(buttonRow)
    .mousePressed(() => toggleCollection());

  // Train button
  createButton("Train Model")
    .parent(buttonRow)
    .mousePressed(() => trainModel());

  // Save button
  createButton("Save Model")
    .parent(buttonRow)
    .mousePressed(() => nn.save());

  // Next class button
  createButton("Next Class")
    .parent(buttonRow)
    .mousePressed(() => nextClass());
}

function toggleCollection() {
  collecting = !collecting;
  const btn = select("#calibration-ui button");
  btn.html(collecting ? "Stop Collecting" : "Start Collecting");
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
  select("#current-class").html("Current Sign: " + classes[currentClass]);
  select("#sample-counter").html(`Samples: ${sampleCount}/${maxSamples}`);
  select("#calibration-ui button").html(
    collecting ? "Stop Collecting" : "Start Collecting"
  );
}

function trainModel() {
  // Normalize the data
  nn.normalizeData();

  // Train the model
  nn.train(
    {
      epochs: 50,
      batchSize: 32,
    },
    () => {
      console.log("Training complete");
      // Switch to prediction mode
      nn.classify(trainingData[classes[0]][0], handleResults);
    }
  );
}

function handleResults(error, results) {
  if (error) {
    console.error(error);
    return;
  }
  // Results contain predicted class and confidence
  console.log(results);
}

// Update the positioning of calibration UI elements to match the new layout

function createUI() {
  // ...existing code...

  // Position the calibration controls at the bottom of the screen
  const containerHeight = 150; // Match the height in sketch.js

  calibrationContainer.style("bottom", "0");
  calibrationContainer.style("top", "auto");
  calibrationContainer.style("height", `${containerHeight}px`);
  calibrationContainer.style("border-radius", "10px 10px 0 0");

  // ...existing code...
}
