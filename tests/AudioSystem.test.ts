import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioSystem, AudioChannel } from '../src/audio/AudioSystem';

// ─── Fake Web Audio API ────────────────────────────────────────────────────────

interface FakeGainNode {
  gain: { value: number };
  connect: ReturnType<typeof vi.fn>;
}

interface FakeAudioContext {
  state: 'running' | 'suspended' | 'closed';
  destination: object;
  createGain: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
}

function makeFakeGain(): FakeGainNode {
  return { gain: { value: 1 }, connect: vi.fn() };
}

function makeFakeContext(state: 'running' | 'suspended' = 'running'): FakeAudioContext {
  const ctx: FakeAudioContext = {
    state,
    destination: {},
    createGain: vi.fn(() => makeFakeGain()),
    resume: vi.fn(() => Promise.resolve()),
  };
  return ctx;
}

function makeSystem(state: 'running' | 'suspended' = 'running'): {
  system: AudioSystem;
  ctx: FakeAudioContext;
} {
  const ctx = makeFakeContext(state);
  const system = new AudioSystem(() => ctx as unknown as AudioContext);
  return { system, ctx };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AudioSystem', () => {
  describe('before resume()', () => {
    it('isReady is false before resume()', () => {
      const { system } = makeSystem();
      expect(system.isReady).toBe(false);
    });

    it('context throws before resume()', () => {
      const { system } = makeSystem();
      expect(() => system.context).toThrow();
    });

    it('masterGainNode throws before resume()', () => {
      const { system } = makeSystem();
      expect(() => system.masterGainNode).toThrow();
    });

    it('getChannelInput throws before resume()', () => {
      const { system } = makeSystem();
      expect(() => system.getChannelInput(AudioChannel.ENGINE)).toThrow();
    });
  });

  describe('after resume() with running context', () => {
    let system: AudioSystem;
    let ctx: FakeAudioContext;

    beforeEach(() => {
      ({ system, ctx } = makeSystem('running'));
      system.resume();
    });

    it('isReady is true when context is running', () => {
      expect(system.isReady).toBe(true);
    });

    it('context returns the AudioContext', () => {
      expect(system.context).toBe(ctx);
    });

    it('creates a master gain node', () => {
      expect(system.masterGainNode).toBeDefined();
    });

    it('master gain is connected to destination', () => {
      const masterGain = system.masterGainNode as unknown as FakeGainNode;
      expect(masterGain.connect).toHaveBeenCalledWith(ctx.destination);
    });

    it('master gain value is > 0 and <= 1', () => {
      const masterGain = system.masterGainNode as unknown as FakeGainNode;
      expect(masterGain.gain.value).toBeGreaterThan(0);
      expect(masterGain.gain.value).toBeLessThanOrEqual(1);
    });

    it('creates gain nodes for ENGINE, SFX, and MUSIC channels', () => {
      // createGain called once for master + 3 channels = 4 total
      expect(ctx.createGain).toHaveBeenCalledTimes(4);
    });

    it('each channel gain node is connected to master', () => {
      const masterGain = system.masterGainNode as unknown as FakeGainNode;
      // 3 channel gains + nothing else should connect to master
      expect(masterGain.connect).toHaveBeenCalledTimes(1); // master connects to destination
      // channel gains connect to master — check that connect was called on channel nodes
      const engineGain = system.getChannelInput(AudioChannel.ENGINE) as unknown as FakeGainNode;
      expect(engineGain.connect).toHaveBeenCalledWith(masterGain);
    });

    it('ENGINE channel has a gain > 0', () => {
      const g = system.getChannelInput(AudioChannel.ENGINE) as unknown as FakeGainNode;
      expect(g.gain.value).toBeGreaterThan(0);
    });

    it('SFX channel has a gain > 0', () => {
      const g = system.getChannelInput(AudioChannel.SFX) as unknown as FakeGainNode;
      expect(g.gain.value).toBeGreaterThan(0);
    });

    it('MUSIC channel has a gain > 0', () => {
      const g = system.getChannelInput(AudioChannel.MUSIC) as unknown as FakeGainNode;
      expect(g.gain.value).toBeGreaterThan(0);
    });

    it('channel gains are independent objects', () => {
      const engine = system.getChannelInput(AudioChannel.ENGINE);
      const sfx = system.getChannelInput(AudioChannel.SFX);
      const music = system.getChannelInput(AudioChannel.MUSIC);
      expect(engine).not.toBe(sfx);
      expect(sfx).not.toBe(music);
      expect(engine).not.toBe(music);
    });
  });

  describe('resume() idempotency', () => {
    it('calling resume() twice does not create a second AudioContext', () => {
      let callCount = 0;
      const ctx = makeFakeContext('running');
      const system = new AudioSystem(() => {
        callCount++;
        return ctx as unknown as AudioContext;
      });

      system.resume();
      system.resume();

      expect(callCount).toBe(1);
    });

    it('calling resume() on suspended context calls ctx.resume()', () => {
      const { system, ctx } = makeSystem('suspended');
      system.resume(); // creates context (suspended)
      system.resume(); // should call ctx.resume()
      expect(ctx.resume).toHaveBeenCalled();
    });
  });

  describe('setMasterVolume', () => {
    it('adjusts master gain value', () => {
      const { system } = makeSystem();
      system.resume();
      system.setMasterVolume(0.5);
      const masterGain = system.masterGainNode as unknown as FakeGainNode;
      expect(masterGain.gain.value).toBeGreaterThan(0);
      expect(masterGain.gain.value).toBeLessThanOrEqual(0.5);
    });

    it('clamps to 0 when given negative value', () => {
      const { system } = makeSystem();
      system.resume();
      system.setMasterVolume(-1);
      const masterGain = system.masterGainNode as unknown as FakeGainNode;
      expect(masterGain.gain.value).toBe(0);
    });

    it('is a no-op before resume()', () => {
      const { system } = makeSystem();
      expect(() => system.setMasterVolume(0.5)).not.toThrow();
    });
  });

  describe('setChannelVolume', () => {
    it('adjusts channel gain', () => {
      const { system } = makeSystem();
      system.resume();
      const before = (system.getChannelInput(AudioChannel.ENGINE) as unknown as FakeGainNode).gain
        .value;
      system.setChannelVolume(AudioChannel.ENGINE, 0.1);
      const after = (system.getChannelInput(AudioChannel.ENGINE) as unknown as FakeGainNode).gain
        .value;
      expect(after).toBeLessThan(before);
      expect(after).toBeGreaterThan(0);
    });

    it('clamps to 0 for negative values', () => {
      const { system } = makeSystem();
      system.resume();
      system.setChannelVolume(AudioChannel.ENGINE, -5);
      const g = system.getChannelInput(AudioChannel.ENGINE) as unknown as FakeGainNode;
      expect(g.gain.value).toBe(0);
    });

    it('is a no-op before resume()', () => {
      const { system } = makeSystem();
      expect(() => system.setChannelVolume(AudioChannel.ENGINE, 0.5)).not.toThrow();
    });
  });

  describe('anti-clipping design', () => {
    it('master gain value is at most 1.0', () => {
      const { system } = makeSystem();
      system.resume();
      const masterGain = system.masterGainNode as unknown as FakeGainNode;
      expect(masterGain.gain.value).toBeLessThanOrEqual(1.0);
    });

    it('all channel gains are at most 1.0', () => {
      const { system } = makeSystem();
      system.resume();
      for (const ch of [AudioChannel.ENGINE, AudioChannel.SFX, AudioChannel.MUSIC]) {
        const g = system.getChannelInput(ch) as unknown as FakeGainNode;
        expect(g.gain.value).toBeLessThanOrEqual(1.0);
      }
    });
  });
});

describe('AudioSystem.isCreated', () => {
  it('stays true while the context is suspended (e.g. paused), unlike isReady', () => {
    const { system } = makeSystem('suspended');
    expect(system.isCreated).toBe(false);
    system.resume();
    expect(system.isCreated).toBe(true);
    expect(system.isReady).toBe(false);
  });
});
