// init sounds and connect to audio output
const blip = new SimplePlayer("sounds/blip.wav").toDestination();
const pink = new SimplePlayer("sounds/pink.wav").toDestination();
const takerimba = new SimplePlayer("sounds/takerimba.wav").toDestination();
const tears = new SimplePlayer("sounds/tears.wav").toDestination();

// set a flag to show if the file has loaded yet
let loaded = false;
Tone.loaded().then(() => {
  loaded = true;
  console.log("loaded");
});

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(0);
}

// map keys to sounds
function keyTyped() {
  console.log(key);
  if (loaded) {
    if (key == "a") {
      blip.start();
    } else if (key == "s") {
      pink.start();
    } else if (key == "d") {
      takerimba.start();
    } else if (key == "f") {
      tears.start();
    }
  }
}
