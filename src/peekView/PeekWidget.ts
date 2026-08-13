import { WidgetType } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import type { Hunk } from '../diff/types';
import { sameHunk } from '../state/hunksField';
import { renderToolbar } from './renderToolbar';
import { renderDiffPane } from './renderDiffPane';

/**
 * Custom block widget that reproduces VSCode's dirty diff peek view.
 *
 * Because it is a `block: true` widget, CodeMirror pushes the lines below it
 * down — the editor visually "splits" at the change, which is exactly the
 * VSCode UX we replicate (no floating modal needed).
 */
export class PeekWidget extends WidgetType {
  /** header(32) + 8 lines × 19.5px ≈ 188px */
  override get estimatedHeight(): number { return 188; }

  constructor(
    readonly hunk: Hunk,
    /** Full baseline file text (git HEAD). */
    readonly baseline: string,
    /** Full current document text. */
    readonly currentDoc: string,
    readonly languageSupport: Extension[],
    readonly themeExtensions: Extension[] = [],
  ) {
    super();
  }

  override eq(other: WidgetType): boolean {
    return other instanceof PeekWidget && sameHunk(other.hunk, this.hunk);
  }

  override toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cm-gitgutter-peek';
    container.appendChild(renderToolbar(view, this.hunk));
    container.appendChild(
      renderDiffPane(this.hunk, this.baseline, this.currentDoc, this.languageSupport, this.themeExtensions),
    );
    return container;
  }

  override destroy(_dom: HTMLElement): void {
    // Pure DOM, nothing to tear down.
  }
}