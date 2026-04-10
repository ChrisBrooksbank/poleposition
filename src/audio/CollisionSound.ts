// CollisionSound — LFSR noise burst with exponential decay envelope (~3s)

import { AudioSystem, AudioChannel } from './AudioSystem';
import { fillLFSRBuffer } from './TireScreech';

/** Duration in seconds of the collision noise burst decay envelope. */
export const COLLISION_DECAY_DURATION = 3.0;
/** Peak gain of the collision burst at trigger time. */
export const COLLISION_BURST_GAIN = 0.8;
/** Low-pass filter cutoff frequency (Hz) to shape the noise into an explosion timbre. */
export const COLLISION_FILTER_FREQ = 600;
/** Noise buffer duration in seconds — must be >= COLLISION_DECAY_DURATION. */
const NOISE_BUFFER_SECONDS = 3;

/**
 * One-shot LFSR noise burst with exponential decay envelope (~3s).
 * Matches the Namco 54XX collision character: a low rumble that fades out.
 *
 * Calling trigger() creates fresh Web Audio nodes each time so bursts can
 * overlap naturally without managing node state. Nodes self-disconnect via
 * onended once the burst finishes.
 */
export class CollisionSound {
  constructor(private readonly _audio: AudioSystem) {}

  /**
   * Fire a collision noise burst.
   * Each call is independent — safe to call multiple times in quick succession.
   * Does nothing if AudioSystem is not ready.
   */
  trigger(): void {
    if (!this._audio.isReady) return;

    const ctx = this._audio.context;
    const channelInput = this._audio.getChannelInput(AudioChannel.SFX);

    // Gain node: starts at peak, exponentially decays to near-silence over ~3s
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(COLLISION_BURST_GAIN, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + COLLISION_DECAY_DURATION);
    gainNode.connect(channelInput);

    // Low-pass filter gives the burst a low-frequency rumble character
    // (distinct from the bandpass tire screech)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = COLLISION_FILTER_FREQ;
    filter.connect(gainNode);

    // LFSR noise buffer — one-shot (no loop)
    const frameCount = Math.floor(ctx.sampleRate * NOISE_BUFFER_SECONDS);
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    fillLFSRBuffer(buffer);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = false;
    source.connect(filter);
    source.start();

    // Clean up nodes once the burst finishes to avoid leaking audio graph objects
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gainNode.disconnect();
    };
  }
}
