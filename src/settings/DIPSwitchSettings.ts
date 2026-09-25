/**
 * DIPSwitchSettings — persistent configuration for all DIP switch options.
 *
 * Settings are persisted to localStorage and restored on construction.
 * Invalid stored values are silently ignored and replaced with defaults.
 *
 * Available settings:
 *   qualifyingTime  — countdown timer length for qualifying lap (90/100/110/120 s)
 *   practiceRank    — qualifying difficulty A–H (default C, cutoff at 73 s)
 *   extendedRank    — race difficulty A–H (default E, normal AI speed)
 *   lapCount        — number of Grand Prix laps (3/4/5/6, default 4)
 *   speed           — top speed tier: AVERAGE (195 MPH), DEFAULT (225 MPH) or HIGH (244 MPH)
 *   units           — display units for speed readout: MPH or KPH
 */

import type { QualifyingTimerOption } from '../state/QualifyingState';
import { QUALIFYING_TIMER_OPTIONS } from '../state/QualifyingState';
import type { GPLapCountOption } from '../state/GrandPrixState';
import { GP_LAP_COUNT_OPTIONS } from '../state/GrandPrixState';

export const PRACTICE_RANK_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
export type PracticeRank = (typeof PRACTICE_RANK_OPTIONS)[number];

export const EXTENDED_RANK_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
export type ExtendedRank = (typeof EXTENDED_RANK_OPTIONS)[number];

export const SPEED_OPTIONS = ['AVERAGE', 'DEFAULT', 'HIGH'] as const;
export type SpeedSetting = (typeof SPEED_OPTIONS)[number];

export const UNITS_OPTIONS = ['MPH', 'KPH'] as const;
export type UnitsSetting = (typeof UNITS_OPTIONS)[number];

export interface DIPSwitchConfig {
  qualifyingTime: QualifyingTimerOption;
  practiceRank: PracticeRank;
  extendedRank: ExtendedRank;
  lapCount: GPLapCountOption;
  speed: SpeedSetting;
  units: UnitsSetting;
}

/** Factory function returning a fresh default config object. */
export function defaultDIPConfig(): DIPSwitchConfig {
  return {
    qualifyingTime: 90,
    practiceRank: 'C',
    extendedRank: 'E',
    lapCount: 4,
    speed: 'DEFAULT',
    units: 'MPH',
  };
}

/**
 * Top speed in MPH for each Speed DIP setting.
 * Research: Average=195, Default=225, High=244 (from arcade manual DIP table).
 */
export const SPEED_TO_MPH: Record<SpeedSetting, number> = {
  AVERAGE: 195,
  DEFAULT: 225,
  HIGH: 244,
};

/**
 * Qualifying cutoff time in seconds per Practice Rank.
 * At rank C (default) the cutoff is 73 seconds — matching the original arcade spec.
 * Ranks A–B are progressively more lenient; D–H progressively stricter.
 */
export const PRACTICE_RANK_CUTOFF: Record<PracticeRank, number> = {
  A: 80,
  B: 76,
  C: 73,
  D: 70,
  E: 67,
  F: 64,
  G: 62,
  H: 60,
};

/**
 * AI car speed multiplier per Extended Rank.
 * At rank E (default) the multiplier is 1.0 — standard AI speeds.
 * Ranks A–D slow the AI; F–H speed it up.
 */
export const EXTENDED_RANK_AI_SPEED: Record<ExtendedRank, number> = {
  A: 0.55,
  B: 0.7,
  C: 0.8,
  D: 0.9,
  E: 1.0,
  F: 1.1,
  G: 1.2,
  H: 1.3,
};

export class DIPSwitchSettings {
  /** localStorage key used for persistence. */
  static readonly STORAGE_KEY = 'poleposition_dipswitches';

  private _config: DIPSwitchConfig;

  constructor() {
    this._config = this._load();
  }

  // ── Getters ──────────────────────────────────────────────────────────────────

  get qualifyingTime(): QualifyingTimerOption {
    return this._config.qualifyingTime;
  }

  get practiceRank(): PracticeRank {
    return this._config.practiceRank;
  }

  get extendedRank(): ExtendedRank {
    return this._config.extendedRank;
  }

  get lapCount(): GPLapCountOption {
    return this._config.lapCount;
  }

  get speed(): SpeedSetting {
    return this._config.speed;
  }

  get units(): UnitsSetting {
    return this._config.units;
  }

  /** Top speed in MPH derived from the Speed setting. */
  get topSpeedMph(): number {
    return SPEED_TO_MPH[this._config.speed];
  }

  /** True when display units are KPH. */
  get useKph(): boolean {
    return this._config.units === 'KPH';
  }

  /** Qualifying cutoff time in seconds for the current Practice Rank. */
  get qualifyingCutoffSeconds(): number {
    return PRACTICE_RANK_CUTOFF[this._config.practiceRank];
  }

  /** AI car speed multiplier for the current Extended Rank. */
  get aiSpeedMultiplier(): number {
    return EXTENDED_RANK_AI_SPEED[this._config.extendedRank];
  }

  // ── Mutation ─────────────────────────────────────────────────────────────────

  /**
   * Update one or more settings at once and persist to localStorage.
   * Only recognisable keys with valid values are applied.
   */
  update(changes: Partial<DIPSwitchConfig>): void {
    this._config = { ...this._config, ...changes };
    this._save();
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private _load(): DIPSwitchConfig {
    try {
      const raw = localStorage.getItem(DIPSwitchSettings.STORAGE_KEY);
      if (!raw) return defaultDIPConfig();
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return defaultDIPConfig();
      return { ...defaultDIPConfig(), ...this._sanitize(parsed as Record<string, unknown>) };
    } catch {
      return defaultDIPConfig();
    }
  }

  private _sanitize(raw: Record<string, unknown>): Partial<DIPSwitchConfig> {
    const out: Partial<DIPSwitchConfig> = {};

    if ((QUALIFYING_TIMER_OPTIONS as readonly unknown[]).includes(raw['qualifyingTime'])) {
      out.qualifyingTime = raw['qualifyingTime'] as QualifyingTimerOption;
    }
    if ((PRACTICE_RANK_OPTIONS as readonly unknown[]).includes(raw['practiceRank'])) {
      out.practiceRank = raw['practiceRank'] as PracticeRank;
    }
    if ((EXTENDED_RANK_OPTIONS as readonly unknown[]).includes(raw['extendedRank'])) {
      out.extendedRank = raw['extendedRank'] as ExtendedRank;
    }
    if ((GP_LAP_COUNT_OPTIONS as readonly unknown[]).includes(raw['lapCount'])) {
      out.lapCount = raw['lapCount'] as GPLapCountOption;
    }
    if ((SPEED_OPTIONS as readonly unknown[]).includes(raw['speed'])) {
      out.speed = raw['speed'] as SpeedSetting;
    }
    if ((UNITS_OPTIONS as readonly unknown[]).includes(raw['units'])) {
      out.units = raw['units'] as UnitsSetting;
    }

    return out;
  }

  private _save(): void {
    try {
      localStorage.setItem(DIPSwitchSettings.STORAGE_KEY, JSON.stringify(this._config));
    } catch {
      // Storage unavailable (private browsing with full quota) — silently skip.
    }
  }
}
