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
    // set up quantization
    if (Tone.Transport.state == "stopped") {
      Tone.Transport.bpm.value = 121.8;
      Tone.Transport.start();
    }

    if (key == "a") {
      if (drums.state == "stopped") {
        drums.start("@1m");
      } else {
        drums.stop();
      }
    } else if (key == "s") {
      if (chords.state == "stopped") {
        chords.start("@1m");
      } else {
        chords.stop();
      }
    } else if (key == "d") {
      if (bass.state == "stopped") {
        bass.start("@1m");
      } else {
        bass.stop();
      }
    } else if (key == "f") {
      if (melody.state == "stopped") {
        melody.start("@1m");
      } else {
        melody.stop();
      }
    }

    // const now = Tone.now();
    // const d = bass._buffer.duration;

    // bass.start(now);
    // chords.start(now + d / 2);
    // drums.start(now + d);
    // melody.start(now + (d * 3) / 2);
  }
}
