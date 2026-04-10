import { describe, it, expect, vi } from 'vitest';
import {
  CollisionSound,
  COLLISION_DECAY_DURATION,
  COLLISION_BURST_GAIN,
  COLLISION_FILTER_FREQ,
} from '../src/audio/CollisionSound';
import { AudioSystem } from '../src/audio/AudioSystem';

// ─── Fake Web Audio API ────────────────────────────────────────────────────────

interface FakeAudioParam {
  value: number;
  setValueAtTime: ReturnType<typeof vi.fn>;
  exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
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
  onended: (() => void) | null;
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
  return {
    value: initial,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
}

function makeFakeGain(): FakeGainNode {
  return { gain: makeFakeAudioParam(1), connect: vi.fn(), disconnect: vi.fn() };
}

function makeFakeBiquadFilter(): FakeBiquadFilterNode {
  return {
    type: 'lowpass',
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
    onended: null,
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

// ─── CollisionSound ────────────────────────────────────────────────────────────

describe('CollisionSound', () => {
  describe('trigger()', () => {
    it('does nothing when AudioSystem is not ready', () => {
      const ctx = makeFakeContext('suspended');
      const audio = new AudioSystem(() => ctx as unknown as AudioContext);
      const sound = new CollisionSound(audio);
      sound.trigger();
      expect(ctx.createBufferSource).not.toHaveBeenCalled();
    });

    it('creates a buffer source via AudioContext', () => {
      const { audio, ctx } = makeReadySystem();
      const sound = new CollisionSound(audio);
      sound.trigger();
      expect(ctx.createBufferSource).toHaveBeenCalledTimes(1);
    });

    it('creates a BiquadFilter via AudioContext', () => {
      const { audio, ctx } = makeReadySystem();
      const sound = new CollisionSound(audio);
      sound.trigger();
      expect(ctx.createBiquadFilter).toHaveBeenCalledTimes(1);
    });

    it('sets the filter type to lowpass', () => {
      const { audio, ctx } = makeReadySystem();
      const sound = new CollisionSound(audio);
      sound.trigger();
      const filter = ctx.createBiquadFilter.mock.results[0]?.value as FakeBiquadFilterNode;
      expect(filter.type).toBe('lowpass');
    });

    it('sets the filter frequency to COLLISION_FILTER_FREQ', () => {
      const { audio, ctx } = makeReadySystem();
      const sound = new CollisionSound(audio);
      sound.trigger();
      const filter = ctx.createBiquadFilter.mock.results[0]?.value as FakeBiquadFilterNode;
      expect(filter.frequency.value).toBe(COLLISION_FILTER_FREQ);
    });

    it('buffer source is not set to loop', () => {
      const { audio, ctx } = makeReadySystem();
      const sound = new CollisionSound(audio);
      sound.trigger();
      const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
      expect(src.loop).toBe(false);
    });

    it('calls start() on the buffer source', () => {
      const { audio, ctx } = makeReadySystem();
      const sound = new CollisionSound(audio);
      sound.trigger();
      const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
      expect(src.start).toHaveBeenCalled();
    });

    it('sets the initial gain to COLLISION_BURST_GAIN', () => {
      const { audio, ctx } = makeReadySystem();
      const sound = new CollisionSound(audio);
      sound.trigger();
      // AudioSystem creates gains for master + 3 channels; CollisionSound creates 1 more
      const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
      const burstGain = allGains[allGains.length - 1]?.value;
      expect(burstGain?.gain.setValueAtTime).toHaveBeenCalledWith(
        COLLISION_BURST_GAIN,
        expect.any(Number)
      );
    });

    it('schedules exponential ramp to near-silence at COLLISION_DECAY_DURATION', () => {
      const { audio, ctx } = makeReadySystem();
      const sound = new CollisionSound(audio);
      sound.trigger();
      const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
      const burstGain = allGains[allGains.length - 1]?.value;
      const [targetValue, endTime] = burstGain?.gain.exponentialRampToValueAtTime.mock.calls[0] as [
        number,
        number,
      ];
      expect(targetValue).toBeCloseTo(0.0001);
      expect(endTime).toBeCloseTo(ctx.currentTime + COLLISION_DECAY_DURATION);
    });

    it('creates new nodes on each trigger — multiple calls do not share nodes', () => {
      const { audio, ctx } = makeReadySystem();
      const sound = new CollisionSound(audio);
      sound.trigger();
      sound.trigger();
      expect(ctx.createBufferSource).toHaveBeenCalledTimes(2);
      expect(ctx.createBiquadFilter).toHaveBeenCalledTimes(2);
    });

    it('registers an onended handler for node cleanup', () => {
      const { audio, ctx } = makeReadySystem();
      const sound = new CollisionSound(audio);
      sound.trigger();
      const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
      expect(src.onended).toBeTypeOf('function');
    });

    it('onended disconnects source, filter, and gain nodes', () => {
      const { audio, ctx } = makeReadySystem();
      const sound = new CollisionSound(audio);
      sound.trigger();

      const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
      const filter = ctx.createBiquadFilter.mock.results[0]?.value as FakeBiquadFilterNode;
      const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
      const burstGain = allGains[allGains.length - 1]?.value as FakeGainNode;

      // Simulate the source finishing playback
      src.onended!();

      expect(src.disconnect).toHaveBeenCalled();
      expect(filter.disconnect).toHaveBeenCalled();
      expect(burstGain.disconnect).toHaveBeenCalled();
    });
  });
});

// ─── Exported constants ────────────────────────────────────────────────────────

describe('CollisionSound constants', () => {
  it('COLLISION_DECAY_DURATION is approximately 3 seconds', () => {
    expect(COLLISION_DECAY_DURATION).toBeCloseTo(3.0);
  });

  it('COLLISION_BURST_GAIN is between 0 and 1', () => {
    expect(COLLISION_BURST_GAIN).toBeGreaterThan(0);
    expect(COLLISION_BURST_GAIN).toBeLessThanOrEqual(1);
  });

  it('COLLISION_FILTER_FREQ is a positive frequency in Hz', () => {
    expect(COLLISION_FILTER_FREQ).toBeGreaterThan(0);
  });
});
