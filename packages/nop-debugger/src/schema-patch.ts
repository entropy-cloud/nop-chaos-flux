import type {
  NopSchemaPatchAuditAction,
  NopSchemaPatchAuditEntry,
  NopSchemaPatchValidationResult,
} from './types.js';

export const MAX_PATCH_OPS = 20;
export const MAX_PATCH_AUDIT_ENTRIES = 50;

const OP_TYPES = new Set(['set-prop', 'set-expression']);

/** Live-tree evidence only: event-stream aggregations have no found semantics. */
export interface PatchTargetResolvers {
  inspectByCid(cid: number): { cid: number } | undefined;
  getComponentTree(): Array<{ cid: number; nodeId?: string; path?: string }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateOps(ops: unknown, errors: string[]): void {
  if (!Array.isArray(ops)) {
    errors.push('ops must be an array');
    return;
  }
  if (ops.length === 0) {
    errors.push('ops empty: at least one op is required');
    return;
  }
  if (ops.length > MAX_PATCH_OPS) {
    errors.push(`too many ops: ${ops.length} > ${MAX_PATCH_OPS}`);
    return;
  }
  ops.forEach((op, index) => {
    if (!isRecord(op)) {
      errors.push(`op[${index}] must be an object`);
      return;
    }
    if (typeof op.type !== 'string' || !OP_TYPES.has(op.type)) {
      errors.push(`op[${index}]: unsupported op type (structural operations are out of the protocol)`);
      return;
    }
    if (typeof op.field !== 'string' || op.field.trim() === '') {
      errors.push(`op[${index}]: field must be a non-empty string`);
    }
    if (op.type === 'set-prop') {
      if (!('value' in op)) {
        errors.push(`op[${index}]: set-prop requires a value`);
      }
      if ('expression' in op) {
        errors.push(`op[${index}]: op field conflict (set-prop must not carry expression)`);
      }
    }
    if (op.type === 'set-expression') {
      if (typeof op.expression !== 'string' || op.expression.trim() === '') {
        errors.push(`op[${index}]: set-expression requires a non-empty expression string`);
      }
      if ('value' in op) {
        errors.push(`op[${index}]: op field conflict (set-expression must not carry value)`);
      }
    }
  });
}

/**
 * Pure patch validator. Target resolution uses live-tree evidence only:
 * cid → `inspectByCid`, nodeId/path → unique `getComponentTree()` match.
 * Event-stream diagnostics are not a resolver (no found semantics).
 */
export function validateSchemaPatchShape(
  patch: unknown,
  scope: { controllerId: string },
  resolvers: PatchTargetResolvers,
): NopSchemaPatchValidationResult {
  const errors: string[] = [];

  if (!isRecord(patch)) {
    return { ok: false, errors: ['patch must be an object'] };
  }
  if (typeof patch.id !== 'string' || patch.id.trim() === '') {
    errors.push('patch id must be a non-empty string');
  }
  if (typeof patch.createdAt !== 'number' || !Number.isFinite(patch.createdAt)) {
    errors.push('patch createdAt must be a number');
  }
  if (!isRecord(patch.scope) || typeof patch.scope.controllerId !== 'string') {
    errors.push('patch scope.controllerId must be a string');
  } else if (patch.scope.controllerId !== scope.controllerId) {
    errors.push(`cross-controller patch rejected (targeted ${patch.scope.controllerId}, here ${scope.controllerId})`);
  }
  if (!errors.length || errors.every((error) => !error.includes('cross-controller'))) {
    validateOps(patch.ops, errors);
  }

  const target = isRecord(patch.scope) && isRecord(patch.scope.target) ? patch.scope.target : undefined;
  let resolvedTarget: NopSchemaPatchValidationResult['resolvedTarget'];
  if (!target) {
    // Fail-closed: absent or non-record scope.target is the no-selector case.
    errors.push('target not resolved: no selector (cid/nodeId/path all absent)');
  } else {
    const hasCid = typeof target.cid === 'number';
    const hasSelector = hasCid || typeof target.nodeId === 'string' || typeof target.path === 'string';
    if (!hasSelector) {
      errors.push('target not resolved: no selector (cid/nodeId/path all absent)');
    } else {
      let cidMatch: { cid: number } | undefined;
      if (hasCid) {
        cidMatch = resolvers.inspectByCid(target.cid as number);
        if (!cidMatch) {
          errors.push(`target not resolved: cid ${target.cid} has no live inspect hit`);
        }
      }
      let treeMatch: { cid: number; nodeId?: string; path?: string } | undefined;
      if (typeof target.nodeId === 'string' || typeof target.path === 'string') {
        const hits = resolvers
          .getComponentTree()
          .filter(
            (item) =>
              (typeof target.nodeId === 'string' && item.nodeId === target.nodeId) ||
              (typeof target.path === 'string' && item.path === target.path),
          );
        if (hits.length === 0) {
          errors.push('target not resolved: no live component-tree hit for nodeId/path');
        } else if (hits.length > 1) {
          errors.push('ambiguous target: path/nodeId matches multiple live tree items');
        } else {
          treeMatch = hits[0];
        }
      }
      if (cidMatch && treeMatch && cidMatch.cid !== treeMatch.cid) {
        errors.push('ambiguous target: cid and nodeId/path resolve to different nodes');
      }
      resolvedTarget = treeMatch ?? (cidMatch ? { cid: cidMatch.cid } : undefined);
    }
  }

  return errors.length === 0
    ? { ok: true, errors: [], resolvedTarget }
    : { ok: false, errors };
}

/** Bounded audit ring shared by the controller wiring. */
export function createSchemaPatchAuditRecorder() {
  const entries: NopSchemaPatchAuditEntry[] = [];
  return {
    append(action: NopSchemaPatchAuditAction, ok: boolean, patchId: string, detail?: string) {
      entries.push({ at: Date.now(), patchId, action, ok, ...(detail ? { detail } : {}) });
      if (entries.length > MAX_PATCH_AUDIT_ENTRIES) {
        entries.splice(0, entries.length - MAX_PATCH_AUDIT_ENTRIES);
      }
    },
    list(): NopSchemaPatchAuditEntry[] {
      return [...entries];
    },
  };
}
