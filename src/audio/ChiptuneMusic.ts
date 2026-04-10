// ChiptuneMusic — Looping chiptune music for name entry and game over screens.
// Uses wavetable synthesis (≤8 voices) via Web Audio API oscillators.
// Music plays ONLY outside active gameplay (name entry, game over).

import { AudioSystem, AudioChannel } from './AudioSystem';

/** Named music tracks for different game situations. */
export type MusicTrack = 'name_entry_1st' | 'name_entry_top6' | 'name_entry_standard' | 'game_over';

/** [frequency_hz, start_offset_s, duration_s] */
type Note = [number, number, number];

/** A single polyphonic voice: one sequence of notes + oscillator type + peak gain. */
interface Voice {
  notes: Note[];
  type: OscillatorType;
  gain: number;
}

/** A complete track definition. */
interface TrackDef {
  /** Duration of one loop iteration in seconds. 0 = plays once, no loop. */
  loopDuration: number;
  /** Up to 8 simultaneous voices for wavetable-style synthesis. */
  voices: Voice[];
}

// ─── Public constants ──────────────────────────────────────────────────────────

/** Seconds ahead to schedule the next loop iteration. */
export const SCHEDULE_AHEAD_S = 0.3;

/** Loop durations per track in seconds (0 = no loop). Exported for testing. */
export const TRACK_LOOP_DURATIONS: Record<MusicTrack, number> = {
  name_entry_1st: 28.0, // 120 BPM × 56 beats
  name_entry_top6: 48 * (60 / 108), // 108 BPM × 48 beats ≈ 26.67s
  name_entry_standard: 60 * (60 / 93), // 93 BPM × 60 beats ≈ 38.71s
  game_over: 0, // plays once
};

// ─── Note frequency table ──────────────────────────────────────────────────────

// prettier-ignore
const F = {
  G3: 196.0,
  A3: 220.0,  B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0,  A4: 440.0,  B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 784.0,  A5: 880.0,  B5: 987.77,
  C6: 1046.5, D6: 1174.66,
} as const;

// ─── Note sequence builder ─────────────────────────────────────────────────────

/**
 * Convert a sequence of (frequency, beat-length) pairs into absolute-time Note[].
 * `freq = 0` means rest (no note emitted).  Gate is 85% to add slight staccato.
 * @param bpm  Tempo in beats per minute.
 * @param seq  Array of [freq_hz, beats] pairs.
 */
function buildNotes(bpm: number, seq: ReadonlyArray<readonly [number, number]>): Note[] {
  const q = 60 / bpm; // seconds per quarter note
  const notes: Note[] = [];
  let t = 0;
  for (const [freq, beats] of seq) {
    if (freq > 0) {
      notes.push([freq, t, beats * q * 0.85]);
    }
    t += beats * q;
  }
  return notes;
}

// ─── Track definitions ─────────────────────────────────────────────────────────
//
// Each track has ≤ 2 voices (melody + bass) for a total of ≤ 4 simultaneous
// oscillators across all tracks (well within the 8-voice spec limit).

// ── 1st place name entry — triumphant C major, 120 BPM, 14 bars = 28s ─────────

const TRACK_1ST: TrackDef = {
  loopDuration: TRACK_LOOP_DURATIONS.name_entry_1st,
  voices: [
    {
      type: 'square',
      gain: 0.5,
      notes: buildNotes(120, [
        // Bar 1 — ascending C major triad
        [F.C5, 1],
        [F.E5, 1],
        [F.G5, 1],
        [F.C6, 1],
        // Bar 2 — descend
        [F.B5, 1],
        [F.A5, 1],
        [F.G5, 1],
        [F.E5, 1],
        // Bar 3 — stepwise rise
        [F.C5, 1],
        [F.D5, 1],
        [F.E5, 1],
        [F.G5, 1],
        // Bar 4 — held note with resolution
        [F.A5, 2],
        [F.G5, 1],
        [F.E5, 1],
        // Bar 5 — eighth-note flourish
        [F.G5, 0.5],
        [F.A5, 0.5],
        [F.G5, 0.5],
        [F.E5, 0.5],
        [F.C5, 1],
        [F.E5, 1],
        // Bar 6 — ascending line
        [F.G5, 1],
        [F.A5, 1],
        [F.B5, 1],
        [F.C6, 1],
        // Bar 7 — sustained mid-phrase
        [F.G5, 2],
        [F.E5, 2],
        // Bar 8 — stepwise answer
        [F.D5, 1],
        [F.E5, 1],
        [F.D5, 1],
        [F.C5, 1],
        // Bar 9 — rising tension
        [F.E5, 1],
        [F.G5, 1],
        [F.A5, 1],
        [F.B5, 1],
        // Bar 10 — peak and descent
        [F.C6, 1],
        [F.B5, 1],
        [F.A5, 1],
        [F.G5, 1],
        // Bar 11 — chord arpeggiation
        [F.E5, 1],
        [F.C5, 1],
        [F.E5, 1],
        [F.G5, 1],
        // Bar 12 — sustained high point
        [F.C6, 2],
        [F.B5, 1],
        [F.G5, 1],
        // Bar 13 — winding down
        [F.A5, 1],
        [F.G5, 1],
        [F.E5, 1],
        [F.C5, 1],
        // Bar 14 — final cadence
        [F.G5, 1],
        [F.E5, 1],
        [F.C5, 2],
      ]),
    },
    {
      type: 'sawtooth',
      gain: 0.3,
      notes: buildNotes(120, [
        // Bass — each note = 2 beats; chord: C G / Am F / G C
        [F.C4, 2],
        [F.G4, 2], // bar 1  C
        [F.G4, 2],
        [F.E4, 2], // bar 2  G
        [F.C4, 2],
        [F.G4, 2], // bar 3  C
        [F.F4, 2],
        [F.C4, 2], // bar 4  F
        [F.C4, 2],
        [F.G4, 2], // bar 5  C
        [F.F4, 2],
        [F.G4, 2], // bar 6  F→G
        [F.G4, 2],
        [F.C4, 2], // bar 7  G→C
        [F.G4, 2],
        [F.C4, 2], // bar 8  G→C
        [F.A3, 2],
        [F.E4, 2], // bar 9  Am
        [F.F4, 2],
        [F.G4, 2], // bar 10 F→G
        [F.C4, 2],
        [F.G4, 2], // bar 11 C
        [F.F4, 2],
        [F.G4, 2], // bar 12 F→G
        [F.A3, 2],
        [F.F4, 2], // bar 13 Am→F
        [F.G4, 2],
        [F.C4, 2], // bar 14 G→C
      ]),
    },
  ],
};

// ── 2nd–6th place name entry — upbeat G-major, 108 BPM, 12 bars ≈ 26.67s ──────

const TRACK_TOP6: TrackDef = {
  loopDuration: TRACK_LOOP_DURATIONS.name_entry_top6,
  voices: [
    {
      type: 'square',
      gain: 0.5,
      notes: buildNotes(108, [
        // Bar 1
        [F.G5, 1],
        [F.D5, 1],
        [F.B4, 1],
        [F.G5, 1],
        // Bar 2
        [F.A5, 1],
        [F.G5, 1],
        [F.E5, 1],
        [F.D5, 1],
        // Bar 3
        [F.B4, 1],
        [F.D5, 1],
        [F.G5, 1],
        [F.A5, 1],
        // Bar 4
        [F.B5, 2],
        [F.G5, 2],
        // Bar 5 — eighth-note run
        [F.D5, 0.5],
        [F.E5, 0.5],
        [F.D5, 0.5],
        [F.B4, 0.5],
        [F.G4, 1],
        [F.B4, 1],
        // Bar 6
        [F.D5, 1],
        [F.G5, 1],
        [F.A5, 1],
        [F.B5, 1],
        // Bar 7
        [F.D6, 2],
        [F.B5, 1],
        [F.G5, 1],
        // Bar 8
        [F.A5, 1],
        [F.G5, 1],
        [F.D5, 1],
        [F.B4, 1],
        // Bar 9
        [F.E5, 1],
        [F.G5, 1],
        [F.B5, 1],
        [F.D6, 1],
        // Bar 10
        [F.B5, 1],
        [F.A5, 1],
        [F.G5, 1],
        [F.D5, 1],
        // Bar 11
        [F.G5, 1],
        [F.A5, 1],
        [F.B5, 1],
        [F.G5, 1],
        // Bar 12
        [F.D5, 2],
        [F.G5, 2],
      ]),
    },
    {
      type: 'sawtooth',
      gain: 0.3,
      notes: buildNotes(108, [
        [F.G4, 2],
        [F.D4, 2], // bar 1
        [F.A3, 2],
        [F.E4, 2], // bar 2
        [F.G4, 2],
        [F.D4, 2], // bar 3
        [F.G4, 2],
        [F.B3, 2], // bar 4
        [F.G4, 2],
        [F.D4, 2], // bar 5
        [F.G4, 2],
        [F.D4, 2], // bar 6
        [F.D4, 2],
        [F.G4, 2], // bar 7
        [F.A3, 2],
        [F.D4, 2], // bar 8
        [F.E4, 2],
        [F.B3, 2], // bar 9
        [F.G4, 2],
        [F.D4, 2], // bar 10
        [F.G4, 2],
        [F.D4, 2], // bar 11
        [F.G4, 2],
        [F.G4, 2], // bar 12
      ]),
    },
  ],
};

// ── 7th–100th place name entry — ambient A minor, 93 BPM, 15 bars ≈ 38.71s ────

const TRACK_STANDARD: TrackDef = {
  loopDuration: TRACK_LOOP_DURATIONS.name_entry_standard,
  voices: [
    {
      type: 'square',
      gain: 0.45,
      notes: buildNotes(93, [
        // Bar 1
        [F.A5, 2],
        [F.G5, 1],
        [F.E5, 1],
        // Bar 2
        [F.C5, 2],
        [F.D5, 1],
        [F.E5, 1],
        // Bar 3
        [F.G5, 2],
        [F.A5, 2],
        // Bar 4
        [F.E5, 1],
        [F.D5, 1],
        [F.C5, 2],
        // Bar 5
        [F.A4, 2],
        [F.B4, 1],
        [F.C5, 1],
        // Bar 6
        [F.D5, 2],
        [F.E5, 1],
        [F.G5, 1],
        // Bar 7
        [F.A5, 2],
        [F.G5, 2],
        // Bar 8
        [F.E5, 1],
        [F.G5, 1],
        [F.A5, 2],
        // Bar 9
        [F.C6, 2],
        [F.B5, 1],
        [F.A5, 1],
        // Bar 10
        [F.G5, 2],
        [F.E5, 2],
        // Bar 11
        [F.D5, 2],
        [F.C5, 1],
        [F.A4, 1],
        // Bar 12
        [F.B4, 1],
        [F.C5, 1],
        [F.D5, 2],
        // Bar 13
        [F.E5, 2],
        [F.G5, 1],
        [F.A5, 1],
        // Bar 14
        [F.B5, 2],
        [F.A5, 2],
        // Bar 15 — back to start
        [F.G5, 1],
        [F.E5, 1],
        [F.A5, 2],
      ]),
    },
    {
      type: 'sawtooth',
      gain: 0.28,
      notes: buildNotes(93, [
        [F.A3, 2],
        [F.E4, 2], // bar 1
        [F.C4, 2],
        [F.G4, 2], // bar 2
        [F.G4, 2],
        [F.D4, 2], // bar 3
        [F.C4, 2],
        [F.G3, 2], // bar 4
        [F.A3, 2],
        [F.E4, 2], // bar 5
        [F.D4, 2],
        [F.A3, 2], // bar 6
        [F.E4, 2],
        [F.A3, 2], // bar 7
        [F.C4, 2],
        [F.E4, 2], // bar 8
        [F.F4, 2],
        [F.C4, 2], // bar 9
        [F.G4, 2],
        [F.D4, 2], // bar 10
        [F.F4, 2],
        [F.C4, 2], // bar 11
        [F.G3, 2],
        [F.C4, 2], // bar 12
        [F.A3, 2],
        [F.E4, 2], // bar 13
        [F.G4, 2],
        [F.E4, 2], // bar 14
        [F.A3, 2],
        [F.E4, 2], // bar 15
      ]),
    },
  ],
};

// ── Game over — descending A minor, 80 BPM, 14 beats ≈ 10.5s, no loop ─────────

const TRACK_GAMEOVER: TrackDef = {
  loopDuration: 0,
  voices: [
    {
      type: 'square',
      gain: 0.5,
      notes: buildNotes(80, [
        [F.A5, 2], // long high note
        [F.G5, 1],
        [F.E5, 1], // descent
        [F.C5, 2], // pause on mid
        [F.D5, 1],
        [F.B4, 1], // step down
        [F.A4, 2], // landing
        [F.G4, 1],
        [F.E4, 1], // low descent
        [F.A4, 2], // resolve up slightly, end
      ]),
    },
    {
      type: 'sawtooth',
      gain: 0.3,
      notes: buildNotes(80, [
        [F.A3, 2], // tonic
        [F.E4, 2], // fifth
        [F.C4, 2], // minor third
        [F.G3, 2], // low fifth
        [F.A3, 2], // tonic resolve
        [F.E4, 2], // held
        [F.D4, 2], // sub-tonic
      ]),
    },
  ],
};

/** All track definitions indexed by MusicTrack. */
const TRACKS: Record<MusicTrack, TrackDef> = {
  name_entry_1st: TRACK_1ST,
  name_entry_top6: TRACK_TOP6,
  name_entry_standard: TRACK_STANDARD,
  game_over: TRACK_GAMEOVER,
};

// ─── ChiptuneMusic ─────────────────────────────────────────────────────────────

/**
 * Chiptune music player using Web Audio API oscillators.
 *
 * Tracks loop automatically (except `game_over`).  Call `update()` every frame
 * to drive the look-ahead scheduler.  Music should only play during non-gameplay
 * states (name entry, game over screen).
 *
 * Usage:
 *   const music = new ChiptuneMusic(audioSystem);
 *   music.play('name_entry_1st');
 *   // each frame:
 *   music.update();
 *   // on state exit:
 *   music.stop();
 */
export class ChiptuneMusic {
  private _activeOscillators = new Set<OscillatorNode>();
  private _currentTrack: MusicTrack | null = null;
  private _currentDef: TrackDef | null = null;
  private _loopEndTime = 0;
  private _isPlaying = false;

  constructor(private readonly _audio: AudioSystem) {}

  // ─── Public accessors ───────────────────────────────────────────────────────

  /** Whether a track is currently playing. */
  get isPlaying(): boolean {
    return this._isPlaying;
  }

  /** The currently playing track, or null if stopped. */
  get currentTrack(): MusicTrack | null {
    return this._currentTrack;
  }

  // ─── Playback control ───────────────────────────────────────────────────────

  /**
   * Start playing a named track, stopping any previously playing music first.
   * Does nothing if AudioSystem is not ready.
   */
  play(track: MusicTrack): void {
    if (!this._audio.isReady) return;
    this.stop();

    const def = TRACKS[track];
    const ctx = this._audio.context;
    const dest = this._audio.getChannelInput(AudioChannel.MUSIC);
    const t0 = ctx.currentTime;

    this._scheduleIteration(def, t0, dest, ctx);

    this._currentTrack = track;
    this._currentDef = def;
    this._loopEndTime = def.loopDuration > 0 ? t0 + def.loopDuration : Infinity;
    this._isPlaying = true;
  }

  /**
   * Stop the currently playing music immediately.
   * Idempotent — safe to call when no music is playing.
   */
  stop(): void {
    const stopAt = this._audio.isReady ? this._audio.context.currentTime : 0;
    for (const osc of this._activeOscillators) {
      try {
        osc.stop(stopAt);
      } catch {
        // Oscillator may already be stopped — ignore
      }
    }
    this._activeOscillators.clear();
    this._isPlaying = false;
    this._currentTrack = null;
    this._currentDef = null;
    this._loopEndTime = 0;
  }

  /**
   * Drive the look-ahead loop scheduler.  Call once per game frame.
   * Schedules the next loop iteration when the current one is about to end.
   * No-op if not playing, not looping, or AudioSystem is not ready.
   */
  update(): void {
    if (!this._isPlaying || !this._audio.isReady || !this._currentDef) return;
    const def = this._currentDef;
    if (def.loopDuration <= 0) return; // non-looping track

    const ctx = this._audio.context;
    const dest = this._audio.getChannelInput(AudioChannel.MUSIC);
    const now = ctx.currentTime;

    // Schedule the next iteration when we're within SCHEDULE_AHEAD_S of the loop point
    if (now >= this._loopEndTime - SCHEDULE_AHEAD_S) {
      const nextStart = this._loopEndTime;
      this._scheduleIteration(def, nextStart, dest, ctx);
      this._loopEndTime = nextStart + def.loopDuration;
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Schedule all notes in all voices of `def` starting at absolute audio time `t0`.
   * Notes whose scheduled time is already in the past are skipped.
   */
  private _scheduleIteration(def: TrackDef, t0: number, dest: AudioNode, ctx: AudioContext): void {
    const now = ctx.currentTime;
    for (const voice of def.voices) {
      for (const [freq, offset, dur] of voice.notes) {
        const when = t0 + offset;
        if (when < now) continue; // skip notes already in the past

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = voice.type;
        osc.frequency.value = freq;

        // Short attack (5 ms) then exponential decay over the note duration
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.exponentialRampToValueAtTime(voice.gain, when + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(when);
        osc.stop(when + dur + 0.01);

        this._activeOscillators.add(osc);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
          this._activeOscillators.delete(osc);
        };
      }
    }
  }
}
