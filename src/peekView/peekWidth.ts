import { ViewPlugin } from '@codemirror/view';
import type { ViewUpdate, EditorView } from '@codemirror/view';
import { activePeekField } from './peekState';

/**
 * CSS custom properties set on the editor element (`view.dom`) that drive the
 * peek view's layout:
 *
 * - `--cm-gitgutter-peek-left`: horizontal offset from the scroller's left
 *   edge where the peek is pinned (the content's left at scrollLeft = 0,
 *   i.e. gutter width + padding). Because the peek is `position: sticky;
 *   left: <this>`, it stays glued to the *viewport* while the document is
 *   scrolled horizontally — the VSCode behavior, where the diff peek never
 *   scrolls away with the code.
 * - `--cm-gitgutter-peek-max-width`: the exact pixel width the peek box may
 *   occupy. It is measured from the visible editor area (the viewport), not
 *   the document, and stops flush before any right-side overlay such as a
 *   minimap.
 */
const PEEK_LEFT_VAR = '--cm-gitgutter-peek-left';
const PEEK_WIDTH_VAR = '--cm-gitgutter-peek-max-width';

/** Tolerance in px for "this element sits at/ near the editor's right edge". */
const RIGHT_EDGE_TOLERANCE = 50;

export interface PeekLayout {
  /** Horizontal offset from the scroller's left edge where the peek is pinned. */
  left: number;
  /** Maximum pixel width the peek may occupy. */
  width: number;
}

/**
 * Measures the peek view's desired layout from the visible editor area.
 *
 * `left` is the content's left edge when the user is not scrolled horizontally
 * (stable under horizontal scrolling). `width` fills the remaining visible
 * area up to the right boundary — either the scroller's right edge, or, when
 * a minimap/overlay hugs the right side, the overlay's left edge (mirroring
 * VSCode, where the inline diff peek stops flush before the minimap).
 *
 * @returns the layout in CSS pixels.
 */
export function computePeekLayout(view: EditorView): PeekLayout {
  const scrollerRect = view.scrollDOM.getBoundingClientRect();
  const contentRect = view.contentDOM.getBoundingClientRect();

  // `contentRect.left` shifts by -scrollLeft as the user scrolls horizontally;
  // adding scrollLeft back gives the content's resting left edge (gutter +
  // padding), which is where the peek should align at scrollLeft = 0.
  const contentLeft = contentRect.left + view.scrollDOM.scrollLeft;
  const left = Math.max(0, Math.round(contentLeft - scrollerRect.left));

  const overlay = findRightOverlay(view);
  const rightBoundary = overlay ? overlay.getBoundingClientRect().left : scrollerRect.right;
  const width = Math.max(0, Math.floor(rightBoundary - scrollerRect.left - left));

  return { left, width };
}

/**
 * Finds the right-side overlay element that visually reserves space in the
 * editor (typically a minimap). We detect any visible element whose class
 * mentions "minimap" and that forms a tall strip hugging the editor's right
 * side. The leftmost such candidate wins so nested minimap internals don't
 * confuse the boundary.
 *
 * Notron's minimap, for example, is `position: absolute; right: 14px` —
 * its right edge sits a scrollbar-width short of the editor edge, so we use
 * a tolerance instead of requiring a flush right edge.
 */
function findRightOverlay(view: EditorView): HTMLElement | null {
  const editorRect = view.scrollDOM.getBoundingClientRect();
  const candidates = view.dom.querySelectorAll<HTMLElement>('[class*="minimap"]');

  let best: HTMLElement | null = null;
  let bestLeft = Infinity;

  for (const el of candidates) {
    if (el.offsetParent === null) continue; // hidden via display:none or detached
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    const hugsRight = rect.right > editorRect.right - RIGHT_EDGE_TOLERANCE;
    const isTall = rect.bottom > editorRect.bottom - RIGHT_EDGE_TOLERANCE;
    const insetLeft = rect.left > editorRect.left + 10;

    if (hugsRight && isTall && insetLeft && rect.left < bestLeft) {
      best = el;
      bestLeft = rect.left;
    }
  }

  return best;
}

/**
 * Keeps the peek layout CSS variables in sync with the actual editor layout.
 *
 * - The value is written synchronously when the peek opens, before the next
 *   paint, so no content-width flash occurs.
 * - While a peek is open a cheap animation-frame loop re-measures constantly.
 *   This covers everything — window resize, scrollbar changes, and minimap
 *   toggles that only mutate the DOM (e.g. setting `display: none`) without
 *   producing a CodeMirror state update.
 * - The properties are removed again when the peek closes so future opens
 *   start from a clean slate.
 */
class PeekWidthPlugin {
  private raf: number | null = null;

  constructor(private view: EditorView) {
    // Baseline so the properties exist (and are correct) even before the
    // first peek opens — e.g. when the host has already toggled its minimap.
    this.applyLayout();
  }

  update(update: ViewUpdate) {
    const peekOpen = Boolean(update.state.field(activePeekField, false));

    if (!peekOpen) {
      this.stopLoop();
      this.view.dom.style.removeProperty(PEEK_LEFT_VAR);
      this.view.dom.style.removeProperty(PEEK_WIDTH_VAR);
      return;
    }

    // Write the layout synchronously (no rAF wait) so the very first painted
    // frame of the peek is already constrained to the visible area.
    this.applyLayout();
    this.startLoop();
  }

  private applyLayout() {
    const { left, width } = computePeekLayout(this.view);
    this.view.dom.style.setProperty(PEEK_LEFT_VAR, `${left}px`);
    this.view.dom.style.setProperty(PEEK_WIDTH_VAR, `${width}px`);
  }

  private startLoop() {
    if (this.raf != null) return;

    let last = '';
    const loop = () => {
      const { left, width } = computePeekLayout(this.view);
      const key = `${left}:${width}`;
      if (key !== last) {
        last = key;
        this.view.dom.style.setProperty(PEEK_LEFT_VAR, `${left}px`);
        this.view.dom.style.setProperty(PEEK_WIDTH_VAR, `${width}px`);
      }
      this.raf = requestAnimationFrame(loop);
    };

    this.raf = requestAnimationFrame(loop);
  }

  private stopLoop() {
    if (this.raf != null) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }

  destroy() {
    this.stopLoop();
    this.view.dom.style.removeProperty(PEEK_LEFT_VAR);
    this.view.dom.style.removeProperty(PEEK_WIDTH_VAR);
  }
}

export const peekWidthPlugin = ViewPlugin.fromClass(PeekWidthPlugin);