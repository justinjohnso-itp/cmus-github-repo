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
    handpose.on("predict", (results) => {
      internalPredictions = results;

      if (internalPredictions.length > 0) {
        // Process hand to detect solfege signs
        const hand = internalPredictions[0];
        const landmarks = hand.landmarks;
        const annotations = hand.annotations;

        // Extract finger tips
        const thumbTip = annotations.thumb[3];
        const indexTip = annotations.indexFinger[3];
        const middleTip = annotations.middleFinger[3];
        const ringTip = annotations.ringFinger[3];
        const pinkyTip = annotations.pinky[3];
        const palmBase = landmarks[0];

        // Calculate confidence scores for all signs
        calculateSignConfidences(
          thumbTip,
          indexTip,
          middleTip,
          ringTip,
          pinkyTip,
          palmBase,
          annotations
        );

        // Get detected sign (highest confidence above threshold)
        let detectedNote = null;
        const confidenceThreshold = 0.7;
        let highestConfidence = 0;

        for (const [note, confidence] of Object.entries(signConfidences)) {
          if (
            confidence > confidenceThreshold &&
            confidence > highestConfidence
          ) {
            highestConfidence = confidence;
            detectedNote = note;
          }
        }

        // Call the detection callback
        if (onDetectionCallback) {
          onDetectionCallback(detectedNote, internalPredictions);
        }
      } else if (onDetectionCallback) {
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

    // Calculate the side vector of the hand (thumb to pinky direction)
    const calculateHandSideVector = () => {
      return [
        pinkyMCP[0] - thumbMCP[0],
        pinkyMCP[1] - thumbMCP[1],
        pinkyMCP[2] - thumbMCP[2],
      ];
    };

    // Normalize a vector
    const normalize = (v) => {
      const mag = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      if (mag === 0) return [0, 0, 0];
      return [v[0] / mag, v[1] / mag, v[2] / mag];
    };

    // Determine palm orientation
    const palmNormal = normalize(calculatePalmNormal());
    const handSideVector = normalize(calculateHandSideVector());

    // Standard reference vectors
    const rightVector = [1, 0, 0];
    const upVector = [0, -1, 0]; // Y is inverted in screen coordinates
    const forwardVector = [0, 0, -1]; // Z decreases away from camera

    // Calculate dot products to determine orientation
    const palmDotForward =
      palmNormal[0] * forwardVector[0] +
      palmNormal[1] * forwardVector[1] +
      palmNormal[2] * forwardVector[2];
    const palmDotUp =
      palmNormal[0] * upVector[0] +
      palmNormal[1] * upVector[1] +
      palmNormal[2] * upVector[2];
    const palmDotRight =
      palmNormal[0] * rightVector[0] +
      palmNormal[1] * rightVector[1] +
      palmNormal[2] * rightVector[2];

    const sideDotRight =
      handSideVector[0] * rightVector[0] +
      handSideVector[1] * rightVector[1] +
      handSideVector[2] * rightVector[2];
    const sideDotUp =
      handSideVector[0] * upVector[0] +
      handSideVector[1] * upVector[1] +
      handSideVector[2] * upVector[2];

    // Derived orientation values
    const isPalmFacingCamera = palmDotForward < -0.6; // Palm facing camera
    const isPalmFacingDown = palmDotUp > 0.6; // Palm facing down
    const isPalmFacingSide = Math.abs(palmDotRight) > 0.6; // Palm facing left/right
    const isHandVertical = Math.abs(sideDotUp) > 0.7; // Hand oriented vertically
    const isHandHorizontal = Math.abs(sideDotRight) > 0.7; // Hand oriented horizontally

    // Calculate finger extension angles
    const getFingerExtension = (mcp, pip, tip) => {
      const angle = angle3D(mcp, pip, tip);
      // Normalize to 0-1 range where 1 is fully extended
      return constrain(map(angle, 120, 170, 0, 1), 0, 1);
    };

    const thumbExt = getFingerExtension(thumbMCP, thumbPIP, thumbTip);
    const indexExt = getFingerExtension(indexMCP, indexPIP, indexTip);
    const middleExt = getFingerExtension(middleMCP, middlePIP, middleTip);
    const ringExt = getFingerExtension(ringMCP, ringPIP, ringTip);
    const pinkyExt = getFingerExtension(pinkyMCP, pinkyPIP, pinkyTip);

    // Finger directions
    const getFingerDirection = (mcp, tip) => {
      const vec = [tip[0] - mcp[0], tip[1] - mcp[1], tip[2] - mcp[2]];
      return normalize(vec);
    };

    const indexDir = getFingerDirection(indexMCP, indexTip);
    const thumbDir = getFingerDirection(thumbMCP, thumbTip);
    const middleDir = getFingerDirection(middleMCP, middleTip);

    // Check if thumb is pointing down
    const thumbDotUp =
      thumbDir[0] * upVector[0] +
      thumbDir[1] * upVector[1] +
      thumbDir[2] * upVector[2];
    const isThumbPointingDown = thumbDotUp > 0.6;

    // Check if index is pointing up
    const indexDotUp =
      indexDir[0] * upVector[0] +
      indexDir[1] * upVector[1] +
      indexDir[2] * upVector[2];
    const isIndexPointingUp = indexDotUp < -0.7;

    // Check finger spread
    const getFingerSpread = () => {
      const handSize = distance(wrist, middleMCP);
      const indexToMiddle = distance(indexTip, middleTip) / handSize;
      const middleToRing = distance(middleTip, ringTip) / handSize;
      const ringToPinky = distance(ringTip, pinkyTip) / handSize;

      // Calculate average normalized distance
      const avgDistance = (indexToMiddle + middleToRing + ringToPinky) / 3;
      // Return 0-1 value where 1 means fingers are spread
      return constrain(map(avgDistance, 0.1, 0.25, 0, 1), 0, 1);
    };

    const fingerSpreadValue = getFingerSpread();
    const fingersTogether = 1 - fingerSpreadValue;

    // Check cupped hand shape (for La)
    const getCupShape = () => {
      // For a cup shape, fingers are slightly bent and palm is facing down
      if (!isPalmFacingDown) return 0;

      // Average finger extension (not too straight, not too curled)
      const avgExtension = (indexExt + middleExt + ringExt + pinkyExt) / 4;
      if (avgExtension < 0.3 || avgExtension > 0.9) return 0;

      // Fingers should be together for cup shape
      if (fingerSpreadValue > 0.5) return 0;

      return constrain(
        map(avgExtension, 0.3, 0.7, 0, 1) *
          constrain(fingersTogether * 2, 0, 1),
        0,
        1
      );
    };

    const cupShapeValue = getCupShape();

    // Calculate horizontal alignment (for Mi)
    const getHorizontalAlignment = () => {
      // Check if fingertips are roughly on same vertical level
      const avgY = (indexTip[1] + middleTip[1] + ringTip[1] + pinkyTip[1]) / 4;
      const yVariance =
        Math.abs(indexTip[1] - avgY) +
        Math.abs(middleTip[1] - avgY) +
        Math.abs(ringTip[1] - avgY) +
        Math.abs(pinkyTip[1] - avgY);

      const handSize = distance(wrist, middleMCP);
      return constrain(map(yVariance / handSize, 0.3, 0.05, 0, 1), 0, 1);
    };

    const horizontalAlignmentValue = getHorizontalAlignment();

    // ----- CURWEN HAND SIGN DETECTION BASED ON REFERENCE IMAGES -----

    // DO: Closed fist with thumb out to side
    signConfidences.Do =
      (1 - indexExt) * 0.2 +
      (1 - middleExt) * 0.2 +
      (1 - ringExt) * 0.2 +
      (1 - pinkyExt) * 0.2 +
      thumbExt * 0.1 +
      (isPalmFacingSide ? 0.2 : 0);

    // RE: Index finger pointing up, slightly angled
    signConfidences.Re =
      indexExt * 0.3 +
      (1 - middleExt) * 0.15 +
      (1 - ringExt) * 0.15 +
      (1 - pinkyExt) * 0.15 +
      (isHandVertical ? 0.25 : 0);

    // MI: Flat hand pointing right, palm down
    signConfidences.Mi =
      indexExt * 0.15 +
      middleExt * 0.15 +
      ringExt * 0.15 +
      pinkyExt * 0.15 +
      (isPalmFacingDown ? 0.2 : 0) +
      (isHandHorizontal ? 0.2 : 0);

    // FA: Hand pointing down, thumb across palm
    signConfidences.Fa =
      (isPalmFacingCamera ? 0.4 : 0) +
      (isThumbPointingDown ? 0.4 : 0) +
      (sideDotUp > 0 ? 0.2 : 0);

    // SOL: Flat hand, palm down, pointing forward
    signConfidences.Sol =
      indexExt * 0.15 +
      middleExt * 0.15 +
      ringExt * 0.15 +
      pinkyExt * 0.15 +
      (isPalmFacingDown ? 0.4 : 0);

    // LA: Hand forming cup shape, fingers curved, palm up
    signConfidences.La = cupShapeValue * 0.7 + (isPalmFacingDown ? 0.3 : 0);

    // TI: Hand with fingers making angle pointing up and in
    signConfidences.Ti =
      indexExt * 0.25 +
      middleExt * 0.25 +
      (isIndexPointingUp ? 0.3 : 0) +
      fingersTogether * 0.2;

    // Apply penalties for ambiguous positions
    // Penalty for Do & La confusion
    if (signConfidences.Do > 0.5 && signConfidences.La > 0.5) {
      if (isPalmFacingDown) {
        signConfidences.Do *= 0.5;
      } else {
        signConfidences.La *= 0.5;
      }
    }

    // Penalty for Re & Ti confusion
    if (signConfidences.Re > 0.5 && signConfidences.Ti > 0.5) {
      if (middleExt > 0.7) {
        signConfidences.Re *= 0.5;
      } else {
        signConfidences.Ti *= 0.5;
      }
    }

    // Penalty for Mi & Sol confusion
    if (signConfidences.Mi > 0.5 && signConfidences.Sol > 0.5) {
      if (isHandHorizontal) {
        signConfidences.Sol *= 0.5;
      } else {
        signConfidences.Mi *= 0.5;
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
