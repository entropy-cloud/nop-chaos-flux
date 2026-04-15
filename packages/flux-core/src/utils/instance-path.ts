import type { InstanceFrame } from '../types/node-identity';

/**
 * Normalizes an instance path array, returning undefined for empty or null paths.
 * This utility ensures consistent handling of instance paths throughout the runtime.
 */
export function normalizeInstancePath(instancePath?: readonly InstanceFrame[] | null): readonly InstanceFrame[] | undefined {
  if (!instancePath || instancePath.length === 0) {
    return undefined;
  }

  return instancePath;
}
