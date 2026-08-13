import type { KeyBinding } from '@codemirror/view';
import { gitGutterGoToNextChange, gitGutterGoToPreviousChange } from './navigation';
import { gitGutterRevertChange } from './revert';

/**
 * Optional keybindings, mirroring VSCode's dirty diff defaults. Import and
 * mount explicitly with `keymap.of(gitGutterKeymap)` — the plugin never
 * registers keybindings automatically.
 */
export const gitGutterKeymap: readonly KeyBinding[] = [
  { key: 'Alt-f3', run: gitGutterGoToNextChange },
  { key: 'Shift-Alt-f3', run: gitGutterGoToPreviousChange },
  { key: 'Mod-Shift-Backspace', run: gitGutterRevertChange },
];