# Individual-Scream-Animation
## Instructions

To see the animated artwork, first click anywhere on the screen. Once clicked, the audio will begin playing softly and fade in gradually, and the visual animation will automatically start to respond to the sound. 

## Individual Approach

For my individual work, I adapted the group’s animated interpretation of the painting "The Scream", by Edvard Munch. I chose to animate the image through audio reactivity.

## Concept and Uniqueness

My approach uses sound as the main driver in the artwork, reinforcing the representation of immense anxiety and chaos that the original artwork by Edvard Munch evokes. 

While other members focused on methods like user imput, time based and perlin noise distortions, my code focuses on linking sound amplitude and frequency bands to movement and energy in the image.

As the sound intensifies, dots representing parts of the image begin to vibrate and expand, and the image starts gaining warm tones of orange and red, giving the sense that the scream is expanding visually according to the sound, while the distorted and warm scenario represents the chaotic state of mind of the character in the painting.

## References/Inspiration

The conceptual inspiration for the animation was the painting itself, which seems to symbolize the universal anxieties of modern life, as well as the visual style of horror movies.

I wanted to create an artwork that brings the painting to life, using sound to build a visual experience that reflects the idea of chaos and intense inner turmoil.

The work was inspired by existing audio visualisation artworks and music-reactive digital art installations. One key influence was the style of p5.js sound-reactive sketches seen in online examples such as:

p5.js Sound Amplitude Example (https://p5js.org/examples/sound-amplitude-analyzer.html
)

Coding Train: Sound Visualization by Daniel Shiffman (https://www.youtube.com/watch?v=2O3nm0Nvbi4
)

## Technical Explanation

The animation uses the p5.sound library to analyse an imported audio file.

p5.Amplitude() tracks overall loudness (volume) and controls the intensity of motion in the dots.

p5.FFT() checks the frequency spectrum, allowing different ranges (bass, mid and treble) to influence brightness and spread.

Each dot representing part of the figure moves in small oscillations, that are proportional to the amplitude of the current frame, creating the impression of trembling.

In terms of modifications, I made several changes to the original group code to both integrate audio control safely and implement my own conceptual idea:

Implemented a volume fade-in system inside the draw() loop to avoid abrupt loudness.

Added a click-based audio activation compliant with modern browser sound policies.

Adjusted the update timing of the dots to synchronize with amplitude peaks.

Added an animation to make it more engaging and invite the user to click on the screen, before the main animation starts.
