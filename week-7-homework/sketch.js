let video;
let handPredictions = []; // Renamed from 'predictions' to avoid conflict
let synth;
let currentNote = "None";
let activeNote = null;
let lastPlayedTime = 0;
let debounceDelay = 500; // ms delay to prevent rapid triggering
let referenceImg; // Reference image for solfege hand signs

// New global variables for layout
let leftPanelWidth = 400; // Static width for left panel
let padding = 20; // Padding for visual elements
let confidenceDisplayHeight = 100; // Height for the confidence display

// Remove the camera aspect ratio constraint variable

// Solfege notes in "fixed do" starting at middle C
const solfegeNotes = {
  Do: "C4",
  Re: "D4",
  Mi: "E4",
  Fa: "F4",
  Sol: "G4",
  La: "A4",
  Ti: "B4",
};

// Add smoothing variables for the keypoints
let smoothedLandmarks = [];
const smoothingFactor = 0.7; // Higher = more smoothing, range 0-1
let isFirstPrediction = true;

// Add at the top with other global variables
let isCalibrationMode = false;

function preload() {
  // Load the reference image
  referenceImg = loadImage("images/solfege-hand-signs.png");
}

function setup() {
  // Create a static sized canvas matching our video dimensions
  createCanvas(1280, 720);

  // Set fixed left panel width
  leftPanelWidth = 400;

  // Initialize video with standard dimensions
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // Initialize the synthesizer
  synth = new Tone.PolySynth(Tone.Synth).toDestination();

  // Initialize model handler
  modelHandler.loadModel().then(() => {
    // Initialize handpose detection using the module
    handPoseDetection.init(
      video,
      // Model ready callback
      () => {
        select("#status").html("Models loaded, show your hand signs!");
      },
      // Detection callback
      (detectedNote, results) => {
        handPredictions = results || [];
        
        if (isCalibrationMode && handPredictions.length > 0) {
          // Send landmarks to calibration system
          collectSample(handPredictions[0].landmarks);
        } else {
          // Apply smoothing to landmarks if predictions exist
          if (handPredictions.length > 0) {
            const currentLandmarks = handPredictions[0].landmarks;

            // Initialize smoothed landmarks on first prediction
            if (isFirstPrediction || smoothedLandmarks.length === 0) {
              smoothedLandmarks = [...currentLandmarks];
              isFirstPrediction = false;
            } else {
              // Apply exponential smoothing to each landmark
              for (let i = 0; i < currentLandmarks.length; i++) {
                if (!smoothedLandmarks[i]) {
                  smoothedLandmarks[i] = [...currentLandmarks[i]];
                } else {
                  for (let j = 0; j < 3; j++) {
                    smoothedLandmarks[i][j] =
                      smoothedLandmarks[i][j] * smoothingFactor +
                      currentLandmarks[i][j] * (1 - smoothingFactor);
                  }
                }
              }
            }
          }

          // Handle note detection and playback
          if (detectedNote !== null && detectedNote !== currentNote) {
            const now = millis();
            if (now - lastPlayedTime > debounceDelay) {
              if (activeNote !== null) {
                stopCurrentNote();
              }
              currentNote = detectedNote;
              updateNoteDisplay();
              playNote(solfegeNotes[currentNote]);
              lastPlayedTime = now;
            }
          } else if (detectedNote === null && currentNote !== "None") {
            currentNote = "None";
            updateNoteDisplay();
            if (activeNote !== null) {
              stopCurrentNote();
            }
          }
        }
      }
    );
  });

  // Add calibration setup
  setupCalibration();
  
  // Add calibration toggle button
  createButton('Toggle Calibration Mode')
    .position(20, height - 40)
    .mousePressed(() => {
      isCalibrationMode = !isCalibrationMode;
      select('#calibration-ui').style('display', isCalibrationMode ? 'block' : 'none');
    });
}

// Remove the updateLayoutDimensions function since we're using static sizing

// Remove the windowResized function since we're using static sizing

function draw() {
  background(220);

  // Draw dividing line
  stroke(180);
  strokeWeight(2);
  line(leftPanelWidth, 0, leftPanelWidth, height);
  noStroke();

  // Draw confidence bars at the top of the left panel
  drawConfidenceBars();

  // Draw reference image below confidence bars
  if (referenceImg) {
    // Calculate available space
    const availableHeight = height - confidenceDisplayHeight - padding * 3;
    const availableWidth = leftPanelWidth - padding * 2;

    // Calculate dimensions while maintaining aspect ratio
    let imgWidth, imgHeight;

    if (
      availableWidth / availableHeight >
      referenceImg.width / referenceImg.height
    ) {
      imgHeight = availableHeight;
      imgWidth = imgHeight * (referenceImg.width / referenceImg.height);
    } else {
      imgWidth = availableWidth;
      imgHeight = imgWidth / (referenceImg.width / referenceImg.height);
    }

    // Center the image horizontally within the left panel
    const imgX = (leftPanelWidth - imgWidth) / 2;
    const imgY = confidenceDisplayHeight + padding * 2;

    image(referenceImg, imgX, imgY, imgWidth, imgHeight);
  }

  // Draw video feed on the right side using simple approach
  const videoX = leftPanelWidth + 20; // Add some padding from the divider
  const videoY = 20; // Add some padding from the top

  push();
  // Flip the video horizontally so it's like a mirror
  translate(videoX + video.width, videoY);
  scale(-1, 1);
  image(video, 0, 0);
  pop();

  // Draw hand visualization directly over the video
  if (handPredictions.length > 0) {
    push();
    translate(videoX + video.width, videoY);
    scale(-1, 1);
    drawConnectors();
    drawKeypoints();
    pop();
  }
}

function drawKeypoints() {
  if (handPredictions.length > 0 && smoothedLandmarks.length > 0) {
    // Enhanced drawing - larger points at key landmark positions
    const keyLandmarks = [0, 4, 8, 12, 16, 20]; // Wrist and fingertips

    // Draw finger connections with thicker lines for better visibility
    drawConnectors();

    // Draw landmarks with varying sizes
    for (let i = 0; i < smoothedLandmarks.length; i++) {
      const keypoint = smoothedLandmarks[i];

      // Different visualization for key landmarks
      if (keyLandmarks.includes(i)) {
        // Fingertips and wrist get larger circles
        noStroke();
        fill(0, 255, 0, 200);
        ellipse(keypoint[0], keypoint[1], 14, 14);

        // Add highlight effect
        fill(255, 255, 255, 150);
        ellipse(keypoint[0], keypoint[1], 8, 8);
      } else {
        // Other landmarks get smaller circles
        noStroke();
        fill(0, 255, 0, 150);
        ellipse(keypoint[0], keypoint[1], 8, 8);
      }
    }
  }
}

function drawConnectors() {
  if (handPredictions.length > 0 && smoothedLandmarks.length > 0) {
    // Using landmark connections as defined by MediaPipe hand tracking

    // Palm connections
    const palmIndices = [
      [0, 1],
      [0, 5],
      [0, 17],
      [1, 2],
      [2, 3],
      [3, 4],
    ];

    // Finger connections
    const fingerIndices = [
      // Thumb
      [1, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      // Index
      [5, 9],
      [9, 10],
      [10, 11],
      [11, 12],
      // Middle
      [9, 13],
      [13, 14],
      [14, 15],
      [15, 16],
      // Ring
      [13, 17],
      [17, 18],
      [18, 19],
      [19, 20],
      // Pinky
      [17, 0],
    ];

    // Draw palm mesh with thicker lines
    stroke(0, 255, 0, 220);
    strokeWeight(3);
    for (const [i, j] of palmIndices) {
      if (smoothedLandmarks[i] && smoothedLandmarks[j]) {
        line(
          smoothedLandmarks[i][0],
          smoothedLandmarks[i][1],
          smoothedLandmarks[j][0],
          smoothedLandmarks[j][1]
        );
      }
    }

    // Draw finger connections
    strokeWeight(2);
    for (const [i, j] of fingerIndices) {
      if (smoothedLandmarks[i] && smoothedLandmarks[j]) {
        line(
          smoothedLandmarks[i][0],
          smoothedLandmarks[i][1],
          smoothedLandmarks[j][0],
          smoothedLandmarks[j][1]
        );
      }
    }
  }
}

function drawConfidenceBars() {
  const numNotes = Object.keys(handPoseDetection.signConfidences).length;
  const maxBarHeight = confidenceDisplayHeight - padding * 2;

  // Calculate bar sizes based on available width
  const totalBarSpace = leftPanelWidth - padding * 2;
  const barWidth = (totalBarSpace - (numNotes - 1) * (padding / 2)) / numNotes;

  // Top position for confidence display
  const startY = padding + maxBarHeight;
  const startX = padding;

  // Draw background panel
  fill(40, 40, 40, 200);
  rect(0, 0, leftPanelWidth, confidenceDisplayHeight + padding);

  // Draw title
  fill(255);
  textSize(16);
  textAlign(LEFT, TOP);
  text("Solfege Sign Confidence", startX, padding);

  // Add threshold line label
  textAlign(RIGHT);
  textSize(12);
  text(
    "70% threshold",
    startX + totalBarSpace - 5,
    startY - maxBarHeight * 0.7 - 15
  );

  // Draw bars
  let x = startX;
  for (const [sign, confidence] of Object.entries(
    handPoseDetection.signConfidences
  )) {
    // Bar background
    fill(80);
    rect(x, startY - maxBarHeight, barWidth, maxBarHeight);

    // Bar fill
    const barHeight = confidence * maxBarHeight;

    // Color based on if it's the current note
    if (sign === currentNote) {
      fill(50, 255, 50); // Brighter green for current note
    } else {
      // Color based on confidence
      const r = map(confidence, 0, 1, 100, 220);
      const g = map(confidence, 0, 1, 100, 220);
      const b = 100;
      fill(r, g, b, 220);
    }

    rect(x, startY - barHeight, barWidth, barHeight);

    // Label
    textAlign(CENTER);

    // Note label shadow for better readability
    fill(0, 0, 0, 160);
    text(sign, x + barWidth / 2 + 1, startY - maxBarHeight - 4 + 1);

    // Note label
    fill(255);
    textSize(14);
    text(sign, x + barWidth / 2, startY - maxBarHeight - 4);

    // Confidence percentage
    if (confidence > 0.05) {
      textSize(12);
      const percentText = Math.round(confidence * 100) + "%";

      // Position the text inside the bar if tall enough, otherwise above it
      const textY =
        barHeight > 20 ? startY - barHeight + 14 : startY - maxBarHeight - 20;

      // Text shadow
      fill(0, 0, 0, 160);
      text(percentText, x + barWidth / 2 + 1, textY + 1);

      fill(255);
      text(percentText, x + barWidth / 2, textY);
    }

    x += barWidth + padding / 2;
  }

  // Draw threshold indicator (at 0.7 confidence)
  stroke(255, 0, 0);
  strokeWeight(2);
  const thresholdY = startY - maxBarHeight * 0.7;
  line(startX, thresholdY, startX + totalBarSpace, thresholdY);

  // Reset text alignment
  textAlign(LEFT);
  noStroke();
}

function playNote(note) {
  // Initialize Tone.js context if it's suspended
  if (Tone.context.state !== "running") {
    Tone.start();
  }

  // Play note with synth
  synth.triggerAttackRelease(note, "8n");
}

function updateNoteDisplay() {
  select("#current-note").html(`Current Note: ${currentNote}`);
}

// Handle mouse press to initialize audio context
function mousePressed() {
  if (Tone.context.state !== "running") {
    Tone.start();
  }
}

function startSustainedNote(note) {
  // Initialize Tone.js context if it's suspended
  if (Tone.context.state !== "running") {
    Tone.start();
  }

  // Stop any currently playing note
  if (activeNote !== null) {
    synth.triggerRelease(activeNote);
  }

  // Start the new note
  synth.triggerAttack(note);
  activeNote = note;
}

function stopCurrentNote() {
  if (activeNote !== null) {
    synth.triggerRelease(activeNote);
    activeNote = null;
  }
}

// Add a function to draw the hand mesh with confidence indicator
function drawHandMesh() {
  if (handPredictions.length > 0 && smoothedLandmarks.length > 0) {
    const hand = handPredictions[0];

    // Get the current detected note and its confidence
    const detectedNote = currentNote !== "None" ? currentNote : null;
    const confidence = detectedNote
      ? handPoseDetection.signConfidences[detectedNote]
      : 0;

    // Draw hand mesh outline
    strokeWeight(2);
    noFill();

    // Color the outline based on note and confidence
    if (detectedNote) {
      const intensity = map(confidence, 0.7, 1, 100, 255);
      stroke(100, intensity, 100, 230);
    } else {
      stroke(255, 255, 255, 150);
    }

    beginShape();
    // Create outline around the hand's key points
    const outlinePoints = [0, 1, 2, 3, 4, 8, 12, 16, 20, 19, 18, 17, 0];
    for (const i of outlinePoints) {
      if (smoothedLandmarks[i]) {
        vertex(smoothedLandmarks[i][0], smoothedLandmarks[i][1]);
      }
    }
    endShape(CLOSE);

    // Add a confident note indicator if applicable
    if (detectedNote) {
      // Find the center of the palm for text positioning
      const centerX = smoothedLandmarks[0][0];
      const centerY = smoothedLandmarks[0][1] - 40;

      // Draw background for text
      noStroke();
      fill(40, 40, 40, 180);
      rect(centerX - 25, centerY - 15, 50, 25, 5);

      // Draw text
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(16);
      text(detectedNote, centerX, centerY);
      textSize(10);
      text(Math.round(confidence * 100) + "%", centerX, centerY + 12);

      // Reset text alignment
      textAlign(LEFT);
    }
  }
}
