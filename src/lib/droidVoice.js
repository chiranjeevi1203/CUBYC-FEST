/**
 * CB-27's voice: short synthesized astromech chirps (Web Audio, no audio files).
 * Only plays after the visitor has interacted (opening the chat counts) and when
 * sound is on. kind: 'hello' | 'reply' | 'think' | 'nav' | 'click'.
 */
let ctx = null;

const PATTERNS = {
  hello: [[1400, 2600, 0.09], [2600, 1800, 0.07], [1800, 3000, 0.11]],
  reply: [[1600, 2200, 0.06], [2200, 1500, 0.06]],
  think: [[900, 1300, 0.05], [1300, 900, 0.05], [900, 1500, 0.05]],
  nav: [[1200, 2800, 0.12], [2800, 2400, 0.05]],
  click: [[2000, 2400, 0.04]],
};

export function chirp(kind = 'click', volume = 0.05) {
  try {
    ctx = ctx ?? new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    let t = ctx.currentTime + 0.01;
    for (const [f0, f1, d] of PATTERNS[kind] ?? PATTERNS.click) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = Math.random() > 0.5 ? 'sine' : 'triangle';
      // A little randomness so the droid never sounds exactly the same twice.
      const j = 0.85 + Math.random() * 0.3;
      osc.frequency.setValueAtTime(f0 * j, t);
      osc.frequency.exponentialRampToValueAtTime(f1 * j, t + d);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + d);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + d + 0.02);
      t += d + 0.025;
    }
  } catch {
    /* audio unavailable */
  }
}
