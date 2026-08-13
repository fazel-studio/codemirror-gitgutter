import { ViewPlugin } from '@codemirror/view';
import type { ViewUpdate, EditorView } from '@codemirror/view';
import { activePeekField, openPeekEffect } from './peekState';

/**
 * CSS custom property set on the editor element (`view.dom`) with the largest
 * width (in px) the peek view may occupy. Falls back to the full visible
 * editor width when no minimap/overlay is present.
 */
const PEEK_MAX_WIDTH_VAR = '--cm-gitgutter-peek-max-width';

/**
 * Computes the maximum width the peek view may use by measuring the visible
 * editor area. Any overlay anchored to the editor's right edge (e.g. a
 * minimap) shortens the available width — mirroring VSCode, where the inline
 * diff peek never tucks underneath the minimap.
 *
 * Works regardless of whether the minimap is a native flex gutter or an
 * absolutely positioned overlay: we only care about pixels actually occupied
 * on the right side of the visible scroller.
 *
 * @returns the available max width in CSS pixels.
 */
export function computePeekMaxWidth(view: EditorView): number {
  const editorRect = view.scrollDOM.getBoundingClientRect();
  const overlay = findRightOverlay(view);

  if (overlay) {
    const rect = overlay.getBoundingClientRect();
    const available = Math.floor(rect.left - editorRect.left);
    // Guard against degenerate measurements (overlay covering everything).
    if (available > 0) return available;
  }

  return Math.max(0, Math.floor(editorRect.width));
}

/**
 * Finds the element that visually covers / reserves the right-hand side of the
 * editor, e.g. a minimap overlay. We detect any visible element whose class
 * mentions "minimap" and whose right edge sits flush against the right edge
 * of the visible scroller.
 */
function findRightOverlay(view: EditorView): HTMLElement | null {
  const editorRect = view.scrollDOM.getBoundingClientRect();
  const candidates = view.dom.querySelectorAll<HTMLElement>('[class*="minimap"]');

  for (const el of candidates) {
    if (getComputedStyle(el).visibility === 'hidden') continue;
    if (getComputedStyle(el).display === 'none') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    // Anchored to the editor's right edge and clearly inset from the left.
    if (rect.right >= editorRect.right - 4 && rect.left > editorRect.left + 8) {
      return el;
    }
  }
  return null;
}

/**
 * Keeps `PEEK_MAX_WIDTH_VAR` in sync with the actual editor layout so the
 * peek view width always matches the visible area (and stops before a
 * minimap). Re-measures whenever the peek opens, the geometry changes (resize,
 * scrollbars, minimap show/hide), or the document/selection changes while a
 * peek is open.
 */
class PeekWidthPlugin {
  private view: EditorView;

  constructor(view: EditorView) {
    this.view = view;
  }

  update(update: ViewUpdate) {
    const peekOpen = Boolean(update.state.field(activePeekField, false));

    if (!peekOpen) {
      // Restore the default when the peek closes so the first measure after a
      // re-open starts from a clean slate.
      this.view.dom.style.removeProperty(PEEK_MAX_WIDTH_VAR);
      return;
    }

    const toggled = update.transactions.some((tr) =>
      tr.effects.some((e) => e.is(openPeekEffect)),
    );
    if (update.geometryChanged || toggled || update.docChanged || update.selectionSet) {
      this.measure();
    }
  }

  private measure() {
    this.view.requestMeasure({
      read: (view) => computePeekMaxWidth(view),
      write: (width, view) => view.dom.style.setProperty(PEEK_MAX_WIDTH_VAR, `${width}px`),
      key: PEEK_MAX_WIDTH_VAR,
    });
  }

  destroy() {
    this.view.dom.style.removeProperty(PEEK_MAX_WIDTH_VAR);
  }
}

export const peekWidthPlugin = ViewPlugin.fromClass(PeekWidthPlugin);