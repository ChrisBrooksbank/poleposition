import { describe, it, expect, vi } from 'vitest';
import {
  ChiptuneMusic,
  SCHEDULE_AHEAD_S,
  TRACK_LOOP_DURATIONS,
  type MusicTrack,
} from '../src/audio/ChiptuneMusic';
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

interface FakeOscillatorNode {
  type: OscillatorType;
  frequency: FakeAudioParam;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
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

function makeFakeContext(
  state: 'running' | 'suspended' = 'running',
  currentTime = 0
): FakeAudioContext {
  return {
    state,
    destination: {},
    currentTime,
    sampleRate: 44100,
    createGain: vi.fn(() => makeFakeGain()),
    createBiquadFilter: vi.fn(),
    createBuffer: vi.fn(),
    createBufferSource: vi.fn(),
    createOscillator: vi.fn(() => makeFakeOscillator()),
    resume: vi.fn(() => Promise.resolve()),
  };
}

function makeReadySystem(currentTime = 0): { audio: AudioSystem; ctx: FakeAudioContext } {
  const ctx = makeFakeContext('running', currentTime);
  const audio = new AudioSystem(() => ctx as unknown as AudioContext);
  audio.resume();
  return { audio, ctx };
}

// ─── Constants ────────────────────────────────────────────────────────────────

describe('ChiptuneMusic constants', () => {
  it('SCHEDULE_AHEAD_S is a small positive value', () => {
    expect(SCHEDULE_AHEAD_S).toBeGreaterThan(0);
    expect(SCHEDULE_AHEAD_S).toBeLessThan(2);
  });

  it('name_entry_1st loop is approximately 27–29 seconds', () => {
    expect(TRACK_LOOP_DURATIONS.name_entry_1st).toBeGreaterThanOrEqual(27);
    expect(TRACK_LOOP_DURATIONS.name_entry_1st).toBeLessThanOrEqual(29);
  });

  it('name_entry_top6 loop is approximately 25–29 seconds', () => {
    expect(TRACK_LOOP_DURATIONS.name_entry_top6).toBeGreaterThanOrEqual(25);
    expect(TRACK_LOOP_DURATIONS.name_entry_top6).toBeLessThanOrEqual(29);
  });

  it('name_entry_standard loop is approximately 36–41 seconds', () => {
    expect(TRACK_LOOP_DURATIONS.name_entry_standard).toBeGreaterThanOrEqual(36);
    expect(TRACK_LOOP_DURATIONS.name_entry_standard).toBeLessThanOrEqual(41);
  });

  it('game_over has loopDuration 0 (no loop)', () => {
    expect(TRACK_LOOP_DURATIONS.game_over).toBe(0);
  });

  it('all three name entry loops are distinct durations', () => {
    const { name_entry_1st, name_entry_top6, name_entry_standard } = TRACK_LOOP_DURATIONS;
    expect(name_entry_1st).not.toBeCloseTo(name_entry_top6, 0);
    expect(name_entry_top6).not.toBeCloseTo(name_entry_standard, 0);
  });
});

// ─── Not-ready guard ─────────────────────────────────────────────────────────

describe('ChiptuneMusic — not ready guard', () => {
  it('play() does nothing when AudioSystem is not ready', () => {
    const ctx = makeFakeContext('suspended');
    const audio = new AudioSystem(() => ctx as unknown as AudioContext);
    const music = new ChiptuneMusic(audio);
    music.play('name_entry_1st');
    expect(ctx.createOscillator).not.toHaveBeenCalled();
    expect(music.isPlaying).toBe(false);
  });

  it('update() does nothing when not playing', () => {
    const { audio, ctx } = makeReadySystem();
    const music = new ChiptuneMusic(audio);
    music.update();
    // AudioSystem gain nodes created during resume; no oscillators yet
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });

  it('stop() is safe to call before play()', () => {
    const { audio } = makeReadySystem();
    const music = new ChiptuneMusic(audio);
    expect(() => music.stop()).not.toThrow();
  });
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe('ChiptuneMusic — initial state', () => {
  it('isPlaying is false before any play() call', () => {
    const { audio } = makeReadySystem();
    const music = new ChiptuneMusic(audio);
    expect(music.isPlaying).toBe(false);
  });

  it('currentTrack is null before any play() call', () => {
    const { audio } = makeReadySystem();
    const music = new ChiptuneMusic(audio);
    expect(music.currentTrack).toBeNull();
  });
});

// ─── play() ───────────────────────────────────────────────────────────────────

describe('ChiptuneMusic.play()', () => {
  const LOOPING_TRACKS: MusicTrack[] = ['name_entry_1st', 'name_entry_top6', 'name_entry_standard'];

  it('sets isPlaying to true', () => {
    const { audio } = makeReadySystem();
    const music = new ChiptuneMusic(audio);
    music.play('name_entry_1st');
    expect(music.isPlaying).toBe(true);
  });

  it('sets currentTrack to the requested track', () => {
    const { audio } = makeReadySystem();
    const music = new ChiptuneMusic(audio);
    music.play('name_entry_top6');
    expect(music.currentTrack).toBe('name_entry_top6');
  });

  it('creates oscillators when playing a looping track', () => {
    const { audio, ctx } = makeReadySystem();
    const music = new ChiptuneMusic(audio);
    music.play('name_entry_1st');
    expect(ctx.createOscillator).toHaveBeenCalled();
  });

  it('creates oscillators when playing game_over', () => {
    const { audio, ctx } = makeReadySystem();
    const music = new ChiptuneMusic(audio);
    music.play('game_over');
    expect(ctx.createOscillator).toHaveBeenCalled();
  });

  it('assigns onended handler to each oscillator for cleanup', () => {
    const { audio, ctx } = makeReadySystem();
    const music = new ChiptuneMusic(audio);
    music.play('name_entry_1st');
    for (const result of ctx.createOscillator.mock.results) {
      expect((result.value as FakeOscillatorNode).onended).toBeTypeOf('function');
    }
  });

  it.each(LOOPING_TRACKS)('all three looping tracks create oscillators: %s', (track) => {
    const { audio, ctx } = makeReadySystem();
    const music = new ChiptuneMusic(audio);
    music.play(track);
    expect(ctx.createOscillator.mock.calls.length).toBeGreaterThan(0);
  });

  it('switches track: stops previous oscillators and creates new ones', () => {
    const { audio, ctx } = makeReadySystem();
    const music = new ChiptuneMusic(audio);

    music.play('name_entry_1st');
    const firstCallCount = ctx.createOscillator.mock.calls.length;

    // Manually fire onended to simulate completion so stop() doesn't skip them
    const firstOscs = ctx.createOscillator.mock.results.map((r) => r.value as FakeOscillatorNode);

    music.play('name_entry_top6');

    // Each first-round oscillator should have been stopped
    for (const osc of firstOscs) {
      expect(osc.stop).toHaveBeenCalled();
    }

    // New oscillators were created for the second track
    expect(ctx.createOscillator.mock.calls.length).toBeGreaterThan(firstCallCount);
    expect(music.currentTrack).toBe('name_entry_top6');
  });
});

// ─── stop() ───────────────────────────────────────────────────────────────────

describe('ChiptuneMusic.stop()', () => {
  it('sets isPlaying to false', () => {
    const { audio } = makeReadySystem();
    const music = new ChiptuneMusic(audio);
    music.play('name_entry_1st');
    music.stop();
    expect(music.isPlaying).toBe(false);
  });

  it('sets currentTrack to null', () => {
    const { audio } = makeReadySystem();
    const music = new ChiptuneMusic(audio);
    music.play('name_entry_1st');
    music.stop();
    expect(music.currentTrack).toBeNull();
  });

  it('calls stop() on each active oscillator', () => {
    const { audio, ctx } = makeReadySystem();
    const music = new ChiptuneMusic(audio);
    music.play('game_over');
    const oscs = ctx.createOscillator.mock.results.map((r) => r.value as FakeOscillatorNode);
    music.stop();
    for (const osc of oscs) {
      expect(osc.stop).toHaveBeenCalled();
    }
  });

  it('is idempotent — calling stop() twice does not throw', () => {
    const { audio } = makeReadySystem();
    const music = new ChiptuneMusic(audio);
    music.play('name_entry_1st');
    music.stop();
    expect(() => music.stop()).not.toThrow();
  });

  it('after stop(), play() can restart cleanly', () => {
    const { audio, ctx } = makeReadySystem();
    const music = new ChiptuneMusic(audio);
    music.play('name_entry_1st');
    music.stop();
    ctx.createOscillator.mockClear();
    music.play('name_entry_1st');
    expect(music.isPlaying).toBe(true);
    expect(ctx.createOscillator).toHaveBeenCalled();
  });
});

// ─── update() — looping ───────────────────────────────────────────────────────

describe('ChiptuneMusic.update() — loop scheduling', () => {
  it('does not re-schedule when far from loop end', () => {
    // Play at t=0; loopEndTime = loopDuration. currentTime stays at 0.
    const ctx = makeFakeContext('running', 0);
    const audio = new AudioSystem(() => ctx as unknown as AudioContext);
    audio.resume();
    const music = new ChiptuneMusic(audio);
    music.play('name_entry_1st');
    const countAfterPlay = ctx.createOscillator.mock.calls.length;

    // t=0 is well before loopEnd (~28s) - no reschedule
    music.update();

    expect(ctx.createOscillator.mock.calls.length).toBe(countAfterPlay);
  });

  it('schedules next iteration when currentTime is near loop end', () => {
    const loopDur = TRACK_LOOP_DURATIONS.name_entry_1st;

    // Play at t=0; loopEndTime = loopDur
    const ctx = makeFakeContext('running', 0);
    const audio = new AudioSystem(() => ctx as unknown as AudioContext);
    audio.resume();
    const music = new ChiptuneMusic(audio);
    music.play('name_entry_1st');
    const countAfterPlay = ctx.createOscillator.mock.calls.length;

    // Simulate time advancing to just past the reschedule threshold
    ctx.currentTime = loopDur - SCHEDULE_AHEAD_S + 0.01;
    music.update();

    expect(ctx.createOscillator.mock.calls.length).toBeGreaterThan(countAfterPlay);
  });

  it('does not re-schedule for game_over (non-looping)', () => {
    const ctx = makeFakeContext('running', 0);
    const audio = new AudioSystem(() => ctx as unknown as AudioContext);
    audio.resume();
    const music = new ChiptuneMusic(audio);
    music.play('game_over');
    const countAfterPlay = ctx.createOscillator.mock.calls.length;

    // Even far in the future, non-looping track never reschedules
    ctx.currentTime = 999;
    music.update();

    expect(ctx.createOscillator.mock.calls.length).toBe(countAfterPlay);
  });

  it('is a no-op when not playing', () => {
    const { audio, ctx } = makeReadySystem();
    const music = new ChiptuneMusic(audio);
    music.update();
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });

  it('advances loopEndTime after re-scheduling', () => {
    const loopDur = TRACK_LOOP_DURATIONS.name_entry_1st;

    // Play at t=0; loopEndTime = loopDur
    const ctx = makeFakeContext('running', 0);
    const audio = new AudioSystem(() => ctx as unknown as AudioContext);
    audio.resume();
    const music = new ChiptuneMusic(audio);
    music.play('name_entry_1st');

    // Advance time to trigger first reschedule
    ctx.currentTime = loopDur - SCHEDULE_AHEAD_S + 0.01;
    music.update();
    const afterFirst = ctx.createOscillator.mock.calls.length;

    // A second update at the same time should NOT reschedule again
    // (loopEndTime was advanced by one full loopDuration)
    music.update();
    expect(ctx.createOscillator.mock.calls.length).toBe(afterFirst);
  });
});

// ─── onended cleanup ─────────────────────────────────────────────────────────

describe('ChiptuneMusic — oscillator cleanup on onended', () => {
  it('onended disconnects oscillator and gain node', () => {
    const { audio, ctx } = makeReadySystem();
    const music = new ChiptuneMusic(audio);
    music.play('game_over');

    const osc = ctx.createOscillator.mock.results[0]?.value as FakeOscillatorNode;
    osc.onended!();

    expect(osc.disconnect).toHaveBeenCalled();
  });
});
