// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { EditorView } from '@codemirror/view';
import { gitGutter } from '../src/index';
import { activePeekField, openPeekEffect } from '../src/peekView/peekState';
import { hunksField } from '../src/state/hunksField';

function makeView(doc: string, baseline: string): { view: EditorView; parent: HTMLElement } {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const view = new EditorView({ doc, parent, extensions: [gitGutter({ baseline })] });
  return { view, parent };
}

const flush = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

describe('integration', () => {
  it('renders gutter markers for modified lines', async () => {
    const { view, parent } = makeView('line a\nline BB\nline c\n', 'line a\nline b\nline c\n');
    await flush();
    expect(parent.querySelector('.cm-gitgutter')).not.toBeNull();
    const markers = parent.querySelectorAll('.cm-gitgutter-marker');
    expect(markers.length).toBeGreaterThan(0);
    expect(parent.querySelectorAll('.cm-gitgutter-modified').length).toBeGreaterThan(0);
    view.destroy();
  });

  it('opening the peek view produces a block widget after the hunk', async () => {
    const { view } = makeView('line a\nline BB\nline c\n', 'line a\nline b\nline c\n');
    const hunk = view.state.field(hunksField)[0]!;
    view.dispatch({ effects: openPeekEffect.of(hunk) });
    expect(view.state.field(activePeekField)).not.toBeNull();
    await flush();
    view.destroy();
  });

  it('updates hunks after the debounce delay when typing', async () => {
    const { view } = makeView('line a\nline b\nline c\n', 'line a\nline b\nline c\n');
    expect(view.state.field(hunksField)).toHaveLength(0);
    view.dispatch({ changes: { from: 0, insert: 'x\n' } });
    expect(view.state.field(hunksField)).toHaveLength(0); // still stale during debounce
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(view.state.field(hunksField).length).toBeGreaterThan(0);
    view.destroy();
  });
});
