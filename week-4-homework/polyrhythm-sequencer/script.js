// Sequencer exercises in p5.js
// https://editor.p5js.org/luisa/sketches/POSaDocKr – making a drum pattern
// https://editor.p5js.org/luisa/sketches/HBYHJ96e7 - making a drum machine
// https://editor.p5js.org/luisa/sketches/D0eixoM6O - adding interactivity

// Mouse event handling for grid interaction – https://github.com/zjun2/SortingComparison/blob/d1bc59a89fb1ee2aeef1874cc8fd083b7c56d49d/%E7%94%9F%E5%91%BD%E6%B8%B8%E6%88%8F.html

const cellSize = 40;
let grid4 = Array(4)
  .fill()
  .map(() => Array(16).fill(0));
let grid3 = Array(4)
  .fill()
  .map(() => Array(12).fill(0));
let position4 = 0;
let position3 = 0;
let isMouseDown = false;
let lastToggledCell = null;

const kit = new Tone.Players({
  kick: "samples/505/kick.mp3",
  snare: "samples/snare.mp3",
  hihat: "samples/hihat.wav",
  clap: "samples/clap.wav",
}).toDestination();

function createGrid(gridElement, rows, cols, gridArray) {
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = i;
      cell.dataset.col = j;

      // Replace click event with mousedown
      cell.addEventListener("mousedown", (e) => {
        isMouseDown = true;
        toggleCell(cell, gridArray, i, j);
        lastToggledCell = cell;
      });

      // Add mouseover event
      cell.addEventListener("mouseover", (e) => {
        if (isMouseDown && cell !== lastToggledCell) {
          toggleCell(cell, gridArray, i, j);
          lastToggledCell = cell;
        }
      });

      gridElement.appendChild(cell);
    }
  }

  // Add measure dividers
  const beatsPerMeasure = cols === 16 ? 4 : 3;
  for (let i = 1; i < cols / beatsPerMeasure; i++) {
    const divider = document.createElement("div");
    divider.className = "measure-divider";
    divider.style.left = `${i * beatsPerMeasure * (cellSize + 2)}px`;
    gridElement.appendChild(divider);
  }
}

function toggleCell(cell, gridArray, row, col) {
  gridArray[row][col] = 1 - gridArray[row][col];
  cell.classList.toggle("active");
  cell.classList.toggle(`active-${row}`);
}

function updatePlayhead(gridElement, position, totalSteps) {
  const playhead = gridElement.querySelector(".playhead");
  const xPos = position * cellSize + cellSize / 2;
  playhead.style.transform = `translateX(${xPos}px)`;
}

Tone.Transport.scheduleRepeat((time) => {
  playBeat4(time);
  position4 = (position4 + 1) % 16;
  updatePlayhead(document.getElementById("grid4"), position4, 16);
}, "16n");

Tone.Transport.scheduleRepeat((time) => {
  playBeat3(time);
  position3 = (position3 + 1) % 12;
  updatePlayhead(document.getElementById("grid3"), position3, 12);
}, "12n");

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
  const playButton = document.getElementById("playButton");
  const tempoSlider = document.getElementById("tempoSlider");
  const tempoValue = document.getElementById("tempoValue");

  playButton.addEventListener("click", () => {
    if (Tone.Transport.state === "started") {
      Tone.Transport.stop();
      playButton.textContent = "Play";
    } else {
      Tone.start();
      Tone.Transport.start();
      playButton.textContent = "Stop";
    }
  });

  tempoSlider.addEventListener("input", () => {
    const tempo = tempoSlider.value;
    Tone.Transport.bpm.value = tempo;
    tempoValue.textContent = `${tempo} BPM`;
  });
}

// Add event listeners to handle mouse up
document.addEventListener("mouseup", () => {
  isMouseDown = false;
  lastToggledCell = null;
});

document.addEventListener("mouseleave", () => {
  isMouseDown = false;
  lastToggledCell = null;
});

// Initialize the sequencer
document.addEventListener("DOMContentLoaded", () => {
  createGrid(document.getElementById("grid4"), 4, 16, grid4);
  createGrid(document.getElementById("grid3"), 4, 12, grid3);
  setupControls();
});
