let cellSize = 40; // Made cells smaller to accommodate more beats
let grid4 = Array(4)
  .fill()
  .map(() => Array(16).fill(0)); // 16 beats for 4/4
let grid3 = Array(4)
  .fill()
  .map(() => Array(12).fill(0)); // 12 beats for 3/4
let position4 = 0;
let position3 = 0;
let smoothPos4 = 0;
let smoothPos3 = 0;
let colors = ["#FF3366", "#33FF57", "#3366FF", "#FFFF33"];

// Calculate layout dimensions
const gridWidth4 = cellSize * 16; // 16 beats
const gridWidth3 = cellSize * 12; // 12 beats
const gridHeight = cellSize * 4;
const spacing = 40; // Space between grids

const kit = new Tone.Players({
  kick: "samples/505/kick.mp3",
  snare: "samples/snare.mp3",
  hihat: "samples/hihat.wav",
  clap: "samples/clap.wav",
}).toDestination();

// Update loop timing for longer patterns
Tone.Transport.scheduleRepeat((time) => {
  playBeat4(time);
  position4 = (position4 + 1) % 16; // 16 beats
}, "16n"); // Changed to 16th notes for smoother movement

Tone.Transport.scheduleRepeat((time) => {
  playBeat3(time);
  position3 = (position3 + 1) % 12; // 12 beats
}, "12n"); // Changed to 12th notes for smoother movement

function setup() {
  createCanvas(max(gridWidth4, gridWidth3) + 100, 600);
  setupControls();
}

function draw() {
  background("#1a1a1a");

  // Smooth playhead movement
  smoothPos4 = lerp(smoothPos4, position4, 0.2);
  smoothPos3 = lerp(smoothPos3, position3, 0.2);

  // Center everything
  translate((width - max(gridWidth4, gridWidth3)) / 2, 100);

  drawGrid4();
  translate(0, gridHeight + spacing); // Move down for second grid
  drawGrid3();
  drawPlayheads();
  drawGraffitiEffects();
}

function drawGrid4() {
  push();
  // Center the 4/4 grid
  translate((max(gridWidth4, gridWidth3) - gridWidth4) / 2, 0);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 16; j++) {
      // 16 beats
      fill(grid4[i][j] ? colors[i] : "#333");
      rect(j * cellSize, i * cellSize, cellSize - 2, cellSize - 2, 5);
    }
  }
  pop();
}

function drawGrid3() {
  push();
  // Center the 3/4 grid
  translate((max(gridWidth4, gridWidth3) - gridWidth3) / 2, 0);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 12; j++) {
      // 12 beats
      fill(grid3[i][j] ? colors[i] : "#333");
      rect(j * cellSize, i * cellSize, cellSize - 2, cellSize - 2, 5);
    }
  }
  pop();
}

function drawPlayheads() {
  let playheadHeight = gridHeight + 20;

  // 4/4 playhead
  push();
  translate((width - gridWidth4) / 2, 0);
  stroke("#fff");
  strokeWeight(2);
  let x4 = smoothPos4 * cellSize + cellSize / 2;
  drawPlayhead(x4, playheadHeight);
  pop();

  // 3/4 playhead
  push();
  translate((width - gridWidth3) / 2, gridHeight + spacing);
  stroke("#fff");
  strokeWeight(2);
  let x3 = smoothPos3 * cellSize + cellSize / 2;
  drawPlayhead(x3, playheadHeight);
  pop();
}

function drawPlayhead(x, height) {
  // Draw glowing playhead
  push();
  strokeWeight(2);
  for (let i = 0; i < 3; i++) {
    stroke(255, 255, 255, 255 - i * 60);
    line(x, -10, x, height);
  }
  pop();
}

function drawGraffitiEffects() {
  // Add spray paint effect around active cells
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 16; j++) {
      if (grid4[i][j]) {
        drawSprayEffect(
          50 + j * cellSize + cellSize / 2,
          50 + i * cellSize + cellSize / 2,
          colors[i]
        );
      }
    }
    for (let j = 0; j < 12; j++) {
      if (grid3[i][j]) {
        drawSprayEffect(
          50 + j * cellSize + cellSize / 2,
          300 + i * cellSize + cellSize / 2,
          colors[i]
        );
      }
    }
  }
}

function drawSprayEffect(x, y, color) {
  push();
  noStroke();
  for (let i = 0; i < 10; i++) {
    let angle = random(TWO_PI);
    let rad = random(5, 15);
    fill(color + "40"); // Add transparency
    circle(x + cos(angle) * rad, y + sin(angle) * rad, random(2, 5));
  }
  pop();
}

function mousePressed() {
  // Adjust mouse coordinates for new centered layout
  let x = mouseX - (width - gridWidth4) / 2;
  let y = mouseY - 100;

  // Check 4/4 grid
  if (y >= 0 && y < gridHeight && x >= 0 && x < gridWidth4) {
    let i = floor(y / cellSize);
    let j = floor(x / cellSize);
    if (i >= 0 && i < 4 && j >= 0 && j < 16) {
      grid4[i][j] = 1 - grid4[i][j];
    }
  }

  // Check 3/4 grid
  x = mouseX - (width - gridWidth3) / 2;
  y = mouseY - (100 + gridHeight + spacing);
  if (y >= 0 && y < gridHeight && x >= 0 && x < gridWidth3) {
    let i = floor(y / cellSize);
    let j = floor(x / cellSize);
    if (i >= 0 && i < 4 && j >= 0 && j < 12) {
      grid3[i][j] = 1 - grid3[i][j];
    }
  }
}

function playBeat4(time) {
  if (kit.loaded) {
    if (grid4[0][position4]) kit.player("kick").start(time);
    if (grid4[1][position4]) kit.player("snare").start(time);
    if (grid4[2][position4]) kit.player("hihat").start(time);
    if (grid4[3][position4]) kit.player("clap").start(time);
  }
}

function playBeat3(time) {
  if (kit.loaded) {
    if (grid3[0][position3]) kit.player("kick").start(time);
    if (grid3[1][position3]) kit.player("snare").start(time);
    if (grid3[2][position3]) kit.player("hihat").start(time);
    if (grid3[3][position3]) kit.player("clap").start(time);
  }
}

function setupControls() {
  const playButton = select("#playButton");
  const tempoSlider = select("#tempoSlider");
  const tempoValue = select("#tempoValue");

  playButton.mousePressed(() => {
    if (Tone.Transport.state === "started") {
      Tone.Transport.stop();
      playButton.html("Play");
    } else {
      Tone.start();
      Tone.Transport.start();
      playButton.html("Stop");
    }
  });

  tempoSlider.input(() => {
    let tempo = tempoSlider.value();
    Tone.Transport.bpm.value = tempo;
    tempoValue.html(`${tempo} BPM`);
  });
}
