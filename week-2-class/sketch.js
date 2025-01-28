// load a track
// create a slider
// connect the value of the lider to the volume of the track

let players = [];
let sliders = [];

// load track
players[0] = new Tone.Player("stems/blobtower.mp3").toDestination();
players[1] = new Tone.Player("stems/brazen_mo.mp3").toDestination();
players[2] = new Tone.Player("stems/breezy_point_rd.mp3").toDestination();
players[3] = new Tone.Player("stems/lower_long_lake.mp3").toDestination();

function setup() {
  noCanvas();

  // make sliders
  for (let i in players) {
    sliders[i] = createSlider(-60, 0);
    sliders[i].id = i;
    sliders[i].input(volumeInput);
  }
}

function volumeInput() {
  console.log(this.id, this.value());
  players[this.id].volume.rampTo(this.value());
}

function draw() {
  background(220);
}

function keyTyped() {
  console.log(key);
  if (key == "a") {
    players[0].start();
  } else if (key == "s") {
    players[1].start();
  } else if (key == "d") {
    players[2].start();
  } else if (key == "f") {
    players[3].start();
  }
}
