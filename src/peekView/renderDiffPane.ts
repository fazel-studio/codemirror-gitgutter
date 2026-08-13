import type { Extension } from '@codemirror/state';
import type { Hunk } from '../diff/types';

interface DiffLine {
  type: 'added' | 'removed' | 'context';
  content: string;
  oldLineNo: number | null;
  newLineNo: number | null;
}

const CONTEXT_LINES = 4;

/**
 * Builds a unified diff line list with context — like `git diff --unified=4`.
 * Always shows CONTEXT_LINES of surrounding unchanged code above and below the
 * hunk so the user can see WHERE in the file the change lives (VSCode style).
 */
function buildDiffLines(hunk: Hunk, baselineLines: string[], currentLines: string[]): DiffLine[] {
  const lines: DiffLine[] = [];

  // ── context BEFORE hunk ───────────────────────────────────────────────────
  // We anchor context on the new-doc side (B). For deleted hunks fromB === toB+1
  // so we just use fromB as the anchor.
  const ctxBeforeEndB   = hunk.fromB - 1;            // last unchanged new-line before hunk
  const ctxBeforeStartB = Math.max(1, ctxBeforeEndB - CONTEXT_LINES + 1);
  // Corresponding old-side anchor (same offset)
  const offsetBA = hunk.fromA - hunk.fromB;           // old = new + offsetBA (for context)

  for (let b = ctxBeforeStartB; b <= ctxBeforeEndB; b++) {
    const a = b + offsetBA;
    lines.push({
      type: 'context',
      content: currentLines[b - 1] ?? '',
      oldLineNo: a >= 1 && a <= baselineLines.length ? a : null,
      newLineNo: b,
    });
  }

  // ── removed lines (from baseline) ─────────────────────────────────────────
  if (hunk.type === 'deleted' || hunk.type === 'modified') {
    const baseText = hunk.baselineText ?? '';
    const removedLines = baseText ? baseText.split('\n') : [];
    for (let i = 0; i < removedLines.length; i++) {
      lines.push({
        type: 'removed',
        content: removedLines[i] ?? '',
        oldLineNo: hunk.fromA + i,
        newLineNo: null,
      });
    }
  }

  // ── added lines (from current doc) ────────────────────────────────────────
  if (hunk.type === 'added' || hunk.type === 'modified') {
    for (let b = hunk.fromB; b <= hunk.toB; b++) {
      lines.push({
        type: 'added',
        content: currentLines[b - 1] ?? '',
        oldLineNo: null,
        newLineNo: b,
      });
    }
  }

  // ── context AFTER hunk ────────────────────────────────────────────────────
  const ctxAfterStartB = (hunk.type === 'deleted' ? hunk.fromB : hunk.toB + 1);
  const ctxAfterEndB   = Math.min(currentLines.length, ctxAfterStartB + CONTEXT_LINES - 1);
  // offsetBA after hunk: old line = new line + (toA - toB) offset
  const offsetAfterBA = hunk.toA - (hunk.type === 'deleted' ? hunk.fromB - 1 : hunk.toB);

  for (let b = ctxAfterStartB; b <= ctxAfterEndB; b++) {
    const a = b + offsetAfterBA;
    lines.push({
      type: 'context',
      content: currentLines[b - 1] ?? '',
      oldLineNo: a >= 1 && a <= baselineLines.length ? a : null,
      newLineNo: b,
    });
  }

  return lines;
}

/**
 * Renders the VSCode-style unified diff pane for the peek view.
 * Uses pure DOM (no nested CodeMirror instance) for performance.
 *
 * @param hunk         - The hunk to display
 * @param baseline     - Full baseline file text (git HEAD content)
 * @param currentDoc   - Full current document text
 */
export function renderDiffPane(
  hunk: Hunk,
  baseline: string,
  currentDoc: string,
  _languageSupport: Extension[],
  _themeExtensions: Extension[],
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'cm-gitgutter-diff-pane';

  const baselineLines = baseline ? baseline.split('\n') : [];
  const currentLines  = currentDoc ? currentDoc.split('\n') : [];

  const diffLines = buildDiffLines(hunk, baselineLines, currentLines);

  let firstChangedIndex = -1;

  diffLines.forEach((line, idx) => {
    const lineEl = document.createElement('div');
    lineEl.className = `cm-gitgutter-diff-line cm-gitgutter-diff-${line.type}`;

    // Old line number column
    const oldLn = document.createElement('span');
    oldLn.className = 'cm-gitgutter-diff-old-ln';
    oldLn.textContent = line.oldLineNo !== null ? String(line.oldLineNo) : '';

    // New line number column
    const newLn = document.createElement('span');
    newLn.className = 'cm-gitgutter-diff-new-ln';
    newLn.textContent = line.newLineNo !== null ? String(line.newLineNo) : '';

    // +/- sign column
    const sign = document.createElement('span');
    sign.className = 'cm-gitgutter-diff-sign';
    sign.textContent = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';

    // Code content column
    const content = document.createElement('span');
    content.className = 'cm-gitgutter-diff-content';
    // Use a zero-width space so empty lines still have height
    content.textContent = line.content !== '' ? line.content : '\u200B';

    lineEl.appendChild(oldLn);
    lineEl.appendChild(newLn);
    lineEl.appendChild(sign);
    lineEl.appendChild(content);
    container.appendChild(lineEl);

    if (firstChangedIndex === -1 && line.type !== 'context') {
      firstChangedIndex = idx;
    }
  });

  // Auto-scroll so the first changed line sits near the top of the pane
  if (firstChangedIndex > 0) {
    // Defer one frame so the widget is in the DOM and has layout
    requestAnimationFrame(() => {
      const LINE_H = 19.5; // matches 13px font at 1.5em
      container.scrollTop = Math.max(0, (firstChangedIndex - 1) * LINE_H);
    });
  }

  return container;
}
