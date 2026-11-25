// Ember Ladle — audio.js
// One clear job: tiny WebAudio synth effects. No audio files, no network.
// Every sound is an oscillator + gain envelope built at call time.

export function createAudio() {
  const audio = {
    ctx: null,
    muted: false,
    // Lazily created on first user gesture so browsers allow it.
    ensure() {
      if (!audio.ctx) {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (AC) audio.ctx = new AC();
        } catch (err) {
          audio.ctx = null;
        }
      }
      if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
      return audio.ctx;
    },
    toggleMute() {
      audio.muted = !audio.muted;
      return audio.muted;
    },
  };
  return audio;
}

// One short tone: frequency in Hz, seconds long, 'sine'|'square'|'triangle'.
function tone(audio, freq, seconds, type, volume, when) {
  if (audio.muted) return;
  const ctx = audio.ensure();
  if (!ctx) return;
  const t0 = ctx.currentTime + (when || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume || 0.12, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + seconds + 0.05);
}

// A knife tick while chopping.
export function playChop(audio) {
  tone(audio, 1900, 0.05, 'square', 0.05);
  tone(audio, 1200, 0.04, 'square', 0.04, 0.03);
}

// Two-note happy ding when a dish is served.
export function playServe(audio) {
  tone(audio, 880, 0.16, 'sine', 0.16);
  tone(audio, 1318, 0.28, 'sine', 0.16, 0.1);
}

// Low buzz when an order expires or a serve is wrong.
export function playFail(audio) {
  tone(audio, 160, 0.3, 'sawtooth', 0.1);
  tone(audio, 110, 0.34, 'sawtooth', 0.1, 0.08);
}

// Soft pop when picking up or placing an ingredient.
export function playPop(audio) {
  tone(audio, 520, 0.08, 'triangle', 0.1);
}

// Sizzle loop start is faked with a short noise-ish burst of tones.
export function playSizzle(audio) {
  tone(audio, 3200, 0.12, 'sine', 0.03);
  tone(audio, 4100, 0.1, 'sine', 0.02, 0.05);
}

// A warm two-note chime when a new order lands on the board.
export function playOrder(audio) {
  tone(audio, 660, 0.12, 'triangle', 0.1);
  tone(audio, 990, 0.16, 'triangle', 0.1, 0.09);
}

// Short warning tick when a burner is about to burn its food.
export function playBurnWarn(audio) {
  tone(audio, 240, 0.1, 'square', 0.07);
  tone(audio, 240, 0.1, 'square', 0.07, 0.14);
}
export function playJingle(audio) {
  tone(audio, 523, 0.14, 'sine', 0.14);
  tone(audio, 659, 0.14, 'sine', 0.14, 0.12);
  tone(audio, 784, 0.14, 'sine', 0.14, 0.24);
  tone(audio, 1046, 0.3, 'sine', 0.16, 0.36);
}
