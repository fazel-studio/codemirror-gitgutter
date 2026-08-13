import { RangeSetBuilder, StateField } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { EditorState, Extension } from '@codemirror/state';
import { hunksField, setHunksEffect } from '../state/hunksField';

function buildLineDecos(state: EditorState): DecorationSet {
  const hunks = state.field(hunksField, false);
  const builder = new RangeSetBuilder<Decoration>();
  if (!hunks) return builder.finish();
  const docLines = state.doc.lines;
  for (const hunk of hunks) {
    if (hunk.type === 'deleted') continue;
    const from = Math.max(1, hunk.fromB);
    const to = Math.min(hunk.toB, docLines);
    const cls = hunk.type === 'added' ? 'cm-gitgutter-line-added' : 'cm-gitgutter-line-modified';
    for (let ln = from; ln <= to; ln++) {
      const line = state.doc.line(ln);
      builder.add(line.from, line.to, Decoration.line({ class: cls }));
    }
  }
  return builder.finish();
}

const lineDecorationField = StateField.define<DecorationSet>({
  create(state) {
    return buildLineDecos(state);
  },
  update(deco, tr) {
    if (tr.docChanged || tr.effects.some((e) => e.is(setHunksEffect))) {
      return buildLineDecos(tr.state);
    }
    return deco.map(tr.changes);
  },
});

/**
 * Optional extension that paints a subtle background highlight on added and
 * modified lines (in addition to the gutter markers). Not included by
 * default — mount it explicitly when you want whole-line highlighting.
 */
export function gitGutterLineDecorations(): Extension {
  return lineDecorationField;
}