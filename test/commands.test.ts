// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { EditorView } from '@codemirror/view';
import { gitGutter } from '../src/index';
import type { Hunk } from '../src/diff/types';
import {
  gitGutterGoToNextChange,
  gitGutterGoToPreviousChange,
  gitGutterToggleWidget,
} from '../src/commands/navigation';
import { gitGutterRevertChange, revertHunk } from '../src/commands/revert';
import { gitGutterStageChange } from '../src/commands/stage';
import { activePeekField } from '../src/peekView/peekState';
import { hunksField } from '../src/state/hunksField';

const baseline = 'line a\nline b\nline c\nline d\nline e\n';
const current = 'line a\nline BB\nline c\nline D\nline e\nline f\n';

function makeView(onStageHunk?: (hunk: Hunk) => void): EditorView {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  return new EditorView({
    doc: current,
    parent,
    extensions: [gitGutter({ baseline, onStageHunk })],
  });
}

describe('commands', () => {
  it('goToNextChange opens the peek view at the next hunk', () => {
    const view = makeView();
    expect(view.state.field(activePeekField)).toBeNull();
    expect(gitGutterGoToNextChange(view)).toBe(true);
    expect(view.state.field(activePeekField)).not.toBeNull();
    view.destroy();
  });

  it('goToPreviousChange wraps to the last change when at the top', () => {
    const view = makeView();
    expect(gitGutterGoToPreviousChange(view)).toBe(true);
    const active = view.state.field(activePeekField);
    expect(active).not.toBeNull();
    expect(active!.fromB).toBe(6); // the added line at the end
    view.destroy();
  });

  it('toggleWidget closes the peek view when already open', () => {
    const view = makeView();
    gitGutterGoToNextChange(view);
    expect(view.state.field(activePeekField)).not.toBeNull();
    expect(gitGutterToggleWidget(view)).toBe(true);
    expect(view.state.field(activePeekField)).toBeNull();
    view.destroy();
  });

  it('revertHunk restores the baseline text of the hunk', () => {
    const view = makeView();
    const hunk = view.state.field(hunksField).find((h) => h.type === 'modified')!;
    expect(revertHunk(view, hunk)).toBe(true);
    const text = view.state.doc.toString();
    expect(text).toContain('line b\n');
    expect(text).not.toContain('line BB\n');
    expect(view.state.field(activePeekField)).toBeNull();
    view.destroy();
  });

  it('gitGutterRevertChange reverts the hunk under the cursor', () => {
    const view = makeView();
    view.dispatch({ selection: { anchor: view.state.doc.line(2).from } });
    expect(gitGutterRevertChange(view)).toBe(true);
    expect(view.state.doc.toString()).toContain('line b\n');
    view.destroy();
  });

  it('gitGutterStageChange delegates to the host callback', () => {
    let staged: Hunk | null = null;
    const view = makeView((hunk) => {
      staged = hunk;
    });
    view.dispatch({ selection: { anchor: view.state.doc.line(2).from } });
    expect(gitGutterStageChange(view)).toBe(true);
    expect(staged).not.toBeNull();
    expect(staged!.type).toBe('modified');
    view.destroy();
  });

  it('gitGutterStageChange returns false when staging is not configured', () => {
    const view = makeView();
    view.dispatch({ selection: { anchor: view.state.doc.line(2).from } });
    expect(gitGutterStageChange(view)).toBe(false);
    view.destroy();
  });
});
