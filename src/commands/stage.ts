import type { EditorView } from '@codemirror/view';
import type { Hunk } from '../diff/types';
import { gitGutterConfigFacet } from '../facets';
import { hunkAtCursor } from '../state/hunksField';

/**
 * Ask the host application to stage `hunk`. The plugin only provides the
 * precise hunk data; executing `git apply --cached` is the host app's job.
 * Returns `false` when no `onStageHunk` callback is configured.
 */
export function stageHunk(view: EditorView, hunk: Hunk): boolean {
  const config = view.state.facet(gitGutterConfigFacet);
  if (!config.onStageHunk) return false;
  config.onStageHunk(hunk);
  return true;
}

/** Stage the hunk under the cursor. */
export const gitGutterStageChange = (view: EditorView): boolean => {
  const hunk = hunkAtCursor(view.state);
  if (!hunk) return false;
  return stageHunk(view, hunk);
};