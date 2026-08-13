import { EditorView } from '@codemirror/view';

/**
 * @deprecated The peek view is now fully transparent and theme-agnostic — it
 * inherits the editor background and text color automatically. These presets
 * are left as no-ops so existing host code keeps compiling; remove the import
 * from your project when convenient.
 */
export const gitGutterDarkTheme = EditorView.theme({});

/**
 * @deprecated See {@link gitGutterDarkTheme}. Kept as a no-op for
 * compatibility; the peek view follows the editor theme on its own.
 */
export const gitGutterLightTheme = EditorView.theme({});