/**
 * Returns true when an event target is an editable form control whose native
 * arrow-key / shortcut behavior must not be hijacked by container-level
 * keyboard handlers (carousel slide nav, sidebar toggle, etc.).
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  const role = target.getAttribute('role');
  if (role === 'textbox' || role === 'slider' || role === 'spinbutton') {
    return true;
  }

  return false;
}
