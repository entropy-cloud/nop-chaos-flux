import type { RendererPlugin, SchemaInput } from '@nop-chaos/flux-core';

const ROLES_KEY = 'xui:roles';

/** Marker returned for a node whose `xui:roles` deny the current user. */
const PRUNED: unique symbol = Symbol('flux:roles-pruned');

type FilterResult = symbol | unknown;

function normalizeRoles(value: unknown): string[] {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }

  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  }

  return [];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Returns true when `node` carries a non-empty `xui:roles` array and none of
 * the listed roles passes `hasRole`. Mirrors AMIS `transformPageJson`
 * (`packages/amis-core/src/page/transform.ts`):
 * `if (roles.length > 0 && !roles.some(hasRole)) prune`.
 */
function isRolesDenied(node: Record<string, unknown>, hasRole: (role: string) => boolean): boolean {
  const roles = normalizeRoles(node[ROLES_KEY]);
  return roles.length > 0 && !roles.some((role) => hasRole(role));
}

function filterNode(node: unknown, hasRole: (role: string) => boolean): FilterResult {
  if (Array.isArray(node)) {
    const filtered: unknown[] = [];
    for (const child of node) {
      const result = filterNode(child, hasRole);
      if (result !== PRUNED) {
        filtered.push(result);
      }
    }
    return filtered;
  }

  if (!isPlainObject(node)) {
    return node;
  }

  if (isRolesDenied(node, hasRole)) {
    return PRUNED;
  }

  // Survivor: strip `xui:roles`, recurse into every value (including nested
  // arrays/objects) so children are filtered too.
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(node)) {
    if (key === ROLES_KEY) {
      continue;
    }
    const filtered = filterNode(node[key], hasRole);
    if (filtered !== PRUNED) {
      result[key] = filtered;
    }
  }
  return result;
}

/**
 * Walks `schema` and removes any node whose `xui:roles` array has no entry the
 * current user holds (via `hasRole`). The `xui:roles` key is stripped from
 * surviving nodes. Children of a denied node are pruned together with it.
 *
 * If the root node itself is denied, an empty schema (`[]`) is returned.
 */
export function filterByRoles(
  schema: SchemaInput,
  hasRole: (role: string) => boolean,
): SchemaInput {
  const filtered = filterNode(schema, hasRole);
  if (filtered === PRUNED) {
    return [];
  }
  return filtered as SchemaInput;
}

export interface XuiRolesPluginOptions {
  /**
   * Returns true when the current user holds `role`. When omitted the plugin is
   * a no-op (allow-all), so unconfigured integrations render every node.
   */
  hasRole?: (role: string) => boolean;
}

/**
 * A `RendererPlugin` that filters schemas by `xui:roles` in `beforeCompile`.
 * Applied to every schema regardless of how it was loaded (page, inline, or
 * dynamic-renderer fragment) because `beforeCompile` is the single pre-compile
 * chokepoint (`packages/flux-compiler/src/schema-compiler-helpers.ts`).
 *
 * Register via `createRendererRuntime({ plugins: [createXuiRolesPlugin({ hasRole: env.hasRole })] })`.
 */
export function createXuiRolesPlugin(options: XuiRolesPluginOptions = {}): RendererPlugin {
  const hasRole = options.hasRole;

  return {
    name: 'flux:xui-roles',
    beforeCompile(schema) {
      if (!hasRole) {
        return schema;
      }
      return filterByRoles(schema, hasRole);
    },
  };
}
