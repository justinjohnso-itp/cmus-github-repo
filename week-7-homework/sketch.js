let handpose;
let video;
let predictions = [];
let synth;
let currentNote = "None";
let lastPlayedTime = 0;
let debounceDelay = 500; // ms delay to prevent rapid triggering
let isPlaying = false;

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

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  // Initialize handpose model
  handpose = ml5.handpose(video, modelReady);

  // Listen to new hand predictions
  handpose.on("predict", (results) => {
    predictions = results;
    if (predictions.length > 0) {
      detectSolfegeSign();
    } else {
      // No hand detected
      if (currentNote !== "None") {
        currentNote = "None";
        updateNoteDisplay();
      }
    }
  });

  // Initialize the synthesizer
  synth = new Tone.PolySynth(Tone.Synth).toDestination();
}

function modelReady() {
  select("#status").html("Model loaded, show your hand signs!");
}

function draw() {
  // Flip the image horizontally for a mirror effect
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);

  // Draw keypoints and skeletons
  drawKeypoints();
  pop();

  // Add instructions
  fill(255);
  noStroke();
  rect(0, 0, width, 30);
  fill(0);
  textSize(16);
  text("Show solfege hand signs: Do, Re, Mi, Fa, Sol, La, Ti", 10, 20);
}

// Draw hand skeleton and landmarks
function drawKeypoints() {
  if (predictions.length > 0) {
    const hand = predictions[0];

    // Draw hand landmarks
    for (let i = 0; i < hand.landmarks.length; i++) {
      const keypoint = hand.landmarks[i];
      fill(0, 255, 0);
      noStroke();
      ellipse(keypoint[0], keypoint[1], 10, 10);
    }

    // Draw hand skeleton
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

function detectSolfegeSign() {
  if (predictions.length === 0) return;

  const hand = predictions[0];
  const landmarks = hand.landmarks;
  const annotations = hand.annotations;

  // Extract finger tips and other useful landmarks
  const thumbTip = annotations.thumb[3];
  const indexTip = annotations.indexFinger[3];
  const middleTip = annotations.middleFinger[3];
  const ringTip = annotations.ringFinger[3];
  const pinkyTip = annotations.pinky[3];

  // Extract palm base positions for reference
  const palmBase = landmarks[0]; // wrist point

  // Detect signs based on finger positions
  let detectedNote = detectSign(
    thumbTip,
    indexTip,
    middleTip,
    ringTip,
    pinkyTip,
    palmBase,
    annotations
  );

  // Update and play note if changed
  if (detectedNote && detectedNote !== currentNote) {
    const now = millis();
    if (now - lastPlayedTime > debounceDelay) {
      currentNote = detectedNote;
      updateNoteDisplay();
      playNote(solfegeNotes[currentNote]);
      lastPlayedTime = now;
    }
  }
}

function detectSign(
  thumbTip,
  indexTip,
  middleTip,
  ringTip,
  pinkyTip,
  palmBase,
  annotations
) {
  // Helper function to calculate distance between two points
  const distance = (a, b) =>
    Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));

  // Helper function to check if a finger is extended
  // Using y-coordinate comparison (lower value is higher on screen)
  const isFingerExtended = (fingerTip, mcp, threshold = 50) => {
    return mcp[1] - fingerTip[1] > threshold;
  };

  // Get MCP joints (where fingers connect to palm)
  const indexMCP = annotations.indexFinger[0];
  const middleMCP = annotations.middleFinger[0];
  const ringMCP = annotations.ringFinger[0];
  const pinkyMCP = annotations.pinky[0];

  // Check for extended fingers
  const thumbExtended = isFingerExtended(thumbTip, palmBase, 30);
  const indexExtended = isFingerExtended(indexTip, indexMCP);
  const middleExtended = isFingerExtended(middleTip, middleMCP);
  const ringExtended = isFingerExtended(ringTip, ringMCP);
  const pinkyExtended = isFingerExtended(pinkyTip, pinkyMCP);

  // Check for thumb and index touching
  const thumbIndexTouch = distance(thumbTip, indexTip) < 30;
  const thumbMiddleTouch = distance(thumbTip, middleTip) < 30;
  const thumbRingTouch = distance(thumbTip, ringTip) < 30;
  const thumbPinkyTouch = distance(thumbTip, pinkyTip) < 30;

  // Do (C): Closed fist with thumb extended
  if (
    thumbExtended &&
    !indexExtended &&
    !middleExtended &&
    !ringExtended &&
    !pinkyExtended
  ) {
    return "Do";
  }

  // Re (D): Index finger extended, others folded
  if (
    !thumbExtended &&
    indexExtended &&
    !middleExtended &&
    !ringExtended &&
    !pinkyExtended
  ) {
    return "Re";
  }

  // Mi (E): Index and middle fingers extended (peace sign)
  if (
    !thumbExtended &&
    indexExtended &&
    middleExtended &&
    !ringExtended &&
    !pinkyExtended
  ) {
    return "Mi";
  }

  // Fa (F): Index, middle, and ring fingers extended
  if (
    !thumbExtended &&
    indexExtended &&
    middleExtended &&
    ringExtended &&
    !pinkyExtended
  ) {
    return "Fa";
  }

  // Sol (G): All fingers extended (open hand)
  if (
    thumbExtended &&
    indexExtended &&
    middleExtended &&
    ringExtended &&
    pinkyExtended
  ) {
    return "Sol";
  }

  // La (A): Thumb and pinky extended (hang loose/shaka sign)
  if (
    thumbExtended &&
    !indexExtended &&
    !middleExtended &&
    !ringExtended &&
    pinkyExtended
  ) {
    return "La";
  }

  // Ti (B): Thumb touching pinky, other fingers extended
  if (thumbPinkyTouch && indexExtended && middleExtended && ringExtended) {
    return "Ti";
  }

  return null;
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
