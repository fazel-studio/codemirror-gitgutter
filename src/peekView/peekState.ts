import { StateEffect, StateField } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { Hunk } from '../diff/types';

/** Effect that opens the peek view for the given hunk. */
export const openPeekEffect = StateEffect.define<Hunk>();

/** Effect that closes the peek view. */
export const closePeekEffect = StateEffect.define<null>();

/**
 * State field holding the hunk currently shown in the peek view, or `null`
 * when no peek view is open.
 */
export const activePeekField = StateField.define<Hunk | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(closePeekEffect)) return null;
      if (e.is(openPeekEffect)) return e.value;
    }
    return value;
  },
});

/**
 * Open the peek view for `hunk` in a single transaction: move the selection
 * to the hunk, register the open effect and scroll it into view.
 */
export function openPeekForHunk(view: EditorView, hunk: Hunk): void {
  const lineNo = Math.max(1, Math.min(hunk.toB, view.state.doc.lines));
  const pos = view.state.doc.line(lineNo).from;
  view.dispatch({
    selection: { anchor: pos },
    effects: [openPeekEffect.of(hunk), EditorView.scrollIntoView(pos, { y: 'center' })],
  });
}