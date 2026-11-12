// Sound bank: cue name -> how to render it. Material cues (`hit_<material>`, `impact_<material>`,
// `break_<material>`) have 3 variations each; a variation is picked at random on every play and
// its pitch is varied by up to 8% either way.
import type { Material } from '../core/types';
import {
  VOICES,
  renderBreak,
  renderChime,
  renderHit,
  renderImpact,
  renderSpark,
  renderSplash,
  renderThumps,
  renderWhoosh,
  seededRandom,
  type Random,
} from './synth';

export const VARIATIONS = 3;
export const PITCH_SPREAD = 0.08;

type Render = (rate: number, random: Random) => Float32Array;

export interface CueDef {
  render: Render;
  variations: number;
  /** Relative loudness 0..1 before the sfx volume setting. */
  volume: number;
  /** Interface sounds keep their exact pitch. */
  fixedPitch?: boolean;
}

const C5 = 523.25;
const note = (semitones: number) => C5 * 2 ** (semitones / 12);

const FIXED_CUES: Record<string, CueDef> = {
  splash: { render: renderSplash, variations: VARIATIONS, volume: 0.8 },
  spark: { render: renderSpark, variations: VARIATIONS, volume: 0.8 },
  owner_door: {
    render: (rate, random) => renderThumps(rate, random, [0, 0.18], 70),
    variations: 1,
    volume: 1,
    fixedPitch: true,
  },
  owner_footsteps: {
    render: (rate, random) => renderThumps(rate, random, [0, 0.45, 0.9, 1.35], 95),
    variations: 1,
    volume: 0.9,
    fixedPitch: true,
  },
  cat_jump: {
    render: (rate, random) => renderWhoosh(rate, random, 0.18, 1800),
    variations: 2,
    volume: 0.35,
  },
  cat_swat: {
    render: (rate, random) => renderWhoosh(rate, random, 0.12, 3000),
    variations: 2,
    volume: 0.45,
  },
  cat_zoomies: {
    render: (rate, random) => renderWhoosh(rate, random, 0.45, 1200),
    variations: 1,
    volume: 0.5,
  },
  cat_land: {
    render: (rate, random) => renderThumps(rate, random, [0], 130),
    variations: 2,
    volume: 0.35,
  },
  cat_pounce: {
    render: (rate, random) => renderThumps(rate, random, [0], 85),
    variations: 2,
    volume: 0.8,
  },
  coin: {
    render: (rate) =>
      renderChime(rate, [
        { at: 0, frequency: note(12), decay: 0.05 },
        { at: 0.06, frequency: note(19), decay: 0.09 },
      ]),
    variations: 1,
    volume: 0.4,
  },
  combo: {
    render: (rate) => renderChime(rate, [{ at: 0, frequency: note(7), decay: 0.06, glide: 1800 }]),
    variations: 1,
    volume: 0.45,
  },
  star: {
    render: (rate) =>
      renderChime(rate, [
        { at: 0, frequency: note(12) },
        { at: 0.09, frequency: note(16) },
        { at: 0.18, frequency: note(19), decay: 0.25 },
      ]),
    variations: 1,
    volume: 0.6,
    fixedPitch: true,
  },
  win: {
    render: (rate) =>
      renderChime(
        rate,
        [0, 4, 7, 12, 16].map((semitones, index) => ({
          at: index * 0.11,
          frequency: note(semitones),
          decay: index === 4 ? 0.4 : 0.14,
        })),
      ),
    variations: 1,
    volume: 0.6,
    fixedPitch: true,
  },
  lose: {
    render: (rate) =>
      renderChime(rate, [
        { at: 0, frequency: note(3), decay: 0.2 },
        { at: 0.2, frequency: note(-2), decay: 0.35 },
      ]),
    variations: 1,
    volume: 0.5,
    fixedPitch: true,
  },
  ui_click: {
    render: (rate) => renderChime(rate, [{ at: 0, frequency: note(9), decay: 0.03 }]),
    variations: 1,
    volume: 0.35,
    fixedPitch: true,
  },
  ui_back: {
    render: (rate) => renderChime(rate, [{ at: 0, frequency: note(2), decay: 0.04 }]),
    variations: 1,
    volume: 0.35,
    fixedPitch: true,
  },
};

const MATERIAL_CUES = {
  hit: { render: renderHit, volume: 0.6 },
  impact: { render: renderImpact, volume: 0.7 },
  break: { render: renderBreak, volume: 1 },
} as const;

/** Looks up a cue. Unknown names return undefined (the caller plays nothing). */
export function findCue(name: string): CueDef | undefined {
  const fixed = FIXED_CUES[name];
  if (fixed) return fixed;
  const split = name.indexOf('_');
  const kind = name.slice(0, split);
  const material = name.slice(split + 1);
  if (!(kind in MATERIAL_CUES) || !(material in VOICES)) return undefined;
  const { render, volume } = MATERIAL_CUES[kind as keyof typeof MATERIAL_CUES];
  const voice = VOICES[material as Material];
  return {
    render: (rate, random) => render(voice, rate, random),
    variations: VARIATIONS,
    volume,
  };
}

/** Samples for one variation of a cue; the same cue and variation always sound the same. */
export function renderCue(
  name: string,
  cue: CueDef,
  variation: number,
  rate: number,
): Float32Array {
  let seed = variation + 1;
  for (let index = 0; index < name.length; index++) {
    seed = (Math.imul(seed, 31) + name.charCodeAt(index)) >>> 0;
  }
  return cue.render(rate, seededRandom(seed));
}

/** Playback rate for one play: within 8% of the original pitch. `roll` is a random 0..1. */
export function pitchFor(cue: CueDef, roll: number): number {
  return cue.fixedPitch ? 1 : 1 - PITCH_SPREAD + roll * PITCH_SPREAD * 2;
}
