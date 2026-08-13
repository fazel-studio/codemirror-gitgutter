import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import type { Hunk } from '../diff/types';

/**
 * Registry of mini `EditorView` instances keyed by their host element so the
 * widget's `destroy` hook can tear them down and prevent memory leaks.
 */
const miniViewRegistry = new WeakMap<HTMLElement, EditorView>();

/**
 * Build the "Original" pane shown inside the peek view: a small read-only
 * CodeMirror editor rendered with the same language support as the main
 * editor, so syntax highlighting stays consistent (this is what makes the
 * widget feel like VSCode's dirty diff peek instead of a plain `<pre>`).
 *
 * The mini editor inherits the host app's theme via CSS variables on the
 * parent `.cm-gitgutter-peek` element — no hardcoded colors here.
 */
export function renderBaselinePane(hunk: Hunk, languageSupport: Extension[], themeExtensions: Extension[]): HTMLElement {
  const container = document.createElement('div');
  container.className = 'cm-gitgutter-peek-baseline';

  const label = document.createElement('div');
  label.className = 'cm-gitgutter-peek-label';
  label.textContent = 'Original';
  label.title = 'Content as of the git baseline (HEAD)';

  const host = document.createElement('div');
  host.className = 'cm-gitgutter-peek-editor';

  const state = EditorState.create({
    doc: hunk.baselineText || '\n',
    extensions: [
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      EditorView.lineWrapping,
      // Pass through the host editor's theme extensions so the mini editor
      // uses the same color scheme (dark/light) automatically.
      ...themeExtensions,
      ...languageSupport,
    ],
  });
  miniViewRegistry.set(host, new EditorView({ state, parent: host }));

  container.appendChild(label);
  container.appendChild(host);
  return container;
}

/** Destroy the mini editor inside a peek widget's DOM node, if any. */
export function destroyBaselinePane(dom: HTMLElement): void {
  const host = dom.querySelector<HTMLElement>('.cm-gitgutter-peek-editor');
  if (!host) return;
  const mini = miniViewRegistry.get(host);
  mini?.destroy();
  miniViewRegistry.delete(host);
}