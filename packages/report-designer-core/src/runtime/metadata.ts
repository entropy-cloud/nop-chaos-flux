import type {
  MetadataBag,
  ReportSelectionTarget,
  ReportTemplateDocument,
} from '../types.js';
import { getTargetMeta } from '../types.js';

export function cloneDocument(document: ReportTemplateDocument): ReportTemplateDocument {
  return JSON.parse(JSON.stringify(document)) as ReportTemplateDocument;
}

export function cloneMetadataBag(input: MetadataBag | undefined): MetadataBag | undefined {
  return input ? { ...input } : undefined;
}

export function shallowEqualMetadata(left: MetadataBag | undefined, right: MetadataBag | undefined): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return !left && !right;
  }
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  return leftKeys.every((key) => Object.is(left[key], right[key]));
}

export function normalizeMetadataBag(value: MetadataBag | undefined): MetadataBag | undefined {
  if (!value) {
    return undefined;
  }
  const entries = Object.entries(value).filter(([, item]) => item !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function getMetaContainer(
  document: ReportTemplateDocument,
  sheetId: string,
  kind: 'cell' | 'row' | 'column',
): Record<string, MetadataBag> {
  const semantic = (document.semantic ??= {});
  switch (kind) {
    case 'cell': {
      const cellMeta = (semantic.cellMeta ??= {});
      return (cellMeta[sheetId] ??= {});
    }
    case 'row': {
      const rowMeta = (semantic.rowMeta ??= {});
      return (rowMeta[sheetId] ??= {});
    }
    case 'column': {
      const columnMeta = (semantic.columnMeta ??= {});
      return (columnMeta[sheetId] ??= {});
    }
  }
}

export function writeMetadata(
  document: ReportTemplateDocument,
  target: ReportSelectionTarget,
  nextMeta: MetadataBag | undefined,
): boolean {
  const normalized = normalizeMetadataBag(nextMeta);

  switch (target.kind) {
    case 'workbook': {
      const semantic = (document.semantic ??= {});
      const changed = !shallowEqualMetadata(semantic.workbookMeta, normalized);
      semantic.workbookMeta = normalized;
      return changed;
    }
    case 'sheet': {
      const semantic = (document.semantic ??= {});
      const sheetMeta = (semantic.sheetMeta ??= {});
      const currentMeta = sheetMeta[target.sheetId];
      const changed = !shallowEqualMetadata(currentMeta, normalized);
      if (normalized) {
        sheetMeta[target.sheetId] = normalized;
      } else {
        delete sheetMeta[target.sheetId];
      }
      return changed;
    }
    case 'row': {
      const container = getMetaContainer(document, target.sheetId, 'row');
      const key = String(target.row);
      const changed = !shallowEqualMetadata(container[key], normalized);
      if (normalized) {
        container[key] = normalized;
      } else {
        delete container[key];
      }
      return changed;
    }
    case 'column': {
      const container = getMetaContainer(document, target.sheetId, 'column');
      const key = String(target.col);
      const changed = !shallowEqualMetadata(container[key], normalized);
      if (normalized) {
        container[key] = normalized;
      } else {
        delete container[key];
      }
      return changed;
    }
    case 'cell': {
      const container = getMetaContainer(document, target.cell.sheetId, 'cell');
      const key = target.cell.address;
      const changed = !shallowEqualMetadata(container[key], normalized);
      if (normalized) {
        container[key] = normalized;
      } else {
        delete container[key];
      }
      return changed;
    }
    case 'range': {
      const semantic = (document.semantic ??= {});
      const rangeMeta = (semantic.rangeMeta ??= {});
      const sheetRanges = (rangeMeta[target.range.sheetId] ??= []);
      const range = target.range;
      const id = `${range.sheetId}:${range.startRow}:${range.startCol}:${range.endRow}:${range.endCol}`;
      const index = sheetRanges.findIndex((item) => item.id === id);
      const previous = index >= 0 ? sheetRanges[index].meta : undefined;
      const changed = !shallowEqualMetadata(previous, normalized);

      if (!normalized) {
        if (index >= 0) {
          sheetRanges.splice(index, 1);
        }
        return changed;
      }

      const nextEntry = { id, range: { ...range }, meta: normalized };
      if (index >= 0) {
        sheetRanges[index] = nextEntry;
      } else {
        sheetRanges.push(nextEntry);
      }
      return changed;
    }
  }
}

export function mergeMetadata(base: MetadataBag | undefined, patch: MetadataBag): MetadataBag {
  return { ...(base ?? {}), ...patch };
}

export function applyFieldDrop(
  document: ReportTemplateDocument,
  field: import('../types.js').FieldDragPayload,
  target: Extract<ReportSelectionTarget, { kind: 'cell' | 'range' }>,
): ReportTemplateDocument {
  const patch: MetadataBag = {
    [field.type]: {
      sourceId: field.sourceId,
      fieldId: field.fieldId,
      data: field.data,
    },
  };

  if (target.kind === 'cell') {
    writeMetadata(document, target, mergeMetadata(getTargetMeta(document.semantic, target), patch));
    return document;
  }

  const range = target.range;
  for (let row = range.startRow; row <= range.endRow; row++) {
    for (let col = range.startCol; col <= range.endCol; col++) {
      const cellTarget: ReportSelectionTarget = {
        kind: 'cell',
        cell: {
          sheetId: range.sheetId,
          address: `${String.fromCharCode(65 + col)}${row + 1}`,
          row,
          col,
        },
      };
      writeMetadata(document, cellTarget, mergeMetadata(getTargetMeta(document.semantic, cellTarget), patch));
    }
  }
  return document;
}
