import { describe, expect, it } from 'vitest';
import { findCue, PITCH_SPREAD, pitchFor, renderCue, VARIATIONS } from '../../src/audio/bank';
import { trackParams } from '../../src/audio/music';
import { addNoise, addTone, normalize, seededRandom, VOICES } from '../../src/audio/synth';
import type { Material } from '../../src/core/types';

const RATE = 22050;
const MATERIALS = Object.keys(VOICES) as Material[];

function peak(samples: Float32Array): number {
  return samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
}

describe('synth', () => {
  it('seededRandom repeats for the same seed and differs between seeds', () => {
    const first = seededRandom(7);
    const second = seededRandom(7);
    const other = seededRandom(8);
    const values = [first(), first(), first()];
    expect([second(), second(), second()]).toEqual(values);
    expect([other(), other(), other()]).not.toEqual(values);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('addTone writes a decaying tone from its start time', () => {
    const out = new Float32Array(RATE);
    addTone(out, RATE, 0.5, 440, 1, 0.05);
    expect(peak(out.subarray(0, RATE / 2 - 1))).toBe(0);
    const early = peak(out.subarray(RATE / 2, RATE / 2 + 1000));
    const late = peak(out.subarray(RATE / 2 + 4000, RATE / 2 + 5000));
    expect(early).toBeGreaterThan(0.5);
    expect(late).toBeLessThan(early / 5);
  });

  it('addTone and addNoise stay inside the buffer when started near its end', () => {
    const out = new Float32Array(100);
    expect(() => addTone(out, RATE, 90 / RATE, 440, 1, 1)).not.toThrow();
    expect(() => addNoise(out, RATE, 95 / RATE, 1, 1, 2000, seededRandom(1))).not.toThrow();
    expect(out).toHaveLength(100);
  });

  it('normalize scales to the requested peak and leaves silence alone', () => {
    const out = normalize(new Float32Array([0.1, -0.4, 0.2]), 0.8);
    expect(peak(out)).toBeCloseTo(0.8);
    expect(out[1]).toBeCloseTo(-0.8);
    expect(normalize(new Float32Array(4))).toEqual(new Float32Array(4));
  });
});

describe('sound bank', () => {
  it('has hit, impact and break cues with 3 variations for every material', () => {
    for (const material of MATERIALS) {
      for (const kind of ['hit', 'impact', 'break']) {
        expect(findCue(`${kind}_${material}`)?.variations, `${kind}_${material}`).toBe(VARIATIONS);
      }
    }
    expect(VARIATIONS).toBeGreaterThanOrEqual(3);
  });

  it('knows every cue the game emits', () => {
    const cues = [
      'splash',
      'spark',
      'owner_door',
      'owner_footsteps',
      'coin',
      'combo',
      'star',
      'win',
      'lose',
      'ui_click',
      'ui_back',
      ...['jump', 'land', 'swat', 'pounce', 'zoomies'].map((action) => `cat_${action}`),
    ];
    for (const cue of cues) expect(findCue(cue), cue).toBeDefined();
  });

  it('returns undefined for unknown cues', () => {
    expect(findCue('break_stone')).toBeUndefined();
    expect(findCue('explode_glass')).toBeUndefined();
    expect(findCue('cat_push')).toBeUndefined();
    expect(findCue('')).toBeUndefined();
  });

  it('renders audible, unclipped, finite samples for every material cue', () => {
    for (const material of MATERIALS) {
      for (const kind of ['hit', 'impact', 'break']) {
        const name = `${kind}_${material}`;
        const cue = findCue(name);
        if (!cue) throw new Error(`missing ${name}`);
        const samples = renderCue(name, cue, 0, RATE);
        expect(samples.length, name).toBeGreaterThan(RATE * 0.05);
        expect(samples.every(Number.isFinite), name).toBe(true);
        expect(peak(samples), name).toBeGreaterThan(0.3);
        expect(peak(samples), name).toBeLessThanOrEqual(1);
      }
    }
  });

  it('a break is longer than a hit', () => {
    const hit = findCue('hit_glass');
    const shatter = findCue('break_glass');
    if (!hit || !shatter) throw new Error('missing cue');
    expect(renderCue('break_glass', shatter, 0, RATE).length).toBeGreaterThan(
      renderCue('hit_glass', hit, 0, RATE).length,
    );
  });

  it('variations differ from each other and each is reproducible', () => {
    const cue = findCue('break_ceramic');
    if (!cue) throw new Error('missing cue');
    const first = renderCue('break_ceramic', cue, 0, RATE);
    expect(renderCue('break_ceramic', cue, 0, RATE)).toEqual(first);
    expect(renderCue('break_ceramic', cue, 1, RATE)).not.toEqual(first);
  });

  it('varies the pitch by at most 8% either way', () => {
    const cue = findCue('hit_wood');
    if (!cue) throw new Error('missing cue');
    expect(pitchFor(cue, 0)).toBeCloseTo(1 - PITCH_SPREAD);
    expect(pitchFor(cue, 0.5)).toBeCloseTo(1);
    expect(pitchFor(cue, 1)).toBeCloseTo(1 + PITCH_SPREAD);
    expect(PITCH_SPREAD).toBe(0.08);
  });

  it('keeps interface sounds at their exact pitch', () => {
    const cue = findCue('ui_click');
    if (!cue) throw new Error('missing cue');
    expect(pitchFor(cue, 0)).toBe(1);
    expect(pitchFor(cue, 1)).toBe(1);
  });
});

describe('generated music', () => {
  it('gives the same track for the same id', () => {
    expect(trackParams('tiny-studio')).toEqual(trackParams('tiny-studio'));
  });

  it('gives different tracks for different ids', () => {
    expect(trackParams('tiny-studio').melody).not.toEqual(trackParams('cozy-cafe').melody);
  });

  it('builds an 8-bar loop of eighth notes at a gentle tempo', () => {
    for (const id of ['menu', 'tiny-studio', 'bathhouse', '']) {
      const { stepSec, rootHz, bars, melody } = trackParams(id);
      expect(bars).toHaveLength(8);
      expect(melody).toHaveLength(64);
      const beatsPerMinute = 60 / (stepSec * 2);
      expect(beatsPerMinute).toBeGreaterThanOrEqual(84);
      expect(beatsPerMinute).toBeLessThan(112);
      expect(rootHz).toBeGreaterThanOrEqual(196);
      expect(rootHz).toBeLessThan(294);
      // Notes are scale steps within two octaves, or -1 for a rest; a track is never silent.
      expect(melody.every((step) => Number.isInteger(step) && step >= -1 && step <= 9)).toBe(true);
      expect(melody.some((step) => step >= 0)).toBe(true);
    }
  });
});
