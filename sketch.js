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
 *  * - Smooth transitions using `lerp()` (learned from p5.js examples)
 * - Colour detection approach adapted from MDN Docs on RGB and pixel manipulation:
 *   https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas
 */

 let baseImg, guyImg;          // Base painting and “screaming figure” layers
let allDots = [];             // Array holding dots for the full background
let guyDots = [];             // Array holding dots for the figure
let song, amp, fft;           // Audio objects
let audioStarted = false;     // Used to control when sound starts
let timeOffset = 0;           // Controls ongoing time-based effects

function preload() {
  // Load base images and sound before setup
  // Using preload() ensures these are ready before rendering
  baseImg = loadImage("assets/scream.jpeg");
  guyImg = loadImage("assets/guy.png");
  song = loadSound("assets/tormented.mp3");
}

function setup() {
  createCanvas(baseImg.width, baseImg.height);
  imageMode(CORNER);
  noStroke();

  // Initialize p5.js sound tools
  // FFT (Fast Fourier Transform) breaks down frequencies
  // Amplitude measures overall volume energy
  amp = new p5.Amplitude();
  fft = new p5.FFT(0.8, 64); // (Smoothing, Bins)

  /**
   * Generate dots based on pixel colors of the base image.
   * Each dot represents a small portion of the painting.
   * Spacing determines density and overall load performance.
   */
  let spacing = 3;
  for (let x = 0; x < width; x += spacing) {
    for (let y = 0; y < height; y += spacing) {
      // Add a small random offset to avoid grid-like appearance
      let px = x + random(-spacing / 3, spacing / 3);
      let py = y + random(-spacing / 3, spacing / 3);

      // Keep within canvas bounds
      px = constrain(px, 0, width - 1);
      py = constrain(py, 0, height - 1);

      let c = baseImg.get(int(px), int(py)); // Sample color at (x,y)
      let colorType = getColorType(c);       // Classify color area for animation

      // Each dot stores its position, color, and motion data
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

  console.log("Total background dots:", allDots.length);

  // Generate dots for the main figure ("the guy")
  let guySpacing = 3;
  for (let x = 0; x < guyImg.width; x += guySpacing) {
    for (let y = 0; y < guyImg.height; y += guySpacing) {
      let c = guyImg.get(int(x), int(y));
      let a = alpha(c);

      // Ignore transparent pixels (so only visible figure parts are included)
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
}

/**
 * Classifies pixel color into categories
 * This helps apply area-specific motion (e.g. sky, water, bridge).
 * 
 * Approach adapted from p5.js color tutorials and
 * custom experimentation based on RGB value thresholds.
 */
function getColorType(c) {
  let r = c[0], g = c[1], b = c[2];
  let brightness = (r + g + b) / 3;

  if (r > 150 && g > 80 && g < 180 && b < 120) return 'warm';   // Sky tones
  else if (b > g && b > r) return 'blue';                        // Water tones
  else if (brightness < 80) return 'dark';                       // Bridge/figure
  else if (r > 80 && g > 60 && b > 40 && r > b) return 'earth';  // Hills
  else if (brightness > 180) return 'bright';                    // Light areas
  else return 'neutral';
}

function draw() {
  background(0);

  // Before audio starts, display instruction
  if (!audioStarted) {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(32);
    text("Click to start the experience", width / 2, height / 2);
    return;
  }

  // Audio analysis: amplitude and frequency breakdown
  let level = amp.getLevel();
  let spectrum = fft.analyze();

  // Extract frequency energy bands
  let bass = fft.getEnergy("bass");
  let mid = fft.getEnergy("mid");
  let treble = fft.getEnergy("treble");

  // Normalise and constrain energy levels
  let energy = map(level, 0, 0.2, 0.8, 4.0);
  energy = constrain(energy, 0.8, 4.0);

  // Map frequency data into 0–1 range for consistency
  let bassAmount = map(bass, 0, 255, 0, 1);
  let midAmount = map(mid, 0, 255, 0, 1);
  let trebleAmount = map(treble, 0, 255, 0, 1);

  // Combine energy to detect “high intensity” moments in the song
  let totalEnergy = (bassAmount + midAmount + trebleAmount) / 3;
  let isHighEnergy = totalEnergy > 0.7;
  let extremeMultiplier = isHighEnergy ? map(totalEnergy, 0.7, 1.0, 1.0, 2.5) : 1.0;

  // Increment time for smooth motion waves
  timeOffset += 0.05 + bassAmount * 0.1;

  // Draw each section of dots
  for (let p of allDots) {
    drawDot(p, energy, bassAmount, midAmount, trebleAmount, timeOffset, extremeMultiplier);
  }

  // Draw figure overlay (reacts dynamically to sound)
  drawGuyOverlay(energy, bassAmount, midAmount, trebleAmount, timeOffset);
}

/**
 * Draws and animates the “screaming figure” overlay.
 * The figure scales, rotates, and slightly dissolves with sound intensity.
 */
function drawGuyOverlay(energy, bassAmount, midAmount, trebleAmount, timeOffset) {
  let baseScale = 0.3; // 30% of original size
  let audioScale = (bassAmount * 0.2) + (midAmount * 0.12) + (trebleAmount * 0.08);
  let pulse = sin(timeOffset * 2) * 0.03 * energy;
  let scaleAmount = baseScale + audioScale + pulse;

  // Subtle rotation (adds liveliness)
  let rotation = sin(timeOffset) * bassAmount * 0.05;

  // Dissolve effect when treble peaks
  let dissolveAmount = 0;
  if (trebleAmount > 0.55) {
    dissolveAmount = map(trebleAmount, 0.55, 1.0, 0, 1);
    dissolveAmount = constrain(dissolveAmount, 0, 1);
  }

  // Transform and redraw each “guy” dot
  for (let p of guyDots) {
    let offsetX = (p.x - guyImg.width / 2) * scaleAmount;
    let offsetY = (p.y - guyImg.height / 2) * scaleAmount;

    // 2D rotation matrix (source: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Transformations)
    let rotatedX = offsetX * cos(rotation) - offsetY * sin(rotation);
    let rotatedY = offsetX * sin(rotation) + offsetY * cos(rotation);

    // Centered position on canvas
    let posX = width / 2 + rotatedX;
    let posY = height / 2 + rotatedY;

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

    // Keep smooth transitions between frames
    p.currentDispersionX = transformedDot.currentDispersionX;
    p.currentDispersionY = transformedDot.currentDispersionY;
  }
}

/**
 * Core drawing function – handles dot behavior per color type.
 * Motion patterns are loosely inspired by natural elements (waves, air, etc.)
 */
function drawDot(p, energy, bassAmount, midAmount, trebleAmount, timeOffset, extremeMultiplier) {
  let finalX, finalY, size;
  let baseSize = map((p.c[0] + p.c[1] + p.c[2]) / 3, 0, 255, 2, 5);

  let [r, g, b] = p.c;

  // Apply treble-driven color shift (orange-red intensity during high notes)
  if (trebleAmount > 0.15) {
    let colorShift = map(trebleAmount, 0.15, 1.0, 0, 1);
    colorShift = constrain(colorShift, 0, 1);

    // Transition through warm tones
    let targetR = 255, targetG = 140, targetB = 50;
    if (colorShift > 0.47) { targetG = 0; targetB = 0; } // Deep red
    r = lerp(r, targetR, colorShift);
    g = lerp(g, targetG, colorShift);
    b = lerp(b, targetB, colorShift);
  }

  // Add movement based on audio and region type
  let dispersionAmount = map(extremeMultiplier, 1.0, 2.5, 0, 150);
  let targetDispersionX = random(-dispersionAmount, dispersionAmount);
  let targetDispersionY = random(-dispersionAmount, dispersionAmount);

  // Easing transition (concept from easing functions in animation)
  p.currentDispersionX = lerp(p.currentDispersionX, targetDispersionX, 0.1);
  p.currentDispersionY = lerp(p.currentDispersionY, targetDispersionY, 0.1);

  let dispersionX = p.currentDispersionX;
  let dispersionY = p.currentDispersionY;

  // Each color group gets a specific movement pattern
  switch (p.colorType) {
    case 'warm': // Sky area
      let spiralX = sin(p.y * 0.02 + timeOffset * 1.5) * trebleAmount * 20;
      let spiralY = cos(p.x * 0.015 + timeOffset) * trebleAmount * 15 - bassAmount * 10;
      finalX = p.x + spiralX + dispersionX;
      finalY = p.y + spiralY + dispersionY;
      size = baseSize * (1 + trebleAmount);
      break;

    case 'blue': // Water
      let waveX = sin(p.y * 0.03 + timeOffset * 2) * midAmount * 25;
      let waveY = cos(p.x * 0.02 + timeOffset * 1.5) * midAmount * 12;
      finalX = p.x + waveX + dispersionX;
      finalY = p.y + waveY + dispersionY;
      size = baseSize * (1 + midAmount);
      break;

    case 'dark': // Bridge/figure
      let distortX = sin(p.y * 0.04 + timeOffset * 2) * bassAmount * 15;
      let distortY = cos(p.x * 0.04 + timeOffset * 2) * bassAmount * 15;
      finalX = p.x + distortX + dispersionX;
      finalY = p.y + distortY + dispersionY;
      size = baseSize * (1 + bassAmount * 1.3);
      break;

    case 'earth': // Hills
      let rollX = sin(p.y * 0.015 + timeOffset) * bassAmount * 18;
      let rollY = cos(p.x * 0.01 + timeOffset * 0.8) * bassAmount * 10;
      finalX = p.x + rollX + dispersionX;
      finalY = p.y + rollY + dispersionY;
      size = baseSize * (1 + bassAmount * 0.6);
      break;

    case 'bright': // Bright regions (expanding outward)
      let centerX = width / 2, centerY = height / 2;
      let angle = atan2(p.y - centerY, p.x - centerX);
      finalX = p.x + cos(angle) * trebleAmount * 12 + dispersionX;
      finalY = p.y + sin(angle) * trebleAmount * 12 + dispersionY;
      size = baseSize * (1 + trebleAmount * 0.8);
      break;

    default: // Neutral tones
      finalX = p.x + sin(timeOffset * 2 + p.x * 0.03) * energy * 4 + dispersionX;
      finalY = p.y + cos(timeOffset * 2 + p.y * 0.03) * energy * 3 + dispersionY;
      size = baseSize * (1 + energy * 0.3);
  }

  fill(r, g, b, 255);
  ellipse(finalX, finalY, size, size);
}

// Mouse controls audio playback
function mousePressed() {
  if (!audioStarted) {
    song.loop();
    song.setVolume(1.0);
    audioStarted = true;
  } else {
    song.isPlaying() ? song.pause() : song.loop();
  }
}

// Spacebar restarts the track if paused
function keyPressed() {
  if (key === ' ') {
    if (!song.isPlaying()) {
      song.loop();
      song.setVolume(1.0);
      audioStarted = true;
    }
  }
}