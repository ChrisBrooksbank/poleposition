// VoiceAnnouncements — synthesized retro voice for "Qualifying Start" and "Grand Prix Start"
//
// Mimics the Namco 52XX custom PCM chip by:
//   1. Mixing pitched sine waves with band-pass filtered noise (phoneme synthesis)
//   2. Quantizing samples to 4-bit resolution (16 discrete levels)
//   3. Routing through a low-pass filter at ~1200 Hz

import { AudioSystem, AudioChannel } from './AudioSystem';

// ─── Exported constants (used by tests) ──────────────────────────────────────

/** Low-pass filter cutoff Hz to simulate Namco 52XX 4-bit PCM character. */
export const VOICE_LOWPASS_FREQ = 1200;

/** Number of quantization bits (4-bit → 16 discrete amplitude levels). */
export const VOICE_QUANTIZE_BITS = 4;

/** Peak output gain routed to the SFX channel. */
export const VOICE_PEAK_GAIN = 0.55;

/** Duration of "Qualifying Start" announcement in seconds. */
export const QUALIFYING_START_DURATION_S = 2.9;

/** Duration of "Grand Prix Start" announcement in seconds. */
export const GRAND_PRIX_START_DURATION_S = 3.8;

// ─── Phoneme type ─────────────────────────────────────────────────────────────

/**
 * A single phoneme segment.
 * - pitch_hz: fundamental frequency (0 = unvoiced / near-silent)
 * - noiseRatio: 0 = pure tone, 1 = pure noise (voiced–unvoiced blend)
 * - duration_s: length in seconds
 */
type Phoneme = [pitch_hz: number, noiseRatio: number, duration_s: number];

// ─── Phoneme sequences ────────────────────────────────────────────────────────

/** "QUALIFYING START" — 13 phoneme segments, total ~2.9 s */
const QUALIFYING_START_PHONEMES: Phoneme[] = [
  // QUAL-
  [180, 0.85, 0.06], // Q  (unvoiced plosive noise)
  [220, 0.25, 0.14], // WA (rounded vowel)
  [240, 0.2, 0.09], // L  (lateral liquid)
  // -I-
  [260, 0.1, 0.09], // IH (short vowel)
  // -FY-
  [160, 0.75, 0.08], // F  (unvoiced fricative)
  [245, 0.2, 0.11], // Y  (glide)
  // -ING
  [230, 0.1, 0.11], // IH (short vowel)
  [210, 0.35, 0.13], // NG (nasal, formant blend)
  // (gap between words)
  [0, 1.0, 0.16], // silence (near-silent noise floor)
  // START
  [0, 0.92, 0.07], // ST (unvoiced stop + fricative)
  [215, 0.18, 0.15], // AH (open vowel)
  [205, 0.28, 0.11], // R  (rhotic approximant)
  [0, 0.65, 0.09], // T  (unvoiced stop)
];

/** "GRAND PRIX START" — 12 phoneme segments, total ~3.8 s */
const GRAND_PRIX_START_PHONEMES: Phoneme[] = [
  // GRAND
  [190, 0.55, 0.08], // G  (voiced plosive)
  [230, 0.12, 0.15], // RA (open vowel + rhotic)
  [215, 0.3, 0.11], // N  (nasal)
  [0, 0.82, 0.08], // D  (unvoiced stop release)
  // (gap)
  [0, 1.0, 0.18], // silence
  // PRIX
  [170, 0.5, 0.08], // PR (bilabial stop)
  [255, 0.1, 0.18], // EE (front vowel, longer)
  // (gap)
  [0, 1.0, 0.18], // silence
  // START
  [0, 0.92, 0.07], // ST (unvoiced stop + fricative)
  [215, 0.18, 0.17], // AH (open vowel)
  [205, 0.28, 0.12], // R  (rhotic approximant)
  [0, 0.65, 0.1], // T  (unvoiced stop)
];

// ─── VoiceAnnouncements ───────────────────────────────────────────────────────

/**
 * Synthesizes retro PCM-style voice announcements for the two race-start calls.
 *
 * Each announcement builds a custom AudioBuffer by:
 *   1. Iterating over a phoneme table, mixing sine tone + white noise per sample
 *   2. Applying a short per-phoneme amplitude envelope (attack + release)
 *   3. Quantizing every sample to VOICE_QUANTIZE_BITS (4-bit → 16 levels)
 *
 * The buffer is then played through a BiquadFilter (lowpass at VOICE_LOWPASS_FREQ)
 * and a GainNode routed to the SFX channel.  All nodes disconnect on `onended`.
 */
export class VoiceAnnouncements {
  constructor(private readonly _audio: AudioSystem) {}

  // ─── Public API ────────────────────────────────────────────────────────────

  /** Play the "QUALIFYING START" announcement (~2.9 s). */
  triggerQualifyingStart(): void {
    this._play(QUALIFYING_START_PHONEMES);
  }

  /** Play the "GRAND PRIX START" announcement (~3.8 s). */
  triggerGrandPrixStart(): void {
    this._play(GRAND_PRIX_START_PHONEMES);
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private _play(phonemes: Phoneme[]): void {
    if (!this._audio.isReady) return;
    const ctx = this._audio.context;
    const channelInput = this._audio.getChannelInput(AudioChannel.SFX);

    // Build the synthesized + quantized PCM buffer
    const buffer = this._buildVoiceBuffer(ctx, phonemes);

    // Low-pass filter — trims high-frequency content to match retro hardware
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = VOICE_LOWPASS_FREQ;

    // Gain — constant output level (voice audio has its own per-sample amplitude)
    const gain = ctx.createGain();
    gain.gain.value = VOICE_PEAK_GAIN;

    // Wire: source → filter → gain → SFX channel
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = false;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(channelInput);
    source.start();

    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  /**
   * Build a mono AudioBuffer containing all phonemes concatenated, with
   * 4-bit quantization applied to each sample.
   */
  _buildVoiceBuffer(ctx: AudioContext, phonemes: Phoneme[]): AudioBuffer {
    const sr = ctx.sampleRate;
    const totalSamples = phonemes.reduce((sum, [, , dur]) => sum + Math.floor(sr * dur), 0);
    const buffer = ctx.createBuffer(1, Math.max(totalSamples, 1), sr);
    const data = buffer.getChannelData(0);

    // Quantization: map [-1, 1] to [-maxLevel, maxLevel] with VOICE_QUANTIZE_BITS
    const levels = Math.pow(2, VOICE_QUANTIZE_BITS - 1); // e.g. 8 for 4-bit
    const quantize = (v: number): number => Math.round(v * levels) / levels;

    let offset = 0;
    const attackDurationS = 0.005; // 5 ms attack
    const releaseDurationS = 0.005; // 5 ms release

    for (const [pitch, noiseRatio, duration] of phonemes) {
      const numSamples = Math.floor(sr * duration);
      const attackSamples = Math.floor(sr * attackDurationS);
      const releaseSamples = Math.floor(sr * releaseDurationS);
      const toneRatio = 1 - noiseRatio;

      for (let i = 0; i < numSamples; i++) {
        // Per-phoneme amplitude envelope
        let env = 1;
        if (i < attackSamples) {
          env = i / attackSamples;
        } else if (i > numSamples - releaseSamples) {
          env = (numSamples - i) / releaseSamples;
        }

        // Voiced component: sine at pitch (0 for unvoiced phonemes)
        const t = i / sr;
        const tone = pitch > 0 ? Math.sin(2 * Math.PI * pitch * t) : 0;

        // Unvoiced component: white noise scaled to [-1, 1]
        // Using Math.random() to keep the implementation simple and testable.
        // The quantization and low-pass filter are what shape the retro character.
        const noise = Math.random() * 2 - 1;

        const raw = (tone * toneRatio + noise * noiseRatio) * env;

        data[offset + i] = quantize(Math.max(-1, Math.min(1, raw)));
      }
      offset += numSamples;
    }

    return buffer;
  }
}
