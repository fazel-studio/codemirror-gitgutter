# @fazelstudio/codemirror-gitgutter

> Git-blame-style inline diff gutter for CodeMirror 6 with a VSCode-like
> **peek view** (dirty diff / Source Control decorations).

A plug-and-play CodeMirror 6 extension: install it, import `gitGutter`,
pass the git **baseline** content, and mount it in your extensions array. It
computes a line-based diff between the current editor content and the baseline,
renders colored gutter markers (added / modified / deleted), and opens an
in-editor **peek view** when a marker is clicked — complete with
Stage / Revert / Next / Previous controls.

## Highlights

- **Plug-and-play**: a single `gitGutter(config)` call returns a ready-to-mount
  `Extension`. All styling (gutter, markers, peek view) is injected
  automatically via CodeMirror style modules — **no CSS file to import, no
  manual DOM wiring**. Peer dependencies (`@codemirror/state`, `@codemirror/view`)
  are installed automatically by npm ≥ 7.
- **Pure function of `(baseline, currentDoc)`** — the plugin never runs git.
  The host app provides the baseline through the `baseline` config option
  (e.g. the result of `git show HEAD:path/to/file`).
- **VSCode-style gutter markers**: green = added, cyan = modified, small red
  triangle = deleted (attached at the line boundary, exactly like VSCode).
- **Peek view** that "splits" the editor (native CM6 block widget, not a modal)
  and renders a **unified diff** of the change with surrounding context —
  old/new line numbers and tinted `+` / `-` rows, VSCode dirty-diff style.
- **Stage** delegates a precise hunk to a host callback (`git apply --cached`
  is the host's job); **Revert** is a purely local CM6 document transaction
  (no git involved).
- **Debounced** diff recomputation (default 150ms) via a `ViewPlugin`, so
  typing stays smooth even on large files.
- **Theme-agnostic**: the peek view is fully transparent — it inherits the
  editor background and text color (`currentColor`) automatically, and
  auto-constrains its width so it never tucks under a minimap, just like VSCode.
  Marker / diff-tint colors are exposed as CSS variables for optional overrides.
- **Zero runtime dependency besides `diff`**; ESM + CJS dual build,
  tree-shakeable.

> **NOTICE**: The gutter + peek-view UX in this package replicates the
> **Source Control Decorations (dirty diff)** feature of VSCode (conceptual
> architecture of `dirtydiffDecorator.ts`). It was written from scratch on top
> of CodeMirror 6 primitives and does **not** copy VSCode code.

---

## Installation

```bash
npm install @fazelstudio/codemirror-gitgutter
```

Peer dependencies (installed automatically by npm ≥ 7, or install manually):

```bash
npm install @codemirror/state @codemirror/view
```

## Basic example

```ts
import { EditorView, basicSetup } from 'codemirror';
import { gitGutter } from '@fazelstudio/codemirror-gitgutter';

const view = new EditorView({
  doc: currentFileContent,
  extensions: [
    basicSetup,
    gitGutter({
      baseline: headFileContent, // host app: `git show HEAD:path/to/file`
      onStageHunk: (hunk) => myBackend.stageHunk(filePath, hunk),
    }),
  ],
  parent: document.querySelector('#editor'),
});
```

That's it. Click a gutter marker to open the peek view; click it again to
close it. If your host app cannot provide an `onStageHunk` callback, the Stage
button is disabled automatically.

## API

### `gitGutter(config: GitGutterConfig): Extension`

The main entry point. Returns a single `Extension` ready to mount.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `baseline` | `string` | — | File content at the git baseline (required). |
| `onStageHunk` | `(hunk: Hunk) => void` | — | Called when the Stage button is pressed. When omitted, the Stage button is disabled. |
| `colors` | `{ added?, modified?, deleted? }` | VSCode palette | Marker colors (CSS values). |
| `debounceMs` | `number` | `150` | Diff recompute delay after a document change. `0` = synchronous. |
| `gutterWidth` | `string` | `'4px'` | Gutter column width. |

### Types

```ts
type ChangeType = 'added' | 'modified' | 'deleted';

interface Hunk {
  type: ChangeType;
  fromA: number;  // first baseline line (1-based, inclusive)
  toA: number;    // last baseline line (toA < fromA for pure additions)
  fromB: number;  // first current-document line (1-based)
  toB: number;    // last current-document line (toB < fromB for pure deletions)
  baselineText: string; // baseline text for this hunk (used by revert & peek view)
}
```

### Commands & keybindings

All commands follow the `(view: EditorView) => boolean` convention:

- `gitGutterGoToNextChange` / `gitGutterGoToPreviousChange`
- `gitGutterToggleWidget`
- `gitGutterRevertChange`
- `gitGutterStageChange`

Optional keybindings (not registered automatically — mount explicitly):

```ts
import { keymap } from '@codemirror/view';
import { gitGutterKeymap } from '@fazelstudio/codemirror-gitgutter';

extensions: [keymap.of(gitGutterKeymap)]
```

Defaults: `Alt-F3` next change, `Shift-Alt-F3` previous change,
`Mod-Shift-Backspace` revert.

### Reading diff state (host integration)

For host-side metadata UIs (e.g. a minimap that colors changed lines), the
plugin exports its state:

```ts
import { hunksField, hunkAtLine, baselineContentFacet } from '@fazelstudio/codemirror-gitgutter';

// Current hunks (updated via the plugin's debounced diff):
const hunks = view.state.field(hunksField, false) ?? [];

// The hunks covering a given 1-based line number:
const hunk = hunkAtLine(view.state, lineNumber);
```

### Optional extensions

- `gitGutterLineDecorations()` — subtle background highlight on added/modified
  lines (not included by default).
- `gitGutterDarkTheme` / `gitGutterLightTheme` — **deprecated no-ops**. The peek
  view follows the editor theme automatically; keep them only to avoid breaking
  old imports, then remove them.

### Theming

Marker and diff-tint colors are semantic and exposed as CSS variables.
Override them on `.cm-editor` (or the editor wrapper):

```css
.cm-editor {
  --cm-gitgutter-added-color: #3fb950;
  --cm-gitgutter-modified-color: #58a6ff;
  --cm-gitgutter-deleted-color: #f85149;
  --cm-gitgutter-diff-added-bg: rgba(63, 185, 80, 0.22);
  --cm-gitgutter-diff-removed-bg: rgba(248, 81, 73, 0.22);
}
```

The peek view background is fully transparent — it automatically inherits the
editor theme (background + `currentColor`), so no theme presets are needed.
Its width is capped automatically to the visible editor area (stopping before
a minimap when present).

---

## Git backend integration (Node.js / Electron)

The plugin provides the data; **the host app runs git**. Example with
[`simple-git`](https://www.npmjs.com/package/simple-git):

```ts
import { git } from 'simple-git';

async function setupGutter(view: EditorView, filePath: string) {
  const repo = git();
  const baseline = await repo.show([`HEAD:${filePath}`]);

  view.dispatch({
    effects: EditorState.reconfigure.of([
      ...existingExtensions,
      gitGutter({
        baseline,
        onStageHunk: async (hunk) => {
          // Apply the hunk to the index. Real implementations typically use
          // `git apply --cached` with a patch built from `hunk`.
          await repo.apply(['--cached', buildPatch(filePath, hunk)]);
          // After staging, reconfigure with the new baseline.
          const newBaseline = await repo.show([`HEAD:${filePath}`]);
          view.dispatch({
            effects: EditorState.reconfigure.of([
              ...existingExtensions,
              gitGutter({ baseline: newBaseline, onStageHunk }),
            ]),
          });
        },
      }),
    ]),
  });
}
```

The baseline can also be updated reactively at any time via
`EditorState.reconfigure`.

---

## Playground

Run the local playground (no git backend — two hardcoded strings):

```bash
npm install
npm run dev   # open http://localhost:5173
```

The playground has buttons to simulate modified / added / deleted / mixed
content plus a log for Stage actions. To deploy to GitHub Pages, run
`npx vite build` (output lands in `examples/basic/dist`).

## Scripts

| Script | Description |
| --- | --- |
| `npm run build` | Build ESM + CJS + types via tsup into `dist/` |
| `npm test` | Run unit & integration tests (vitest) |
| `npm run lint` / `npm run typecheck` | Type-check with strict TypeScript |
| `npm run dev` | Run the Vite playground |
| `npm run publish:dry` | Dry-run publish to npm |

## License

MIT — see [LICENSE](./LICENSE).
