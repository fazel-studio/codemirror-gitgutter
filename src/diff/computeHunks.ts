import { diffLines } from 'diff';
import type { Change } from 'diff';
import type { ChangeType, Hunk } from './types';

/**
 * Compute a line-based diff between the git baseline (`baseline`) and the
 * current editor content (`current`) and convert it into a list of hunks.
 *
 * This function is fully pure: it never touches the DOM or any CodeMirror
 * state, which makes it trivial to unit test and safe to run inside a
 * Web Worker.
 *
 * The Myers diff engine itself comes from the battle-tested `diff` npm
 * package (`diffLines`); here we only map its `Change[]` output onto the
 * `Hunk` structure consumed by the plugin.
 */
export function computeHunks(baseline: string, current: string): Hunk[] {
  const parts = diffLines(baseline, current);
  const hunks: Hunk[] = [];
  let aPos = 1; // next line number in the baseline (1-based)
  let bPos = 1; // next line number in the current document (1-based)
  let run: Change[] = [];

  const flush = () => {
    if (run.length === 0) return;
    let removedText = '';
    let removedCount = 0;
    let addedCount = 0;
    for (const part of run) {
      const count = part.count ?? countLines(part.value);
      if (part.removed) {
        removedText += part.value;
        removedCount += count;
      } else if (part.added) {
        addedCount += count;
      }
    }
    const fromA = aPos;
    const toA = aPos + removedCount - 1;
    const fromB = bPos;
    const toB = bPos + addedCount - 1;
    const type: ChangeType =
      removedCount > 0 && addedCount > 0
        ? 'modified'
        : removedCount > 0
          ? 'deleted'
          : 'added';
    hunks.push({ type, fromA, toA, fromB, toB, baselineText: removedText });
    aPos += removedCount;
    bPos += addedCount;
    run = [];
  };

  for (const part of parts) {
    if (part.added || part.removed) {
      run.push(part);
    } else {
      flush();
      const count = part.count ?? countLines(part.value);
      aPos += count;
      bPos += count;
    }
  }
  flush();
  return hunks;
}

function countLines(text: string): number {
  if (text === '') return 0;
  const newlines = (text.match(/\n/g) ?? []).length;
  return text.endsWith('\n') ? newlines : newlines + 1;
}
