import { describe, it, expect, vi } from 'vitest';
import {
  VoiceAnnouncements,
  VOICE_LOWPASS_FREQ,
  VOICE_QUANTIZE_BITS,
  VOICE_PEAK_GAIN,
  QUALIFYING_START_DURATION_S,
  GRAND_PRIX_START_DURATION_S,
} from '../src/audio/VoiceAnnouncements';
import { AudioSystem } from '../src/audio/AudioSystem';

// ─── Fake Web Audio API ────────────────────────────────────────────────────────

interface FakeAudioParam {
  value: number;
  setValueAtTime: ReturnType<typeof vi.fn>;
  exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
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
  onended: (() => void) | null;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

interface FakeAudioBuffer {
  getChannelData: ReturnType<typeof vi.fn>;
  numberOfChannels: number;
  length: number;
  sampleRate: number;
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
  createOscillator: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
}

function makeFakeAudioParam(initial = 0): FakeAudioParam {
  return {
    value: initial,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
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
  return {
    getChannelData: vi.fn(() => data),
    numberOfChannels: 1,
    length,
    sampleRate: 44100,
  };
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
    createBuffer: vi.fn((_ch, length) => makeFakeBuffer(length as number)),
    createBufferSource: vi.fn(() => makeFakeBufferSource()),
    createOscillator: vi.fn(),
    resume: vi.fn(() => Promise.resolve()),
  };
}

function makeReadySystem(): { audio: AudioSystem; ctx: FakeAudioContext } {
  const ctx = makeFakeContext('running');
  const audio = new AudioSystem(() => ctx as unknown as AudioContext);
  audio.resume();
  return { audio, ctx };
}

// ─── Exported constants ────────────────────────────────────────────────────────

describe('VoiceAnnouncements constants', () => {
  it('VOICE_LOWPASS_FREQ is a positive frequency below 4000 Hz', () => {
    expect(VOICE_LOWPASS_FREQ).toBeGreaterThan(0);
    expect(VOICE_LOWPASS_FREQ).toBeLessThan(4000);
  });

  it('VOICE_QUANTIZE_BITS equals 4', () => {
    expect(VOICE_QUANTIZE_BITS).toBe(4);
  });

  it('VOICE_PEAK_GAIN is between 0 and 1', () => {
    expect(VOICE_PEAK_GAIN).toBeGreaterThan(0);
    expect(VOICE_PEAK_GAIN).toBeLessThanOrEqual(1);
  });

  it('QUALIFYING_START_DURATION_S is approximately 3 seconds', () => {
    expect(QUALIFYING_START_DURATION_S).toBeGreaterThan(2);
    expect(QUALIFYING_START_DURATION_S).toBeLessThan(4);
  });

  it('GRAND_PRIX_START_DURATION_S is approximately 4 seconds', () => {
    expect(GRAND_PRIX_START_DURATION_S).toBeGreaterThan(3);
    expect(GRAND_PRIX_START_DURATION_S).toBeLessThan(5);
  });

  it('Grand Prix announcement is longer than Qualifying announcement', () => {
    expect(GRAND_PRIX_START_DURATION_S).toBeGreaterThan(QUALIFYING_START_DURATION_S);
  });
});

// ─── Not-ready guard ──────────────────────────────────────────────────────────

describe('VoiceAnnouncements — not ready guard', () => {
  it('triggerQualifyingStart does nothing if AudioSystem is not ready', () => {
    const ctx = makeFakeContext('suspended');
    const audio = new AudioSystem(() => ctx as unknown as AudioContext);
    const va = new VoiceAnnouncements(audio);
    va.triggerQualifyingStart();
    expect(ctx.createBuffer).not.toHaveBeenCalled();
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
  });

  it('triggerGrandPrixStart does nothing if AudioSystem is not ready', () => {
    const ctx = makeFakeContext('suspended');
    const audio = new AudioSystem(() => ctx as unknown as AudioContext);
    const va = new VoiceAnnouncements(audio);
    va.triggerGrandPrixStart();
    expect(ctx.createBuffer).not.toHaveBeenCalled();
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
  });
});

// ─── triggerQualifyingStart ───────────────────────────────────────────────────

describe('VoiceAnnouncements.triggerQualifyingStart()', () => {
  it('creates a buffer source', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerQualifyingStart();
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(1);
  });

  it('creates a BiquadFilter', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerQualifyingStart();
    expect(ctx.createBiquadFilter).toHaveBeenCalledTimes(1);
  });

  it('sets the filter type to lowpass', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerQualifyingStart();
    const filter = ctx.createBiquadFilter.mock.results[0]?.value as FakeBiquadFilterNode;
    expect(filter.type).toBe('lowpass');
  });

  it('sets the filter frequency to VOICE_LOWPASS_FREQ', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerQualifyingStart();
    const filter = ctx.createBiquadFilter.mock.results[0]?.value as FakeBiquadFilterNode;
    expect(filter.frequency.value).toBe(VOICE_LOWPASS_FREQ);
  });

  it('sets the gain to VOICE_PEAK_GAIN', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerQualifyingStart();
    const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
    const voiceGain = allGains[allGains.length - 1]?.value;
    expect(voiceGain?.gain.value).toBe(VOICE_PEAK_GAIN);
  });

  it('buffer source is not looping', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerQualifyingStart();
    const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
    expect(src.loop).toBe(false);
  });

  it('calls start() on the buffer source', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerQualifyingStart();
    const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
    expect(src.start).toHaveBeenCalled();
  });

  it('creates an AudioBuffer via createBuffer', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerQualifyingStart();
    expect(ctx.createBuffer).toHaveBeenCalledTimes(1);
  });

  it('registers an onended handler for cleanup', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerQualifyingStart();
    const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
    expect(src.onended).toBeTypeOf('function');
  });

  it('onended disconnects source, filter, and gain', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerQualifyingStart();

    const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
    const filter = ctx.createBiquadFilter.mock.results[0]?.value as FakeBiquadFilterNode;
    const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
    const voiceGain = allGains[allGains.length - 1]?.value;

    src.onended!();

    expect(src.disconnect).toHaveBeenCalled();
    expect(filter.disconnect).toHaveBeenCalled();
    expect(voiceGain?.disconnect).toHaveBeenCalled();
  });

  it('can be called multiple times — each call is independent', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerQualifyingStart();
    va.triggerQualifyingStart();
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(2);
  });
});

// ─── triggerGrandPrixStart ────────────────────────────────────────────────────

describe('VoiceAnnouncements.triggerGrandPrixStart()', () => {
  it('creates a buffer source', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerGrandPrixStart();
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(1);
  });

  it('creates a BiquadFilter', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerGrandPrixStart();
    expect(ctx.createBiquadFilter).toHaveBeenCalledTimes(1);
  });

  it('sets filter type to lowpass', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerGrandPrixStart();
    const filter = ctx.createBiquadFilter.mock.results[0]?.value as FakeBiquadFilterNode;
    expect(filter.type).toBe('lowpass');
  });

  it('sets the filter frequency to VOICE_LOWPASS_FREQ', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerGrandPrixStart();
    const filter = ctx.createBiquadFilter.mock.results[0]?.value as FakeBiquadFilterNode;
    expect(filter.frequency.value).toBe(VOICE_LOWPASS_FREQ);
  });

  it('calls start() on the buffer source', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerGrandPrixStart();
    const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
    expect(src.start).toHaveBeenCalled();
  });

  it('registers an onended handler for cleanup', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerGrandPrixStart();
    const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
    expect(src.onended).toBeTypeOf('function');
  });

  it('onended disconnects source, filter, and gain', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerGrandPrixStart();

    const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
    const filter = ctx.createBiquadFilter.mock.results[0]?.value as FakeBiquadFilterNode;
    const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
    const voiceGain = allGains[allGains.length - 1]?.value;

    src.onended!();

    expect(src.disconnect).toHaveBeenCalled();
    expect(filter.disconnect).toHaveBeenCalled();
    expect(voiceGain?.disconnect).toHaveBeenCalled();
  });

  it('Grand Prix buffer is longer than Qualifying buffer', () => {
    const { audio: audioA, ctx: ctxA } = makeReadySystem();
    const vaA = new VoiceAnnouncements(audioA);
    vaA.triggerQualifyingStart();
    const [, qualifyingLength] = ctxA.createBuffer.mock.calls[0] as [number, number, number];

    const { audio: audioB, ctx: ctxB } = makeReadySystem();
    const vaB = new VoiceAnnouncements(audioB);
    vaB.triggerGrandPrixStart();
    const [, grandPrixLength] = ctxB.createBuffer.mock.calls[0] as [number, number, number];

    expect(grandPrixLength).toBeGreaterThan(qualifyingLength);
  });
});

// ─── _buildVoiceBuffer (4-bit quantization) ───────────────────────────────────

describe('VoiceAnnouncements._buildVoiceBuffer()', () => {
  it('all samples are quantized to 4-bit discrete levels', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);

    // Build a tiny test buffer using a simple phoneme set
    const testPhonemes: Parameters<typeof va._buildVoiceBuffer>[1] = [
      [220, 0.5, 0.01], // 10 ms mixed phoneme
    ];
    const buf = va._buildVoiceBuffer(ctx as unknown as AudioContext, testPhonemes);
    const data = buf.getChannelData(0) as Float32Array;

    // 4-bit quantization: levels = 2^(4-1) = 8, so step = 1/8 = 0.125
    // Every sample should be a multiple of 0.125
    const step = 1 / Math.pow(2, VOICE_QUANTIZE_BITS - 1);
    for (let i = 0; i < data.length; i++) {
      const remainder = Math.abs(data[i] % step);
      // Allow floating-point epsilon
      expect(Math.min(remainder, step - remainder)).toBeLessThan(1e-6);
    }
  });

  it('all samples are clamped to [-1, 1]', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);

    const testPhonemes: Parameters<typeof va._buildVoiceBuffer>[1] = [
      [440, 0.0, 0.01], // pure high-amplitude tone
      [0, 1.0, 0.01], // pure noise
    ];
    const buf = va._buildVoiceBuffer(ctx as unknown as AudioContext, testPhonemes);
    const data = buf.getChannelData(0) as Float32Array;

    for (let i = 0; i < data.length; i++) {
      expect(data[i]).toBeGreaterThanOrEqual(-1);
      expect(data[i]).toBeLessThanOrEqual(1);
    }
  });

  it('returns a mono AudioBuffer (1 channel)', () => {
    const { audio, ctx } = makeReadySystem();
    const va = new VoiceAnnouncements(audio);
    va.triggerQualifyingStart();
    // createBuffer is called with (channels, length, sampleRate)
    const [channels] = ctx.createBuffer.mock.calls[0] as [number, number, number];
    expect(channels).toBe(1);
  });
});
