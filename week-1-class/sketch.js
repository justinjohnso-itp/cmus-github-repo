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
  if (loaded) {
    background(220);
  } else {
    background(0);
    text("loading...", 20, 20);
  }
  let aShape = map(blip.progress(), 0, 1, 0, width);
  ellipse(aShape, height / 3, 50, 50);

  let sShape = map(pink.progress(), 0, 1, 0, width);
  ellipse(sShape, height - 20, 50, 50);

  let dShape = map(takerimba.progress(), 0, 1, 0, width);
  ellipse(dShape, height / 2 + 20, 50, 50);

  let fShape = map(tears.progress(), 0, 1, 0, width);
  ellipse(fShape, height / 5, 50, 50);
}

// map keys to sounds
function keyTyped() {
  console.log(key);
  if (loaded) {
    if (key == "a") {
      blip.start();
    } else if (key == "s") {
      pink.start();
      console.log(pink.progress());
    } else if (key == "d") {
      takerimba.start();
    } else if (key == "f") {
      tears.start();
    }
  }
}
