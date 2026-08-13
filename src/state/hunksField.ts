import { StateEffect, StateField } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { computeHunks } from '../diff/computeHunks';
import type { Hunk } from '../diff/types';
import { baselineContentFacet, gitGutterConfigFacet } from '../facets';

/**
 * Effect used by the (debounced) view plugin to push freshly computed hunks
 * back into `hunksField`. This keeps the heavy diff computation out of the
 * pure, synchronous state layer.
 */
export const setHunksEffect = StateEffect.define<Hunk[]>();

/**
 * State field holding the current list of hunks.
 *
 * - Initial value is computed synchronously from the baseline facet and the
 *   initial document.
 * - After that, hunks normally arrive via `setHunksEffect` (dispatched by
 *   the debounced `gitGutterPlugin`).
 * - When `debounceMs` is explicitly `0`, the field falls back to recomputing
 *   synchronously on every relevant transaction.
 */
export const hunksField = StateField.define<Hunk[]>({
  create(state) {
    return computeHunks(state.facet(baselineContentFacet), state.doc.toString());
  },
  update(hunks, tr) {
    for (const e of tr.effects) {
      if (e.is(setHunksEffect)) return e.value;
    }
    const baselineChanged =
      tr.startState.facet(baselineContentFacet) !== tr.state.facet(baselineContentFacet);
    if ((tr.docChanged || baselineChanged) && tr.state.facet(gitGutterConfigFacet).debounceMs === 0) {
      return computeHunks(tr.state.facet(baselineContentFacet), tr.state.doc.toString());
    }
    return hunks;
  },
});

/**
 * Return the hunk whose gutter marker is rendered on the given (1-based)
 * line number, or `null` when there is none.
 *
 * Deleted hunks have no physical line in the current document; their marker
 * is placed on the line right after the deletion point (or the last line
 * when the deletion is at the end of the file), which is what this lookup
 * mirrors.
 */
export function hunkAtLine(state: EditorState, lineNo: number): Hunk | null {
  const hunks = state.field(hunksField, false);
  if (!hunks) return null;
  const docLines = state.doc.lines;
  for (const hunk of hunks) {
    if (hunk.type === 'deleted') {
      if (Math.min(hunk.fromB, docLines) === lineNo) return hunk;
    } else if (hunk.fromB <= lineNo && lineNo <= hunk.toB) {
      return hunk;
    }
  }
  return null;
}

/** Return the hunk at the current cursor position, or `null`. */
export function hunkAtCursor(state: EditorState): Hunk | null {
  const line = state.doc.lineAt(state.selection.main.head).number;
  return hunkAtLine(state, line);
}

/** Positional + content identity check for hunks. */
export function sameHunk(a: Hunk, b: Hunk): boolean {
  return (
    a.type === b.type &&
    a.fromA === b.fromA &&
    a.toA === b.toA &&
    a.fromB === b.fromB &&
    a.toB === b.toB &&
    a.baselineText === b.baselineText
  );
}
