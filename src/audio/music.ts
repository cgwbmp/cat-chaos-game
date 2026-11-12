// Generated music: each track id (a room's `music` field) seeds a gentle looping tune of plucks
// over a bass line, so every room has its own music without audio files. Tracks crossfade.
import { seededRandom } from './synth';

// Major pentatonic scale degrees in semitones.
const SCALE = [0, 2, 4, 7, 9];
// Chord roots per bar as scale steps; each track picks one progression.
const PROGRESSIONS = [
  [0, 3, 4, 3],
  [0, 4, 2, 3],
  [0, 2, 3, 4],
  [3, 0, 4, 0],
];
const STEPS_PER_BAR = 8;
const BARS = 8;
const LOOK_AHEAD_SEC = 0.35;
const TICK_MS = 120;

export interface TrackParams {
  /** Seconds per eighth note. */
  stepSec: number;
  /** Frequency of the scale's root, Hz. */
  rootHz: number;
  /** Chord root (scale step) for each bar. */
  bars: number[];
  /** Melody: a scale step per eighth note, or -1 for a rest. BARS x STEPS_PER_BAR entries. */
  melody: number[];
}

/** Derives a track from its id. The same id always gives the same music. */
export function trackParams(track: string): TrackParams {
  let seed = 7;
  for (let index = 0; index < track.length; index++) {
    seed = (Math.imul(seed, 31) + track.charCodeAt(index)) >>> 0;
  }
  const random = seededRandom(seed);
  const tempo = 84 + Math.floor(random() * 28); // beats per minute
  const rootHz = 196 * 2 ** (Math.floor(random() * 7) / 12); // G3 up to C#4
  const progression = PROGRESSIONS[Math.floor(random() * PROGRESSIONS.length)] ?? [0];
  const bars = Array.from({ length: BARS }, (_, bar) => progression[bar % progression.length] ?? 0);

  const melody: number[] = [];
  let step = 2;
  for (let index = 0; index < BARS * STEPS_PER_BAR; index++) {
    const onBeat = index % 2 === 0;
    if (random() < (onBeat ? 0.25 : 0.55)) {
      melody.push(-1);
      continue;
    }
    // Wander by small steps and stay within two octaves.
    step = Math.min(9, Math.max(0, step + Math.floor(random() * 5) - 2));
    melody.push(step);
  }
  return { stepSec: 60 / tempo / 2, rootHz, bars, melody };
}

function stepToHz(rootHz: number, step: number): number {
  const octave = Math.floor(step / SCALE.length);
  const degree = SCALE[((step % SCALE.length) + SCALE.length) % SCALE.length] ?? 0;
  return rootHz * 2 ** (octave + degree / 12);
}

export interface MusicPlayer {
  /** Crossfades to a track; an empty id fades to silence. */
  play(track: string, fadeSec: number): void;
  stop(fadeSec: number): void;
}

export function createMusicPlayer(context: AudioContext, output: AudioNode): MusicPlayer {
  let current: { track: string; gain: GainNode; timer: number } | undefined;

  function pluck(to: AudioNode, at: number, frequency: number, level: number, decay: number): void {
    const oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(level, at + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.001, at + decay);
    oscillator.connect(envelope).connect(to);
    oscillator.start(at);
    oscillator.stop(at + decay + 0.05);
  }

  function fadeOut(playing: NonNullable<typeof current>, fadeSec: number): void {
    window.clearInterval(playing.timer);
    const now = context.currentTime;
    playing.gain.gain.cancelScheduledValues(now);
    playing.gain.gain.setValueAtTime(playing.gain.gain.value, now);
    playing.gain.gain.linearRampToValueAtTime(0, now + fadeSec);
    window.setTimeout(() => playing.gain.disconnect(), (fadeSec + 1.5) * 1000);
  }

  return {
    play(track, fadeSec) {
      if (current?.track === track) return;
      if (current) fadeOut(current, fadeSec);
      current = undefined;
      if (track === '') return;

      const params = trackParams(track);
      const gain = context.createGain();
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(1, context.currentTime + fadeSec);
      gain.connect(output);

      let index = 0;
      let nextAt = context.currentTime + 0.1;
      const schedule = () => {
        // A hidden tab pauses timers; restart from now instead of rushing to catch up.
        if (nextAt < context.currentTime) nextAt = context.currentTime + 0.05;
        while (nextAt < context.currentTime + LOOK_AHEAD_SEC) {
          const position = index % params.melody.length;
          const bar = Math.floor(position / STEPS_PER_BAR);
          const chord = params.bars[bar] ?? 0;
          const step = params.melody[position] ?? -1;
          if (step >= 0) pluck(gain, nextAt, stepToHz(params.rootHz, chord + step) * 2, 0.16, 0.5);
          if (position % STEPS_PER_BAR === 0) {
            pluck(gain, nextAt, stepToHz(params.rootHz, chord) / 2, 0.3, params.stepSec * 7);
          } else if (position % STEPS_PER_BAR === 4) {
            pluck(gain, nextAt, stepToHz(params.rootHz, chord + 2) / 2, 0.2, params.stepSec * 3);
          }
          nextAt += params.stepSec;
          index++;
        }
      };
      schedule();
      current = { track, gain, timer: window.setInterval(schedule, TICK_MS) };
    },

    stop(fadeSec) {
      if (current) fadeOut(current, fadeSec);
      current = undefined;
    },
  };
}
