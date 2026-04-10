/**
 * HighScoreManager — persistent high score storage and ranking utilities.
 *
 * Stores up to MAX_ENTRIES scores in localStorage.  Each entry holds 3-character
 * initials and a numeric score.  Entries are kept sorted by score descending.
 *
 * Usage:
 *   const hsm = new HighScoreManager();
 *   if (hsm.isHighScore(myScore)) {
 *     const rank = hsm.addEntry('AAA', myScore);
 *     const tier = HighScoreManager.rankingTier(rank); // 1 | 2 | 3
 *   }
 */

export interface HighScoreEntry {
  /** Exactly 3 characters (space-padded if needed). */
  initials: string;
  score: number;
}

/** Music tier for the name-entry screen. */
export type RankingTier = 1 | 2 | 3;

export class HighScoreManager {
  /** Maximum number of scores retained in the table. */
  static readonly MAX_ENTRIES = 10;
  /** localStorage key used for persistence. */
  static readonly STORAGE_KEY = 'poleposition_highscores';

  private _entries: HighScoreEntry[] = [];

  constructor() {
    this._load();
  }

  /** Read-only ordered list of high score entries (highest first). */
  get entries(): readonly HighScoreEntry[] {
    return this._entries;
  }

  /**
   * True if the given score would appear in the high score table.
   * Always true when the table is not yet full.
   */
  isHighScore(score: number): boolean {
    if (this._entries.length < HighScoreManager.MAX_ENTRIES) return true;
    const lowest = this._entries[this._entries.length - 1];
    return lowest !== undefined && score > lowest.score;
  }

  /**
   * Insert a new entry into the table, re-sort, trim to MAX_ENTRIES, and persist.
   * @param initials  Up to 3 characters; shorter strings are space-padded.
   * @param score     The player's final score.
   * @returns         The 1-based rank of the new entry.
   */
  addEntry(initials: string, score: number): number {
    const trimmed = initials.slice(0, 3).padEnd(3, ' ');
    this._entries.push({ initials: trimmed, score });
    this._entries.sort((a, b) => b.score - a.score);
    if (this._entries.length > HighScoreManager.MAX_ENTRIES) {
      this._entries = this._entries.slice(0, HighScoreManager.MAX_ENTRIES);
    }
    this._save();
    // Return the rank of the first matching entry (there may be ties)
    const idx = this._entries.findIndex((e) => e.initials === trimmed && e.score === score);
    return idx >= 0 ? idx + 1 : this._entries.length;
  }

  /**
   * Map a 1-based rank to a music tier for the name-entry screen.
   *   Rank 1      → tier 1 (1st-place melody)
   *   Rank 2–6    → tier 2 (top-6 melody)
   *   Rank 7–100  → tier 3 (standard melody)
   */
  static rankingTier(rank: number): RankingTier {
    if (rank === 1) return 1;
    if (rank <= 6) return 2;
    return 3;
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private _load(): void {
    try {
      const raw = localStorage.getItem(HighScoreManager.STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      this._entries = (parsed as unknown[])
        .filter(
          (e): e is HighScoreEntry =>
            typeof e === 'object' &&
            e !== null &&
            typeof (e as Record<string, unknown>).initials === 'string' &&
            typeof (e as Record<string, unknown>).score === 'number'
        )
        .slice(0, HighScoreManager.MAX_ENTRIES);
    } catch {
      this._entries = [];
    }
  }

  private _save(): void {
    try {
      localStorage.setItem(HighScoreManager.STORAGE_KEY, JSON.stringify(this._entries));
    } catch {
      // Storage unavailable (e.g. private browsing with full quota) — silently skip
    }
  }
}
