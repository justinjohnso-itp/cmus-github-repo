// Add a snare drum sound
// Play a kick/snare/snare/snare pattern

// INTERFACE
let playButton;
let tempoSlider;

// PATTERN
const totalBeats = 0;

// SOUNDS

// Create a Players object and load the "kick.mp3" and "snare.mp3" files
const kit = new Tone.Players({
  kick: "samples/505/kick.mp3",
  snare: "samples/snare.mp3",
});

// Connect the player output to the computer's audio output
kit.toDestination();

// Create a loop: call playBeat every half a second
// Tone.Transport.scheduleRepeat(playBeat, 0.5);

// Create a loop: call playBeat every beat / quarter note
Tone.Transport.bpm.value = 120;
Tone.Transport.scheduleRepeat(playBeat, "4n");

// Audio playback loop
function playBeat(time) {
  kit.player("kick").start(time);
}

// INTERFACE
function setup() {
  playButton = createButton("play");
  playButton.mouseClicked(togglePlay);

  tempoSlider = createSlider(20, 240, 120);
  tempoSlider.changed(updateTempo);
}

function togglePlay() {
  if (Tone.Transport.state == "started") {
    Tone.Transport.stop();
    playButton.html("play");
  } else {
    if (kit.loaded) {
      Tone.Transport.start();
      playButton.html("stop");
    }
  }
}

function updateTempo() {
  Tone.Transport.bpm.rampTo(tempoSlider.value());
}
