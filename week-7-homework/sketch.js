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

function preload() {
  // Load the reference image
  referenceImg = loadImage("images/solfege-hand-signs.png");
}

function setup() {
  // Create a wider static sized canvas
  createCanvas(1600, 800); // Increased width from 1000 to 1200

  // Set fixed left panel width
  leftPanelWidth = 400;

  // Initialize video without specifying dimensions to use default camera resolution
  video = createCapture(VIDEO);
  video.hide();

  // Initialize the synthesizer
  synth = new Tone.PolySynth(Tone.Synth).toDestination();

  // Initialize handpose detection using the module
  handPoseDetection.init(
    video,
    // Model ready callback
    () => {
      select("#status").html("Model loaded, show your hand signs!");
    },
    // Detection callback
    (detectedNote, results) => {
      // Store predictions for drawing
      handPredictions = results || []; // Use handPredictions instead of predictions

      // Handle note detection
      if (detectedNote !== null && detectedNote !== currentNote) {
        const now = millis();
        if (now - lastPlayedTime > debounceDelay) {
          // Stop any currently playing note
          if (activeNote !== null) {
            stopCurrentNote();
          }

          // Update current note and play it
          currentNote = detectedNote;
          updateNoteDisplay();
          playNote(solfegeNotes[currentNote]);
          lastPlayedTime = now;
        }
      } else if (detectedNote === null && currentNote !== "None") {
        // No hand detected, reset current note
        currentNote = "None";
        updateNoteDisplay();
        if (activeNote !== null) {
          stopCurrentNote();
        }
      }
    }
  );
}

// Remove the updateLayoutDimensions function since we're using static sizing

// Remove the windowResized function since we're using static sizing

function draw() {
  background(220);

  // Draw video feed on the right side
  push();
  translate(width, 0);
  scale(-1, 1);

  // Display video using the available right panel space
  const videoWidth = width - leftPanelWidth; // Now 800px instead of 600px

  // Display video - let it scale to fit the right panel width
  // while maintaining its natural aspect ratio
  image(video, 0, 0, videoWidth, height);

  // Draw hand keypoints and connectors if hand is detected
  if (handPredictions.length > 0) {
    drawKeypoints();
    drawConnectors();
  }
  pop(); // Always reset transform, regardless of predictions

  // Draw dividing line
  stroke(180);
  strokeWeight(2);
  line(leftPanelWidth, 0, leftPanelWidth, height);
  noStroke();

  // Draw confidence bars at the top of the left panel with more padding
  drawConfidenceBars();

  // Draw reference image below confidence bars - adjusted for static sizing
  if (referenceImg) {
    // Calculate available space
    const availableHeight = height - confidenceDisplayHeight - padding * 3;
    const availableWidth = leftPanelWidth - padding * 2;

    // Get the aspect ratio of the reference image
    const imgAspect = referenceImg.width / referenceImg.height;

    // Calculate dimensions that fit the available space while maintaining aspect ratio
    let imgWidth, imgHeight;

    if (availableWidth / availableHeight > imgAspect) {
      // Available space is wider than image aspect ratio - constrain by height
      imgHeight = availableHeight;
      imgWidth = imgHeight * imgAspect;
    } else {
      // Available space is taller than image aspect ratio - constrain by width
      imgWidth = availableWidth;
      imgHeight = imgWidth / imgAspect;
    }

    // Center the image horizontally within the left panel
    const imgX = (leftPanelWidth - imgWidth) / 2;
    const imgY = confidenceDisplayHeight + padding * 2;

    image(referenceImg, imgX, imgY, imgWidth, imgHeight);
  }
}

function drawKeypoints() {
  if (handPredictions.length > 0) {
    // Update references
    const hand = handPredictions[0];

    // Draw hand landmarks
    for (let i = 0; i < hand.landmarks.length; i++) {
      const keypoint = hand.landmarks[i];
      fill(0, 255, 0);
      noStroke();
      ellipse(keypoint[0], keypoint[1], 8, 8);
    }
  }
}

function drawConnectors() {
  if (handPredictions.length > 0) {
    // Update references
    const hand = handPredictions[0];
    const landmarks = hand.landmarks;

    // Draw lines connecting landmarks
    stroke(0, 255, 0);
    strokeWeight(2);

    // Draw thumb connections
    for (let i = 1; i < 5; i++) {
      const a = hand.landmarks[i - 1];
      const b = hand.landmarks[i];
      line(a[0], a[1], b[0], b[1]);
    }

    // Draw connections for each finger
    for (let finger = 0; finger < 5; finger++) {
      const baseIndex = finger === 0 ? 0 : finger * 4 + 1;
      for (let i = 0; i < 3; i++) {
        const a = hand.landmarks[baseIndex + i];
        const b = hand.landmarks[baseIndex + i + 1];
        line(a[0], a[1], b[0], b[1]);
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
