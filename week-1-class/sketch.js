// init sound and connect to audio output
const sound = new SimplePlayer("sounds/blip.wav");
sound.toDestination();

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(0);
}

// function mouseClicked() {
//   loaded && sound.start();
// }

function keyTyped() {
  if (key == "a") {
    loaded && sound.start();
  }
}

// set a flag to show if the file has loaded yet
let loaded = false;
Tone.loaded().then(() => {
  loaded = true;
  console.log("loaded");
});
