import { StateField } from '@codemirror/state';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { language } from '@codemirror/language';
import type { EditorState, Extension } from '@codemirror/state';
import type { Hunk } from '../diff/types';
import { activePeekField, closePeekEffect, openPeekEffect } from './peekState';
import { gitGutterConfigFacet } from '../facets';
import { PeekWidget } from './PeekWidget';

function languageSupportFrom(state: EditorState): Extension[] {
  const lang = state.facet(language);
  if (!lang) return [];
  return [lang.extension];
}

function themeExtensionsFrom(state: EditorState): Extension[] {
  // @ts-ignore — accessing internal facet is the only reliable cross-package way.
  const modules = state.facet(EditorView.styleModule);
  if (!modules || modules.length === 0) return [];
  return modules.map((m: any) => EditorView.styleModule.of(m));
}

function buildPeekDecoration(state: EditorState, hunk: Hunk | null): DecorationSet {
  if (!hunk) return Decoration.none;
  const builder = new RangeSetBuilder<Decoration>();

  // Position the widget just after the last line of the hunk
  let pos: number;
  if (hunk.toB >= state.doc.lines) {
    pos = state.doc.length;
  } else if (hunk.toB < 1) {
    pos = state.doc.line(1).from;
  } else {
    pos = state.doc.line(hunk.toB + 1).from;
  }

  // Pass the FULL baseline and FULL current document so the diff pane
  // can render context lines above and below the hunk (VSCode style).
  const baseline   = state.facet(gitGutterConfigFacet).baseline;
  const currentDoc = state.doc.toString();

  builder.add(
    pos,
    pos,
    Decoration.widget({
      widget: new PeekWidget(
        hunk,
        baseline,
        currentDoc,
        languageSupportFrom(state),
        themeExtensionsFrom(state),
      ),
      block: true,
      side: 1,
    }),
  );
  return builder.finish();
}

export const peekDecorationField = StateField.define<DecorationSet>({
  create(state) {
    return buildPeekDecoration(state, state.field(activePeekField, false) ?? null);
  },
  update(deco, tr) {
    const toggled = tr.effects.some((e) => e.is(openPeekEffect) || e.is(closePeekEffect));
    if (toggled) {
      return buildPeekDecoration(tr.state, tr.state.field(activePeekField, false) ?? null);
    }
    return deco.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Re-exported for type convenience in callers that only need the view type.
export type { EditorView };
