import type {
  MetadataBag,
  RangeMetaDocument,
  ReportSelectionTarget,
  ReportSemanticDocument,
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

function buildNextSemanticWithWorkbookMeta(
  semantic: ReportSemanticDocument | undefined,
  normalized: MetadataBag | undefined,
): ReportSemanticDocument {
  return {
    ...(semantic ?? {}),
    workbookMeta: normalized,
  };
}

function buildNextSemanticWithSheetMeta(
  semantic: ReportSemanticDocument | undefined,
  sheetId: string,
  normalized: MetadataBag | undefined,
): ReportSemanticDocument {
  const currentSheetMeta = semantic?.sheetMeta ?? {};
  const nextSheetMeta = { ...currentSheetMeta };
  if (normalized) {
    nextSheetMeta[sheetId] = normalized;
  } else {
    delete nextSheetMeta[sheetId];
  }

  return {
    ...(semantic ?? {}),
    sheetMeta: nextSheetMeta,
  };
}

function buildNextSemanticWithAxisMeta(
  semantic: ReportSemanticDocument | undefined,
  containerKey: 'rowMeta' | 'columnMeta' | 'cellMeta',
  sheetId: string,
  entryKey: string,
  normalized: MetadataBag | undefined,
): ReportSemanticDocument {
  const currentGroup = semantic?.[containerKey] ?? {};
  const currentSheetEntries = currentGroup[sheetId] ?? {};
  const nextSheetEntries = { ...currentSheetEntries };

  if (normalized) {
    nextSheetEntries[entryKey] = normalized;
  } else {
    delete nextSheetEntries[entryKey];
  }

  return {
    ...(semantic ?? {}),
    [containerKey]: {
      ...currentGroup,
      [sheetId]: nextSheetEntries,
    },
  };
}

function buildNextSemanticWithBatchedCellMeta(
  semantic: ReportSemanticDocument | undefined,
  sheetId: string,
  entries: ReadonlyArray<{ entryKey: string; normalized: MetadataBag | undefined }>,
): ReportSemanticDocument {
  const currentGroup = semantic?.cellMeta ?? {};
  const currentSheetEntries = currentGroup[sheetId] ?? {};
  const nextSheetEntries = { ...currentSheetEntries };

  for (const entry of entries) {
    if (entry.normalized) {
      nextSheetEntries[entry.entryKey] = entry.normalized;
    } else {
      delete nextSheetEntries[entry.entryKey];
    }
  }

  return {
    ...(semantic ?? {}),
    cellMeta: {
      ...currentGroup,
      [sheetId]: nextSheetEntries,
    },
  };
}

function buildNextSemanticWithRangeMeta(
  semantic: ReportSemanticDocument | undefined,
  sheetId: string,
  rangeId: string,
  range: Extract<ReportSelectionTarget, { kind: 'range' }>['range'],
  normalized: MetadataBag | undefined,
): ReportSemanticDocument {
  const currentRangeMeta = semantic?.rangeMeta ?? {};
  const currentRanges = currentRangeMeta[sheetId] ?? [];
  const index = currentRanges.findIndex((item) => item.id === rangeId);

  let nextRanges: RangeMetaDocument[];
  if (!normalized) {
    nextRanges = index >= 0
      ? [...currentRanges.slice(0, index), ...currentRanges.slice(index + 1)]
      : currentRanges;
  } else {
    const nextEntry: RangeMetaDocument = { id: rangeId, range: { ...range }, meta: normalized };
    nextRanges = index >= 0
      ? [...currentRanges.slice(0, index), nextEntry, ...currentRanges.slice(index + 1)]
      : [...currentRanges, nextEntry];
  }

  return {
    ...(semantic ?? {}),
    rangeMeta: {
      ...currentRangeMeta,
      [sheetId]: nextRanges,
    },
  };
}

export function updateMetadata(
  document: ReportTemplateDocument,
  target: ReportSelectionTarget,
  nextMeta: MetadataBag | undefined,
): { changed: boolean; document: ReportTemplateDocument } {
  const normalized = normalizeMetadataBag(nextMeta);

  switch (target.kind) {
    case 'workbook': {
      const currentMeta = document.semantic?.workbookMeta;
      const changed = !shallowEqualMetadata(currentMeta, normalized);
      return {
        changed,
        document: changed
          ? { ...document, semantic: buildNextSemanticWithWorkbookMeta(document.semantic, normalized) }
          : document,
      };
    }
    case 'sheet': {
      const currentMeta = document.semantic?.sheetMeta?.[target.sheetId];
      const changed = !shallowEqualMetadata(currentMeta, normalized);
      return {
        changed,
        document: changed
          ? { ...document, semantic: buildNextSemanticWithSheetMeta(document.semantic, target.sheetId, normalized) }
          : document,
      };
    }
    case 'row': {
      const key = String(target.row);
      const currentMeta = document.semantic?.rowMeta?.[target.sheetId]?.[key];
      const changed = !shallowEqualMetadata(currentMeta, normalized);
      return {
        changed,
        document: changed
          ? { ...document, semantic: buildNextSemanticWithAxisMeta(document.semantic, 'rowMeta', target.sheetId, key, normalized) }
          : document,
      };
    }
    case 'column': {
      const key = String(target.col);
      const currentMeta = document.semantic?.columnMeta?.[target.sheetId]?.[key];
      const changed = !shallowEqualMetadata(currentMeta, normalized);
      return {
        changed,
        document: changed
          ? { ...document, semantic: buildNextSemanticWithAxisMeta(document.semantic, 'columnMeta', target.sheetId, key, normalized) }
          : document,
      };
    }
    case 'cell': {
      const key = target.cell.address;
      const currentMeta = document.semantic?.cellMeta?.[target.cell.sheetId]?.[key];
      const changed = !shallowEqualMetadata(currentMeta, normalized);
      return {
        changed,
        document: changed
          ? { ...document, semantic: buildNextSemanticWithAxisMeta(document.semantic, 'cellMeta', target.cell.sheetId, key, normalized) }
          : document,
      };
    }
    case 'range': {
      const range = target.range;
      const id = `${range.sheetId}:${range.startRow}:${range.startCol}:${range.endRow}:${range.endCol}`;
      const currentRanges = document.semantic?.rangeMeta?.[range.sheetId] ?? [];
      const previous = currentRanges.find((item) => item.id === id)?.meta;
      const changed = !shallowEqualMetadata(previous, normalized);
      return {
        changed,
        document: changed
          ? { ...document, semantic: buildNextSemanticWithRangeMeta(document.semantic, range.sheetId, id, range, normalized) }
          : document,
      };
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
): { changed: boolean; document: ReportTemplateDocument } {
  const patch: MetadataBag = {
    [field.type]: {
      sourceId: field.sourceId,
      fieldId: field.fieldId,
      data: field.data,
    },
  };

  if (target.kind === 'cell') {
    return updateMetadata(document, target, mergeMetadata(getTargetMeta(document.semantic, target), patch));
  }

  const range = target.range;
  const updates: Array<{ entryKey: string; normalized: MetadataBag | undefined }> = [];
  let changed = false;

  for (let row = range.startRow; row <= range.endRow; row++) {
    for (let col = range.startCol; col <= range.endCol; col++) {
      const entryKey = `${String.fromCharCode(65 + col)}${row + 1}`;
      const cellTarget: ReportSelectionTarget = {
        kind: 'cell',
        cell: {
          sheetId: range.sheetId,
          address: entryKey,
          row,
          col,
        },
      };
      const nextMeta = mergeMetadata(getTargetMeta(document.semantic, cellTarget), patch);
      const normalized = normalizeMetadataBag(nextMeta);
      const currentMeta = document.semantic?.cellMeta?.[range.sheetId]?.[entryKey];
      const entryChanged = !shallowEqualMetadata(currentMeta, normalized);
      changed = changed || entryChanged;
      if (entryChanged) {
        updates.push({ entryKey, normalized });
      }
    }
  }

  if (!changed) {
    return { changed: false, document };
  }

  return {
    changed: true,
    document: {
      ...document,
      semantic: buildNextSemanticWithBatchedCellMeta(document.semantic, range.sheetId, updates),
    },
  };
}
