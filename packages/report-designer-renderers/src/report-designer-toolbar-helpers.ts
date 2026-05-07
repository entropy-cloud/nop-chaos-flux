import type { ActionSchema } from '@nop-chaos/flux-core';
import type { ToolbarItem } from './schemas.js';
export type { ToolbarItem };

export function readState(name: string, snapshot: Record<string, unknown>): unknown {
  switch (name) {
    case 'canUndo':
      return snapshot.canUndo;
    case 'canRedo':
      return snapshot.canRedo;
    case 'isDirty': {
      if (snapshot.isDirty !== undefined) return snapshot.isDirty;
      const designer = snapshot.designer as Record<string, unknown> | undefined;
      return designer?.dirty;
    }
    case 'hasSelection': {
      const designer = snapshot.designer as Record<string, unknown> | undefined;
      return designer?.selectionTarget != null;
    }
    case 'fieldCount': {
      const designer = snapshot.designer as Record<string, unknown> | undefined;
      return designer?.fieldCount;
    }
    case 'documentName': {
      const designer = snapshot.designer as Record<string, unknown> | undefined;
      if (designer?.documentName != null) return designer.documentName;
      const doc = snapshot.document as Record<string, unknown> | undefined;
      if (doc?.name != null) return doc.name;
      return snapshot.documentName;
    }
    default:
      return snapshot[name];
  }
}

export function evalBooleanExpr(
  value: boolean | string | undefined,
  snapshot: Record<string, unknown>,
): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;

  const trimmed = value.trim();
  const expr =
    trimmed.startsWith('${') && trimmed.endsWith('}') ? trimmed.slice(2, -1).trim() : trimmed;

  if (expr === '') return false;
  if (expr.startsWith('!')) {
    return !readState(expr.slice(1).trim(), snapshot);
  }
  return readState(expr, snapshot) === true;
}

export function evalTextTemplate(
  template: string | undefined,
  snapshot: Record<string, unknown>,
): string {
  if (!template) return '';

  const trimmed = template.trim();
  if (trimmed.startsWith('${') && trimmed.endsWith('}')) {
    const inner = trimmed.slice(2, -1);
    if (!inner.includes('${')) {
      const expr = inner.trim();
      const ternaryMatch = expr.match(/^([A-Za-z0-9_.]+)\s*\?\s*'([^']*)'\s*:\s*'([^']*)'$/);
      if (ternaryMatch) {
        const [, cond, left, right] = ternaryMatch;
        return readState(cond, snapshot) === true ? left : right;
      }
      const value = readState(expr, snapshot);
      return value != null ? String(value) : '';
    }
  }

  return template.replace(/\$\{([^}]+)\}/g, (_full, exprSource: string) => {
    const expr = exprSource.trim();
    const value = readState(expr, snapshot);
    return value != null ? String(value) : '';
  });
}

export function toCommand(action: string | undefined): ActionSchema | null {
  switch (action) {
    case 'report-designer:undo':
      return { action: 'report-designer:undo' };
    case 'report-designer:redo':
      return { action: 'report-designer:redo' };
    case 'report-designer:preview':
      return { action: 'report-designer:preview', mode: 'inline' };
    case 'report-designer:stopPreview':
      return { action: 'report-designer:stopPreview' };
    case 'report-designer:save':
      return { action: 'report-designer:save' };
    case 'report-designer:openInspector':
      return { action: 'report-designer:openInspector' };
    case 'report-designer:closeInspector':
      return { action: 'report-designer:closeInspector' };
    default:
      return null;
  }
}

export function mergeToolbarItems(
  defaults: ToolbarItem[],
  overrides: ToolbarItem[] | undefined,
): ToolbarItem[] {
  if (!overrides || overrides.length === 0) return [...defaults];

  const overrideMap = new Map<string, ToolbarItem>();
  for (const item of overrides) {
    if (item.id != null) {
      overrideMap.set(item.id, item);
    }
  }

  const result: ToolbarItem[] = [];

  for (const defaultItem of defaults) {
    if (defaultItem.id != null && overrideMap.has(defaultItem.id)) {
      const override = overrideMap.get(defaultItem.id)!;
      overrideMap.delete(defaultItem.id);
      if (isHidden(override.visible)) continue;
      result.push({ ...defaultItem, ...override });
    } else {
      result.push(defaultItem);
    }
  }

  for (const override of overrides) {
    if (override.id != null && overrideMap.has(override.id) && !isHidden(override.visible)) {
      result.push(override);
    }
  }

  return result;
}

function isHidden(visible: boolean | string | undefined): boolean {
  if (visible === false) return true;
  if (visible === 'false') return true;
  return false;
}
