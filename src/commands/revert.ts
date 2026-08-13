import type { EditorView } from '@codemirror/view';
import type { Hunk } from '../diff/types';
import { closePeekEffect } from '../peekView/peekState';
import { hunkAtCursor } from '../state/hunksField';

/**
 * Locally revert a single hunk: replace the hunk's lines in the current
 * document with the baseline text. This is a pure CodeMirror document
 * transaction — no git is involved, because the baseline content is already
 * in memory.
 */
export function revertHunk(view: EditorView, hunk: Hunk): boolean {
  const doc = view.state.doc;
  const from = hunk.fromB <= doc.lines ? doc.line(hunk.fromB).from : doc.length;
  const to = hunk.toB >= 1 && hunk.toB <= doc.lines ? doc.line(hunk.toB).to : from;
  view.dispatch({
    changes: { from, to, insert: hunk.baselineText },
    effects: [closePeekEffect.of(null)],
  });
  return true;
}

/** Revert the hunk under the cursor. */
export const gitGutterRevertChange = (view: EditorView): boolean => {
  const hunk = hunkAtCursor(view.state);
  if (!hunk) return false;
  return revertHunk(view, hunk);
};