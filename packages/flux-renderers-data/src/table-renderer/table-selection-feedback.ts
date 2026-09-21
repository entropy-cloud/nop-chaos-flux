import { isEditableKeyboardTarget } from '@nop-chaos/flux-react';
import type { TableSchema } from '../schemas.js';

/**
 * Selection-gesture feedback helpers ([G3-R2-视角4-01] container markers +
 * header hint; D1 G-B2 Decision 3 container ⌘/ctrl+A select-all). Extracted
 * from table-renderer.tsx (oversized-file governance).
 */

/**
 * Container-level keydown relay for rowSelection.modifierSelect (⌘/ctrl+A
 * select-all). Trigger domain = focus inside the table container
 * (container-level React onKeyDown bubble); editable targets (inputs) keep
 * the native select-all.
 */
export function createSelectAllKeyDownHandler(options: {
  enabled: boolean;
  onSelectAll: () => void;
}): (event: React.KeyboardEvent<HTMLDivElement>) => void {
  return (event) => {
    if (!options.enabled) {
      return;
    }
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'a') {
      return;
    }
    if (isEditableKeyboardTarget(event.target)) {
      return;
    }
    event.preventDefault();
    options.onSelectAll();
  };
}

/** Dev-only warn (once per schema update): optionRow.value overrides the
 * rowSelection marker binding — surface the precedence so it is diagnosable. */
export function warnDevOptionRowValueOverride(schemaProps: TableSchema): void {
  const optionRow = schemaProps.optionRow;
  const binding = optionRow && typeof optionRow === 'object' ? optionRow.value : undefined;
  if (binding === undefined || binding === null || binding === '' || !schemaProps.rowSelection) {
    return;
  }
  if (!isDevRuntime()) {
    return;
  }
  console.warn(
    '[flux:table] optionRow.value overrides rowSelection for row state markers. ' +
      'Row selection checkboxes keep working and dispatch onSelectionChange, but visual ' +
      'selected markers follow the binding.',
  );
}

function isDevRuntime(): boolean {
  const importMeta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  return importMeta.env?.DEV === true;
}
