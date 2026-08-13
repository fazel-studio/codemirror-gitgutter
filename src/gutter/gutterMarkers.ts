import { GutterMarker } from '@codemirror/view';

/**
 * Base marker: a full-height cell that gets its visual from CSS classes.
 * Colors come from CSS custom properties (`--cm-gitgutter-added-color`,
 * etc.) so end users can restyle everything without forking the package.
 */
class GitGutterMarker extends GutterMarker {
  protected cls: string;

  constructor(cls: string) {
    super();
    this.cls = cls;
  }

  override toDOM(): HTMLElement {
    const el = document.createElement('div');
    el.className = `cm-gitgutter-marker ${this.cls}`;
    return el;
  }
}

/** Solid green block = lines added since baseline. */
export class AddedMarker extends GitGutterMarker {
  constructor() {
    super('cm-gitgutter-added');
  }
}

/** Solid cyan/blue block = lines modified since baseline. */
export class ModifiedMarker extends GitGutterMarker {
  constructor() {
    super('cm-gitgutter-modified');
  }
}

export class DeletedMarker extends GitGutterMarker {
  constructor() {
    super('cm-gitgutter-deleted');
  }

  override toDOM(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'cm-gitgutter-marker cm-gitgutter-deleted';
    return el;
  }
}