const bellSound = new SimplePlayer("sounds/bell.wav").toDestination();
const sheepSound = new SimplePlayer("sounds/sheep.wav").toDestination();
const strumSound = new SimplePlayer("sounds/strum.wav").toDestination();
const wilhelmSound = new SimplePlayer("sounds/wilhelm.wav").toDestination();

let sheepImage;

// set a flag to show if the file has loaded yet
let loaded = false;
Tone.loaded().then(() => {
  loaded = true;
  console.log("loaded");
});

function setup() {
  createCanvas(windowWidth, windowHeight);
  sheepImage = createImg("images/sheep.png");
  // sheepImage.mouseOver(console.log("wehhe"));
}

function draw() {
  background("green");
  image(sheepImage, 0, windowHeight - 250, 200, 200);
}

// map keys to sounds
function keyTyped() {
  console.log(key);
  if (loaded) {
    if (key == "a") {
      bellSound.start();
    } else if (key == "s") {
      sheepSound.start();
    } else if (key == "d") {
      strumSound.start();
    } else if (key == "f") {
      wilhelmSound.start();
    }
  }
}
