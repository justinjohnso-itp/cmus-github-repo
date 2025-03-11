let video;
let handPredictions = [];
let synth;
let currentNote = "None";
let activeNote = null;
let lastPlayedTime = 0;
let debounceDelay = 500; // ms delay to prevent rapid triggering
let referenceImg; // Reference image for solfege hand signs

// Layout variables
let leftPanelWidth = 400;
let padding = 20;
let confidenceDisplayHeight = 200;

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

// Landmark smoothing variables
let smoothedLandmarks = [];
const smoothingFactor = 0.7;
let isFirstPrediction = true;

// Calibration mode flag
let isCalibrationMode = false;

// Add this at the top with other globals
let toggleButton;

// Add these variables for stability detection
let lastDetectedNote = null;
let noteDetectionTime = 0;
const noteDetectionDelay = 200; // Require 200ms of confident detection before playing

function preload() {
  referenceImg = loadImage("images/solfege-hand-signs.png");
}

function setup() {
  createCanvas(1080, 720);
  leftPanelWidth = 400;

  // Initialize video
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // Initialize synthesizer
  synth = new Tone.PolySynth(Tone.Synth).toDestination();

  // Initialize model and handpose detection
  modelHandler.loadModel().then(() => {
    handPoseDetection.init(
      video,
      () => {
        select("#status").html("Model loaded!");
      },
      (detectedNote, results) => {
        handPredictions = results || [];

        if (isCalibrationMode && handPredictions.length > 0) {
          // Send landmarks to calibration system
          collectSample(handPredictions[0].landmarks);
        } else {
          // Apply smoothing to landmarks if predictions exist
          if (handPredictions.length > 0) {
            const currentLandmarks = handPredictions[0].landmarks;

            // Initialize or update smoothed landmarks
            if (isFirstPrediction || smoothedLandmarks.length === 0) {
              smoothedLandmarks = [...currentLandmarks];
              isFirstPrediction = false;
            } else {
              // Apply exponential smoothing
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

          // Stable detection before triggering note
          const now = millis();

          if (detectedNote !== null) {
            if (detectedNote !== lastDetectedNote) {
              // New note detected, reset timer
              lastDetectedNote = detectedNote;
              noteDetectionTime = now;
            } else if (
              lastDetectedNote === detectedNote &&
              now - noteDetectionTime >= noteDetectionDelay &&
              detectedNote !== currentNote
            ) {
              // Same note detected for required delay and it's different from current playing note
              if (activeNote !== null) {
                stopCurrentNote();
              }
              currentNote = detectedNote;
              startSustainedNote(solfegeNotes[currentNote]);
              lastPlayedTime = now;
            }
          } else {
            // No note detected, reset detection
            lastDetectedNote = null;

            // If we were playing a note but now nothing is detected
            if (currentNote !== "None") {
              currentNote = "None";
              if (activeNote !== null) {
                stopCurrentNote();
              }
            }
          }
        }
      }
    );
  });

  // Setup calibration
  setupCalibration();

  // Add calibration toggle button - STORE THE REFERENCE
  toggleButton = createButton("Toggle Calibration Mode");
  toggleButton.position((windowWidth - 200) / 2, height + 200);
  toggleButton.mousePressed(() => {
    isCalibrationMode = !isCalibrationMode;

    // When toggling, immediately update the position
    const ui = select("#calibration-ui");
    if (ui) {
      ui.style("display", isCalibrationMode ? "block" : "none");

      // Set position immediately after display change
      positionCalibrationUI();
    }
  });

  // Position calibration UI after a short delay to ensure DOM is ready
  setTimeout(positionCalibrationUI, 500);
}

function positionCalibrationUI() {
  // Get button element directly from our reference
  if (toggleButton && select("#calibration-ui")) {
    const buttonPos = toggleButton.position();
    const buttonSize = toggleButton.size();

    // Position UI exactly 20px below the button
    select("#calibration-ui").style(
      "top",
      buttonPos.y + buttonSize.height + 20 + "px"
    );
  }
}

function draw() {
  background(220);

  // Draw confidence bars
  drawConfidenceBars();

  // Draw dividing line
  stroke(180);
  strokeWeight(2);
  line(leftPanelWidth, confidenceDisplayHeight, leftPanelWidth, height);
  noStroke();

  // Draw reference image
  drawReferenceImage();

  // Draw video feed
  const videoX = leftPanelWidth + 20;
  const videoY = confidenceDisplayHeight + 20;

  push();
  translate(videoX + video.width, videoY);
  scale(-1, 1);
  image(video, 0, 0);

  // Draw hand visualization
  if (handPredictions.length > 0) {
    drawConnectors();
    drawKeypoints();
    drawHandMesh();
  }
  pop();
}

function drawReferenceImage() {
  if (referenceImg) {
    // Calculate available space
    const availableWidth = leftPanelWidth - padding * 2;
    const availableHeight = height - confidenceDisplayHeight - padding * 5;

    // Calculate dimensions maintaining aspect ratio
    const imgAspect = referenceImg.width / referenceImg.height;
    let imgWidth, imgHeight;

    if (availableWidth / availableHeight > imgAspect) {
      imgHeight = availableHeight;
      imgWidth = imgHeight * imgAspect;
    } else {
      imgWidth = availableWidth;
      imgHeight = imgWidth / imgAspect;
    }

    // Position the image
    const imgX = (leftPanelWidth - imgWidth) / 2;
    const imgY =
      confidenceDisplayHeight + (availableHeight - imgHeight) / 2 + padding * 3;

    // Draw image with border
    stroke(180);
    strokeWeight(1);
    fill(255);
    rect(imgX - 5, imgY - 5, imgWidth + 10, imgHeight + 10, 5);
    noStroke();

    image(referenceImg, imgX, imgY, imgWidth, imgHeight);

    // Add title
    fill(40);
    textAlign(CENTER);
    textSize(18);
    text("Solfege Hand Sign Reference", leftPanelWidth / 2, imgY - padding * 2);
    textAlign(LEFT);
  }
}

function drawConfidenceBars() {
  const numNotes = Object.keys(handPoseDetection.signConfidences).length;
  const maxBarHeight = 120;

  // Calculate bar dimensions
  const barAreaWidth = width - padding * 2;
  const barWidth = (barAreaWidth - (numNotes - 1) * padding) / numNotes;
  const startY = padding * 2.5 + maxBarHeight;
  const startX = padding;

  // Draw panel background
  fill(120, 120, 120, 200);
  rect(0, 0, width, confidenceDisplayHeight, 0, 0, 10, 10);

  // Draw title
  fill(255);
  textSize(18);
  textAlign(CENTER, TOP);
  text("Solfege Sign Confidence", width / 2, padding / 2);

  // Draw threshold line
  stroke(255, 0, 0, 150);
  strokeWeight(1);
  const thresholdY = startY - maxBarHeight * 0.7;
  line(startX, thresholdY, width - padding, thresholdY);

  // Add threshold label
  textSize(10);
  fill(255, 200);
  textAlign(RIGHT);
  text("70% threshold", width - padding - 5, thresholdY - 5);

  // Draw bars for each note
  let x = startX;
  for (const [sign, confidence] of Object.entries(
    handPoseDetection.signConfidences
  )) {
    // Bar background
    fill(80);
    rect(x, startY - maxBarHeight, barWidth, maxBarHeight, 3);

    // Bar fill based on confidence
    const barHeight = confidence * maxBarHeight;
    if (sign === currentNote) {
      fill(50, 255, 100); // Highlight current note
    } else {
      // Color gradient based on confidence
      const r = map(confidence, 0, 1, 100, 220);
      const g = map(confidence, 0, 1, 100, 220);
      const b = 100;
      fill(r, g, b, 220);
    }

    rect(x, startY - barHeight, barWidth, barHeight, 3);

    // Note label
    textAlign(CENTER);
    fill(255);
    textSize(16);
    text(sign, x + barWidth / 2, startY - maxBarHeight - 5);

    // Confidence percentage
    if (confidence > 0.05) {
      textSize(14);
      const percentText = Math.round(confidence * 100) + "%";
      const textY =
        barHeight > 25 ? startY - barHeight + 15 : startY - maxBarHeight - 25;

      // Add background for readability
      if (barHeight <= 25) {
        fill(0, 0, 0, 50);
        rect(x + 2, textY - 12, barWidth - 4, 20, 5);
      }

      fill(255);
      text(percentText, x + barWidth / 2, textY);
    }

    x += barWidth + padding;
  }

  textAlign(LEFT);
  noStroke();
}

function drawKeypoints() {
  if (handPredictions.length > 0 && smoothedLandmarks.length > 0) {
    const keyLandmarks = [0, 4, 8, 12, 16, 20]; // Wrist and fingertips

    // Draw landmarks with varying sizes
    for (let i = 0; i < smoothedLandmarks.length; i++) {
      const keypoint = smoothedLandmarks[i];

      // Different visualization for key landmarks
      if (keyLandmarks.includes(i)) {
        // Fingertips and wrist
        noStroke();
        fill(0, 255, 0, 200);
        ellipse(keypoint[0], keypoint[1], 14, 14);

        // Highlight
        fill(255, 255, 255, 150);
        ellipse(keypoint[0], keypoint[1], 8, 8);
      } else {
        // Other landmarks
        noStroke();
        fill(0, 255, 0, 150);
        ellipse(keypoint[0], keypoint[1], 8, 8);
      }
    }
  }
}

function drawConnectors() {
  if (handPredictions.length > 0 && smoothedLandmarks.length > 0) {
    // Define hand connections
    const palmIndices = [
      [0, 1],
      [0, 5],
      [0, 17],
      [1, 2],
      [2, 3],
      [3, 4],
    ];

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

    // Draw palm connections
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

// Modify the playNote function to be a wrapper for startSustainedNote
function playNote(note) {
  // Initialize Tone.js context if needed
  if (Tone.context.state !== "running") {
    Tone.start();
  }

  // Use sustained notes instead of short notes
  startSustainedNote(note);
}

function mousePressed() {
  if (Tone.context.state !== "running") {
    Tone.start();
  }
}

function startSustainedNote(note) {
  // Initialize Tone.js context if needed
  if (Tone.context.state !== "running") {
    Tone.start();
  }

  // Stop any currently playing note
  if (activeNote !== null) {
    synth.triggerRelease(activeNote);
  }

  // Start new note
  synth.triggerAttack(note);
  activeNote = note;
}

function stopCurrentNote() {
  if (activeNote !== null) {
    synth.triggerRelease(activeNote);
    activeNote = null;
  }
}

function drawHandMesh() {
  if (handPredictions.length > 0 && smoothedLandmarks.length > 0) {
    // Get current detection info
    const detectedNote = currentNote !== "None" ? currentNote : null;
    const confidence = detectedNote
      ? handPoseDetection.signConfidences[detectedNote]
      : 0;

    // Draw hand outline
    strokeWeight(2);
    noFill();

    // Color based on confidence
    if (detectedNote) {
      const intensity = map(confidence, 0.7, 1, 100, 255);
      stroke(100, intensity, 100, 230);
    } else {
      stroke(255, 255, 255, 150);
    }

    // Create hand outline
    beginShape();
    const outlinePoints = [0, 1, 2, 3, 4, 8, 12, 16, 20, 19, 18, 17, 0];
    for (const i of outlinePoints) {
      if (smoothedLandmarks[i]) {
        vertex(smoothedLandmarks[i][0], smoothedLandmarks[i][1]);
      }
    }
    endShape(CLOSE);

    // Show note indicator
    if (detectedNote) {
      // Position in palm
      const centerX = smoothedLandmarks[0][0];
      const centerY = smoothedLandmarks[0][1] - 40;

      // Draw text background
      noStroke();
      fill(40, 40, 40, 180);
      rect(centerX - 25, centerY - 15, 50, 25, 5);

      // Draw label
      push();
      translate(centerX, centerY);
      scale(-1, 1); // Flip the text so it's readable

      // Show note and confidence
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(16);
      text(detectedNote, 0, 0);

      // Show confidence and detection progress
      textSize(10);
      const now = millis();

      if (lastDetectedNote === detectedNote) {
        // Calculate and show progress toward activation
        const progress = min(1, (now - noteDetectionTime) / noteDetectionDelay);
        text(
          Math.round(confidence * 100) + "% " + (progress < 1 ? "..." : "✓"),
          0,
          12
        );

        // Draw progress bar
        if (progress < 1) {
          fill(255, 255, 255, 100);
          rect(-20, 18, 40, 3); // Background bar
          fill(50, 255, 100, 230);
          rect(-20, 18, 40 * progress, 3); // Progress indicator
        }
      } else {
        text(Math.round(confidence * 100) + "%", 0, 12);
      }

      pop();

      textAlign(LEFT);
    }
  }
}
