/**
 * Game feel. Tiny WebAudio synth for rep and completion cues.
 *
 * No audio asset files: every sound is generated, so the bundle stays small and
 * there is nothing to download. Context is created lazily on first user gesture,
 * because browsers refuse to start one otherwise.
 */

let ctx: AudioContext | null = null;
let enabled = true;

function ensure(): AudioContext | null {
  if (!enabled) return null;
  if (ctx) return ctx;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  if (!on && ctx) {
    void ctx.suspend();
  } else if (on && ctx) {
    void ctx.resume();
  }
}

export function isSoundEnabled(): boolean {
  return enabled;
}

/** Call from a user gesture so the context can start. */
export function unlockAudio(): void {
  const c = ensure();
  if (c && c.state === 'suspended') void c.resume();
}

interface ToneSpec {
  freq: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  /** Optional pitch sweep endpoint. */
  sweepTo?: number;
  delay?: number;
}

function play(spec: ToneSpec): void {
  const c = ensure();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();

  const t0 = c.currentTime + (spec.delay ?? 0);
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = spec.type;
  osc.frequency.setValueAtTime(spec.freq, t0);
  if (spec.sweepTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(spec.sweepTo, t0 + spec.duration);
  }
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(spec.gain, t0 + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + spec.duration);
  osc.connect(amp).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + spec.duration + 0.02);
}

/** Short woody click for a completed rep. Pitch climbs with the rep count. */
export function playRep(repIndex: number): void {
  const step = Math.min(repIndex, 11);
  const freq = 320 * Math.pow(2, step / 24);
  play({ freq, duration: 0.1, type: 'triangle', gain: 0.14 });
  play({ freq: freq * 2, duration: 0.05, type: 'sine', gain: 0.05, delay: 0.005 });
}

/** Rising arpeggio when a plot reaches its next stage. */
export function playLevelUp(): void {
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    play({ freq, duration: 0.22, type: 'sine', gain: 0.11, delay: i * 0.075 });
  });
}

/** Full-set completion: a warm major chord with a soft tail. */
export function playDayComplete(): void {
  const notes = [392, 523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    play({ freq, duration: 0.7, type: 'sine', gain: 0.1, delay: i * 0.09 });
    play({ freq: freq / 2, duration: 0.9, type: 'triangle', gain: 0.04, delay: i * 0.09 });
  });
}

/** Dull thud for an out-of-range or rejected rep. */
export function playMiss(): void {
  play({ freq: 150, duration: 0.14, type: 'sawtooth', gain: 0.07, sweepTo: 90 });
}

/** Soft tick for taps that are not yet reps, e.g. selecting an exercise. */
export function playTick(): void {
  play({ freq: 880, duration: 0.045, type: 'sine', gain: 0.06 });
}
