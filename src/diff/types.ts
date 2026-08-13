/**
 * Type of a single change between the git baseline (A side) and the
 * current editor document (B side).
 *
 * Follows the classification rules of VSCode's dirty diff model:
 * - `added`: only new lines, nothing removed at that position.
 * - `deleted`: only lines removed, nothing new at that position.
 * - `modified`: removed and added lines sit at the same position
 *   (old lines replaced by new ones).
 */
export type ChangeType = 'added' | 'modified' | 'deleted';

/**
 * A single contiguous change between the baseline content and the current
 * editor document. All line numbers are 1-based and inclusive.
 */
export interface Hunk {
  /** Classification of the change. */
  type: ChangeType;
  /** First baseline line touched (1-based). */
  fromA: number;
  /** Last baseline line touched (1-based). `toA < fromA` for pure additions. */
  toA: number;
  /** First document line touched (1-based). */
  fromB: number;
  /** Last document line touched (1-based). `toB < fromB` for pure deletions. */
  toB: number;
  /**
   * Exact baseline text for this hunk (used by the peek view and by the
   * local revert transaction). Empty for pure additions.
   */
  baselineText: string;
}
