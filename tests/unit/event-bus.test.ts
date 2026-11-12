import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEventBus } from '../../src/core/events';

describe('event bus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delivers the payload to a listener of that event', () => {
    const bus = createEventBus();
    const listener = vi.fn();
    bus.on('score/changed', listener);

    bus.emit('score/changed', { coins: 120, delta: 20 });

    expect(listener).toHaveBeenCalledExactlyOnceWith({ coins: 120, delta: 20 });
  });

  it('does not deliver other events', () => {
    const bus = createEventBus();
    const listener = vi.fn();
    bus.on('score/changed', listener);

    bus.emit('timer/tick', { remainingSec: 10 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('emitting with no listeners does nothing', () => {
    const bus = createEventBus();
    expect(() => bus.emit('game/paused', { paused: true })).not.toThrow();
  });

  it('calls listeners in subscription order', () => {
    const bus = createEventBus();
    const calls: string[] = [];
    bus.on('game/paused', () => calls.push('first'));
    bus.on('game/paused', () => calls.push('second'));
    bus.on('game/paused', () => calls.push('third'));

    bus.emit('game/paused', { paused: true });

    expect(calls).toEqual(['first', 'second', 'third']);
  });

  it('stops delivering after unsubscribe', () => {
    const bus = createEventBus();
    const listener = vi.fn();
    const off = bus.on('timer/tick', listener);

    bus.emit('timer/tick', { remainingSec: 3 });
    off();
    bus.emit('timer/tick', { remainingSec: 2 });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribing twice is harmless and leaves other listeners alone', () => {
    const bus = createEventBus();
    const kept = vi.fn();
    const off = bus.on('timer/tick', vi.fn());
    bus.on('timer/tick', kept);

    off();
    off();
    bus.emit('timer/tick', { remainingSec: 1 });

    expect(kept).toHaveBeenCalledTimes(1);
  });

  it('the same function subscribed twice is called twice and unsubscribes one at a time', () => {
    const bus = createEventBus();
    const listener = vi.fn();
    const off = bus.on('timer/tick', listener);
    bus.on('timer/tick', listener);

    bus.emit('timer/tick', { remainingSec: 5 });
    expect(listener).toHaveBeenCalledTimes(2);

    off();
    bus.emit('timer/tick', { remainingSec: 4 });
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('a listener that unsubscribes during an emit does not skip the next listener', () => {
    const bus = createEventBus();
    const second = vi.fn();
    const off = bus.on('game/paused', () => off());
    bus.on('game/paused', second);

    bus.emit('game/paused', { paused: true });

    expect(second).toHaveBeenCalledTimes(1);
  });

  it('a listener added during an emit is first called on the next emit', () => {
    const bus = createEventBus();
    const late = vi.fn();
    bus.on('game/paused', () => bus.on('game/paused', late));

    bus.emit('game/paused', { paused: true });
    expect(late).not.toHaveBeenCalled();

    bus.emit('game/paused', { paused: false });
    expect(late).toHaveBeenCalledTimes(1);
  });

  it('a throwing listener is reported and does not stop the others', () => {
    const bus = createEventBus();
    const error = new Error('boom');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const second = vi.fn();
    bus.on('game/paused', () => {
      throw error;
    });
    bus.on('game/paused', second);

    expect(() => bus.emit('game/paused', { paused: true })).not.toThrow();

    expect(second).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('game/paused'), error);
  });

  it('supports emitting from inside a listener', () => {
    const bus = createEventBus();
    const calls: string[] = [];
    bus.on('object/broken', ({ coins }) => {
      calls.push('broken');
      bus.emit('score/changed', { coins, delta: coins });
    });
    bus.on('score/changed', () => calls.push('score'));

    bus.emit('object/broken', {
      objectId: 'cup',
      defId: 'cup',
      coins: 10,
      isTreasure: false,
      position: { x: 0, y: 0, z: 0 },
    });

    expect(calls).toEqual(['broken', 'score']);
  });

  it('separate buses do not share listeners', () => {
    const first = createEventBus();
    const second = createEventBus();
    const listener = vi.fn();
    first.on('game/paused', listener);

    second.emit('game/paused', { paused: true });

    expect(listener).not.toHaveBeenCalled();
  });
});
