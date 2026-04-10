// EngineSound — Continuous sawtooth oscillator mapped to car speed

import { AudioSystem, AudioChannel } from './AudioSystem';

/** Oscillator frequency (Hz) when the car is stationary (idle tone). */
export const ENGINE_IDLE_FREQ = 80;
/** Oscillator frequency (Hz) at the maximum speed of 225 MPH. */
export const ENGINE_MAX_FREQ = 420;

/** Speed at which ENGINE_MAX_FREQ is reached (MPH). Must match PlayerPhysics.topSpeedHighGear. */
const MAX_SPEED_MPH = 225;

/** Web Audio exponential time-constant (seconds) for smooth pitch transitions. */
const FREQ_SMOOTH_TC = 0.08;

/**
 * Map a car speed in MPH to an oscillator frequency in Hz.
 * Linear interpolation: 0 MPH → ENGINE_IDLE_FREQ, MAX_SPEED_MPH → ENGINE_MAX_FREQ.
 */
export function speedToFrequency(speedMph: number): number {
  const clamped = Math.max(0, Math.min(speedMph, MAX_SPEED_MPH));
  return ENGINE_IDLE_FREQ + (clamped / MAX_SPEED_MPH) * (ENGINE_MAX_FREQ - ENGINE_IDLE_FREQ);
}

/** Procedural engine sound: a continuous sawtooth oscillator whose pitch tracks car speed. */
export class EngineSound {
  private _oscillator: OscillatorNode | null = null;
  private _gainNode: GainNode | null = null;
  private _started = false;

  constructor(private readonly _audio: AudioSystem) {}

  /**
   * Create and start the oscillator at idle pitch.
   * Must be called after AudioSystem.resume() so the context is running.
   * Idempotent — safe to call multiple times.
   */
  start(): void {
    if (this._started || !this._audio.isReady) return;

    const ctx = this._audio.context;
    const channelInput = this._audio.getChannelInput(AudioChannel.ENGINE);

    // Gain node keeps engine volume at a comfortable level below channel ceiling
    this._gainNode = ctx.createGain();
    this._gainNode.gain.value = 0.35;
    this._gainNode.connect(channelInput);

    // Sawtooth waveform — rich harmonics suit the arcade engine character
    this._oscillator = ctx.createOscillator();
    this._oscillator.type = 'sawtooth';
    this._oscillator.frequency.value = ENGINE_IDLE_FREQ;
    this._oscillator.connect(this._gainNode);
    this._oscillator.start();

    this._started = true;
  }

  /** Stop and disconnect the oscillator. Idempotent — safe to call multiple times. */
  stop(): void {
    if (!this._started) return;
    try {
      this._oscillator?.stop();
    } catch {
      // Oscillator may have already stopped; ignore the error
    }
    this._oscillator?.disconnect();
    this._gainNode?.disconnect();
    this._oscillator = null;
    this._gainNode = null;
    this._started = false;
  }

  /**
   * Smoothly update the engine pitch to match the current car speed.
   * Call once per game-loop frame during active gameplay.
   *
   * @param speedMph Car speed in MPH (0–225).
   */
  update(speedMph: number): void {
    if (!this._oscillator || !this._audio.isReady) return;
    const ctx = this._audio.context;
    const targetFreq = speedToFrequency(speedMph);
    this._oscillator.frequency.setTargetAtTime(targetFreq, ctx.currentTime, FREQ_SMOOTH_TC);
  }

  /** Whether the oscillator is currently running. */
  get isStarted(): boolean {
    return this._started;
  }
}
