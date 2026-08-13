import { ViewPlugin } from '@codemirror/view';
import type { ViewUpdate, EditorView } from '@codemirror/view';
import { computeHunks } from './diff/computeHunks';
import { baselineContentFacet, gitGutterConfigFacet } from './facets';
import { setHunksEffect } from './state/hunksField';

/**
 * View plugin that keeps the diff computation out of the pure state layer.
 *
 * `hunksField` is computed synchronously on editor creation; afterwards the
 * heavy `computeHunks` call only runs here, debounced by `debounceMs`, and
 * the result is pushed back into the field through `setHunksEffect`. This
 * keeps typing smooth even on large documents.
 */
class GitGutterPlugin {
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private view: EditorView) {}

  update(update: ViewUpdate) {
    const baselineChanged =
      update.startState.facet(baselineContentFacet) !== update.state.facet(baselineContentFacet);
    if (!update.docChanged && !baselineChanged) return;

    const config = update.state.facet(gitGutterConfigFacet);
    if (this.timer != null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      const state = this.view.state;
      const hunks = computeHunks(state.facet(baselineContentFacet), state.doc.toString());
      this.view.dispatch({ effects: setHunksEffect.of(hunks) });
    }, config.debounceMs);
  }

  destroy() {
    if (this.timer != null) clearTimeout(this.timer);
  }
}

export const gitGutterPlugin = ViewPlugin.fromClass(GitGutterPlugin);