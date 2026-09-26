// DiscreteSFX — Discrete one-shot SFX and looping grass rumble

import { AudioSystem, AudioChannel } from './AudioSystem';
import { fillLFSRBuffer } from './TireScreech';

// ─── Note frequencies (Hz) ────────────────────────────────────────────────────
// prettier-ignore
const N = {
  C4: 261.63, E4: 329.63, G4: 392.0,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 784.0,
  A5: 880.0,  B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.51,
} as const;

/** A single scheduled note: [frequency_hz, start_offset_s, duration_s] */
type Note = [number, number, number];

// ─── Note sequences ──────────────────────────────────────────────────────────

/** Coin insert: 4-note ascending arpeggio (~1.2s) */
const COIN_INSERT_SEQ: Note[] = [
  [N.C5, 0.0, 0.18],
  [N.E5, 0.2, 0.18],
  [N.G5, 0.4, 0.18],
  [N.C6, 0.6, 0.55],
];

/** Qualifying start fanfare: ascending chiptune jingle (~6s) */
const QUALIFYING_FANFARE_SEQ: Note[] = [
  [N.C4, 0.0, 0.15],
  [N.G4, 0.18, 0.15],
  [N.C5, 0.36, 0.3],
  [N.E5, 0.75, 0.2],
  [N.G5, 1.0, 0.2],
  [N.C6, 1.25, 0.4],
  [N.G5, 1.8, 0.15],
  [N.E5, 2.0, 0.15],
  [N.C5, 2.2, 0.15],
  [N.G5, 2.45, 0.15],
  [N.E5, 2.65, 0.15],
  [N.C5, 2.85, 0.15],
  [N.C5, 3.15, 0.25],
  [N.G5, 3.55, 0.25],
  [N.C6, 3.95, 0.45],
  [N.G5, 4.55, 0.15],
  [N.E5, 4.75, 0.15],
  [N.G5, 4.95, 0.15],
  [N.C6, 5.25, 0.75],
];

/** Qualifying complete — non-pole: modest descending/resolving jingle (~4s) */
const QUAL_COMPLETE_NON_POLE_SEQ: Note[] = [
  [N.C5, 0.0, 0.15],
  [N.D5, 0.2, 0.15],
  [N.E5, 0.4, 0.3],
  [N.D5, 0.8, 0.15],
  [N.C5, 1.0, 0.45],
  [N.G4, 1.6, 0.15],
  [N.C5, 1.85, 0.15],
  [N.E5, 2.1, 0.45],
  [N.C5, 2.75, 0.15],
  [N.E5, 3.0, 0.15],
  [N.G5, 3.25, 0.7],
];

/** Qualifying complete — pole position: triumphant ascending major jingle (~4s) */
const QUAL_COMPLETE_POLE_SEQ: Note[] = [
  [N.C5, 0.0, 0.1],
  [N.E5, 0.15, 0.1],
  [N.G5, 0.3, 0.1],
  [N.C6, 0.45, 0.3],
  [N.B5, 0.85, 0.1],
  [N.C6, 1.0, 0.1],
  [N.D6, 1.15, 0.3],
  [N.E6, 1.55, 0.15],
  [N.D6, 1.75, 0.1],
  [N.C6, 1.9, 0.1],
  [N.B5, 2.05, 0.1],
  [N.C6, 2.25, 0.15],
  [N.G5, 2.45, 0.15],
  [N.E5, 2.65, 0.15],
  [N.C5, 2.9, 0.1],
  [N.E5, 3.05, 0.1],
  [N.G5, 3.2, 0.1],
  [N.C6, 3.35, 0.65],
];

/** Race complete: celebratory ascending jingle (~4s) */
const RACE_COMPLETE_SEQ: Note[] = [
  [N.G5, 0.0, 0.2],
  [N.E5, 0.25, 0.2],
  [N.C5, 0.5, 0.2],
  [N.G5, 0.8, 0.15],
  [N.A5, 1.0, 0.15],
  [N.B5, 1.2, 0.15],
  [N.C6, 1.4, 0.4],
  [N.G5, 1.95, 0.15],
  [N.E5, 2.15, 0.15],
  [N.C5, 2.35, 0.15],
  [N.E5, 2.6, 0.15],
  [N.G5, 2.8, 0.15],
  [N.C6, 3.0, 0.15],
  [N.E6, 3.2, 0.8],
];

/** Time extend: fast ascending arpeggio (~3s) */
const TIME_EXTEND_SEQ: Note[] = [
  [N.C5, 0.0, 0.1],
  [N.E5, 0.12, 0.1],
  [N.G5, 0.24, 0.1],
  [N.C6, 0.36, 0.1],
  [N.E6, 0.48, 0.1],
  [N.G5, 0.6, 0.1],
  [N.C6, 0.72, 0.1],
  [N.E6, 0.84, 0.15],
  [N.C5, 1.1, 0.08],
  [N.E5, 1.19, 0.08],
  [N.G5, 1.28, 0.08],
  [N.C6, 1.37, 0.08],
  [N.E6, 1.46, 0.3],
  [N.C5, 1.9, 0.06],
  [N.E5, 1.97, 0.06],
  [N.G5, 2.04, 0.06],
  [N.C6, 2.11, 0.06],
  [N.D6, 2.18, 0.06],
  [N.E6, 2.25, 0.7],
];

// ─── Exported constants (used by tests) ──────────────────────────────────────

/** Countdown beep frequency in Hz. */
export const COUNTDOWN_BEEP_FREQ = 880;
/** Countdown beep note duration in seconds. */
export const COUNTDOWN_BEEP_DURATION_S = 0.15;

/** Time bonus tick frequency in Hz. */
export const TIME_BONUS_TICK_FREQ = 1000;
/** Overtake tick frequency in Hz (distinct pitch from time bonus). */
export const OVERTAKE_TICK_FREQ = 1500;
/** Duration of each tick note in seconds. */
export const TICK_DURATION_S = 0.12;
/** Peak gain of each tick note. */
export const TICK_PEAK_GAIN = 0.4;

/** Grass rumble low-pass filter cutoff in Hz. */
export const GRASS_RUMBLE_FILTER_FREQ = 200;
/** Grass rumble peak gain when off-road. */
export const GRASS_RUMBLE_GAIN = 0.4;

/** Puddle hit high-pass filter cutoff in Hz. */
export const PUDDLE_FILTER_FREQ = 3000;
/** Puddle hit noise burst duration in seconds. */
export const PUDDLE_DURATION_S = 0.8;
/** Puddle hit burst peak gain. */
export const PUDDLE_BURST_GAIN = 0.6;

// ─── Internal constants ───────────────────────────────────────────────────────

const GRASS_RUMBLE_BUFFER_SECONDS = 2;
const GRASS_GAIN_SMOOTH_TC = 0.05;

// ─── DiscreteSFX ─────────────────────────────────────────────────────────────

/**
 * Discrete one-shot sound effects and the looping grass rumble.
 *
 * One-shot SFX use Web Audio API scheduling to queue multi-note sequences or
 * single-buffer noise bursts.  Nodes are self-cleaning via `onended`.
 *
 * The grass rumble is a persistent looping noise source (like TireScreech)
 * that is switched on/off each frame via `updateGrassRumble(isOffRoad)`.
 */
export class DiscreteSFX {
  // ─── Grass rumble state ─────────────────────────────────────────────────────
  private _grassSource: AudioBufferSourceNode | null = null;
  private _grassFilter: BiquadFilterNode | null = null;
  private _grassGain: GainNode | null = null;
  private _grassStarted = false;

  constructor(private readonly _audio: AudioSystem) {}

  // ─── Internal helpers ───────────────────────────────────────────────────────

  /**
   * Schedule a single oscillator note into `dest` at absolute audio time `when`.
   * The note has a short 5 ms attack and decays exponentially over `duration` s.
   * Nodes self-disconnect via `onended` to avoid audio-graph leaks.
   */
  private _scheduleNote(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    when: number,
    duration: number,
    peakGain = 0.5,
    type: OscillatorType = 'square'
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    // Envelope: near-silent → peak (5 ms attack) → near-silent (exponential decay)
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(peakGain, when + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(when);
    osc.stop(when + duration + 0.01);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  /**
   * Schedule every note in `seq` relative to `ctx.currentTime`.
   * Does nothing if AudioSystem is not ready.
   */
  private _playSequence(seq: Note[], peakGain = 0.5, type: OscillatorType = 'square'): void {
    if (!this._audio.isReady) return;
    const ctx = this._audio.context;
    const dest = this._audio.getChannelInput(AudioChannel.SFX);
    const t0 = ctx.currentTime;
    for (const [freq, offset, dur] of seq) {
      this._scheduleNote(ctx, dest, freq, t0 + offset, dur, peakGain, type);
    }
  }

  // ─── One-shot SFX ──────────────────────────────────────────────────────────

  /** Short ascending 4-note arpeggio for credit/coin insert (~1.2s). */
  triggerCoinInsert(): void {
    this._playSequence(COIN_INSERT_SEQ, 0.5);
  }

  /** ~6s chiptune fanfare played at the start of qualifying. */
  triggerQualifyingFanfare(): void {
    this._playSequence(QUALIFYING_FANFARE_SEQ, 0.5);
  }

  /**
   * Single countdown beep (~0.15s).
   * Call once per countdown tick (e.g. at 3, 2, 1 and GO).
   */
  triggerCountdownBeep(): void {
    if (!this._audio.isReady) return;
    const ctx = this._audio.context;
    const dest = this._audio.getChannelInput(AudioChannel.SFX);
    this._scheduleNote(
      ctx,
      dest,
      COUNTDOWN_BEEP_FREQ,
      ctx.currentTime,
      COUNTDOWN_BEEP_DURATION_S,
      0.6
    );
  }

  /** Higher, longer beep for the green light at the start of a race. */
  triggerGoBeep(): void {
    if (!this._audio.isReady) return;
    const ctx = this._audio.context;
    const dest = this._audio.getChannelInput(AudioChannel.SFX);
    this._scheduleNote(ctx, dest, COUNTDOWN_BEEP_FREQ * 2, ctx.currentTime, 0.5, 0.6);
  }

  /**
   * ~4s jingle played when qualifying ends.
   * @param isPole true for the triumphant pole-position variant.
   */
  triggerQualifyingComplete(isPole: boolean): void {
    this._playSequence(isPole ? QUAL_COMPLETE_POLE_SEQ : QUAL_COMPLETE_NON_POLE_SEQ, 0.5);
  }

  /** ~4s celebratory jingle played when all Grand Prix laps are complete. */
  triggerRaceComplete(): void {
    this._playSequence(RACE_COMPLETE_SEQ, 0.5);
  }

  /** ~3s fast ascending arpeggio for time-extend bonus. */
  triggerTimeExtend(): void {
    this._playSequence(TIME_EXTEND_SEQ, 0.45, 'sawtooth');
  }

  /** ~0.8s high-pass white-noise burst for puddle hit. */
  triggerPuddleHit(): void {
    if (!this._audio.isReady) return;
    const ctx = this._audio.context;
    const channelInput = this._audio.getChannelInput(AudioChannel.SFX);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(PUDDLE_BURST_GAIN, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + PUDDLE_DURATION_S);
    gainNode.connect(channelInput);

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = PUDDLE_FILTER_FREQ;
    filter.connect(gainNode);

    const frameCount = Math.floor(ctx.sampleRate * PUDDLE_DURATION_S);
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = false;
    source.connect(filter);
    source.start();

    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gainNode.disconnect();
    };
  }

  /** Short beep (~0.12s) for time bonus scoring tick. */
  triggerTimeBonusTick(): void {
    if (!this._audio.isReady) return;
    const ctx = this._audio.context;
    const dest = this._audio.getChannelInput(AudioChannel.SFX);
    this._scheduleNote(
      ctx,
      dest,
      TIME_BONUS_TICK_FREQ,
      ctx.currentTime,
      TICK_DURATION_S,
      TICK_PEAK_GAIN
    );
  }

  /** Short beep (~0.12s) at a distinct higher pitch for overtake bonus tick. */
  triggerOvertakeTick(): void {
    if (!this._audio.isReady) return;
    const ctx = this._audio.context;
    const dest = this._audio.getChannelInput(AudioChannel.SFX);
    this._scheduleNote(
      ctx,
      dest,
      OVERTAKE_TICK_FREQ,
      ctx.currentTime,
      TICK_DURATION_S,
      TICK_PEAK_GAIN
    );
  }

  // ─── Grass rumble (looping) ─────────────────────────────────────────────────

  /**
   * Create and start the looping grass rumble noise source at zero gain.
   * Call after AudioSystem.resume().  Idempotent — safe to call multiple times.
   */
  startGrassRumble(): void {
    if (this._grassStarted || !this._audio.isReady) return;

    const ctx = this._audio.context;
    const channelInput = this._audio.getChannelInput(AudioChannel.SFX);

    this._grassGain = ctx.createGain();
    this._grassGain.gain.value = 0;
    this._grassGain.connect(channelInput);

    this._grassFilter = ctx.createBiquadFilter();
    this._grassFilter.type = 'lowpass';
    this._grassFilter.frequency.value = GRASS_RUMBLE_FILTER_FREQ;
    this._grassFilter.connect(this._grassGain);

    const frameCount = Math.floor(ctx.sampleRate * GRASS_RUMBLE_BUFFER_SECONDS);
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    fillLFSRBuffer(buffer);

    this._grassSource = ctx.createBufferSource();
    this._grassSource.buffer = buffer;
    this._grassSource.loop = true;
    this._grassSource.connect(this._grassFilter);
    this._grassSource.start();

    this._grassStarted = true;
  }

  /** Stop and disconnect the grass rumble source.  Idempotent. */
  stopGrassRumble(): void {
    if (!this._grassStarted) return;
    try {
      this._grassSource?.stop();
    } catch {
      // Source may already be stopped — ignore
    }
    this._grassSource?.disconnect();
    this._grassFilter?.disconnect();
    this._grassGain?.disconnect();
    this._grassSource = null;
    this._grassFilter = null;
    this._grassGain = null;
    this._grassStarted = false;
  }

  /**
   * Enable or disable the grass rumble based on off-road state.
   * Call each frame during gameplay.
   *
   * @param isOffRoad Whether the player is currently driving on grass.
   */
  updateGrassRumble(isOffRoad: boolean): void {
    if (!this._grassGain || !this._audio.isReady) return;
    const ctx = this._audio.context;
    const target = isOffRoad ? GRASS_RUMBLE_GAIN : 0;
    this._grassGain.gain.setTargetAtTime(target, ctx.currentTime, GRASS_GAIN_SMOOTH_TC);
  }

  /** Whether the grass rumble source is currently running. */
  get isGrassRumbleStarted(): boolean {
    return this._grassStarted;
  }
}
