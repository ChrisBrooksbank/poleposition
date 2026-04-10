import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EngineSound,
  speedToFrequency,
  ENGINE_IDLE_FREQ,
  ENGINE_MAX_FREQ,
} from '../src/audio/EngineSound';
import { AudioSystem } from '../src/audio/AudioSystem';

// ─── Fake Web Audio API ────────────────────────────────────────────────────────

interface FakeAudioParam {
  value: number;
  setTargetAtTime: ReturnType<typeof vi.fn>;
}

interface FakeOscillatorNode {
  type: OscillatorType;
  frequency: FakeAudioParam;
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

interface FakeGainNode {
  gain: { value: number };
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

interface FakeAudioContext {
  state: 'running' | 'suspended' | 'closed';
  destination: object;
  currentTime: number;
  createGain: ReturnType<typeof vi.fn>;
  createOscillator: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
}

function makeFakeOscillator(): FakeOscillatorNode {
  return {
    type: 'sine',
    frequency: { value: 0, setTargetAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
  };
}

function makeFakeGain(): FakeGainNode {
  return { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() };
}

function makeFakeContext(state: 'running' | 'suspended' = 'running'): FakeAudioContext {
  return {
    state,
    destination: {},
    currentTime: 0,
    createGain: vi.fn(() => makeFakeGain()),
    createOscillator: vi.fn(() => makeFakeOscillator()),
    resume: vi.fn(() => Promise.resolve()),
  };
}

/** Build an AudioSystem whose context is already running, plus the raw fake context. */
function makeReadySystem(): { audio: AudioSystem; ctx: FakeAudioContext } {
  const ctx = makeFakeContext('running');
  const audio = new AudioSystem(() => ctx as unknown as AudioContext);
  audio.resume();
  return { audio, ctx };
}

// ─── speedToFrequency ─────────────────────────────────────────────────────────

describe('speedToFrequency', () => {
  it('returns ENGINE_IDLE_FREQ at 0 MPH', () => {
    expect(speedToFrequency(0)).toBe(ENGINE_IDLE_FREQ);
  });

  it('returns ENGINE_MAX_FREQ at 225 MPH', () => {
    expect(speedToFrequency(225)).toBe(ENGINE_MAX_FREQ);
  });

  it('returns a higher frequency at 100 MPH than at 50 MPH', () => {
    expect(speedToFrequency(100)).toBeGreaterThan(speedToFrequency(50));
  });

  it('clamps negative speeds to IDLE_FREQ', () => {
    expect(speedToFrequency(-10)).toBe(ENGINE_IDLE_FREQ);
  });

  it('clamps speeds above 225 to ENGINE_MAX_FREQ', () => {
    expect(speedToFrequency(300)).toBe(ENGINE_MAX_FREQ);
  });

  it('returns a value between IDLE and MAX for a mid-range speed', () => {
    const f = speedToFrequency(112.5);
    expect(f).toBeGreaterThan(ENGINE_IDLE_FREQ);
    expect(f).toBeLessThan(ENGINE_MAX_FREQ);
  });

  it('produces a linear midpoint at 112.5 MPH', () => {
    const midpoint = (ENGINE_IDLE_FREQ + ENGINE_MAX_FREQ) / 2;
    expect(speedToFrequency(112.5)).toBeCloseTo(midpoint);
  });
});

// ─── EngineSound ──────────────────────────────────────────────────────────────

describe('EngineSound', () => {
  describe('initial state', () => {
    it('isStarted is false before start()', () => {
      const { audio } = makeReadySystem();
      const engine = new EngineSound(audio);
      expect(engine.isStarted).toBe(false);
    });
  });

  describe('start()', () => {
    let audio: AudioSystem;
    let ctx: FakeAudioContext;
    let engine: EngineSound;

    beforeEach(() => {
      ({ audio, ctx } = makeReadySystem());
      engine = new EngineSound(audio);
      engine.start();
    });

    it('sets isStarted to true', () => {
      expect(engine.isStarted).toBe(true);
    });

    it('creates an oscillator via the AudioContext', () => {
      expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
    });

    it('sets oscillator type to sawtooth', () => {
      const osc = ctx.createOscillator.mock.results[0]?.value as FakeOscillatorNode;
      expect(osc.type).toBe('sawtooth');
    });

    it('initialises oscillator frequency to ENGINE_IDLE_FREQ', () => {
      const osc = ctx.createOscillator.mock.results[0]?.value as FakeOscillatorNode;
      expect(osc.frequency.value).toBe(ENGINE_IDLE_FREQ);
    });

    it('calls oscillator.start()', () => {
      const osc = ctx.createOscillator.mock.results[0]?.value as FakeOscillatorNode;
      expect(osc.start).toHaveBeenCalled();
    });

    it('connects oscillator through a gain node to the ENGINE channel', () => {
      const osc = ctx.createOscillator.mock.results[0]?.value as FakeOscillatorNode;
      expect(osc.connect).toHaveBeenCalled();
    });

    it('is idempotent — a second call to start() does not create another oscillator', () => {
      engine.start();
      expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
    });

    it('does nothing if AudioSystem is not ready', () => {
      const suspendedCtx = makeFakeContext('suspended');
      const notReadyAudio = new AudioSystem(() => suspendedCtx as unknown as AudioContext);
      // Do NOT call notReadyAudio.resume() — context stays suspended
      const e = new EngineSound(notReadyAudio);
      e.start();
      expect(e.isStarted).toBe(false);
      expect(suspendedCtx.createOscillator).not.toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    it('calls setTargetAtTime on the oscillator frequency', () => {
      const { audio, ctx } = makeReadySystem();
      const engine = new EngineSound(audio);
      engine.start();
      engine.update(100);
      const osc = ctx.createOscillator.mock.results[0]?.value as FakeOscillatorNode;
      expect(osc.frequency.setTargetAtTime).toHaveBeenCalled();
    });

    it('passes the correct target frequency for the given speed', () => {
      const { audio, ctx } = makeReadySystem();
      const engine = new EngineSound(audio);
      engine.start();
      engine.update(100);
      const osc = ctx.createOscillator.mock.results[0]?.value as FakeOscillatorNode;
      const [targetFreq] = osc.frequency.setTargetAtTime.mock.calls[0] as [number, number, number];
      expect(targetFreq).toBeCloseTo(speedToFrequency(100));
    });

    it('targets a higher frequency at 200 MPH than at 50 MPH', () => {
      const { audio, ctx } = makeReadySystem();
      const engine = new EngineSound(audio);
      engine.start();

      engine.update(50);
      const osc = ctx.createOscillator.mock.results[0]?.value as FakeOscillatorNode;
      const [lowFreq] = osc.frequency.setTargetAtTime.mock.calls[0] as [number];

      engine.update(200);
      const [highFreq] = osc.frequency.setTargetAtTime.mock.calls[1] as [number];

      expect(highFreq).toBeGreaterThan(lowFreq);
    });

    it('is a no-op if not yet started', () => {
      const { audio, ctx } = makeReadySystem();
      const engine = new EngineSound(audio);
      expect(() => engine.update(100)).not.toThrow();
      expect(ctx.createOscillator).not.toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('sets isStarted to false', () => {
      const { audio } = makeReadySystem();
      const engine = new EngineSound(audio);
      engine.start();
      engine.stop();
      expect(engine.isStarted).toBe(false);
    });

    it('calls oscillator.stop()', () => {
      const { audio, ctx } = makeReadySystem();
      const engine = new EngineSound(audio);
      engine.start();
      engine.stop();
      const osc = ctx.createOscillator.mock.results[0]?.value as FakeOscillatorNode;
      expect(osc.stop).toHaveBeenCalled();
    });

    it('calls oscillator.disconnect()', () => {
      const { audio, ctx } = makeReadySystem();
      const engine = new EngineSound(audio);
      engine.start();
      engine.stop();
      const osc = ctx.createOscillator.mock.results[0]?.value as FakeOscillatorNode;
      expect(osc.disconnect).toHaveBeenCalled();
    });

    it('is idempotent — calling stop() twice does not throw', () => {
      const { audio } = makeReadySystem();
      const engine = new EngineSound(audio);
      engine.start();
      engine.stop();
      expect(() => engine.stop()).not.toThrow();
    });

    it('is a no-op before start()', () => {
      const { audio } = makeReadySystem();
      const engine = new EngineSound(audio);
      expect(() => engine.stop()).not.toThrow();
    });

    it('after stop(), start() can restart the oscillator', () => {
      const { audio, ctx } = makeReadySystem();
      const engine = new EngineSound(audio);
      engine.start();
      engine.stop();
      engine.start();
      expect(engine.isStarted).toBe(true);
      expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
    });
  });
});
