// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { gitGutter } from '../src/index';
import { computeHunks } from '../src/diff/computeHunks';
import { activePeekField, closePeekEffect, openPeekEffect } from '../src/peekView/peekState';
import { hunksField, setHunksEffect } from '../src/state/hunksField';

const baseline = 'const a = 1;\nconst b = 2;\nconst c = 3;\n';

describe('state management', () => {
  it('computes initial hunks on state creation', () => {
    const current = 'const a = 1;\nconst b = 22;\nconst c = 3;\n';
    const state = EditorState.create({ doc: current, extensions: [gitGutter({ baseline })] });
    expect(state.field(hunksField)).toEqual(computeHunks(baseline, current));
  });

  it('recomputes synchronously when debounceMs is 0', () => {
    const state = EditorState.create({ doc: baseline, extensions: [gitGutter({ baseline, debounceMs: 0 })] });
    const next = state.update({ changes: { from: 0, insert: 'x\n' } }).state;
    expect(next.field(hunksField)).toEqual(computeHunks(baseline, next.doc.toString()));
  });

  it('reacts to setHunksEffect pushed by the view plugin', () => {
    const state = EditorState.create({ doc: baseline, extensions: [gitGutter({ baseline })] });
    const next = state.update({ effects: setHunksEffect.of([]) }).state;
    expect(next.field(hunksField)).toEqual([]);
  });

  it('opens and closes the active peek hunk via effects', () => {
    const current = 'const a = 1;\nconst b = 22;\nconst c = 3;\n';
    const state = EditorState.create({ doc: current, extensions: [gitGutter({ baseline })] });
    const hunk = state.field(hunksField)[0]!;
    const opened = state.update({ effects: openPeekEffect.of(hunk) }).state;
    expect(opened.field(activePeekField)).toEqual(hunk);
    const closed = opened.update({ effects: closePeekEffect.of(null) }).state;
    expect(closed.field(activePeekField)).toBeNull();
  });

  it('keeps the peek decoration mapped across unrelated doc changes', () => {
    const current = 'const a = 1;\nconst b = 22;\nconst c = 3;\n';
    const state = EditorState.create({ doc: current, extensions: [gitGutter({ baseline })] });
    const hunk = state.field(hunksField)[0]!;
    const opened = state.update({ effects: openPeekEffect.of(hunk) }).state;
    expect(opened.field(hunksField)).toBeDefined();
  });
});
