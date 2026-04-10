import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TireScreech,
  fillLFSRBuffer,
  SCREECH_THRESHOLD,
  SCREECH_MAX_GAIN,
  SCREECH_FILTER_FREQ,
  SCREECH_FILTER_Q,
} from '../src/audio/TireScreech';
import { AudioSystem } from '../src/audio/AudioSystem';

// ─── Fake Web Audio API ────────────────────────────────────────────────────────

interface FakeAudioParam {
  value: number;
  setTargetAtTime: ReturnType<typeof vi.fn>;
}

interface FakeGainNode {
  gain: FakeAudioParam;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

interface FakeBiquadFilterNode {
  type: BiquadFilterType;
  frequency: FakeAudioParam;
  Q: FakeAudioParam;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

interface FakeBufferSourceNode {
  buffer: AudioBuffer | null;
  loop: boolean;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

interface FakeAudioBuffer {
  getChannelData: ReturnType<typeof vi.fn>;
  length: number;
}

interface FakeAudioContext {
  state: 'running' | 'suspended' | 'closed';
  destination: object;
  currentTime: number;
  sampleRate: number;
  createGain: ReturnType<typeof vi.fn>;
  createBiquadFilter: ReturnType<typeof vi.fn>;
  createBuffer: ReturnType<typeof vi.fn>;
  createBufferSource: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
}

function makeFakeAudioParam(initial = 0): FakeAudioParam {
  return { value: initial, setTargetAtTime: vi.fn() };
}

function makeFakeGain(): FakeGainNode {
  return { gain: makeFakeAudioParam(1), connect: vi.fn(), disconnect: vi.fn() };
}

function makeFakeBiquadFilter(): FakeBiquadFilterNode {
  return {
    type: 'bandpass',
    frequency: makeFakeAudioParam(0),
    Q: makeFakeAudioParam(0),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function makeFakeBuffer(length = 44100): FakeAudioBuffer {
  const data = new Float32Array(length);
  return { getChannelData: vi.fn(() => data), length };
}

function makeFakeBufferSource(): FakeBufferSourceNode {
  return {
    buffer: null,
    loop: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function makeFakeContext(state: 'running' | 'suspended' = 'running'): FakeAudioContext {
  return {
    state,
    destination: {},
    currentTime: 0,
    sampleRate: 44100,
    createGain: vi.fn(() => makeFakeGain()),
    createBiquadFilter: vi.fn(() => makeFakeBiquadFilter()),
    createBuffer: vi.fn(() => makeFakeBuffer()),
    createBufferSource: vi.fn(() => makeFakeBufferSource()),
    resume: vi.fn(() => Promise.resolve()),
  };
}

function makeReadySystem(): { audio: AudioSystem; ctx: FakeAudioContext } {
  const ctx = makeFakeContext('running');
  const audio = new AudioSystem(() => ctx as unknown as AudioContext);
  audio.resume();
  return { audio, ctx };
}

// ─── fillLFSRBuffer ────────────────────────────────────────────────────────────

describe('fillLFSRBuffer', () => {
  it('fills the buffer with values in the range [-1, 1]', () => {
    const data = new Float32Array(1000);
    const fakeBuffer = { getChannelData: () => data } as unknown as AudioBuffer;
    fillLFSRBuffer(fakeBuffer);
    for (const v of data) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('produces non-zero values (noise, not silence)', () => {
    const data = new Float32Array(1000);
    const fakeBuffer = { getChannelData: () => data } as unknown as AudioBuffer;
    fillLFSRBuffer(fakeBuffer);
    const nonZero = Array.from(data).filter((v) => v !== 0);
    expect(nonZero.length).toBeGreaterThan(0);
  });

  it('produces deterministic output for the same buffer', () => {
    const dataA = new Float32Array(500);
    const dataB = new Float32Array(500);
    fillLFSRBuffer({ getChannelData: () => dataA } as unknown as AudioBuffer);
    fillLFSRBuffer({ getChannelData: () => dataB } as unknown as AudioBuffer);
    expect(Array.from(dataA)).toEqual(Array.from(dataB));
  });
});

// ─── TireScreech ──────────────────────────────────────────────────────────────

describe('TireScreech', () => {
  describe('initial state', () => {
    it('isStarted is false before start()', () => {
      const { audio } = makeReadySystem();
      const screech = new TireScreech(audio);
      expect(screech.isStarted).toBe(false);
    });
  });

  describe('start()', () => {
    let audio: AudioSystem;
    let ctx: FakeAudioContext;
    let screech: TireScreech;

    beforeEach(() => {
      ({ audio, ctx } = makeReadySystem());
      screech = new TireScreech(audio);
      screech.start();
    });

    it('sets isStarted to true', () => {
      expect(screech.isStarted).toBe(true);
    });

    it('creates a BiquadFilter via AudioContext', () => {
      expect(ctx.createBiquadFilter).toHaveBeenCalledTimes(1);
    });

    it('sets the filter type to bandpass', () => {
      const filter = ctx.createBiquadFilter.mock.results[0]?.value as FakeBiquadFilterNode;
      expect(filter.type).toBe('bandpass');
    });

    it('sets the filter frequency to SCREECH_FILTER_FREQ', () => {
      const filter = ctx.createBiquadFilter.mock.results[0]?.value as FakeBiquadFilterNode;
      expect(filter.frequency.value).toBe(SCREECH_FILTER_FREQ);
    });

    it('sets the filter Q to SCREECH_FILTER_Q', () => {
      const filter = ctx.createBiquadFilter.mock.results[0]?.value as FakeBiquadFilterNode;
      expect(filter.Q.value).toBe(SCREECH_FILTER_Q);
    });

    it('creates a buffer source via AudioContext', () => {
      expect(ctx.createBufferSource).toHaveBeenCalledTimes(1);
    });

    it('sets the buffer source to loop', () => {
      const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
      expect(src.loop).toBe(true);
    });

    it('calls start() on the buffer source', () => {
      const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
      expect(src.start).toHaveBeenCalled();
    });

    it('starts the gain node at zero (silent)', () => {
      // The gain node that TireScreech owns is one of the ones created after the channel gains
      // AudioSystem creates 4 gains (master + 3 channels), TireScreech creates 1 more
      const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
      const screechGain = allGains[allGains.length - 1]?.value;
      expect(screechGain?.gain.value).toBe(0);
    });

    it('is idempotent — a second call does not create another buffer source', () => {
      screech.start();
      expect(ctx.createBufferSource).toHaveBeenCalledTimes(1);
    });

    it('does nothing if AudioSystem is not ready', () => {
      const suspendedCtx = makeFakeContext('suspended');
      const notReadyAudio = new AudioSystem(() => suspendedCtx as unknown as AudioContext);
      const s = new TireScreech(notReadyAudio);
      s.start();
      expect(s.isStarted).toBe(false);
      expect(suspendedCtx.createBufferSource).not.toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    it('calls setTargetAtTime on the gain node', () => {
      const { audio, ctx } = makeReadySystem();
      const screech = new TireScreech(audio);
      screech.start();
      screech.update(1.0, false);

      const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
      const screechGain = allGains[allGains.length - 1]?.value;
      expect(screechGain?.gain.setTargetAtTime).toHaveBeenCalled();
    });

    it('targets zero gain when input is below threshold', () => {
      const { audio, ctx } = makeReadySystem();
      const screech = new TireScreech(audio);
      screech.start();
      screech.update(SCREECH_THRESHOLD * 0.5, false);

      const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
      const screechGain = allGains[allGains.length - 1]?.value;
      const [targetGain] = screechGain?.gain.setTargetAtTime.mock.calls[0] as [
        number,
        number,
        number,
      ];
      expect(targetGain).toBe(0);
    });

    it('targets zero gain when off-road even with high turn input', () => {
      const { audio, ctx } = makeReadySystem();
      const screech = new TireScreech(audio);
      screech.start();
      screech.update(1.0, true /* off-road */);

      const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
      const screechGain = allGains[allGains.length - 1]?.value;
      const [targetGain] = screechGain?.gain.setTargetAtTime.mock.calls[0] as [
        number,
        number,
        number,
      ];
      expect(targetGain).toBe(0);
    });

    it('targets a positive gain when above threshold and on-road', () => {
      const { audio, ctx } = makeReadySystem();
      const screech = new TireScreech(audio);
      screech.start();
      screech.update(1.0, false);

      const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
      const screechGain = allGains[allGains.length - 1]?.value;
      const [targetGain] = screechGain?.gain.setTargetAtTime.mock.calls[0] as [
        number,
        number,
        number,
      ];
      expect(targetGain).toBeGreaterThan(0);
    });

    it('targets SCREECH_MAX_GAIN at full lock (input = 1)', () => {
      const { audio, ctx } = makeReadySystem();
      const screech = new TireScreech(audio);
      screech.start();
      screech.update(1.0, false);

      const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
      const screechGain = allGains[allGains.length - 1]?.value;
      const [targetGain] = screechGain?.gain.setTargetAtTime.mock.calls[0] as [
        number,
        number,
        number,
      ];
      expect(targetGain).toBeCloseTo(SCREECH_MAX_GAIN);
    });

    it('gain increases with higher turn input (on-road)', () => {
      const { audio, ctx } = makeReadySystem();
      const screech = new TireScreech(audio);
      screech.start();

      screech.update(0.5, false);
      screech.update(0.9, false);

      const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
      const screechGain = allGains[allGains.length - 1]?.value;
      const calls = screechGain?.gain.setTargetAtTime.mock.calls as [number, number, number][];
      const [lowGain] = calls[0]!;
      const [highGain] = calls[1]!;
      expect(highGain).toBeGreaterThan(lowGain);
    });

    it('is a no-op before start()', () => {
      const { audio } = makeReadySystem();
      const screech = new TireScreech(audio);
      expect(() => screech.update(1.0, false)).not.toThrow();
    });
  });

  describe('stop()', () => {
    it('sets isStarted to false', () => {
      const { audio } = makeReadySystem();
      const screech = new TireScreech(audio);
      screech.start();
      screech.stop();
      expect(screech.isStarted).toBe(false);
    });

    it('calls stop() on the buffer source', () => {
      const { audio, ctx } = makeReadySystem();
      const screech = new TireScreech(audio);
      screech.start();
      screech.stop();
      const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
      expect(src.stop).toHaveBeenCalled();
    });

    it('calls disconnect() on the buffer source', () => {
      const { audio, ctx } = makeReadySystem();
      const screech = new TireScreech(audio);
      screech.start();
      screech.stop();
      const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
      expect(src.disconnect).toHaveBeenCalled();
    });

    it('is idempotent — calling stop() twice does not throw', () => {
      const { audio } = makeReadySystem();
      const screech = new TireScreech(audio);
      screech.start();
      screech.stop();
      expect(() => screech.stop()).not.toThrow();
    });

    it('is a no-op before start()', () => {
      const { audio } = makeReadySystem();
      const screech = new TireScreech(audio);
      expect(() => screech.stop()).not.toThrow();
    });

    it('after stop(), start() can restart the source', () => {
      const { audio, ctx } = makeReadySystem();
      const screech = new TireScreech(audio);
      screech.start();
      screech.stop();
      screech.start();
      expect(screech.isStarted).toBe(true);
      expect(ctx.createBufferSource).toHaveBeenCalledTimes(2);
    });
  });
});
