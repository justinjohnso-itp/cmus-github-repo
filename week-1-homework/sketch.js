const bellSound = new SimplePlayer("sounds/bell.wav").toDestination();
const sheepSound = new SimplePlayer("sounds/sheep.wav").toDestination();
const strumSound = new SimplePlayer("sounds/strum.wav").toDestination();
const wilhelmSound = new SimplePlayer("sounds/wilhelm.wav").toDestination();

let sheepImage;
let circlePos, squarePos, trianglePos;
let pitchShift;
let isDragging = false;
let sheepY;

// set a flag to show if the file has loaded yet
let loaded = false;
Tone.loaded().then(() => {
  loaded = true;
  console.log("loaded");
});

function setup() {
  createCanvas(windowWidth, windowHeight);
  sheepImage = createImg("images/sheep.png");
  // sheepImage.mouseOver(console.log("wheee"));

  // Set positions for shapes
  circlePos = { x: width / 4, y: height / 2 };
  squarePos = { x: width / 2, y: height / 2 };
  trianglePos = { x: (3 * width) / 4, y: height / 2 };
  angleMode(DEGREES);

  // Create pitch shift effect
  pitchShift = new Tone.PitchShift().toDestination();
  sheepSound.disconnect();
  sheepSound.connect(pitchShift);

  // Initialize sheep position
  sheepY = windowHeight - 250;
}

function draw() {
  if (loaded) {
    background("green");
  } else {
    background("white");
    text("loading...", 20, 20);
  }

  // Sheep
  image(sheepImage, sheepSound.progress() * 200, sheepY, 200, 200);
  sheepImage.hide();
  console.log(sheepSound.progress()); // 0 -> 1

  // Map vertical position to pitch shift
  if (isDragging) {
    let pitch = map(sheepY, windowHeight, 0, -12, 12);
    pitchShift.pitch = pitch;
  }

  // Draw circle with scaling
  push();
  translate(circlePos.x, circlePos.y);
  let circleScale = 1;
  // let bellProgress = bellSound.progress();
  if (bellSound.state == "started") {
    circleScale = map(0, 1, 0, 2, bellSound.progress());
  }
  scale(circleScale);
  fill(255, 0, 0); // Red
  ellipse(0, 0, 100);
  pop();

  // Draw square with rotation
  push();
  translate(squarePos.x, squarePos.y);
  if (strumSound.state == "started") {
    rotate(strumSound.progress() * 360);
  }
  fill(0, 255, 0); // Green
  rectMode(CENTER);
  rect(0, 0, 100, 100);
  pop();

  // Draw triangle with flipping
  push();
  translate(trianglePos.x, trianglePos.y);
  if (wilhelmSound.state == "started") {
    scale(-1); // Flip horizontally
  }
  fill(0, 0, 255); // Blue
  triangle(-50, 50, 0, -50, 50, 50);
  pop();
}

function mousePressed() {
  // Check if mouse is over sheep
  if (
    mouseX > sheepSound.progress() * 200 &&
    mouseX < sheepSound.progress() * 200 + 200 &&
    mouseY > sheepY &&
    mouseY < sheepY + 200
  ) {
    isDragging = true;
  }
}

function mouseDragged() {
  if (isDragging) {
    sheepY = constrain(mouseY, 0, windowHeight - 200);
  }
}

function mouseReleased() {
  isDragging = false;
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
