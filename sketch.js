/**
 * Title: Animated Interpretation of “The Scream”
 * Author: Giovanna Angeiras
 * Description:
 * This sketch visualizes Edvard Munch’s *The Scream* using dynamic dot-based animation
 * that responds to sound. Each region of the painting reacts differently to frequency bands in the audio track.
 * The project builds on group work, but this version focuses on my individual work, using AUDIO as a method to animate the painting.
 * References:
 * - p5.js Reference: https://p5js.org/reference/
 * - p5.Sound library: https://p5js.org/reference/#/libraries/p5.sound
 * - Amplitude + FFT techniques inspired by the “Frequency Spectrum” example:
 *   https://p5js.org/examples/sound-frequency-spectrum.html
 * - Colour detection approach adapted from MDN Docs on RGB and pixel manipulation:
 *   https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas
 */

let baseImg, guyImg;   // Main painting and figure overlay
let allDots = [];      // Array to store each coloured dot
let song, amp, fft;    // Audio variables
let audioStarted = false;
let timeOffset = 0;    // Used to create flowing motion in time

function preload() {
  // Load all image and audio assets before the program starts
  baseImg = loadImage("assets/scream.jpeg");
  guyImg = loadImage("assets/guy.png");
  song = loadSound("assets/screamAudio.mp3");
}

function setup() {
  createCanvas(baseImg.width, baseImg.height);
  imageMode(CORNER);
  noStroke();

  // Initialize p5.sound analysis tools
  amp = new p5.Amplitude(); // Tracks overall loudness
  fft = new p5.FFT(0.8, 64); // Splits sound into 64 frequency bands

  // Generate dots that reconstruct the base image.
  // Each dot carries its colour and a category label for animation.
  let spacing = 3; // Smaller spacing = denser image
  for (let x = 0; x < width; x += spacing) {
    for (let y = 0; y < height; y += spacing) {
      // Add randomness to avoid grid-like appearance
      let px = x + random(-spacing / 3, spacing / 3);
      let py = y + random(-spacing / 3, spacing / 3);

      // Keep coordinates inside canvas
      px = constrain(px, 0, width - 1);
      py = constrain(py, 0, height - 1);

      // Sample pixel colour from base image
      let c = baseImg.get(int(px), int(py));

      // Categorise pixel colour into broad emotional zones
      let colorType = getColorType(c);

      allDots.push({ x: px, y: py, c: c, colorType: colorType });
    }
  }

  console.log("Total dots generated:", allDots.length);
}

/**
 * getColorType(c)
 * Simple heuristic for classifying a pixel’s RGB colour into categories.
 * This allows for varied movement behaviours without manual region masking.
 *
 * Technique inspired by MDN canvas pixel manipulation tutorial.
 */
function getColorType(c) {
  let r = c[0], g = c[1], b = c[2];
  let brightness = (r + g + b) / 3;

  // Orange/red hues = sky (warm, energetic)
  if (r > 150 && g > 80 && g < 180 && b < 120) return 'warm';

  // Blue dominance = water
  else if (b > g && b > r) return 'blue';

  // Very dark = bridge or figure
  else if (brightness < 80) return 'dark';

  // Brown/green tones = hills/earth
  else if (r > 80 && g > 60 && b > 40 && r > b) return 'earth';

  // Very bright = light reflections or highlights
  else if (brightness > 180) return 'bright';

  // Otherwise, neutral tones
  return 'neutral';
}

function draw() {
  background(0); // Black background for contrast

  // Wait for user input to start the audio (required by browsers)
  if (!audioStarted) {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(32);
    text("Click to start sound", width / 2, height / 2);
    return;
  }

  // Analyse current audio state
  let level = amp.getLevel();
  let spectrum = fft.analyze();

  // Extract main frequency bands for different movement types
  let bass = fft.getEnergy("bass");
  let mid = fft.getEnergy("mid");
  let treble = fft.getEnergy("treble");

  // Map and constrain values for smoother motion
  let energy = map(level, 0, 0.2, 0.8, 4.0);
  energy = constrain(energy, 0.8, 4.0);
  let bassAmount = map(bass, 0, 255, 0, 1);
  let midAmount = map(mid, 0, 255, 0, 1);
  let trebleAmount = map(treble, 0, 255, 0, 1);

  // Time progression — adds flow and variation
  timeOffset += 0.05 + bassAmount * 0.1;

  // Animate every dot depending on its colour category
  for (let p of allDots) {
    drawDot(p, energy, bassAmount, midAmount, trebleAmount, timeOffset);
  }

  // Draw the screaming figure overlay on top
  drawGuyOverlay(energy, bassAmount, midAmount, trebleAmount, timeOffset);
}

/**
 * drawGuyOverlay()
 * Adds a dynamic version of the figure, scaling and rotating with sound intensity.
 * Inspired by the idea of a “scream” expanding visually.
 */
function drawGuyOverlay(energy, bassAmount, midAmount, trebleAmount, timeOffset) {
  push();

  // Base scale starts small (50% of original size)
  let baseScale = 0.5;

  // Adjust scale dynamically according to sound spectrum
  let audioScale = (bassAmount * 0.25) + (midAmount * 0.15) + (trebleAmount * 0.1);

  // Add subtle pulse for organic motion
  let pulse = sin(timeOffset * 2) * 0.04 * energy;

  // Combined total scale factor
  let scaleAmount = baseScale + audioScale + pulse;

  // Position at center and rotate slightly with bass
  translate(width / 2, height / 2);
  let rotation = sin(timeOffset) * bassAmount * 0.05;
  rotate(rotation);

  // Scale around center
  scale(scaleAmount);

  // Draw the guy image centered on canvas
  imageMode(CENTER);
  tint(255, 255); // Ensure full visibility
  image(guyImg, 0, 0);

  pop();
}

/**
 * drawDot()
 * Defines the motion style for each colour category.
 * Each group’s behaviour relates conceptually to the painting’s elements:
 *  - Warm = sky
 *  - Blue = water
 *  - Dark = bridge or figure
 *  - Earth = hills
 *  - Bright = reflections
 *  - Neutral = background tone
 *
 * Trigonometric motion patterns (sin/cos) are from p5.js “Trigonometry” examples.
 */
function drawDot(p, energy, bassAmount, midAmount, trebleAmount, timeOffset) {
  let finalX, finalY, size;
  let baseSize = map((p.c[0] + p.c[1] + p.c[2]) / 3, 0, 255, 2, 5);

  if (p.colorType === 'warm') {
    // Sky-like swirling motion with treble (high frequencies)
    let spiralX = sin(p.y * 0.02 + timeOffset * 1.5) * trebleAmount * 20;
    let spiralY = cos(p.x * 0.015 + timeOffset) * trebleAmount * 15 - bassAmount * 10;
    finalX = p.x + spiralX + random(-energy, energy) * 0.3;
    finalY = p.y + spiralY + random(-energy, energy) * 0.3;
    size = baseSize * (1 + energy * 0.3) * (1 + trebleAmount * 0.7);

  } else if (p.colorType === 'blue') {
    // Water-like horizontal ripples linked to mid frequencies
    let waveX = sin(p.y * 0.03 + timeOffset * 2) * midAmount * 25;
    let waveY = cos(p.x * 0.02 + timeOffset * 1.5) * midAmount * 12 + bassAmount * 8;
    finalX = p.x + waveX;
    finalY = p.y + waveY;
    size = baseSize * (1 + energy * 0.3) * (1 + midAmount * 0.8);

  } else if (p.colorType === 'dark') {
    // Distorted, vibrating motion — visual “scream” energy
    let distortX = sin(p.y * 0.04 + timeOffset * 2) * bassAmount * 15;
    let distortY = cos(p.x * 0.04 + timeOffset * 2) * bassAmount * 15;
    let pulseX = sin(timeOffset * 3) * trebleAmount * 10;
    let pulseY = cos(timeOffset * 3) * trebleAmount * 10;
    finalX = p.x + distortX + pulseX;
    finalY = p.y + distortY + pulseY;
    baseSize = map((p.c[0] + p.c[1] + p.c[2]) / 3, 0, 255, 2.5, 6);
    size = baseSize * (1 + energy * 0.5) * (1 + bassAmount * 1.3 + trebleAmount * 0.6);

  } else if (p.colorType === 'earth') {
    // Rolling hill-like motion driven by bass
    let rollX = sin(p.y * 0.015 + timeOffset) * bassAmount * 18;
    let rollY = cos(p.x * 0.01 + timeOffset * 0.8) * bassAmount * 10;
    finalX = p.x + rollX;
    finalY = p.y + rollY;
    size = baseSize * (1 + energy * 0.3) * (1 + bassAmount * 0.6);

  } else if (p.colorType === 'bright') {
    // Bright areas pulse outward from the center (radial expansion)
    let centerX = width / 2;
    let centerY = height / 2;
    let angle = atan2(p.y - centerY, p.x - centerX);
    let pushX = cos(angle) * trebleAmount * 12;
    let pushY = sin(angle) * trebleAmount * 12;
    finalX = p.x + pushX + sin(timeOffset * 2) * midAmount * 5;
    finalY = p.y + pushY + cos(timeOffset * 2) * midAmount * 5;
    size = baseSize * (1 + energy * 0.4) * (1 + trebleAmount * 0.8);

  } else {
    // Neutral tones: subtle vibration to maintain cohesion
    let vibrateX = sin(timeOffset * 2 + p.x * 0.03) * energy * 4;
    let vibrateY = cos(timeOffset * 2 + p.y * 0.03) * energy * 3;
    finalX = p.x + vibrateX;
    finalY = p.y + vibrateY;
    size = baseSize * (1 + energy * 0.3) * (1 + (bassAmount + midAmount + trebleAmount) * 0.2);
  }

  // Draw dot with its original pixel colour
  fill(p.c[0], p.c[1], p.c[2], 255);
  ellipse(finalX, finalY, size, size);
}

/**
 * mousePressed()
 * Starts the looping audio on user click.
 * (This step is required because browsers restrict autoplay of audio.)
 */
function mousePressed() {
  if (!audioStarted) {
    song.loop();
    audioStarted = true;
  }
}
