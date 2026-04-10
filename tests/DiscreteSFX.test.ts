import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DiscreteSFX,
  COUNTDOWN_BEEP_FREQ,
  COUNTDOWN_BEEP_DURATION_S,
  TIME_BONUS_TICK_FREQ,
  OVERTAKE_TICK_FREQ,
  TICK_DURATION_S,
  TICK_PEAK_GAIN,
  GRASS_RUMBLE_FILTER_FREQ,
  GRASS_RUMBLE_GAIN,
  PUDDLE_FILTER_FREQ,
  PUDDLE_DURATION_S,
  PUDDLE_BURST_GAIN,
} from '../src/audio/DiscreteSFX';
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

interface FakeOscillatorNode {
  type: OscillatorType;
  frequency: FakeAudioParam;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
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

function makeFakeOscillator(): FakeOscillatorNode {
  return {
    type: 'sine',
    frequency: makeFakeAudioParam(0),
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
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
    createOscillator: vi.fn(() => makeFakeOscillator()),
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

describe('DiscreteSFX constants', () => {
  it('COUNTDOWN_BEEP_FREQ is a positive Hz value', () => {
    expect(COUNTDOWN_BEEP_FREQ).toBeGreaterThan(0);
  });

  it('COUNTDOWN_BEEP_DURATION_S is a short positive duration', () => {
    expect(COUNTDOWN_BEEP_DURATION_S).toBeGreaterThan(0);
    expect(COUNTDOWN_BEEP_DURATION_S).toBeLessThan(1);
  });

  it('TIME_BONUS_TICK_FREQ and OVERTAKE_TICK_FREQ are distinct', () => {
    expect(TIME_BONUS_TICK_FREQ).not.toBe(OVERTAKE_TICK_FREQ);
  });

  it('TICK_DURATION_S is a short positive duration', () => {
    expect(TICK_DURATION_S).toBeGreaterThan(0);
    expect(TICK_DURATION_S).toBeLessThan(1);
  });

  it('TICK_PEAK_GAIN is between 0 and 1', () => {
    expect(TICK_PEAK_GAIN).toBeGreaterThan(0);
    expect(TICK_PEAK_GAIN).toBeLessThanOrEqual(1);
  });

  it('GRASS_RUMBLE_FILTER_FREQ is positive', () => {
    expect(GRASS_RUMBLE_FILTER_FREQ).toBeGreaterThan(0);
  });

  it('GRASS_RUMBLE_GAIN is between 0 and 1', () => {
    expect(GRASS_RUMBLE_GAIN).toBeGreaterThan(0);
    expect(GRASS_RUMBLE_GAIN).toBeLessThanOrEqual(1);
  });

  it('PUDDLE_FILTER_FREQ is positive', () => {
    expect(PUDDLE_FILTER_FREQ).toBeGreaterThan(0);
  });

  it('PUDDLE_DURATION_S is less than 1.5s', () => {
    expect(PUDDLE_DURATION_S).toBeGreaterThan(0);
    expect(PUDDLE_DURATION_S).toBeLessThan(1.5);
  });

  it('PUDDLE_BURST_GAIN is between 0 and 1', () => {
    expect(PUDDLE_BURST_GAIN).toBeGreaterThan(0);
    expect(PUDDLE_BURST_GAIN).toBeLessThanOrEqual(1);
  });
});

// ─── Shared "not ready" guard ──────────────────────────────────────────────────

describe('DiscreteSFX — not ready guard', () => {
  it('triggerCoinInsert does nothing if AudioSystem is not ready', () => {
    const ctx = makeFakeContext('suspended');
    const audio = new AudioSystem(() => ctx as unknown as AudioContext);
    const sfx = new DiscreteSFX(audio);
    sfx.triggerCoinInsert();
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });

  it('triggerCountdownBeep does nothing if AudioSystem is not ready', () => {
    const ctx = makeFakeContext('suspended');
    const audio = new AudioSystem(() => ctx as unknown as AudioContext);
    const sfx = new DiscreteSFX(audio);
    sfx.triggerCountdownBeep();
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });

  it('triggerPuddleHit does nothing if AudioSystem is not ready', () => {
    const ctx = makeFakeContext('suspended');
    const audio = new AudioSystem(() => ctx as unknown as AudioContext);
    const sfx = new DiscreteSFX(audio);
    sfx.triggerPuddleHit();
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
  });

  it('triggerTimeBonusTick does nothing if AudioSystem is not ready', () => {
    const ctx = makeFakeContext('suspended');
    const audio = new AudioSystem(() => ctx as unknown as AudioContext);
    const sfx = new DiscreteSFX(audio);
    sfx.triggerTimeBonusTick();
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });

  it('triggerOvertakeTick does nothing if AudioSystem is not ready', () => {
    const ctx = makeFakeContext('suspended');
    const audio = new AudioSystem(() => ctx as unknown as AudioContext);
    const sfx = new DiscreteSFX(audio);
    sfx.triggerOvertakeTick();
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });

  it('startGrassRumble does nothing if AudioSystem is not ready', () => {
    const ctx = makeFakeContext('suspended');
    const audio = new AudioSystem(() => ctx as unknown as AudioContext);
    const sfx = new DiscreteSFX(audio);
    sfx.startGrassRumble();
    expect(sfx.isGrassRumbleStarted).toBe(false);
  });
});

// ─── triggerCoinInsert ────────────────────────────────────────────────────────

describe('DiscreteSFX.triggerCoinInsert()', () => {
  it('creates oscillators (one per note) when ready', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerCoinInsert();
    // Coin insert has 4 notes → 4 oscillators
    expect(ctx.createOscillator).toHaveBeenCalledTimes(4);
  });

  it('each oscillator uses the square waveform', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerCoinInsert();
    for (const result of ctx.createOscillator.mock.results) {
      expect((result.value as FakeOscillatorNode).type).toBe('square');
    }
  });

  it('sets start and stop times on each oscillator', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerCoinInsert();
    for (const result of ctx.createOscillator.mock.results) {
      const osc = result.value as FakeOscillatorNode;
      expect(osc.start).toHaveBeenCalled();
      expect(osc.stop).toHaveBeenCalled();
    }
  });

  it('registers an onended handler on each oscillator for cleanup', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerCoinInsert();
    for (const result of ctx.createOscillator.mock.results) {
      expect((result.value as FakeOscillatorNode).onended).toBeTypeOf('function');
    }
  });

  it('onended disconnects oscillator and gain', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerCoinInsert();
    const osc = ctx.createOscillator.mock.results[0]?.value as FakeOscillatorNode;
    osc.onended!();
    expect(osc.disconnect).toHaveBeenCalled();
  });
});

// ─── triggerQualifyingFanfare ─────────────────────────────────────────────────

describe('DiscreteSFX.triggerQualifyingFanfare()', () => {
  it('creates multiple oscillators (one per note)', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerQualifyingFanfare();
    // Fanfare has 19 notes
    expect(ctx.createOscillator).toHaveBeenCalledTimes(19);
  });

  it('schedules notes at future times (start offset > currentTime for later notes)', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerQualifyingFanfare();
    const lastOsc = ctx.createOscillator.mock.results.at(-1)?.value as FakeOscillatorNode;
    // The last note's start time should be > 0 (currentTime) since it has a non-zero offset
    const [startTime] = lastOsc.start.mock.calls[0] as [number];
    expect(startTime).toBeGreaterThan(0);
  });
});

// ─── triggerCountdownBeep ─────────────────────────────────────────────────────

describe('DiscreteSFX.triggerCountdownBeep()', () => {
  it('creates exactly one oscillator', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerCountdownBeep();
    expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
  });

  it('sets oscillator frequency to COUNTDOWN_BEEP_FREQ', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerCountdownBeep();
    const osc = ctx.createOscillator.mock.results[0]?.value as FakeOscillatorNode;
    expect(osc.frequency.value).toBe(COUNTDOWN_BEEP_FREQ);
  });

  it('can be called multiple times (each call is independent)', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerCountdownBeep();
    sfx.triggerCountdownBeep();
    sfx.triggerCountdownBeep();
    expect(ctx.createOscillator).toHaveBeenCalledTimes(3);
  });
});

// ─── triggerQualifyingComplete ────────────────────────────────────────────────

describe('DiscreteSFX.triggerQualifyingComplete()', () => {
  it('non-pole: creates multiple oscillators', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerQualifyingComplete(false);
    expect(ctx.createOscillator.mock.calls.length).toBeGreaterThan(0);
  });

  it('pole: creates multiple oscillators', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerQualifyingComplete(true);
    expect(ctx.createOscillator.mock.calls.length).toBeGreaterThan(0);
  });

  it('pole variant creates more or different notes than non-pole', () => {
    const { audio: audioA, ctx: ctxA } = makeReadySystem();
    const sfxA = new DiscreteSFX(audioA);
    sfxA.triggerQualifyingComplete(false);
    const nonPoleCount = ctxA.createOscillator.mock.calls.length;

    const { audio: audioB, ctx: ctxB } = makeReadySystem();
    const sfxB = new DiscreteSFX(audioB);
    sfxB.triggerQualifyingComplete(true);
    const poleCount = ctxB.createOscillator.mock.calls.length;

    // The sequences are different — at minimum they differ in note count
    expect(nonPoleCount).not.toBe(poleCount);
  });
});

// ─── triggerRaceComplete ──────────────────────────────────────────────────────

describe('DiscreteSFX.triggerRaceComplete()', () => {
  it('creates multiple oscillators when ready', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerRaceComplete();
    expect(ctx.createOscillator.mock.calls.length).toBeGreaterThan(0);
  });

  it('does nothing if AudioSystem is not ready', () => {
    const ctx = makeFakeContext('suspended');
    const audio = new AudioSystem(() => ctx as unknown as AudioContext);
    const sfx = new DiscreteSFX(audio);
    sfx.triggerRaceComplete();
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });
});

// ─── triggerTimeExtend ────────────────────────────────────────────────────────

describe('DiscreteSFX.triggerTimeExtend()', () => {
  it('creates multiple oscillators when ready', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerTimeExtend();
    expect(ctx.createOscillator.mock.calls.length).toBeGreaterThan(0);
  });

  it('uses sawtooth waveform', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerTimeExtend();
    for (const result of ctx.createOscillator.mock.results) {
      expect((result.value as FakeOscillatorNode).type).toBe('sawtooth');
    }
  });
});

// ─── triggerPuddleHit ─────────────────────────────────────────────────────────

describe('DiscreteSFX.triggerPuddleHit()', () => {
  it('creates a buffer source when ready', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerPuddleHit();
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(1);
  });

  it('creates a BiquadFilter', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerPuddleHit();
    expect(ctx.createBiquadFilter).toHaveBeenCalledTimes(1);
  });

  it('sets the filter type to highpass', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerPuddleHit();
    const filter = ctx.createBiquadFilter.mock.results[0]?.value as FakeBiquadFilterNode;
    expect(filter.type).toBe('highpass');
  });

  it('sets filter frequency to PUDDLE_FILTER_FREQ', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerPuddleHit();
    const filter = ctx.createBiquadFilter.mock.results[0]?.value as FakeBiquadFilterNode;
    expect(filter.frequency.value).toBe(PUDDLE_FILTER_FREQ);
  });

  it('buffer source is not set to loop', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerPuddleHit();
    const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
    expect(src.loop).toBe(false);
  });

  it('calls start() on the buffer source', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerPuddleHit();
    const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
    expect(src.start).toHaveBeenCalled();
  });

  it('sets initial gain to PUDDLE_BURST_GAIN', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerPuddleHit();
    // AudioSystem creates 4 gains; PuddleHit creates 1 more
    const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
    const burstGain = allGains[allGains.length - 1]?.value;
    expect(burstGain?.gain.setValueAtTime).toHaveBeenCalledWith(
      PUDDLE_BURST_GAIN,
      expect.any(Number)
    );
  });

  it('registers onended handler for cleanup', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerPuddleHit();
    const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
    expect(src.onended).toBeTypeOf('function');
  });

  it('onended disconnects all nodes', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerPuddleHit();

    const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
    const filter = ctx.createBiquadFilter.mock.results[0]?.value as FakeBiquadFilterNode;
    const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
    const burstGain = allGains[allGains.length - 1]?.value;

    src.onended!();

    expect(src.disconnect).toHaveBeenCalled();
    expect(filter.disconnect).toHaveBeenCalled();
    expect(burstGain?.disconnect).toHaveBeenCalled();
  });
});

// ─── triggerTimeBonusTick ──────────────────────────────────────────────────────

describe('DiscreteSFX.triggerTimeBonusTick()', () => {
  it('creates exactly one oscillator', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerTimeBonusTick();
    expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
  });

  it('sets oscillator frequency to TIME_BONUS_TICK_FREQ', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerTimeBonusTick();
    const osc = ctx.createOscillator.mock.results[0]?.value as FakeOscillatorNode;
    expect(osc.frequency.value).toBe(TIME_BONUS_TICK_FREQ);
  });

  it('gain envelope targets TICK_PEAK_GAIN', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerTimeBonusTick();
    const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
    const tickGain = allGains[allGains.length - 1]?.value;
    // Should ramp up to TICK_PEAK_GAIN
    const rampCalls = tickGain?.gain.exponentialRampToValueAtTime.mock.calls as [number, number][];
    const peakCall = rampCalls.find(([v]) => v === TICK_PEAK_GAIN);
    expect(peakCall).toBeDefined();
  });
});

// ─── triggerOvertakeTick ───────────────────────────────────────────────────────

describe('DiscreteSFX.triggerOvertakeTick()', () => {
  it('creates exactly one oscillator', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerOvertakeTick();
    expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
  });

  it('sets oscillator frequency to OVERTAKE_TICK_FREQ', () => {
    const { audio, ctx } = makeReadySystem();
    const sfx = new DiscreteSFX(audio);
    sfx.triggerOvertakeTick();
    const osc = ctx.createOscillator.mock.results[0]?.value as FakeOscillatorNode;
    expect(osc.frequency.value).toBe(OVERTAKE_TICK_FREQ);
  });

  it('OVERTAKE_TICK_FREQ differs from TIME_BONUS_TICK_FREQ', () => {
    expect(OVERTAKE_TICK_FREQ).not.toBe(TIME_BONUS_TICK_FREQ);
  });
});

// ─── Grass rumble ──────────────────────────────────────────────────────────────

describe('DiscreteSFX — grass rumble', () => {
  describe('initial state', () => {
    it('isGrassRumbleStarted is false before startGrassRumble()', () => {
      const { audio } = makeReadySystem();
      const sfx = new DiscreteSFX(audio);
      expect(sfx.isGrassRumbleStarted).toBe(false);
    });
  });

  describe('startGrassRumble()', () => {
    let audio: AudioSystem;
    let ctx: FakeAudioContext;
    let sfx: DiscreteSFX;

    beforeEach(() => {
      ({ audio, ctx } = makeReadySystem());
      sfx = new DiscreteSFX(audio);
      sfx.startGrassRumble();
    });

    it('sets isGrassRumbleStarted to true', () => {
      expect(sfx.isGrassRumbleStarted).toBe(true);
    });

    it('creates a buffer source', () => {
      expect(ctx.createBufferSource).toHaveBeenCalledTimes(1);
    });

    it('buffer source loops', () => {
      const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
      expect(src.loop).toBe(true);
    });

    it('calls start() on the buffer source', () => {
      const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
      expect(src.start).toHaveBeenCalled();
    });

    it('creates a lowpass BiquadFilter', () => {
      expect(ctx.createBiquadFilter).toHaveBeenCalledTimes(1);
      const filter = ctx.createBiquadFilter.mock.results[0]?.value as FakeBiquadFilterNode;
      expect(filter.type).toBe('lowpass');
    });

    it('sets filter frequency to GRASS_RUMBLE_FILTER_FREQ', () => {
      const filter = ctx.createBiquadFilter.mock.results[0]?.value as FakeBiquadFilterNode;
      expect(filter.frequency.value).toBe(GRASS_RUMBLE_FILTER_FREQ);
    });

    it('starts gain at zero (silent until off-road)', () => {
      const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
      const rumbleGain = allGains[allGains.length - 1]?.value;
      expect(rumbleGain?.gain.value).toBe(0);
    });

    it('is idempotent — a second call does not create another buffer source', () => {
      sfx.startGrassRumble();
      expect(ctx.createBufferSource).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateGrassRumble()', () => {
    it('calls setTargetAtTime on the rumble gain node', () => {
      const { audio, ctx } = makeReadySystem();
      const sfx = new DiscreteSFX(audio);
      sfx.startGrassRumble();
      sfx.updateGrassRumble(true);
      const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
      const rumbleGain = allGains[allGains.length - 1]?.value;
      expect(rumbleGain?.gain.setTargetAtTime).toHaveBeenCalled();
    });

    it('targets GRASS_RUMBLE_GAIN when isOffRoad=true', () => {
      const { audio, ctx } = makeReadySystem();
      const sfx = new DiscreteSFX(audio);
      sfx.startGrassRumble();
      sfx.updateGrassRumble(true);
      const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
      const rumbleGain = allGains[allGains.length - 1]?.value;
      const [target] = rumbleGain?.gain.setTargetAtTime.mock.calls[0] as [number, number, number];
      expect(target).toBe(GRASS_RUMBLE_GAIN);
    });

    it('targets 0 when isOffRoad=false', () => {
      const { audio, ctx } = makeReadySystem();
      const sfx = new DiscreteSFX(audio);
      sfx.startGrassRumble();
      sfx.updateGrassRumble(false);
      const allGains = ctx.createGain.mock.results as { value: FakeGainNode }[];
      const rumbleGain = allGains[allGains.length - 1]?.value;
      const [target] = rumbleGain?.gain.setTargetAtTime.mock.calls[0] as [number, number, number];
      expect(target).toBe(0);
    });

    it('is a no-op before startGrassRumble()', () => {
      const { audio } = makeReadySystem();
      const sfx = new DiscreteSFX(audio);
      expect(() => sfx.updateGrassRumble(true)).not.toThrow();
    });
  });

  describe('stopGrassRumble()', () => {
    it('sets isGrassRumbleStarted to false', () => {
      const { audio } = makeReadySystem();
      const sfx = new DiscreteSFX(audio);
      sfx.startGrassRumble();
      sfx.stopGrassRumble();
      expect(sfx.isGrassRumbleStarted).toBe(false);
    });

    it('calls stop() on the buffer source', () => {
      const { audio, ctx } = makeReadySystem();
      const sfx = new DiscreteSFX(audio);
      sfx.startGrassRumble();
      sfx.stopGrassRumble();
      const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
      expect(src.stop).toHaveBeenCalled();
    });

    it('calls disconnect() on the buffer source', () => {
      const { audio, ctx } = makeReadySystem();
      const sfx = new DiscreteSFX(audio);
      sfx.startGrassRumble();
      sfx.stopGrassRumble();
      const src = ctx.createBufferSource.mock.results[0]?.value as FakeBufferSourceNode;
      expect(src.disconnect).toHaveBeenCalled();
    });

    it('is idempotent — calling twice does not throw', () => {
      const { audio } = makeReadySystem();
      const sfx = new DiscreteSFX(audio);
      sfx.startGrassRumble();
      sfx.stopGrassRumble();
      expect(() => sfx.stopGrassRumble()).not.toThrow();
    });

    it('is a no-op before startGrassRumble()', () => {
      const { audio } = makeReadySystem();
      const sfx = new DiscreteSFX(audio);
      expect(() => sfx.stopGrassRumble()).not.toThrow();
    });

    it('after stop(), startGrassRumble() can restart', () => {
      const { audio, ctx } = makeReadySystem();
      const sfx = new DiscreteSFX(audio);
      sfx.startGrassRumble();
      sfx.stopGrassRumble();
      sfx.startGrassRumble();
      expect(sfx.isGrassRumbleStarted).toBe(true);
      expect(ctx.createBufferSource).toHaveBeenCalledTimes(2);
    });
  });
});
