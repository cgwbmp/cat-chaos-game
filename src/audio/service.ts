// Audio service on the Web Audio API: a synthesized sound bank, per-room generated music with
// crossfade, ducking on the results screen and while paused, and volume settings. Nothing plays
// until `unlock()` is called from the first tap.
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AudioService, ServiceFactory } from '../core/services';
import type { Vec3 } from '../core/types';
import { findCue, pitchFor, renderCue } from './bank';
import { createMusicPlayer, type MusicPlayer } from './music';

const MENU_TRACK = 'menu';
const MUSIC_LEVEL = 0.22; // music bus gain at full volume; sfx peak at most 6 dB above it
const SFX_LEVEL = 0.44;
const DUCKED = 0.35;
const CROSSFADE_SEC = 1.5;
const MAX_VOICES = 24;
const SAME_CUE_GAP_SEC = 0.03; // a burst of identical cues plays once
const PAN_RANGE = 4; // m to the side of the camera for a full pan

export const createAudioService: ServiceFactory<AudioService> = (services) => {
  const { bus } = services;
  let context: AudioContext | undefined;
  let sfxBus: GainNode | undefined;
  let musicBus: GainNode | undefined;
  let duck: GainNode | undefined;
  let music: MusicPlayer | undefined;
  let wantedTrack = MENU_TRACK;
  let voices = 0;
  const buffers = new Map<string, AudioBuffer>();
  const lastPlayed = new Map<string, number>();

  function applyVolumes(): void {
    const { settings } = services.save.get();
    sfxBus?.gain.setTargetAtTime(settings.sfx * SFX_LEVEL, context?.currentTime ?? 0, 0.02);
    musicBus?.gain.setTargetAtTime(settings.music * MUSIC_LEVEL, context?.currentTime ?? 0, 0.02);
  }

  function setDucked(ducked: boolean): void {
    duck?.gain.setTargetAtTime(ducked ? DUCKED : 1, context?.currentTime ?? 0, 0.15);
  }

  function bufferFor(name: string, variation: number): AudioBuffer | undefined {
    if (!context) return undefined;
    const key = `${name}#${variation}`;
    let buffer = buffers.get(key);
    if (!buffer) {
      const cue = findCue(name);
      if (!cue) return undefined;
      const samples = renderCue(name, cue, variation, context.sampleRate);
      buffer = context.createBuffer(1, samples.length, context.sampleRate);
      buffer.getChannelData(0).set(samples);
      buffers.set(key, buffer);
    }
    return buffer;
  }

  /** -1 (left) to 1 (right) for a world position, relative to the camera. */
  function panFor(position: Vec3): number {
    const camera = services.scene.scene.activeCamera;
    if (!camera) return 0;
    const right = camera.getDirection(Vector3.Right());
    const side =
      (position.x - camera.position.x) * right.x + (position.z - camera.position.z) * right.z;
    return Math.min(1, Math.max(-1, side / PAN_RANGE));
  }

  function play(name: string, options: { position?: Vec3; volume?: number } = {}): void {
    if (!context || !sfxBus || context.state !== 'running') return;
    const cue = findCue(name);
    if (!cue || voices >= MAX_VOICES) return;
    const now = context.currentTime;
    if (now - (lastPlayed.get(name) ?? -1) < SAME_CUE_GAP_SEC) return;
    lastPlayed.set(name, now);

    const buffer = bufferFor(name, Math.floor(Math.random() * cue.variations));
    if (!buffer) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = pitchFor(cue, Math.random());
    const gain = context.createGain();
    gain.gain.value = cue.volume * Math.min(1, Math.max(0, options.volume ?? 1));
    let tail: AudioNode = source.connect(gain);
    if (options.position) {
      const panner = context.createStereoPanner();
      panner.pan.value = panFor(options.position);
      tail = tail.connect(panner);
    }
    tail.connect(sfxBus);
    voices++;
    source.onended = () => {
      voices--;
      gain.disconnect();
    };
    source.start();
  }

  function playMusic(track: string, fadeSec = CROSSFADE_SEC): void {
    wantedTrack = track;
    music?.play(track, fadeSec);
  }

  bus.on('audio/play', ({ cue, position, volume }) => play(cue, { position, volume }));
  bus.on('settings/changed', applyVolumes);
  bus.on('cat/action', ({ action, position }) => play(`cat_${action}`, { position }));
  bus.on('score/changed', ({ delta }) => {
    if (delta > 0) play('coin');
  });
  bus.on('combo/changed', ({ chain }) => {
    if (chain > 0) play('combo', { volume: Math.min(1, 0.5 + chain * 0.1) });
  });
  bus.on('level/loaded', ({ roomId }) => {
    setDucked(false);
    playMusic(services.rooms.get(roomId)?.music ?? '');
  });
  bus.on('level/started', () => setDucked(false));
  bus.on('level/ended', ({ result }) => {
    setDucked(true);
    play(result.mode === 'mission' && result.stars === 0 ? 'lose' : 'win');
  });
  bus.on('level/quit', () => {
    setDucked(false);
    playMusic(MENU_TRACK);
  });
  bus.on('game/paused', ({ paused }) => setDucked(paused));

  // Mobile browsers keep playing in a hidden tab unless the context is suspended.
  document.addEventListener('visibilitychange', () => {
    if (!context) return;
    void (document.hidden ? context.suspend() : context.resume());
  });

  return {
    async unlock() {
      if (!context) {
        const Context =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Context) return; // no Web Audio: the game stays silent
        context = new Context();
        // A limiter keeps a pile of simultaneous breaks from clipping.
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -10;
        limiter.ratio.value = 12;
        limiter.connect(context.destination);
        sfxBus = context.createGain();
        sfxBus.connect(limiter);
        musicBus = context.createGain();
        musicBus.connect(limiter);
        duck = context.createGain();
        duck.connect(musicBus);
        music = createMusicPlayer(context, duck);
        applyVolumes();
      }
      if (context.state !== 'running') await context.resume();
      music?.play(wantedTrack, CROSSFADE_SEC);
    },
    play,
    playMusic(track, options) {
      playMusic(track, options?.fadeSec);
    },
    stopMusic(fadeSec = CROSSFADE_SEC) {
      wantedTrack = '';
      music?.stop(fadeSec);
    },
    setVolume(target, volume) {
      services.save.update((data) => {
        data.settings[target] = Math.min(1, Math.max(0, volume));
      });
    },
  };
};
