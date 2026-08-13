import { EditorView, basicSetup } from 'codemirror';
import { keymap } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { gitGutter, gitGutterKeymap } from '@fazelstudio/codemirror-gitgutter';

// Simulated git baseline — the host app would normally get this from
// `git show HEAD:path/to/file` (e.g. via simple-git in Node/Electron).
const head = [
  '// baseline (HEAD) — this file is the git "Original"',
  'export function add(a, b) {',
  '  return a + b;',
  '}',
  '',
  'export function multiply(a, b) {',
  '  return a * b;',
  '}',
  '',
  "const greeting = 'hello';",
  'export { greeting };',
  '',
].join('\n');

const modified = [
  '// working copy — with uncommitted changes (modified / added / deleted)',
  'export function add(a, b) {',
  '  const result = a + b;',
  '  return result;',
  '}',
  '',
  'export function subtract(a, b) {',
  '  return a - b;',
  '}',
  '',
  'export function multiply(a, b) {',
  '  return a * b;',
  '}',
  '',
  "const greeting = 'hello world';",
  'const extra = true;',
  'export { greeting, extra };',
  '',
].join('\n');

const view = new EditorView({
  doc: modified,
  extensions: [
    basicSetup,
    javascript(),
    gitGutter({
      baseline: head,
      onStageHunk: (hunk) => {
        log(`Stage change (${hunk.type}) baseline lines ${hunk.fromA}-${hunk.toA} -> working lines ${hunk.fromB}-${hunk.toB}`);
      },
    }),
    keymap.of(gitGutterKeymap),
  ],
  parent: document.querySelector<HTMLElement>('#editor')!,
});

const scenarios: Record<string, [string, string]> = {
  modified: [modified, 'Switched to modified content'],
  added: [head.replace("const greeting = 'hello';\n", "const greeting = 'hello';\nconst brandNew = 42;\n"), 'Switched to added content'],
  deleted: ['export function add(a, b) {\n  return a + b;\n}\n', 'Switched to deleted content'],
  mixed: [modified, 'Switched to mixed content'],
  reset: [head, 'Reset to HEAD'],
};

function setDoc(text: string, label: string) {
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
  log(label);
}

function log(msg: string) {
  const el = document.querySelector<HTMLElement>('#log')!;
  el.textContent = `${new Date().toLocaleTimeString()} — ${msg}\n` + el.textContent;
}

for (const [id, [text, label]] of Object.entries(scenarios)) {
  document.querySelector<HTMLElement>(`#btn-${id}`)!.addEventListener('click', () => setDoc(text, label));
}

log('Editor ready. Click a gutter marker to open the peek view.');
