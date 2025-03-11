/**
 * HandPose Detection Module
 * Manages ml5 handpose detection and solfege sign confidence calculations
 */

// Using IIFE (Immediately Invoked Function Expression) to create a module with private variables
const handPoseDetection = (function () {
  // Private variables
  let handpose;
  let internalPredictions = []; // Renamed variable
  let onDetectionCallback;

  // Confidence scores for each sign
  const signConfidences = {
    Do: 0,
    Re: 0,
    Mi: 0,
    Fa: 0,
    Sol: 0,
    La: 0,
    Ti: 0,
  };

  // Add temporal smoothing for confidence scores
  const confidenceSmoothingFactor = 0.6; // Higher = more smoothing
  let previousConfidences = {
    Do: 0,
    Re: 0,
    Mi: 0,
    Fa: 0,
    Sol: 0,
    La: 0,
    Ti: 0,
  };

  // Add debouncing variables
  let lastDetectedNote = null;
  let noteDetectionCount = 0;
  const requiredConsistentFrames = 3; // Frames needed with same detection before triggering

  /**
   * Initialize the handpose detection system
   * @param {p5.Element} video - The p5 video element with webcam feed
   * @param {Function} onReadyCallback - Called when model is ready
   * @param {Function} onDetection - Called when a detection occurs with results
   */
  function init(video, onReadyCallback, onDetection) {
    onDetectionCallback = onDetection;

    // Initialize handpose model
    handpose = ml5.handpose(video, onReadyCallback);

    // Listen for predictions
    handpose.on("predict", async (results) => {
      internalPredictions = results;

      if (internalPredictions.length > 0) {
        if (isCalibrationMode) {
          // Handle calibration mode
          if (onDetectionCallback) {
            onDetectionCallback(null, internalPredictions);
          }
        } else {
          // Use trained model for detection
          const hand = internalPredictions[0];
          const detectedNote = await modelHandler.classifyPose(hand.landmarks);

          // Update confidence scores for visualization
          for (const note in signConfidences) {
            signConfidences[note] = note === detectedNote ? 1.0 : 0.0;
          }

          if (onDetectionCallback) {
            onDetectionCallback(detectedNote, internalPredictions);
          }
        }
      } else if (onDetectionCallback) {
        // Reset when no hand is detected
        onDetectionCallback(null, internalPredictions);
      }
    });
  }

  /**
   * Get current predictions
   */
  function getPredictions() {
    return internalPredictions;
  }

  /**
   * Calculate confidence scores for all solfege signs
   * Enhanced to match standard Curwen hand signs accurately
   */
  function calculateSignConfidences(
    thumbTip,
    indexTip,
    middleTip,
    ringTip,
    pinkyTip,
    palmBase,
    annotations
  ) {
    // Get all joints for better gesture recognition
    const wrist = palmBase;
    const thumbMCP = annotations.thumb[0];
    const indexMCP = annotations.indexFinger[0];
    const middleMCP = annotations.middleFinger[0];
    const ringMCP = annotations.ringFinger[0];
    const pinkyMCP = annotations.pinky[0];

    const thumbPIP = annotations.thumb[1];
    const indexPIP = annotations.indexFinger[1];
    const middlePIP = annotations.middleFinger[1];
    const ringPIP = annotations.ringFinger[1];
    const pinkyPIP = annotations.pinky[1];

    const thumbDIP = annotations.thumb[2];
    const indexDIP = annotations.indexFinger[2];
    const middleDIP = annotations.middleFinger[2];
    const ringDIP = annotations.ringFinger[2];
    const pinkyDIP = annotations.pinky[2];

    // Helper functions
    const distance = (a, b) =>
      Math.sqrt(
        Math.pow(a[0] - b[0], 2) +
          Math.pow(a[1] - b[1], 2) +
          Math.pow(a[2] - b[2], 2)
      );

    const angle3D = (a, b, c) => {
      // Calculate vectors
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const bc = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];

      // Normalize vectors
      const abMag = Math.sqrt(ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2]);
      const bcMag = Math.sqrt(bc[0] * bc[0] + bc[1] * bc[1] + bc[2] * bc[2]);

      if (abMag === 0 || bcMag === 0) return 0;

      const abNorm = [ab[0] / abMag, ab[1] / abMag, ab[2] / abMag];
      const bcNorm = [bc[0] / bcMag, bc[1] / bcMag, bc[2] / bcMag];

      // Dot product of normalized vectors
      const dotProduct =
        abNorm[0] * bcNorm[0] + abNorm[1] * bcNorm[1] + abNorm[2] * bcNorm[2];

      // Clamp dot product to [-1, 1] range to avoid numerical errors
      const clampedDot = Math.max(-1, Math.min(1, dotProduct));

      // Calculate angle in degrees
      return (Math.acos(clampedDot) * 180) / Math.PI;
    };

    // Calculate vectors to determine hand orientation
    const calculatePalmNormal = () => {
      // Vector from wrist to middle finger base
      const wristToMiddle = [
        middleMCP[0] - wrist[0],
        middleMCP[1] - wrist[1],
        middleMCP[2] - wrist[2],
      ];

      // Vector from index to pinky
      const indexToPinky = [
        pinkyMCP[0] - indexMCP[0],
        pinkyMCP[1] - indexMCP[1],
        pinkyMCP[2] - indexMCP[2],
      ];

      // Cross product gives normal vector
      return [
        wristToMiddle[1] * indexToPinky[2] - wristToMiddle[2] * indexToPinky[1],
        wristToMiddle[2] * indexToPinky[0] - wristToMiddle[0] * indexToPinky[2],
        wristToMiddle[0] * indexToPinky[1] - wristToMiddle[1] * indexToPinky[0],
      ];
    };

    // Calculate the vectors for precise hand orientation
    const calculateHandVectors = () => {
      // Palm direction (from wrist to middle MCP)
      const palmDir = [
        middleMCP[0] - wrist[0],
        middleMCP[1] - wrist[1],
        middleMCP[2] - wrist[2],
      ];

      // Side direction (from thumb MCP to pinky MCP)
      const sideDir = [
        pinkyMCP[0] - thumbMCP[0],
        pinkyMCP[1] - thumbMCP[1],
        pinkyMCP[2] - thumbMCP[2],
      ];

      return {
        palmDir: normalize(palmDir),
        sideDir: normalize(sideDir),
        normal: normalize(calculatePalmNormal()),
      };
    };

    // Normalize a vector
    const normalize = (v) => {
      const mag = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      if (mag === 0) return [0, 0, 0];
      return [v[0] / mag, v[1] / mag, v[2] / mag];
    };

    // Calculate dot product of two vectors
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

    // Standard reference vectors
    const rightVector = [1, 0, 0]; // Right in camera view
    const upVector = [0, -1, 0]; // Up in camera view
    const forwardVector = [0, 0, -1]; // Forward from camera

    // Get hand orientation vectors
    const handVectors = calculateHandVectors();
    const palmNormal = handVectors.normal;
    const palmDir = handVectors.palmDir;
    const sideDir = handVectors.sideDir;

    // Orientation values
    const palmDotForward = dot(palmNormal, forwardVector); // Palm facing camera
    const palmDotUp = dot(palmNormal, upVector); // Palm facing down
    const palmDotRight = dot(palmNormal, rightVector); // Palm facing side

    const sideDotForward = dot(sideDir, forwardVector); // Side pointing forward/back
    const sideDotUp = dot(sideDir, upVector); // Side pointing up/down
    const sideDotRight = dot(sideDir, rightVector); // Side pointing left/right

    const palmDirDotUp = dot(palmDir, upVector); // Palm direction up/down
    const palmDirDotForward = dot(palmDir, forwardVector); // Palm direction forward/back

    // Derived orientation values that correspond to solfege hand positions
    const isPalmFacingCamera = palmDotForward < -0.7;
    const isPalmFacingDown = palmDotUp > 0.7;
    const isPalmFacingUp = palmDotUp < -0.7;
    const isPalmFacingSide = Math.abs(palmDotRight) > 0.7;

    // Side of pinky facing camera (common in most solfege signs)
    const isPinkySideFacingCamera = sideDotForward < -0.5;

    // Hand pointing directions
    const isHandPointingUp = palmDirDotUp < -0.7;
    const isHandPointingForward = palmDirDotForward < -0.6;
    const isHandPointingDown = palmDirDotUp > 0.7;
    const isHandHorizontal =
      Math.abs(sideDotUp) < 0.3 && Math.abs(palmDotUp) > 0.6;

    // Calculate finger curl and extension
    const getFingerCurl = (mcp, pip, tip) => {
      // Normalized curl measurement: 0 = fully extended, 1 = fully curled
      const angle = angle3D(mcp, pip, tip);
      return constrain(1 - map(angle, 120, 170, 0, 1), 0, 1);
    };

    const getFingerExtension = (mcp, pip, tip) => {
      // Normalized extension: 0 = fully curled, 1 = fully extended
      return 1 - getFingerCurl(mcp, pip, tip);
    };

    const thumbCurl = getFingerCurl(thumbMCP, thumbPIP, thumbTip);
    const indexCurl = getFingerCurl(indexMCP, indexPIP, indexTip);
    const middleCurl = getFingerCurl(middleMCP, middlePIP, middleTip);
    const ringCurl = getFingerCurl(ringMCP, ringPIP, ringTip);
    const pinkyCurl = getFingerCurl(pinkyMCP, pinkyPIP, pinkyTip);

    const thumbExt = 1 - thumbCurl;
    const indexExt = 1 - indexCurl;
    const middleExt = 1 - middleCurl;
    const ringExt = 1 - ringCurl;
    const pinkyExt = 1 - pinkyCurl;

    // Finger directions
    const getFingerDirection = (mcp, tip) => {
      const vec = [tip[0] - mcp[0], tip[1] - mcp[1], tip[2] - mcp[2]];
      return normalize(vec);
    };

    const thumbDir = getFingerDirection(thumbMCP, thumbTip);
    const indexDir = getFingerDirection(indexMCP, indexTip);
    const middleDir = getFingerDirection(middleMCP, middleTip);

    const thumbDotUp = dot(thumbDir, upVector);
    const indexDotUp = dot(indexDir, upVector);
    const indexDotForward = dot(indexDir, forwardVector);

    const isThumbPointingDown = thumbDotUp > 0.5;
    const isThumbPointingUp = thumbDotUp < -0.5;
    const isIndexPointingUp = indexDotUp < -0.7;
    const isIndexPointingForward = indexDotForward < -0.7;

    // Check finger spread
    const getFingerSpread = () => {
      const handSize = distance(wrist, middleMCP);
      const indexToMiddle = distance(indexTip, middleTip) / handSize;
      const middleToRing = distance(middleTip, ringTip) / handSize;
      const ringToPinky = distance(ringTip, pinkyTip) / handSize;

      // Calculate average normalized distance
      const avgDistance = (indexToMiddle + middleToRing + ringToPinky) / 3;
      return constrain(map(avgDistance, 0.1, 0.25, 0, 1), 0, 1);
    };

    const fingerSpread = getFingerSpread();
    const fingersTogether = 1 - fingerSpread;

    // Special feature detection for specific signs

    // Cup shape for LA - fingers slightly curved, palm down, fingers together
    const getCupShape = () => {
      // Require palm facing down
      if (!isPalmFacingDown) return 0;

      // All fingers should be partially curled (not straight, not tight fist)
      const avgFlex = (indexCurl + middleCurl + ringCurl + pinkyCurl) / 4;
      if (avgFlex < 0.3 || avgFlex > 0.8) return 0;

      // Fingers should be together
      if (fingerSpread > 0.5) return 0;

      return constrain(map(avgFlex, 0.3, 0.6, 0, 1) * fingersTogether, 0, 1);
    };

    const cupShape = getCupShape();

    // For MI: Flat hand with all fingers extended horizontally
    const getFlatHandHorizontal = () => {
      if (!isHandHorizontal) return 0;

      // All fingers should be extended
      const avgExtension = (indexExt + middleExt + ringExt + pinkyExt) / 4;
      if (avgExtension < 0.7) return 0;

      // Fingers should be together
      if (fingerSpread > 0.4) return 0;

      return constrain(avgExtension * fingersTogether * 1.3, 0, 1);
    };

    const flatHandHorizontal = getFlatHandHorizontal();

    // For DO: Fist with thumb out to side
    const getFistWithThumbOut = () => {
      // All fingers should be curled
      const fistCurl = (indexCurl + middleCurl + ringCurl + pinkyCurl) / 4;
      if (fistCurl < 0.7) return 0;

      // Thumb should be somewhat extended
      if (thumbExt < 0.3 || thumbExt > 0.9) return 0;

      // Side of hand should face camera (pinky side forward)
      if (!isPinkySideFacingCamera) return 0;

      return fistCurl * constrain(thumbExt, 0, 1);
    };

    const fistWithThumbOut = getFistWithThumbOut();

    // For TI: Index pointing up with angled hand position
    const getIndexPointingWithAngle = () => {
      // Index should be extended upward
      if (!isIndexPointingUp || indexExt < 0.7) return 0;

      // Other fingers should be curled somewhat
      const otherFingersCurl = (middleCurl + ringCurl + pinkyCurl) / 3;
      if (otherFingersCurl < 0.5) return 0;

      // Thumb should be partly extended
      if (thumbExt < 0.3 || thumbExt > 0.9) return 0;

      return indexExt * otherFingersCurl * thumbExt;
    };

    const indexPointingWithAngle = getIndexPointingWithAngle();

    // ----- CURWEN HAND SIGN CONFIDENCE CALCULATION -----

    // DO: Closed fist with side to camera (pinky side forward)
    // Per reference: Clenched fist representing strength and resolve
    signConfidences.Do =
      indexCurl * 0.2 +
      middleCurl * 0.2 +
      ringCurl * 0.2 +
      pinkyCurl * 0.2 +
      fistWithThumbOut * 0.3 +
      (isPinkySideFacingCamera ? 0.2 : 0);

    // RE: Index finger pointing up, other fingers curled
    // Per reference: Beckoning gesture representing forward movement
    signConfidences.Re =
      indexExt * 0.3 +
      middleCurl * 0.15 +
      ringCurl * 0.15 +
      pinkyCurl * 0.15 +
      (isIndexPointingUp ? 0.25 : 0) +
      (isPinkySideFacingCamera ? 0.1 : 0);

    // MI: Flat horizontal hand pointing right, palm down
    // Per reference: Flat palm facing down representing stability
    signConfidences.Mi =
      flatHandHorizontal * 0.6 +
      (isPalmFacingDown ? 0.2 : 0) +
      fingersTogether * 0.2 +
      (isHandHorizontal ? 0.2 : 0);

    // FA: Hand pointing down with palm facing forward, thumb across
    // Per reference: Hand pointing down with thumb across palm
    signConfidences.Fa =
      (isPalmFacingCamera ? 0.3 : 0) +
      (isHandPointingDown ? 0.3 : 0) +
      (isThumbPointingDown ? 0.2 : 0) +
      indexExt * 0.1 +
      middleExt * 0.1;

    // SOL: Flat hand, palm down, back of hand to camera
    // Per reference: Hand moves outward, representing radiating energy
    signConfidences.Sol =
      indexExt * 0.15 +
      middleExt * 0.15 +
      ringExt * 0.15 +
      pinkyExt * 0.15 +
      (isPalmFacingDown ? 0.2 : 0) +
      (!isPinkySideFacingCamera ? 0.2 : 0) + // Back of hand visible
      (isHandPointingForward ? 0.2 : 0);

    // LA: Hand forming cup shape, fingers curved slightly, palm down
    // Per reference: Relaxed hand in cup shape, expressing emotion
    signConfidences.La =
      cupShape * 0.6 +
      (isPalmFacingDown ? 0.2 : 0) +
      fingersTogether * 0.2 +
      (isPinkySideFacingCamera ? 0.1 : 0);

    // TI: Index finger angled up, suggesting movement to DO
    // Per reference: Index finger pointing with tension
    signConfidences.Ti =
      indexPointingWithAngle * 0.5 +
      (isIndexPointingUp ? 0.2 : 0) +
      middleCurl * 0.1 +
      ringCurl * 0.1 +
      pinkyCurl * 0.1 +
      (isPinkySideFacingCamera ? 0.1 : 0);

    // ----- DISAMBIGUATION LOGIC -----

    // Prevent confusion between similar signs

    // DO vs LA (both can have curled fingers)
    if (signConfidences.Do > 0.6 && signConfidences.La > 0.6) {
      if (cupShape > 0.6) {
        signConfidences.Do *= 0.5; // Favor LA if cup shape is strong
      } else if (fistWithThumbOut > 0.6) {
        signConfidences.La *= 0.5; // Favor DO if fist is tight
      } else if (isPalmFacingDown) {
        signConfidences.Do *= 0.7; // Slightly favor LA if palm down
      } else {
        signConfidences.La *= 0.7; // Otherwise slightly favor DO
      }
    }

    // RE vs TI (both have index finger extended)
    if (signConfidences.Re > 0.6 && signConfidences.Ti > 0.6) {
      if (thumbExt > 0.7 && indexPointingWithAngle > 0.8) {
        signConfidences.Re *= 0.6; // Favor TI if thumb is extended and index at angle
      } else if (isIndexPointingUp) {
        signConfidences.Ti *= 0.7; // Otherwise favor RE for straight up pointing
      }
    }

    // MI vs SOL (both have flat palm)
    if (signConfidences.Mi > 0.6 && signConfidences.Sol > 0.6) {
      if (isHandHorizontal && isPalmFacingDown) {
        signConfidences.Sol *= 0.6; // Favor MI if hand is horizontal
      } else if (isHandPointingForward && !isPinkySideFacingCamera) {
        signConfidences.Mi *= 0.6; // Favor SOL if hand is pointing forward with back visible
      }
    }

    // Additional penalties for less likely signs based on orientation
    for (const sign in signConfidences) {
      // If pinky side isn't facing camera (except for Sol and Fa which have different orientations)
      if (
        !isPinkySideFacingCamera &&
        sign !== "Sol" &&
        sign !== "Fa" &&
        signConfidences[sign] > 0.5
      ) {
        signConfidences[sign] *= 0.8;
      }

      // Ensure a minimum difference between highest and second highest confidence
      const sortedConfidences = Object.entries(signConfidences).sort(
        (a, b) => b[1] - a[1]
      );

      if (sortedConfidences.length >= 2) {
        const highestSign = sortedConfidences[0][0];
        const highestConf = sortedConfidences[0][1];
        const secondSign = sortedConfidences[1][0];
        const secondConf = sortedConfidences[1][1];

        // If two confidences are too close, penalize the second highest
        if (highestConf - secondConf < 0.15 && highestConf > 0.6) {
          signConfidences[secondSign] *= 0.8;
        }
      }
    }
  }

  /**
   * p5.js map function equivalent
   */
  function map(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  }

  /**
   * p5.js constrain function equivalent
   */
  function constrain(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // Public interface
  return {
    init,
    getPredictions,
    signConfidences,
  };
})(); // Immediately invoke the function
