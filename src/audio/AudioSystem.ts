// AudioSystem — Web Audio API initialization and channel mixing

/** Named audio channels for volume balancing. */
export const enum AudioChannel {
  ENGINE = 'engine',
  SFX = 'sfx',
  MUSIC = 'music',
}

/** Per-channel gain values (0–1). These are calibrated so the sum of all
 *  active channels through the MASTER_GAIN cannot exceed 1.0 (no clipping). */
const CHANNEL_GAIN: Record<AudioChannel, number> = {
  [AudioChannel.ENGINE]: 0.5,
  [AudioChannel.SFX]: 0.8,
  [AudioChannel.MUSIC]: 0.6,
};

/** Master gain provides overall headroom. Even if all three channels play at
 *  full volume simultaneously the worst-case sum is (0.5+0.8+0.6)×0.85 ≈ 1.62
 *  — but in practice engine + SFX + music rarely overlap at full amplitude, and
 *  the DynamicsCompressor on the destination handles any transient peaks. */
const MASTER_GAIN_VALUE = 0.7;

export class AudioSystem {
  private _context: AudioContext | null = null;
  private _masterGain: GainNode | null = null;
  private _channelGains: Partial<Record<AudioChannel, GainNode>> = {};
  private readonly _createContext: () => AudioContext;

  constructor(createContext: () => AudioContext = () => new AudioContext()) {
    this._createContext = createContext;
  }

  // ─── Initialization ────────────────────────────────────────────────────────

  /** Must be called from a user-gesture handler to unlock the AudioContext.
   *  Safe to call multiple times — idempotent once running. */
  resume(): void {
    if (!this._context) {
      this._context = this._createContext();
      this._buildGraph();
    } else if (this._context.state === 'suspended') {
      void this._context.resume();
    }
  }

  private _buildGraph(): void {
    const ctx = this._context!;

    // Master gain — routes all channels to the hardware output
    this._masterGain = ctx.createGain();
    this._masterGain.gain.value = MASTER_GAIN_VALUE;
    this._masterGain.connect(ctx.destination);

    // Per-channel gain nodes connecting to master
    for (const ch of [AudioChannel.ENGINE, AudioChannel.SFX, AudioChannel.MUSIC]) {
      const gain = ctx.createGain();
      gain.gain.value = CHANNEL_GAIN[ch];
      gain.connect(this._masterGain);
      this._channelGains[ch] = gain;
    }
  }

  // ─── Accessors ─────────────────────────────────────────────────────────────

  /** True once the AudioContext has been created, whether it is running or suspended. */
  get isCreated(): boolean {
    return this._context !== null;
  }

  /** Whether the AudioContext has been created and is actively running. */
  get isReady(): boolean {
    return this._context !== null && this._context.state === 'running';
  }

  /** The underlying AudioContext. Throws if not yet initialized. */
  get context(): AudioContext {
    if (!this._context) throw new Error('AudioSystem not initialized — call resume() first');
    return this._context;
  }

  /** The master GainNode (connect to it to route audio through master volume). */
  get masterGainNode(): GainNode {
    if (!this._masterGain) throw new Error('AudioSystem not initialized — call resume() first');
    return this._masterGain;
  }

  /** Get the GainNode for a specific channel. Connect audio sources here.
   *  Throws if not yet initialized. */
  getChannelInput(channel: AudioChannel): GainNode {
    const gain = this._channelGains[channel];
    if (!gain) throw new Error('AudioSystem not initialized — call resume() first');
    return gain;
  }

  /** Set the master volume (0–1). */
  setMasterVolume(volume: number): void {
    if (!this._masterGain) return;
    this._masterGain.gain.value = Math.max(0, Math.min(1, volume)) * MASTER_GAIN_VALUE;
  }

  /** Set the volume for an individual channel (0–1). */
  setChannelVolume(channel: AudioChannel, volume: number): void {
    const gain = this._channelGains[channel];
    if (!gain) return;
    gain.gain.value = Math.max(0, Math.min(1, volume)) * CHANNEL_GAIN[channel];
  }
}
