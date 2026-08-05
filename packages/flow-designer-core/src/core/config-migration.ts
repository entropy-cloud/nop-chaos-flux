import type { DesignerConfig, NormalizedDesignerConfig, TreeProjectionError } from '../types.js';

export const LEGACY_CONFIG_VERSION = '1.0.0';
export const TARGET_CONFIG_VERSION = '1.1.0';

function normalizeSemver(input: string): string | null {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(input.trim());
  if (!match) {
    return null;
  }
  return `${Number(match[1])}.${Number(match[2])}.${Number(match[3] ?? 0)}`;
}

function compareSemver(left: string, right: string): number {
  const [lMajor, lMinor, lPatch] = left.split('.').map(Number);
  const [rMajor, rMinor, rPatch] = right.split('.').map(Number);
  if (lMajor !== rMajor) return lMajor - rMajor;
  if (lMinor !== rMinor) return lMinor - rMinor;
  return lPatch - rPatch;
}

function makeError(code: TreeProjectionError['code'], message: string, path?: string): TreeProjectionError {
  return { code, message, path };
}

export function normalizeConfigVersion(version: unknown): string | null {
  if (typeof version !== 'string') {
    return null;
  }
  return normalizeSemver(version);
}

/**
 * Migrates a legacy config to the canonical tree config version 1.1.0:
 * - `1.0` / `1.0.0` normalize to `1.0.0`, then migrate to `1.1.0`.
 * - Removes `treeConfig.autoLayout` (structured layout is mandatory).
 * - Copies `appearance.minWidth/minHeight` into missing `tree.layoutSize`.
 * - Rejects versions with a major above 1 or above the supported target.
 *
 * The migration is structural: it preserves all existing object references
 * (including compiled schema `body` values) and only copies the fields it
 * needs. It never JSON-round-trips the config.
 */
export function migrateTreeConfig(config: DesignerConfig): { ok: true; config: DesignerConfig } | { ok: false; error: TreeProjectionError } {
  const version = normalizeConfigVersion(config.version);
  if (!version) {
    return {
      ok: false,
      error: makeError('unsupported-version', `Invalid config version: ${String(config.version)}`, 'version'),
    };
  }

  if (version.startsWith('1.') && compareSemver(version, TARGET_CONFIG_VERSION) > 0) {
    return {
      ok: false,
      error: makeError('unsupported-version', `Config version ${version} is newer than supported ${TARGET_CONFIG_VERSION}`, 'version'),
    };
  }

  if (!version.startsWith('1.')) {
    return {
      ok: false,
      error: makeError('unsupported-version', `Config version ${version} is not supported`, 'version'),
    };
  }

  const next: DesignerConfig = {
    ...config,
    version: TARGET_CONFIG_VERSION,
  };

  if (next.treeConfig && 'autoLayout' in next.treeConfig) {
    const { autoLayout: _autoLayout, ...rest } = next.treeConfig as DesignerConfig['treeConfig'] & { autoLayout?: boolean };
    next.treeConfig = rest;
  }

  if (next.nodeTypes.some((nodeType) => {
    const appearance = nodeType.appearance;
    return (
      !nodeType.tree?.layoutSize &&
      typeof appearance?.minWidth === 'number' &&
      typeof appearance.minHeight === 'number'
    );
  })) {
    next.nodeTypes = next.nodeTypes.map((nodeType) => {
      if (nodeType.tree?.layoutSize) {
        return nodeType;
      }
      const appearance = nodeType.appearance;
      const minWidth = appearance?.minWidth;
      const minHeight = appearance?.minHeight;
      if (typeof minWidth === 'number' && typeof minHeight === 'number') {
        return {
          ...nodeType,
          tree: {
            ...(nodeType.tree ?? {}),
            layoutSize: { width: minWidth, height: minHeight },
          },
        };
      }
      return nodeType;
    });
  }

  return { ok: true, config: next };
}

export function normalizeTreeDocumentVersion(version: unknown): { ok: true; version: string } | { ok: false; error: TreeProjectionError } {
  const normalized = normalizeConfigVersion(version);
  if (!normalized) {
    return {
      ok: false,
      error: makeError('tree-migration-failed', `Invalid tree document version: ${String(version)}`, 'version'),
    };
  }
  if (!normalized.startsWith('1.')) {
    return {
      ok: false,
      error: makeError('unsupported-version', `Tree document version ${normalized} is not supported`, 'version'),
    };
  }
  return { ok: true, version: normalized };
}

export type { NormalizedDesignerConfig };
