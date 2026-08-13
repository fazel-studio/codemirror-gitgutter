import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { DEFAULT_COLORS, baselineContentFacet, gitGutterConfigFacet } from './facets';
import type { GitGutterConfig } from './facets';
import { hunksField } from './state/hunksField';
import { gitGutterGutter } from './gutter/gutterExtension';
import { activePeekField } from './peekView/peekState';
import { peekDecorationField } from './peekView/peekDecorationField';
import { gitGutterTheme } from './theme/baseTheme';
import { gitGutterPlugin } from './viewPlugin';
import { peekWidthPlugin } from './peekView/peekWidth';

/**
 * Main entry point. Returns a CodeMirror 6 extension that renders a
 * git-blame-style diff gutter (added / modified / deleted markers) plus a
 * VSCode-like peek view, driven purely by the `baseline` content the host
 * application provides.
 *
 * @example
 * ```ts
 * import { EditorView, basicSetup } from 'codemirror';
 * import { gitGutter } from '@fazelstudio/codemirror-gitgutter';
 *
 * const view = new EditorView({
 *   doc: currentFileContent,
 *   extensions: [
 *     basicSetup,
 *     gitGutter({
 *       baseline: headFileContent, // e.g. `git show HEAD:path/to/file`
 *       onStageHunk: (hunk) => myBackend.stageHunk(filePath, hunk),
 *     }),
 *   ],
 *   parent: document.querySelector('#editor'),
 * });
 * ```
 */
export function gitGutter(config: GitGutterConfig): Extension {
  return [
    gitGutterConfigFacet.of(config),
    baselineContentFacet.of(config.baseline),
    hunksField,
    activePeekField,
    peekDecorationField,
    // Per-config marker colors as CSS variables on the gutter column, with
    // the defaults from the VSCode palette.
    EditorView.theme({
      '.cm-gitgutter': {
        '--cm-gitgutter-added-color': config.colors?.added ?? DEFAULT_COLORS.added,
        '--cm-gitgutter-modified-color': config.colors?.modified ?? DEFAULT_COLORS.modified,
        '--cm-gitgutter-deleted-color': config.colors?.deleted ?? DEFAULT_COLORS.deleted,
      },
    }),
    gitGutterTheme,
    gitGutterGutter(),
    gitGutterPlugin,
    peekWidthPlugin,
  ];
}

// --- Public API -------------------------------------------------------------

export { gitGutterGoToNextChange, gitGutterGoToPreviousChange, gitGutterToggleWidget } from './commands/navigation';
export { gitGutterRevertChange, revertHunk } from './commands/revert';
export { gitGutterStageChange, stageHunk } from './commands/stage';
export { gitGutterKeymap } from './commands/keymap';
export { gitGutterLineDecorations } from './decorations/lineDecorations';
export { gitGutterDarkTheme, gitGutterLightTheme } from './theme/presets';

// --- State access (for host-app metadata UI, e.g. a minimap) -----------------

export { hunksField, hunkAtLine, hunkAtCursor, setHunksEffect } from './state/hunksField';
export { baselineContentFacet } from './facets';

// --- Types ------------------------------------------------------------------

export type { Hunk, ChangeType } from './diff/types';
export type { GitGutterConfig } from './facets';