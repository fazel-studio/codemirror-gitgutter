import { EditorView } from '@codemirror/view';

/**
 * Base theme for the git gutter. All colors are semantic and theme-agnostic —
 * the plugin never hardcodes or guesses an editor theme:
 *
 * - Gutter marker colors expose the VSCode dirty-diff palette as CSS custom
 *   properties (`--cm-gitgutter-*-color`) so hosts can override them.
 * - The peek view is fully transparent: it inherits the editor background,
 *   text color (`currentColor`) and only draws the diff-tinted lines plus
 *   thin hairline separators derived from `currentColor`. Dark or light
 *   themes therefore "just work" without any theme presets.
 *
 * Width: the peek view is a block widget inside `.cm-content`. By default it
 * spans the full content width (edge-to-edge, like VSCode). `peekWidth`
 * measures the visible editor area and sets
 * `--cm-gitgutter-peek-max-width` on the editor element so the peek stops
 * before any right-side overlay (e.g. a minimap).
 */
export const gitGutterTheme = EditorView.baseTheme({
  '.cm-gitgutter': {
    overflow: 'visible',
  },

  '.cm-gitgutter-marker': {
    position: 'relative',
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
  },

  '.cm-gitgutter-added': {
    backgroundColor: 'var(--cm-gitgutter-added-color, #587c0c)',
    transition: 'transform 120ms ease',
    transformOrigin: 'left center',
    cursor: 'pointer',
  },
  '.cm-gitgutter-added:hover': {
    transform: 'scaleX(1.5)',
  },

  '.cm-gitgutter-modified': {
    backgroundColor: 'var(--cm-gitgutter-modified-color, #0c7d9d)',
    transition: 'transform 120ms ease',
    transformOrigin: 'left center',
    cursor: 'pointer',
  },
  '.cm-gitgutter-modified:hover': {
    transform: 'scaleX(1.5)',
  },

  // Deleted marker: small red triangle that expands to a line on hover (VSCode style).
  '.cm-gitgutter-deleted': {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start', // Align to left edge for triangle
    overflow: 'visible',
    cursor: 'pointer',
  },
  '.cm-gitgutter-deleted::before': {
    content: '""',
    display: 'block',
    width: '0',
    height: '0',
    borderTop: '4px solid transparent',
    borderBottom: '4px solid transparent',
    borderLeft: '4px solid var(--cm-gitgutter-deleted-color, #b5152b)', // Triangle pointing right
    transition: 'all 120ms ease',
    position: 'absolute',
    left: '2px', // Slight inset
  },
  '.cm-gitgutter-deleted:hover::before': {
    width: '100%',
    height: '3px',
    border: 'none',
    backgroundColor: 'var(--cm-gitgutter-deleted-color, #b5152b)',
    left: '0',
  },

  // Optional whole-line backgrounds (see gitGutterLineDecorations).
  '.cm-gitgutter-line-added': {
    backgroundColor: 'var(--cm-gitgutter-line-added-bg, rgba(88, 124, 12, 0.12))',
  },
  '.cm-gitgutter-line-modified': {
    backgroundColor: 'var(--cm-gitgutter-line-modified-bg, rgba(12, 125, 157, 0.12))',
  },

  // ── Peek view widget ────────────────────────────────────────────────────────
  //
  // Fully transparent: the editor background shows through, so the peek always
  // matches whatever theme the host uses. `peekWidth` caps the width at the
  // visible editor area via `--cm-gitgutter-peek-max-width` so the widget
  // stops before a minimap instead of running to the editor's edge.

  '.cm-gitgutter-peek': {
    backgroundColor: 'transparent',
    borderTop: '1px solid var(--cm-gitgutter-peek-border, color-mix(in srgb, currentColor 12%, transparent))',
    borderBottom: '1px solid var(--cm-gitgutter-peek-border, color-mix(in srgb, currentColor 12%, transparent))',
    boxSizing: 'border-box',
    width: '100%',
    maxWidth: 'var(--cm-gitgutter-peek-max-width, none)',
    overflow: 'hidden',
    fontSize: '13px',
    borderRadius: '0',
    position: 'relative',
    height: 'calc(33px + 8 * 1.5em)', // 33px toolbar + 8 lines
  },

  '.cm-gitgutter-peek-toolbar': {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '4px 8px',
    borderBottom: '1px solid var(--cm-gitgutter-peek-border, color-mix(in srgb, currentColor 10%, transparent))',
    backgroundColor: 'transparent',
  },

  // Title: file · Git Local Changes (Working Tree) · N of M changes.
  // Left-aligned and flexible; action buttons sit at the right edge (VSCode).
  '.cm-gitgutter-peek-title': {
    fontSize: '12px',
    color: 'var(--cm-gitgutter-peek-label-color, currentColor)',
    opacity: '0.78',
    flex: '1',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'left',
    paddingRight: '8px',
  },

  '.cm-gitgutter-peek-actions': {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    flexShrink: '0',
  },

  '.cm-gitgutter-peek-btn': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    padding: '0',
    margin: '0',
    border: 'none',
    borderRadius: '4px',
    background: 'transparent',
    color: 'var(--cm-gitgutter-peek-btn-color, currentColor)',
    opacity: '0.9',
    cursor: 'pointer',
    flexShrink: '0',
  },

  '.cm-gitgutter-peek-btn:hover': {
    backgroundColor: 'color-mix(in srgb, currentColor 16%, transparent)',
  },

  '.cm-gitgutter-peek-btn:disabled': {
    opacity: '0.4',
    cursor: 'default',
  },

  '.cm-gitgutter-peek-btn:disabled:hover': {
    backgroundColor: 'transparent',
  },

  '.cm-gitgutter-peek-label': {
    padding: '2px 10px',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--cm-gitgutter-peek-label-color, currentColor)',
    opacity: '0.6',
    backgroundColor: 'transparent',
    borderBottom: '1px solid var(--cm-gitgutter-peek-border, color-mix(in srgb, currentColor 10%, transparent))',
  },

  '.cm-gitgutter-diff-pane': {
    position: 'absolute',
    top: '33px', // Below the toolbar
    left: '0',
    right: '0',
    bottom: '0',
    overflowY: 'auto',
    overflowX: 'auto',
    fontFamily: 'inherit',
    fontSize: '13px',
    lineHeight: '1.5em',
  },
  '.cm-gitgutter-diff-line': {
    display: 'flex',
    alignItems: 'stretch',
    minWidth: 'max-content',
    whiteSpace: 'pre',
  },
  '.cm-gitgutter-diff-added': {
    backgroundColor: 'var(--cm-gitgutter-diff-added-bg, rgba(88, 124, 12, 0.22))',
  },
  '.cm-gitgutter-diff-removed': {
    backgroundColor: 'var(--cm-gitgutter-diff-removed-bg, rgba(181, 21, 43, 0.22))',
  },
  '.cm-gitgutter-diff-old-ln': {
    minWidth: '3em',
    textAlign: 'right',
    paddingRight: '8px',
    paddingLeft: '4px',
    color: 'var(--cm-gitgutter-peek-label-color, currentColor)',
    opacity: '0.6',
    userSelect: 'none',
    flexShrink: '0',
    borderRight: '1px solid var(--cm-gitgutter-peek-border, color-mix(in srgb, currentColor 10%, transparent))',
    backgroundColor: 'transparent',
  },
  '.cm-gitgutter-diff-new-ln': {
    minWidth: '3em',
    textAlign: 'right',
    paddingRight: '8px',
    paddingLeft: '4px',
    color: 'var(--cm-gitgutter-peek-label-color, currentColor)',
    opacity: '0.6',
    userSelect: 'none',
    flexShrink: '0',
    borderRight: '1px solid var(--cm-gitgutter-peek-border, color-mix(in srgb, currentColor 10%, transparent))',
    backgroundColor: 'transparent',
  },
  '.cm-gitgutter-diff-sign': {
    width: '1.2em',
    textAlign: 'center',
    flexShrink: '0',
    color: 'var(--cm-gitgutter-peek-label-color, currentColor)',
    opacity: '0.6',
    userSelect: 'none',
  },
  '.cm-gitgutter-diff-content': {
    paddingLeft: '8px',
    flex: '1',
    color: 'var(--cm-gitgutter-peek-content-color, inherit)',
  },
});