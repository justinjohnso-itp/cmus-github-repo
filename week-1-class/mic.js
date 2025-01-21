let mic = new Tone.UserMedia();
let analyzer = new Tone.Waveform(512);
mic.connect(analyzer);
mic.open();

function setup() {
  createCanvas(400, 100);
}

function draw() {
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
}
