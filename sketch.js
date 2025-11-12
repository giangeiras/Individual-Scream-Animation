/**
 * Project: Animating “The Scream”
 * Individual Focus: Audio-Reactive Animation
 * Author: Giovanna Angeiras Catao
 * DESCRIPTION
 * This sketch visualizes the painting dynamically through animated dots
 * that respond to sound frequency and amplitude. Each region of the image
 * (sky, water, bridge, figure, etc.) has its own motion behaviour
 * depending on the color classification.
 * 
 * The animation begins with a simple interactive intro screen.
 * Audio and visuals are synchronized once the user clicks to start.
 * 
 * Note:
 * - Uses p5.sound library for amplitude and FFT analysis.
 * - Color classification and movement logic are original but inspired by
 *   examples from the p5.js Sound reference and MDN documentation on
 *   array manipulation and easing.
 * - Some easing logic and FFT usage were informed by p5.js examples:
 *   https://p5js.org/examples/sound-fft-spectrum.html
 */

// --- CODE ---

// Base and character images
let baseImg, guyImg, guyFaceImg;

// Arrays to hold all point (dot) data
let allDots = [];
let guyDots = [];

// Sound-related variables
let song, amp, fft;
let audioStarted = false;

// Variables for smooth volume fade-in
let targetVolume = 1.0;
let currentVolume = 0;
let fadeSpeed = 0.01;

// Time offset used for wave and motion calculations
let timeOffset = 0;

// Variables for intro screen animation (bouncing image)
let guyFaceX, guyFaceY;
let guyFaceVelX = 2;
let guyFaceVelY = 1.5;


// ------------------------------------------------------------
// --- PRELOAD: Load all assets before setup() runs ---
// ------------------------------------------------------------
function preload() {
  baseImg = loadImage("assets/scream.jpeg");
  guyImg = loadImage("assets/guy.png");
  guyFaceImg = loadImage("assets/Guyface.png");
  song = loadSound("assets/violin.mp3"); // Royalty-free track
}


// ------------------------------------------------------------
// --- SETUP: Runs once at the beginning ---
// ------------------------------------------------------------
function setup() {
  createCanvas(baseImg.width, baseImg.height);
  imageMode(CORNER);
  noStroke();

  // Initialize amplitude and frequency analysis (p5.sound)
  amp = new p5.Amplitude();
  fft = new p5.FFT(0.8, 64); // Smooth FFT, 64 frequency bins

  // Generate dots across the entire base image
  // Each dot corresponds to a sampled pixel color
  let spacing = 3;
  for (let x = 0; x < width; x += spacing) {
    for (let y = 0; y < height; y += spacing) {
      // Small random offset for a more organic look
      let px = x + random(-spacing / 3, spacing / 3);
      let py = y + random(-spacing / 3, spacing / 3);

      // Keep within canvas bounds
      px = constrain(px, 0, width - 1);
      py = constrain(py, 0, height - 1);

      // Get pixel color from base image
      let c = baseImg.get(int(px), int(py));

      // Classify color type to assign animation behaviour
      let colorType = getColorType(c);

      // Store all relevant data for each dot
      allDots.push({
        x: px,
        y: py,
        c: c,
        colorType: colorType,
        currentDispersionX: 0,
        currentDispersionY: 0
      });
    }
  }
  console.log("Total dots:", allDots.length);

  // Generate dots for the character ("guy") image
  let guySpacing = 3;
  for (let x = 0; x < guyImg.width; x += guySpacing) {
    for (let y = 0; y < guyImg.height; y += guySpacing) {
      let c = guyImg.get(int(x), int(y));
      let a = alpha(c);

      // Only include visible pixels
      if (a > 50) {
        let px = x + random(-guySpacing / 3, guySpacing / 3);
        let py = y + random(-guySpacing / 3, guySpacing / 3);
        let colorType = getColorType(c);

        guyDots.push({
          x: px,
          y: py,
          c: c,
          colorType: colorType,
          currentDispersionX: 0,
          currentDispersionY: 0
        });
      }
    }
  }
  console.log("Total guy dots:", guyDots.length);

  // Initialize bouncing position for intro screen
  guyFaceX = width / 2;
  guyFaceY = height / 2;
}


// ------------------------------------------------------------
// --- COLOR CLASSIFICATION ---
// Determines how different image regions behave visually
// ------------------------------------------------------------
function getColorType(c) {
  let r = c[0], g = c[1], b = c[2];
  let brightness = (r + g + b) / 3;

  // Warm/orange tones (sky)
  if (r > 150 && g > 80 && g < 180 && b < 120) return 'warm';

  // Cool blue tones (water)
  else if (b > g && b > r) return 'blue';

  // Very dark tones (bridge/figure)
  else if (brightness < 80) return 'dark';

  // Earthy/brown tones (hills)
  else if (r > 80 && g > 60 && b > 40 && r > b) return 'earth';

  // Very bright highlights
  else if (brightness > 180) return 'bright';

  // Neutral tones
  else return 'neutral';
}


// ------------------------------------------------------------
// --- DRAW LOOP: Called continuously after setup() ---
// ------------------------------------------------------------
function draw() {
  background(0);

  // --- INTRO SCREEN ---
  if (!audioStarted) {
    // Bounce the face around the canvas
    guyFaceX += guyFaceVelX;
    guyFaceY += guyFaceVelY;

    let faceScale = 0.5; // 50% of original size
    let faceWidth = guyFaceImg.width * faceScale;
    let faceHeight = guyFaceImg.height * faceScale;

    // Bounce off horizontal edges
    if (guyFaceX - faceWidth / 2 <= 0 || guyFaceX + faceWidth / 2 >= width) {
      guyFaceVelX *= -1;
      guyFaceX = constrain(guyFaceX, faceWidth / 2, width - faceWidth / 2);
    }

    // Bounce off vertical edges (leaving room for text)
    if (guyFaceY - faceHeight / 2 <= 0 || guyFaceY + faceHeight / 2 + 50 >= height) {
      guyFaceVelY *= -1;
      guyFaceY = constrain(guyFaceY, faceHeight / 2, height - faceHeight / 2 - 50);
    }

    // Draw the bouncing face image
    push();
    imageMode(CENTER);
    image(guyFaceImg, guyFaceX, guyFaceY, faceWidth, faceHeight);
    pop();

    // Display click instruction
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(32);
    text("click here", guyFaceX, guyFaceY + faceHeight / 2 + 30);
    return; // Stop drawing until audio starts
  }

  // --- AUDIO SETUP ---
  // Gradually fade in volume after clicking
  if (currentVolume < targetVolume) {
    currentVolume += fadeSpeed;
    currentVolume = constrain(currentVolume, 0, targetVolume);
    song.setVolume(currentVolume);
  }

  // --- SOUND ANALYSIS ---
  let level = amp.getLevel(); // Amplitude (overall volume)
  let spectrum = fft.analyze(); // Frequency distribution

  // Extract frequency energy bands (built-in p5.FFT method)
  let bass = fft.getEnergy("bass");
  let mid = fft.getEnergy("mid");
  let treble = fft.getEnergy("treble");

  // Map and normalize these values to more usable ranges
  let energy = map(level, 0, 0.2, 0.8, 4.0);
  energy = constrain(energy, 0.8, 4.0);

  let bassAmount = map(bass, 0, 255, 0, 1);
  let midAmount = map(mid, 0, 255, 0, 1);
  let trebleAmount = map(treble, 0, 255, 0, 1);

  // Detect when total energy passes a “high intensity” threshold
  let totalEnergy = (bassAmount + midAmount + trebleAmount) / 3;
  let isHighEnergy = totalEnergy > 0.7;
  let extremeMultiplier = isHighEnergy ? map(totalEnergy, 0.7, 1.0, 1.0, 2.5) : 1.0;

  // Increment time for oscillating visual effects
  timeOffset += 0.05 + bassAmount * 0.1;

  // Draw all dots for the background and environment
  for (let p of allDots) {
    drawDot(p, energy, bassAmount, midAmount, trebleAmount, timeOffset, extremeMultiplier);
  }

  // Draw the figure (“guy”) overlay with audio-based transformations
  drawGuyOverlay(energy, bassAmount, midAmount, trebleAmount, timeOffset);
}


// ------------------------------------------------------------
// --- DRAW GUY OVERLAY ---
// Makes the figure respond to the music: scaling, rotation, pulsing
// ------------------------------------------------------------
function drawGuyOverlay(energy, bassAmount, midAmount, trebleAmount, timeOffset) {
  let baseScale = 0.3;
  let audioScale = (bassAmount * 0.2) + (midAmount * 0.12) + (trebleAmount * 0.08);
  let pulse = sin(timeOffset * 2) * 0.03 * energy;
  let scaleAmount = baseScale + audioScale + pulse;

  let rotation = sin(timeOffset) * bassAmount * 0.05;

  // Add dissolve effect during intense treble
  let dissolveAmount = 0;
  if (trebleAmount > 0.55) {
    dissolveAmount = map(trebleAmount, 0.55, 1.0, 0, 1);
    dissolveAmount = constrain(dissolveAmount, 0, 1);
  }

  for (let p of guyDots) {
    // Transform positions based on scale and rotation
    let offsetX = (p.x - guyImg.width / 2) * scaleAmount;
    let offsetY = (p.y - guyImg.height / 2) * scaleAmount;

    let rotatedX = offsetX * cos(rotation) - offsetY * sin(rotation);
    let rotatedY = offsetX * sin(rotation) + offsetY * cos(rotation);

    let posX = width / 2 + rotatedX;
    let posY = height / 2 + rotatedY;

    // Create transformed dot and reuse the same draw function
    let transformedDot = {
      x: posX,
      y: posY,
      c: p.c,
      colorType: p.colorType,
      currentDispersionX: p.currentDispersionX,
      currentDispersionY: p.currentDispersionY
    };

    drawDot(
      transformedDot,
      energy,
      bassAmount,
      midAmount,
      trebleAmount,
      timeOffset,
      dissolveAmount > 0 ? map(dissolveAmount, 0, 1, 1.0, 2.5) : 1.0
    );

    // Update persistent state for smoother animation
    p.currentDispersionX = transformedDot.currentDispersionX;
    p.currentDispersionY = transformedDot.currentDispersionY;
  }
}


// ------------------------------------------------------------
// --- DRAW DOT FUNCTION ---
// Handles how each dot moves and changes color
// ------------------------------------------------------------
function drawDot(p, energy, bassAmount, midAmount, trebleAmount, timeOffset, extremeMultiplier) {
  let baseSize = map((p.c[0] + p.c[1] + p.c[2]) / 3, 0, 255, 2, 5);
  let r = p.c[0], g = p.c[1], b = p.c[2];

  // Gradual shift toward warm tones (orange/red) when treble increases
  if (trebleAmount > 0.15) {
    let colorShift = map(trebleAmount, 0.15, 1.0, 0, 1);
    colorShift = constrain(colorShift, 0, 1);

    let targetR = 255, targetG, targetB;
    if (colorShift < 0.235) {
      targetG = 140; targetB = 50;
    } else if (colorShift < 0.47) {
      let midShift = map(colorShift, 0.235, 0.47, 0, 1);
      targetG = lerp(140, 80, midShift);
      targetB = lerp(50, 10, midShift);
    } else {
      let highShift = map(colorShift, 0.47, 1.0, 0, 1);
      targetG = lerp(80, 0, highShift);
      targetB = lerp(10, 0, highShift);
    }
    r = lerp(r, targetR, colorShift);
    g = lerp(g, targetG, colorShift);
    b = lerp(b, targetB, colorShift);
  }

  // Calculate smooth dispersion for each dot (adds liveliness)
  let dispersionAmount = map(extremeMultiplier, 1.0, 2.5, 0, 150);
  let targetDispersionX = random(-dispersionAmount, dispersionAmount);
  let targetDispersionY = random(-dispersionAmount, dispersionAmount);
  p.currentDispersionX = lerp(p.currentDispersionX, targetDispersionX, 0.1);
  p.currentDispersionY = lerp(p.currentDispersionY, targetDispersionY, 0.1);

  let dispersionX = p.currentDispersionX;
  let dispersionY = p.currentDispersionY;

  let finalX, finalY, size;

  // --- REGION-SPECIFIC ANIMATIONS ---
  // Each region type behaves differently based on frequency energy

  if (p.colorType === 'warm') {
    // Sky region: swirling movement reacting to treble
    let spiralX = sin(p.y * 0.02 + timeOffset * 1.5) * trebleAmount * 20 * extremeMultiplier;
    let spiralY = cos(p.x * 0.015 + timeOffset) * trebleAmount * 15 * extremeMultiplier - bassAmount * 10;
    finalX = p.x + spiralX + random(-energy, energy) * 0.3 * extremeMultiplier + dispersionX;
    finalY = p.y + spiralY + random(-energy, energy) * 0.3 * extremeMultiplier + dispersionY;
    size = baseSize * (1 + energy * 0.3) * (1 + trebleAmount * 0.7) * extremeMultiplier;

  } else if (p.colorType === 'blue') {
    // Water region: horizontal ripples reacting to mid frequencies
    let waveX = sin(p.y * 0.03 + timeOffset * 2) * midAmount * 25 * extremeMultiplier;
    let waveY = cos(p.x * 0.02 + timeOffset * 1.5) * midAmount * 12 * extremeMultiplier + bassAmount * 8;
    finalX = p.x + waveX + dispersionX;
    finalY = p.y + waveY + dispersionY;
    size = baseSize * (1 + energy * 0.3) * (1 + midAmount * 0.8) * extremeMultiplier;

  } else if (p.colorType === 'dark') {
    // Figure and bridge: heavy distortion based on bass and treble
    let distortX = sin(p.y * 0.04 + timeOffset * 2) * bassAmount * 15 * extremeMultiplier;
    let distortY = cos(p.x * 0.04 + timeOffset * 2) * bassAmount * 15 * extremeMultiplier;
    let pulseX = sin(timeOffset * 3) * trebleAmount * 10 * extremeMultiplier;
    let pulseY = cos(timeOffset * 3) * trebleAmount * 10 * extremeMultiplier;
    finalX = p.x + distortX + pulseX + dispersionX;
    finalY = p.y + distortY + pulseY + dispersionY;
    size = map((p.c[0] + p.c[1] + p.c[2]) / 3, 0, 255, 2.5, 6);
    size *= (1 + energy * 0.5) * (1 + bassAmount * 1.3 + trebleAmount * 0.6) * extremeMultiplier;

  } else if (p.colorType === 'earth') {
    // Hills: rolling motion influenced by bass
    let rollX = sin(p.y * 0.015 + timeOffset) * bassAmount * 18 * extremeMultiplier;
    let rollY = cos(p.x * 0.01 + timeOffset * 0.8) * bassAmount * 10 * extremeMultiplier;
    finalX = p.x + rollX + dispersionX;
    finalY = p.y + rollY + dispersionY;
    size = baseSize * (1 + energy * 0.3) * (1 + bassAmount * 0.6) * extremeMultiplier;

  } else if (p.colorType === 'bright') {
    // Highlights: radial expansion from center
    let centerX = width / 2;
    let centerY = height / 2;
    let angle = atan2(p.y - centerY, p.x - centerX);
    let pushX = cos(angle) * trebleAmount * 12 * extremeMultiplier;
    let pushY = sin(angle) * trebleAmount * 12 * extremeMultiplier;
    finalX = p.x + pushX + sin(timeOffset * 2) * midAmount * 5 * extremeMultiplier + dispersionX;
    finalY = p.y + pushY + cos(timeOffset * 2) * midAmount * 5 * extremeMultiplier + dispersionY;
    size = baseSize * (1 + energy * 0.3) * (1 + trebleAmount * 1.0) * extremeMultiplier;

  } else {
    // Neutral region: gentle pulsing to keep the image alive
    let offsetX = sin(p.y * 0.01 + timeOffset) * midAmount * 10 * extremeMultiplier;
    let offsetY = cos(p.x * 0.01 + timeOffset) * bassAmount * 8 * extremeMultiplier;
    finalX = p.x + offsetX + dispersionX;
    finalY = p.y + offsetY + dispersionY;
    size = baseSize * (1 + energy * 0.25) * extremeMultiplier;
  }

  fill(r, g, b, 180);
  ellipse(finalX, finalY, size, size);
}


// ------------------------------------------------------------
// --- INTERACTION: Mouse Click to Start/Restart Audio ---
// ------------------------------------------------------------
function mousePressed() {
  if (!audioStarted) {
    // Start music and animation
    audioStarted = true;
    song.loop();
    song.setVolume(0);
  } else if (!song.isPlaying()) {
    song.loop();
  } else {
    // Reset animation
    audioStarted = false;
    song.stop();
    currentVolume = 0;
  }
}
