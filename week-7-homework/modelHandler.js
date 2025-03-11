const modelHandler = (function () {
  let model;
  let isModelReady = false;
  let onDetectionCallback;

  async function loadModel() {
    try {
      // Load the model from the models directory
      model = await ml5.neuralNetwork({
        task: "classification",
        debug: true,
      });

      // Load the trained model files
      await model.load({
        model: "models/model.json",
        metadata: "models/model_meta.json",
        weights: "models/model.weights.bin",
      });

      isModelReady = true;
      console.log("Custom hand sign model loaded");
      return true;
    } catch (error) {
      console.error("Error loading model:", error);
      return false;
    }
  }

  function processLandmarks(landmarks) {
    // Flatten landmarks into single array
    return landmarks.reduce((arr, point) => {
      return arr.concat([point[0], point[1], point[2]]);
    }, []);
  }

  async function classifyPose(landmarks) {
    if (!isModelReady || !model) return null;

    const input = processLandmarks(landmarks);
    const results = await model.classify(input);

    // Return the highest confidence prediction
    const topResult = results.reduce((prev, current) => {
      return prev.confidence > current.confidence ? prev : current;
    });

    return topResult.confidence > 0.7 ? topResult.label : null;
  }

  function init(callback) {
    onDetectionCallback = callback;
  }

  return {
    loadModel,
    classifyPose,
    init,
    isModelReady: () => isModelReady,
  };
})();
