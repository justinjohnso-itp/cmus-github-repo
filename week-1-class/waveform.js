const sound = new SimplePlayer("sounds/takerimba.wav");
let analyzer = new Tone.Waveform(2048);
sound.toDestination();
sound.connect(analyzer);

let loaded = false;

function setup() {
  createCanvas(600, 600);
}

function draw() {
  if (loaded) {
    background(0);

    let waveform = analyzer.getValue();

    strokeWeight(2);
    noFill();
    stroke(255);
    beginShape();
    for (let i = 0; i < waveform.length; i++) {
      let x = map(i, 0, waveform.length, 0, width);
      let y = map(waveform[i], -1, 1, height, 0);
      vertex(x, y);
    }
    endShape();
  } else {
    background(220);
    text("loading...", 20, 20);
  }
}

function mouseClicked() {
  if (loaded) {
    sound.start();
  }
}

Tone.loaded().then(function () {
  loaded = true;
});
