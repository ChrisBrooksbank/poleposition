/**
 * DIPSwitchPanel — interactive settings screen rendered on the canvas.
 *
 * Displays all 6 DIP switch settings as a navigable list.  The caller drives
 * the panel each frame via update(), passing raw key states.  When the player
 * presses Enter, isDone becomes true and the caller should transition away.
 *
 * Navigation:
 *   ArrowUp / ArrowDown (throttle / brake)  — move between rows
 *   ArrowLeft / ArrowRight                  — cycle through values
 *   Enter                                   — save and close
 *
 * All key presses are edge-triggered (no key-repeat) to keep navigation
 * predictable in a menu context.
 */

import type { QualifyingTimerOption } from '../state/QualifyingState';
import type { GPLapCountOption } from '../state/GrandPrixState';
import {
  DIPSwitchSettings,
  PRACTICE_RANK_OPTIONS,
  EXTENDED_RANK_OPTIONS,
  SPEED_OPTIONS,
  UNITS_OPTIONS,
} from './DIPSwitchSettings';

const QUALIFYING_TIME_OPTIONS: readonly QualifyingTimerOption[] = [90, 100, 110, 120];
const LAP_COUNT_OPTIONS: readonly GPLapCountOption[] = [3, 4, 5, 6];

// ── Row key union type ───────────────────────────────────────────────────────

type SettingsKey =
  | 'qualifyingTime'
  | 'practiceRank'
  | 'extendedRank'
  | 'lapCount'
  | 'speed'
  | 'units';

interface SettingsRow {
  key: SettingsKey;
  label: string;
  options: readonly (string | number)[];
  format: (v: string | number) => string;
}

const ROWS: readonly SettingsRow[] = [
  {
    key: 'qualifyingTime',
    label: 'QUALIFYING TIME',
    options: QUALIFYING_TIME_OPTIONS,
    format: (v) => `${v}S`,
  },
  {
    key: 'practiceRank',
    label: 'PRACTICE RANK',
    options: PRACTICE_RANK_OPTIONS,
    format: (v) => String(v),
  },
  {
    key: 'extendedRank',
    label: 'EXTENDED RANK',
    options: EXTENDED_RANK_OPTIONS,
    format: (v) => String(v),
  },
  {
    key: 'lapCount',
    label: 'LAP COUNT',
    options: LAP_COUNT_OPTIONS,
    format: (v) => String(v),
  },
  {
    key: 'speed',
    label: 'SPEED',
    options: SPEED_OPTIONS,
    format: (v) => (v === 'AVERAGE' ? 'AVG' : v === 'DEFAULT' ? 'DEF' : String(v)),
  },
  {
    key: 'units',
    label: 'UNITS',
    options: UNITS_OPTIONS,
    format: (v) => String(v),
  },
];

export class DIPSwitchPanel {
  private _row = 0;
  private _done = false;

  // Edge-detection state for all navigated keys
  private _prevUp = false;
  private _prevDown = false;
  private _prevLeft = false;
  private _prevRight = false;
  private _prevConfirm = false;

  constructor(private readonly _settings: DIPSwitchSettings) {}

  /** True once the player presses Enter — caller should transition away. */
  get isDone(): boolean {
    return this._done;
  }

  /** Currently selected row index (0–5). */
  get selectedRow(): number {
    return this._row;
  }

  /** Reset panel to initial state ready for display; `held` lists keys already down. */
  reset(held: Partial<Record<'up' | 'down' | 'left' | 'right' | 'confirm', boolean>> = {}): void {
    this._row = 0;
    this._done = false;
    // Keys still held from the screen before count as already pressed (edge-triggered input).
    this._prevUp = held.up ?? false;
    this._prevDown = held.down ?? false;
    this._prevLeft = held.left ?? false;
    this._prevRight = held.right ?? false;
    this._prevConfirm = held.confirm ?? false;
  }

  /**
   * Advance panel state for one frame.
   *
   * @param up      ArrowUp / throttle key held this frame.
   * @param down    ArrowDown / brake key held this frame.
   * @param left    ArrowLeft key held this frame.
   * @param right   ArrowRight key held this frame.
   * @param confirm Enter key held this frame.
   */
  update(up: boolean, down: boolean, left: boolean, right: boolean, confirm: boolean): void {
    if (this._done) return;

    if (up && !this._prevUp) {
      this._row = (this._row - 1 + ROWS.length) % ROWS.length;
    }
    if (down && !this._prevDown) {
      this._row = (this._row + 1) % ROWS.length;
    }
    if (left && !this._prevLeft) {
      this._cycleRow(-1);
    }
    if (right && !this._prevRight) {
      this._cycleRow(+1);
    }
    if (confirm && !this._prevConfirm) {
      this._done = true;
    }

    this._prevUp = up;
    this._prevDown = down;
    this._prevLeft = left;
    this._prevRight = right;
    this._prevConfirm = confirm;
  }

  /**
   * Render the settings panel onto the given canvas context.
   *
   * Fills the entire canvas with a dark background then draws the settings
   * list, with the currently selected row highlighted in yellow.
   */
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();

    // Full dark background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DIP SWITCH SETTINGS', width / 2, 16);

    // Top separator
    ctx.fillStyle = '#444444';
    ctx.fillRect(8, 22, width - 16, 1);

    // Settings rows
    const rowStartY = 36;
    const rowH = 15;

    for (let i = 0; i < ROWS.length; i++) {
      const row = ROWS[i]!;
      const y = rowStartY + i * rowH;
      const isSelected = i === this._row;

      // Selection highlight
      if (isSelected) {
        ctx.fillStyle = 'rgba(255,221,0,0.12)';
        ctx.fillRect(4, y - 10, width - 8, rowH);
      }

      // Row label
      ctx.fillStyle = isSelected ? '#ffdd00' : '#999999';
      ctx.font = `${isSelected ? 'bold ' : ''}7px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(row.label, 10, y);

      // Current value with navigation arrows
      const rawVal = this._getSettingValue(row.key);
      const display = row.format(rawVal);
      ctx.fillStyle = isSelected ? '#ffffff' : '#666666';
      ctx.textAlign = 'right';
      ctx.fillText(`< ${display} >`, width - 10, y);
    }

    // Bottom separator
    const sepY = rowStartY + ROWS.length * rowH + 4;
    ctx.fillStyle = '#444444';
    ctx.fillRect(8, sepY, width - 16, 1);

    // Footer hint
    ctx.fillStyle = '#555555';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('\u2191\u2193 ROW   \u2190\u2192 VALUE   ENTER:SAVE', width / 2, height - 6);

    ctx.restore();
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /** Read a single setting value by key. */
  private _getSettingValue(key: SettingsKey): string | number {
    switch (key) {
      case 'qualifyingTime':
        return this._settings.qualifyingTime;
      case 'practiceRank':
        return this._settings.practiceRank;
      case 'extendedRank':
        return this._settings.extendedRank;
      case 'lapCount':
        return this._settings.lapCount;
      case 'speed':
        return this._settings.speed;
      case 'units':
        return this._settings.units;
    }
  }

  /** Cycle the selected row's value by +1 or -1 step. */
  private _cycleRow(dir: 1 | -1): void {
    const row = ROWS[this._row];
    if (!row) return;
    const opts = row.options;
    const current = this._getSettingValue(row.key);
    const idx = opts.findIndex((o) => o === current);
    const newIdx = (idx + dir + opts.length) % opts.length;
    const newVal = opts[newIdx];
    if (newVal !== undefined) {
      this._settings.update({ [row.key]: newVal } as Parameters<DIPSwitchSettings['update']>[0]);
    }
  }
}
