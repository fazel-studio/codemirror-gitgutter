import { gutter, GutterMarker } from '@codemirror/view';
import type { Extension, RangeSet } from '@codemirror/state';
import { RangeSetBuilder } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { hunksField, hunkAtLine, sameHunk } from '../state/hunksField';
import { AddedMarker, DeletedMarker, ModifiedMarker } from './gutterMarkers';
import { activePeekField, closePeekEffect, openPeekForHunk } from '../peekView/peekState';
import { gitGutterConfigFacet } from '../facets';

function buildMarkers(view: EditorView): RangeSet<GutterMarker> {
  const state = view.state;
  const hunks = state.field(hunksField, false);
  const builder = new RangeSetBuilder<GutterMarker>();
  if (!hunks) return builder.finish();
  const docLines = state.doc.lines;

  for (const hunk of hunks) {
    if (hunk.type === 'deleted') {
      const lineNo = Math.min(hunk.fromB, docLines);
      const pos = state.doc.line(lineNo).from;
      builder.add(pos, pos, new DeletedMarker());
    } else {
      for (let ln = hunk.fromB; ln <= hunk.toB; ln++) {
        if (ln > docLines) break;
        const pos = state.doc.line(ln).from;
        builder.add(pos, pos, hunk.type === 'added' ? new AddedMarker() : new ModifiedMarker());
      }
    }
  }
  return builder.finish();
}

/** Spacer reserving horizontal space so the gutter does not flicker. */
class GitGutterSpacer extends GutterMarker {
  constructor(readonly width: string) {
    super();
  }

  override toDOM(): HTMLElement {
    const div = document.createElement('div');
    div.style.width = this.width;
    div.style.height = '1px';
    return div;
  }
}

function createSpacer(view: EditorView): GutterMarker {
  const width = view.state.facet(gitGutterConfigFacet).gutterWidth;
  return new GitGutterSpacer(width);
}

/**
 * The gutter extension: renders added/modified/deleted markers in their own
 * column next to the line numbers and handles mouse clicks on markers to
 * toggle the peek view.
 */
export function gitGutterGutter(): Extension {
  return gutter({
    class: 'cm-gitgutter',
    markers: buildMarkers,
    initialSpacer: createSpacer,
    renderEmptyElements: false,
    domEventHandlers: {
      mousedown(view, line, event) {
        const lineNo = view.state.doc.lineAt(line.from).number;
        const hunk = hunkAtLine(view.state, lineNo);
        if (!hunk) return false;
        const active = view.state.field(activePeekField, false);
        if (active && sameHunk(active, hunk)) {
          view.dispatch({ effects: closePeekEffect.of(null) });
        } else {
          openPeekForHunk(view, hunk);
        }
        return true;
      },
    },
  });
}