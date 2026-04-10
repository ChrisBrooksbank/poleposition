// TireScreech — band-pass filtered LFSR noise triggered during sharp turns

import { AudioSystem, AudioChannel } from './AudioSystem';

/** Minimum absolute steering input (0–1) before screech activates. */
export const SCREECH_THRESHOLD = 0.3;
/** Maximum gain of the screech sound at full turn input. */
export const SCREECH_MAX_GAIN = 0.5;
/** Band-pass filter center frequency in Hz — sculpts noise into tire squeal character. */
export const SCREECH_FILTER_FREQ = 1200;
/** Band-pass filter Q factor (narrowness). */
export const SCREECH_FILTER_Q = 3.0;
/** Noise buffer duration in seconds (loops seamlessly). */
const NOISE_BUFFER_SECONDS = 2;
/** Gain smoothing time-constant in seconds (prevents clicks on sharp transitions). */
const GAIN_SMOOTH_TC = 0.04;

/**
 * Fill an AudioBuffer with LFSR-generated noise.
 * Uses a 16-bit maximal-length Galois LFSR (polynomial 0xB400) to produce
 * a deterministic pseudo-random sequence that approximates the Namco 54XX noise chip.
 */
export function fillLFSRBuffer(buffer: AudioBuffer): void {
  const data = buffer.getChannelData(0);
  let lfsr = 0xace1; // non-zero seed
  for (let i = 0; i < data.length; i++) {
    const lsb = lfsr & 1;
    lfsr >>>= 1;
    if (lsb) lfsr ^= 0xb400;
    // Normalize to [-1, 1]
    data[i] = (lfsr & 0xffff) / 0x8000 - 1.0;
  }
}

/** Procedural tire screech: looping LFSR noise through a band-pass filter, gain-controlled by turn sharpness. */
export class TireScreech {
  private _source: AudioBufferSourceNode | null = null;
  private _filter: BiquadFilterNode | null = null;
  private _gainNode: GainNode | null = null;
  private _started = false;

  constructor(private readonly _audio: AudioSystem) {}

  /**
   * Create and start the looping noise source at zero gain (silent until update() drives it).
   * Must be called after AudioSystem.resume(). Idempotent — safe to call multiple times.
   */
  start(): void {
    if (this._started || !this._audio.isReady) return;

    const ctx = this._audio.context;
    const channelInput = this._audio.getChannelInput(AudioChannel.SFX);

    // Gain node — starts silent, driven each frame by turn sharpness
    this._gainNode = ctx.createGain();
    this._gainNode.gain.value = 0;
    this._gainNode.connect(channelInput);

    // Band-pass filter shapes the noise into a tire-screech timbre
    this._filter = ctx.createBiquadFilter();
    this._filter.type = 'bandpass';
    this._filter.frequency.value = SCREECH_FILTER_FREQ;
    this._filter.Q.value = SCREECH_FILTER_Q;
    this._filter.connect(this._gainNode);

    // LFSR noise buffer (looping)
    const frameCount = Math.floor(ctx.sampleRate * NOISE_BUFFER_SECONDS);
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    fillLFSRBuffer(buffer);

    this._source = ctx.createBufferSource();
    this._source.buffer = buffer;
    this._source.loop = true;
    this._source.connect(this._filter);
    this._source.start();

    this._started = true;
  }

  /** Stop and disconnect all nodes. Idempotent — safe to call multiple times. */
  stop(): void {
    if (!this._started) return;
    try {
      this._source?.stop();
    } catch {
      // Source may have already stopped — ignore
    }
    this._source?.disconnect();
    this._filter?.disconnect();
    this._gainNode?.disconnect();
    this._source = null;
    this._filter = null;
    this._gainNode = null;
    this._started = false;
  }

  /**
   * Update screech intensity each frame.
   *
   * @param turnInput Absolute steering input magnitude (0 = straight, 1 = full lock).
   *                  Values above 1 are clamped internally.
   * @param isOffRoad Whether the car is currently on grass (screech suppressed off-road).
   */
  update(turnInput: number, isOffRoad: boolean): void {
    if (!this._gainNode || !this._audio.isReady) return;

    const ctx = this._audio.context;
    let targetGain = 0;

    if (!isOffRoad && turnInput > SCREECH_THRESHOLD) {
      // Map (threshold..1] → [0..1] intensity, clamped at 1
      const intensity = Math.min(1, (turnInput - SCREECH_THRESHOLD) / (1 - SCREECH_THRESHOLD));
      targetGain = intensity * SCREECH_MAX_GAIN;
    }

    this._gainNode.gain.setTargetAtTime(targetGain, ctx.currentTime, GAIN_SMOOTH_TC);
  }

  /** Whether the noise source is currently running. */
  get isStarted(): boolean {
    return this._started;
  }
}
