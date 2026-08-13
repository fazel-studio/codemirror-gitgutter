import type { EditorView } from '@codemirror/view';
import { activePeekField, closePeekEffect, openPeekForHunk } from '../peekView/peekState';
import { hunkAtLine, hunksField, sameHunk } from '../state/hunksField';

/**
 * Move to the next change (wrapping around): if a peek view is open it moves
 * to the following hunk; otherwise it moves to the first hunk at or after
 * the cursor. The peek view is opened at the target hunk.
 */
export function gitGutterGoToNextChange(view: EditorView): boolean {
  const hunks = view.state.field(hunksField, false);
  if (!hunks || hunks.length === 0) return false;
  const active = view.state.field(activePeekField, false);
  let next: number;
  if (active) {
    const i = hunks.findIndex((h) => sameHunk(h, active));
    next = i < 0 ? 0 : (i + 1) % hunks.length;
  } else {
    const line = view.state.doc.lineAt(view.state.selection.main.head).number;
    const i = hunks.findIndex((h) => h.toB >= line);
    next = i < 0 ? 0 : i;
  }
  const target = hunks[next];
  if (!target) return false;
  openPeekForHunk(view, target);
  return true;
}

/**
 * Move to the previous change (wrapping around): if a peek view is open it
 * moves to the preceding hunk; otherwise it moves to the change right before
 * the cursor (or the last one when the cursor is past every change).
 */
export function gitGutterGoToPreviousChange(view: EditorView): boolean {
  const hunks = view.state.field(hunksField, false);
  if (!hunks || hunks.length === 0) return false;
  const active = view.state.field(activePeekField, false);
  let prev: number;
  if (active) {
    const i = hunks.findIndex((h) => sameHunk(h, active));
    prev = i <= 0 ? hunks.length - 1 : i - 1;
  } else {
    const line = view.state.doc.lineAt(view.state.selection.main.head).number;
    const i = hunks.findIndex((h) => h.toB >= line);
    if (i === -1 || i === 0) prev = hunks.length - 1;
    else prev = i - 1;
  }
  const target = hunks[prev];
  if (!target) return false;
  openPeekForHunk(view, target);
  return true;
}

/**
 * Toggle the peek view for the hunk at the cursor position: open it if it is
 * closed, close it if it is already open for that hunk.
 */
export function gitGutterToggleWidget(view: EditorView): boolean {
  const active = view.state.field(activePeekField, false);
  const line = view.state.doc.lineAt(view.state.selection.main.head).number;
  const hunk = hunkAtLine(view.state, line);
  if (!hunk) return false;
  if (active && sameHunk(active, hunk)) {
    view.dispatch({ effects: closePeekEffect.of(null) });
  } else {
    openPeekForHunk(view, hunk);
  }
  return true;
}