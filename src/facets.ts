import { Facet } from '@codemirror/state';
import type { Hunk } from './diff/types';

/**
 * Facet holding the git baseline content (typically the file content at
 * HEAD). The host application provides it — the plugin never runs git
 * itself. Reconfiguring the editor with a new value replaces the baseline.
 */
export const baselineContentFacet = Facet.define<string, string>({
  combine: (values) => values[values.length - 1] ?? '',
});

/** User-facing configuration passed to `gitGutter()`. */
export interface GitGutterConfig {
  /**
   * Content of the file at the git baseline (e.g. the result of
   * `git show HEAD:path/to/file`). Required.
   */
  baseline: string;
  /**
   * Callback invoked when the user presses the "Stage" button in the peek
   * view or runs `gitGutterStageChange`. The host app is responsible for
   * actually applying the hunk (e.g. `git apply --cached`). When omitted,
   * the stage button is disabled.
   */
  onStageHunk?: (hunk: Hunk) => void;
  /** Override the marker colors (CSS values). */
  colors?: Partial<{
    added: string;
    modified: string;
    deleted: string;
  }>;
  /**
   * Delay in milliseconds before the diff is recomputed after a document
   * change. Defaults to `150`. Set to `0` for synchronous recomputation.
   */
  debounceMs?: number;
  /**
   * Width of the gutter column (CSS length). Defaults to `'4px'`, mirroring
   * the thin colored line VSCode draws next to the line numbers.
   */
  gutterWidth?: string;
}

/** Default marker colors, matching the VSCode dirty diff palette. */
export const DEFAULT_COLORS = {
  added: '#587c0c',
  modified: '#0c7d9d',
  deleted: '#b5152b',
} as const;

/** Fully resolved configuration produced by `gitGutterConfigFacet`. */
export interface ResolvedGitGutterConfig {
  baseline: string;
  onStageHunk: ((hunk: Hunk) => void) | undefined;
  colors: { added: string; modified: string; deleted: string };
  debounceMs: number;
  gutterWidth: string;
}

/**
 * Facet holding the resolved configuration. Using a facet instead of a
 * plain closure lets host apps reconfigure options (baseline, colors,
 * callbacks) at runtime via `EditorState.reconfigure`.
 */
export const gitGutterConfigFacet = Facet.define<GitGutterConfig, ResolvedGitGutterConfig>({
  combine: (values) => {
    const v = values[values.length - 1] ?? ({} as GitGutterConfig);
    return {
      baseline: v.baseline ?? '',
      onStageHunk: v.onStageHunk,
      debounceMs: v.debounceMs ?? 150,
      gutterWidth: v.gutterWidth ?? '4px',
      colors: {
        added: v.colors?.added ?? DEFAULT_COLORS.added,
        modified: v.colors?.modified ?? DEFAULT_COLORS.modified,
        deleted: v.colors?.deleted ?? DEFAULT_COLORS.deleted,
      },
    };
  },
});
