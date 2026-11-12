// Sound synthesis: every sound in the game is generated here, so there are no audio files to
// license. Free of the Web Audio API (plain sample arrays) so it can be unit tested.
import type { Material } from '../core/types';

export type Random = () => number;

/** Small seeded generator (mulberry32), so each variation of a cue is reproducible. */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function add(out: Float32Array, index: number, value: number): void {
  out[index] = (out[index] ?? 0) + value;
}

/** A decaying sine. `decay` is the time in seconds to fall to about a third. */
export function addTone(
  out: Float32Array,
  rate: number,
  start: number,
  frequency: number,
  amplitude: number,
  decay: number,
  glide = 0, // frequency change in Hz per second
): void {
  const first = Math.floor(start * rate);
  const length = Math.min(out.length - first, Math.ceil(decay * 5 * rate));
  let phase = 0;
  for (let index = 0; index < length; index++) {
    const t = index / rate;
    phase += (2 * Math.PI * Math.max(20, frequency + glide * t)) / rate;
    // A 2 ms fade-in avoids a click at the start.
    const attack = Math.min(1, t / 0.002);
    add(out, first + index, Math.sin(phase) * amplitude * attack * Math.exp(-t / decay));
  }
}

/** Decaying noise through a one-pole low-pass at `cutoff` Hz (`bright` keeps the highs instead). */
export function addNoise(
  out: Float32Array,
  rate: number,
  start: number,
  amplitude: number,
  decay: number,
  cutoff: number,
  random: Random,
  bright = false,
): void {
  const first = Math.floor(start * rate);
  const length = Math.min(out.length - first, Math.ceil(decay * 5 * rate));
  const mix = 1 - Math.exp((-2 * Math.PI * cutoff) / rate);
  let low = 0;
  for (let index = 0; index < length; index++) {
    const t = index / rate;
    const white = random() * 2 - 1;
    low += (white - low) * mix;
    const sample = bright ? white - low : low;
    add(out, first + index, sample * amplitude * Math.min(1, t / 0.001) * Math.exp(-t / decay));
  }
}

/** Scales the buffer so its loudest sample is `peak`. */
export function normalize(out: Float32Array, peak = 0.9): Float32Array {
  let max = 0;
  for (const sample of out) max = Math.max(max, Math.abs(sample));
  if (max > 0) {
    const gain = peak / max;
    for (let index = 0; index < out.length; index++) out[index] = (out[index] ?? 0) * gain;
  }
  return out;
}

/** How a material sounds: its ringing partials, how long they ring, and its noise. */
export interface MaterialVoice {
  partials: readonly number[]; // Hz
  ring: number; // decay of the partials, seconds
  body: number; // Hz of the low thump
  noise: number; // 0..1 share of noise
  cutoff: number; // Hz
  bright: boolean; // noise keeps the highs (crisp) or the lows (dull)
}

export const VOICES: Record<Material, MaterialVoice> = {
  ceramic: {
    partials: [1850, 2900, 4300],
    ring: 0.07,
    body: 320,
    noise: 0.25,
    cutoff: 3000,
    bright: true,
  },
  glass: {
    partials: [2600, 4100, 6200, 7900],
    ring: 0.16,
    body: 500,
    noise: 0.2,
    cutoff: 5000,
    bright: true,
  },
  wood: { partials: [210, 430], ring: 0.05, body: 150, noise: 0.5, cutoff: 1200, bright: false },
  plastic: {
    partials: [620, 980],
    ring: 0.035,
    body: 280,
    noise: 0.35,
    cutoff: 2500,
    bright: false,
  },
  paper: { partials: [], ring: 0.02, body: 0, noise: 1, cutoff: 2200, bright: true },
  metal: {
    partials: [880, 1340, 2150, 3400],
    ring: 0.28,
    body: 240,
    noise: 0.15,
    cutoff: 4000,
    bright: true,
  },
  fabric: { partials: [], ring: 0.02, body: 90, noise: 0.9, cutoff: 500, bright: false },
  electronic: {
    partials: [140, 560],
    ring: 0.05,
    body: 110,
    noise: 0.5,
    cutoff: 1800,
    bright: false,
  },
};

function strike(
  out: Float32Array,
  rate: number,
  start: number,
  voice: MaterialVoice,
  amplitude: number,
  random: Random,
): void {
  const detune = 0.94 + random() * 0.12;
  voice.partials.forEach((frequency, index) => {
    addTone(out, rate, start, frequency * detune, (amplitude * 0.6) / (index + 1), voice.ring);
  });
  if (voice.body > 0) addTone(out, rate, start, voice.body * detune, amplitude * 0.5, 0.03, -400);
  addNoise(
    out,
    rate,
    start,
    amplitude * voice.noise,
    0.02 + voice.ring * 0.3,
    voice.cutoff,
    random,
    voice.bright,
  );
}

/** A swat landing on the object: one light strike. */
export function renderHit(voice: MaterialVoice, rate: number, random: Random): Float32Array {
  const out = new Float32Array(Math.ceil(rate * (0.12 + voice.ring * 2)));
  strike(out, rate, 0, voice, 0.7, random);
  return normalize(out, 0.7);
}

/** The object landing without breaking: a strike with more thump. */
export function renderImpact(voice: MaterialVoice, rate: number, random: Random): Float32Array {
  const out = new Float32Array(Math.ceil(rate * (0.18 + voice.ring * 2)));
  strike(out, rate, 0, voice, 0.8, random);
  addTone(out, rate, 0, 90 + random() * 30, 0.6, 0.05, -200);
  return normalize(out, 0.8);
}

/** The object breaking: a hard strike, a burst, then pieces scattering. */
export function renderBreak(voice: MaterialVoice, rate: number, random: Random): Float32Array {
  const out = new Float32Array(Math.ceil(rate * (0.5 + voice.ring * 2)));
  strike(out, rate, 0, voice, 1, random);
  addNoise(out, rate, 0, 0.7, 0.06, voice.cutoff * 1.5, random, voice.bright);
  const pieces = 5 + Math.floor(random() * 4);
  for (let piece = 0; piece < pieces; piece++) {
    strike(out, rate, 0.03 + random() * 0.3, voice, 0.2 + random() * 0.35, random);
  }
  return normalize(out);
}

/** Liquid: a wet burst and a few drips. */
export function renderSplash(rate: number, random: Random): Float32Array {
  const out = new Float32Array(Math.ceil(rate * 0.6));
  addNoise(out, rate, 0, 1, 0.09, 1400, random);
  addNoise(out, rate, 0.02, 0.5, 0.12, 4000, random, true);
  for (let drip = 0; drip < 5; drip++) {
    addTone(out, rate, 0.08 + random() * 0.35, 700 + random() * 900, 0.3, 0.025, 2500);
  }
  return normalize(out, 0.8);
}

/** Electronics: a crackle of short bright bursts over a falling buzz. */
export function renderSpark(rate: number, random: Random): Float32Array {
  const out = new Float32Array(Math.ceil(rate * 0.45));
  for (let crackle = 0; crackle < 9; crackle++) {
    addNoise(out, rate, random() * 0.3, 0.5 + random() * 0.5, 0.008, 5000, random, true);
  }
  addTone(out, rate, 0, 180, 0.4, 0.12, -300);
  addTone(out, rate, 0, 363, 0.25, 0.1, -500);
  return normalize(out, 0.8);
}

/** A short sequence of soft sine notes, for interface and reward sounds. */
export function renderChime(
  rate: number,
  notes: readonly { at: number; frequency: number; decay?: number; glide?: number }[],
): Float32Array {
  const end = Math.max(...notes.map((note) => note.at + (note.decay ?? 0.12) * 5));
  const out = new Float32Array(Math.ceil(rate * end));
  for (const { at, frequency, decay = 0.12, glide = 0 } of notes) {
    addTone(out, rate, at, frequency, 0.6, decay, glide);
    addTone(out, rate, at, frequency * 2, 0.15, decay * 0.6, glide * 2);
  }
  return normalize(out, 0.7);
}

/** Low thumps: footsteps, the door, the cat landing. */
export function renderThumps(
  rate: number,
  random: Random,
  times: readonly number[],
  frequency: number,
): Float32Array {
  const out = new Float32Array(Math.ceil(rate * (Math.max(...times) + 0.4)));
  for (const at of times) {
    addTone(out, rate, at, frequency, 0.9, 0.06, -frequency * 3);
    addNoise(out, rate, at, 0.35, 0.03, 600, random);
  }
  return normalize(out, 0.8);
}

/** Airy noise that rises or falls: jump, swat, zoomies. */
export function renderWhoosh(
  rate: number,
  random: Random,
  seconds: number,
  cutoff: number,
): Float32Array {
  const out = new Float32Array(Math.ceil(rate * seconds));
  addNoise(out, rate, 0, 1, seconds / 3, cutoff, random, true);
  // Shape: swell in, then out.
  for (let index = 0; index < out.length; index++) {
    out[index] = (out[index] ?? 0) * Math.sin((index / out.length) * Math.PI);
  }
  return normalize(out, 0.5);
}
