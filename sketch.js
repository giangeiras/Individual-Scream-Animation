/**
 * Title: Animated Interpretation of “The Scream”
 * Author: Giovanna Angeiras
 * Description:
 * This sketch visualizes Edvard Munch’s *The Scream* using dynamic dot-based animation
 * that responds to sound. Each region of the painting reacts differently to frequency bands in the audio track.
 * The project builds on group work, but this version focuses on my individual work, using AUDIO as a method to animate the painting.
 * References:
 * - p5.js reference: https://p5js.org/reference/
 * - p5.Sound library (Amplitude + FFT): https://p5js.org/reference/#/libraries/p5.sound
 * - Technique for pixel sampling inspired by p5.js “Image get()” example:
 *   https://p5js.org/examples/image-pixels.html
 */

let baseImg, skyMask, waterMask, hillsMask, bridgeMask, guyMask; // Image and mask assets
let allDots = []; // Array to store dot objects across the image
let song, amp, fft; // Sound-related variables
let audioStarted = false; // Controls whether sound playback has begun
let timeOffset = 0; // Used to animate temporal changes (waves, vibrations, etc.)

function preload() {
  // Load base painting and all mask images.
  // Each mask isolates a region of the artwork (white = active area).
  baseImg = loadImage("assets/scream.jpeg");
  skyMask = loadImage("assets/sky.png");
  waterMask = loadImage("assets/water.png");
  hillsMask = loadImage("assets/bwhills.png");
  bridgeMask = loadImage("assets/bridge.png");
  guyMask = loadImage("assets/guy.png");

  // Load the sound file 
  // Learned via p5.js Sound example: https://p5js.org/reference/#/p5.SoundFile
  song = loadSound("assets/screamAudio.mp3");
}

function setup() {
  createCanvas(baseImg.width, baseImg.height);
  imageMode(CORNER);
  noStroke();

  // Initialize p5.sound objects
  amp = new p5.Amplitude(); // Measures overall loudness
  fft = new p5.FFT(0.8, 64); // Breaks down sound into frequency spectrum

  // Generate a dense field of dots to reconstruct the image
  // Each dot inherits the color of its pixel in baseImg.
  let spacing = 3; // Controls density of dots
  for (let x = 0; x < width; x += spacing) {
    for (let y = 0; y < height; y += spacing) {
      // Slight random offset to make the result feel organic and hand-drawn
      let px = x + random(-spacing / 3, spacing / 3);
      let py = y + random(-spacing / 3, spacing / 3);

      // Keep dots inside canvas bounds
      px = constrain(px, 0, width - 1);
      py = constrain(py, 0, height - 1);

      // Sample pixel color from base image
      let c = baseImg.get(int(px), int(py));

      // Determine which region this pixel belongs to based on masks
      let area = getAreaType(int(px), int(py));

      // Store dot as an object for later animation
      allDots.push({ x: px, y: py, c: c, area: area });
    }
  }

  console.log("Total dots generated:", allDots.length);
}

/**
 * getAreaType(x, y)
 * Uses brightness values from the mask images to determine which region (sky, water, hills, bridge, guy) a pixel belongs to.
 * The brighter the pixel in the mask, the stronger the match.
 */
function getAreaType(x, y) {
  // The following brightness thresholds were manually tuned
  // based on trial and error to best match the regions visually.
  let guyBright = (guyMask.get(x, y)[0] + guyMask.get(x, y)[1] + guyMask.get(x, y)[2]) / 3;
  if (guyBright > 100) return 'guy';

  let bridgeBright = (bridgeMask.get(x, y)[0] + bridgeMask.get(x, y)[1] + bridgeMask.get(x, y)[2]) / 3;
  if (bridgeBright > 20) return 'bridge';

  let skyBright = (skyMask.get(x, y)[0] + skyMask.get(x, y)[1] + skyMask.get(x, y)[2]) / 3;
  if (skyBright > 120) return 'sky';

  let waterBright = (waterMask.get(x, y)[0] + waterMask.get(x, y)[1] + waterMask.get(x, y)[2]) / 3;
  if (waterBright > 80) return 'water';

  let hillsBright = (hillsMask.get(x, y)[0] + hillsMask.get(x, y)[1] + hillsMask.get(x, y)[2]) / 3;
  if (hillsBright > 100) return 'hills';

  // If no mask clearly matches, default to "hills"
  return 'hills';
}

function draw() {
  background(0); // Start with a blank (black) background

  // Before audio starts, prompt user to interact
  if (!audioStarted) {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(32);
    text("Click to start the sound", width / 2, height / 2);
    return; // Wait until user clicks
  }

  // Retrieve live amplitude and frequency data
  let level = amp.getLevel();
  let spectrum = fft.analyze();

  // Extract main frequency bands for different animation behaviours
  let bass = fft.getEnergy("bass");
  let mid = fft.getEnergy("mid");
  let treble = fft.getEnergy("treble");

  // Map amplitude levels to energy values for dot movement intensity
  let energy = map(level, 0, 0.2, 0.8, 4.0);
  energy = constrain(energy, 0.8, 4.0);

  let bassAmount = map(bass, 0, 255, 0, 1);
  let midAmount = map(mid, 0, 255, 0, 1);
  let trebleAmount = map(treble, 0, 255, 0, 1);

  // Increment timeOffset to create continuous motion
  timeOffset += 0.05 + bassAmount * 0.1;

  // Draw all dots, applying area-specific transformations
  for (let p of allDots) {
    drawDot(p, energy, bassAmount, midAmount, trebleAmount, timeOffset);
  }
}


function drawDot(p, energy, bassAmount, midAmount, trebleAmount, timeOffset) {
  let finalX, finalY, size;

  // Base size determined by pixel brightness
  let baseSize = map((p.c[0] + p.c[1] + p.c[2]) / 3, 0, 255, 2, 5);

  if (p.area === 'sky') {
    // Sine and cosine waveforms learned from p5.js trig examples.
    let spiralX = sin(p.y * 0.02 + timeOffset * 1.5) * trebleAmount * 20;
    let spiralY = cos(p.x * 0.015 + timeOffset) * trebleAmount * 15 - bassAmount * 10;

    finalX = p.x + spiralX + random(-energy, energy) * 0.3;
    finalY = p.y + spiralY + random(-energy, energy) * 0.3;
    size = baseSize * (1 + energy * 0.3) * (1 + trebleAmount * 0.7);

  } else if (p.area === 'water') {
    
    let waveX = sin(p.y * 0.03 + timeOffset * 2) * midAmount * 25;
    let waveY = cos(p.x * 0.02 + timeOffset * 1.5) * midAmount * 12 + bassAmount * 8;

    finalX = p.x + waveX;
    finalY = p.y + waveY;
    size = baseSize * (1 + energy * 0.3) * (1 + midAmount * 0.8);

  } else if (p.area === 'hills') {
    
    let rollX = sin(p.y * 0.015 + timeOffset) * bassAmount * 18;
    let rollY = cos(p.x * 0.01 + timeOffset * 0.8) * bassAmount * 10;

    finalX = p.x + rollX;
    finalY = p.y + rollY;
    size = baseSize * (1 + energy * 0.3) * (1 + bassAmount * 0.6);

  } else if (p.area === 'bridge') {
  
    let vibrateX = sin(timeOffset * 3 + p.x * 0.05) * energy * 3;
    let vibrateY = cos(timeOffset * 2.5 + p.y * 0.05) * energy * 2;

    finalX = p.x + vibrateX;
    finalY = p.y + vibrateY;
    size = baseSize * (1 + energy * 0.3) * (1 + (bassAmount + midAmount + trebleAmount) * 0.3);

  } else if (p.area === 'guy') {
    // “Screaming” area 
    let distortX = sin(p.y * 0.04 + timeOffset * 2) * bassAmount * 12;
    let distortY = cos(p.x * 0.04 + timeOffset * 2) * bassAmount * 12;
    let pulseX = sin(timeOffset * 3) * trebleAmount * 8;
    let pulseY = cos(timeOffset * 3) * trebleAmount * 8;

    finalX = p.x + distortX + pulseX;
    finalY = p.y + distortY + pulseY;
    baseSize = map((p.c[0] + p.c[1] + p.c[2]) / 3, 0, 255, 2.5, 6);
    size = baseSize * (1 + energy * 0.4) * (1 + bassAmount * 1.2 + trebleAmount * 0.5);
  }

  // Finally draw the dot with its original color
  fill(p.c[0], p.c[1], p.c[2], 255);
  ellipse(finalX, finalY, size, size);
}

/**
 * mousePressed()
 * Starts the audio loop on user interaction.
 * (This step is required because browsers restrict autoplay of audio.)
 */
function mousePressed() {
  if (!audioStarted) {
    song.loop();
    audioStarted = true;
  }
}
