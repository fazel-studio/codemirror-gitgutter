import type { EditorView } from '@codemirror/view';
import type { Hunk } from '../diff/types';
import { gitGutterConfigFacet } from '../facets';
import { closePeekEffect } from './peekState';
import { gitGutterGoToNextChange, gitGutterGoToPreviousChange } from '../commands/navigation';
import { revertHunk } from '../commands/revert';
import { hunksField } from '../state/hunksField';

const ICONS = {
  previous: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>',
  next: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  stage: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  revert: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h13a5 5 0 0 1 0 10H9"/><path d="M7 5L3 9l4 4"/></svg>',
  close: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
} as const;

export function renderToolbar(view: EditorView, hunk: Hunk): HTMLElement {
  const toolbar = document.createElement('div');
  toolbar.className = 'cm-gitgutter-peek-toolbar';

  let borderColor = 'transparent';
  if (hunk.type === 'added') borderColor = 'var(--cm-gitgutter-added-color, #587c0c)';
  else if (hunk.type === 'modified') borderColor = 'var(--cm-gitgutter-modified-color, #0c7d9d)';
  else if (hunk.type === 'deleted') borderColor = 'var(--cm-gitgutter-deleted-color, #b5152b)';
  toolbar.style.borderLeft = `4px solid ${borderColor}`;

  const config = view.state.facet(gitGutterConfigFacet);

  const button = (icon: string, title: string, onClick: () => void, disabled = false): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cm-gitgutter-peek-btn';
    btn.title = title;
    btn.innerHTML = icon;
    btn.disabled = disabled;
    btn.addEventListener('click', onClick);
    return btn;
  };

  const hunks = view.state.field(hunksField, false) ?? [];
  const idx = hunks.findIndex((h) => h.fromB === hunk.fromB && h.toB === hunk.toB && h.type === hunk.type);

  // Title on the left (takes up the remaining space and pushes the actions
  // container to the right edge — VSCode style).
  const title = document.createElement('span');
  title.className = 'cm-gitgutter-peek-title';
  title.textContent = `Git Local Changes (Working Tree) · ${idx + 1} of ${hunks.length} change${hunks.length !== 1 ? 's' : ''}`;

  toolbar.appendChild(title);

  // Actions on the right: Previous, Next, Stage, Revert, Close.
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'cm-gitgutter-peek-actions';

  actionsContainer.appendChild(button(ICONS.previous, 'Previous change (Shift+Alt+F3)', () => gitGutterGoToPreviousChange(view)));
  actionsContainer.appendChild(button(ICONS.next, 'Next change (Alt+F3)', () => gitGutterGoToNextChange(view)));
  actionsContainer.appendChild(button(ICONS.stage, config.onStageHunk ? 'Stage change' : 'Staging not configured', () => config.onStageHunk?.(hunk), !config.onStageHunk));
  actionsContainer.appendChild(button(ICONS.revert, 'Revert change', () => revertHunk(view, hunk)));
  actionsContainer.appendChild(button(ICONS.close, 'Close peek view', () => view.dispatch({ effects: closePeekEffect.of(null) })));

  toolbar.appendChild(actionsContainer);

  return toolbar;
}