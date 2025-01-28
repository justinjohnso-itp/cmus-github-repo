// load tracks
let bass = new Tone.Player({
  url: "loops/Bass0.mp3",
  loop: true,
}).toDestination();
let chords = new Tone.Player({
  url: "loops/Chords0.mp3",
  loop: true,
}).toDestination();
let drums = new Tone.Player({
  url: "loops/Drums0.mp3",
  loop: true,
}).toDestination();
let melody = new Tone.Player({
  url: "loops/Melody0.mp3",
  loop: true,
}).toDestination();

let loaded = false;

function setup() {
  noCanvas();
}

function draw() {
  // not drawing anything for now
}

Tone.loaded().then(function () {
  loaded = true;
  console.log("loaded");
});

function keyTyped() {
  if (loaded) {
    const now = Tone.now();
    const d = bass._buffer.duration;

    bass.start(now);
    chords.start(now + d / 2);
    drums.start(now + d);
    melody.start(now + (d * 3) / 2);
  }
}
