import type {
  RendererDefinition,
  RendererPlugin
} from '@nop-chaos/flux-core';
import { META_FIELDS } from '@nop-chaos/flux-core';

export function applyWrapComponentPlugins(renderer: RendererDefinition, plugins?: RendererPlugin[]): RendererDefinition {
  return (plugins ?? []).reduce((current, plugin) => plugin.wrapComponent?.(current) ?? current, renderer);
}

export function isNamespacedSchemaKey(key: string): boolean {
  const separatorIndex = key.indexOf(':');
  return separatorIndex > 0;
}

export function getSchemaNamespace(key: string): string | undefined {
  if (!isNamespacedSchemaKey(key)) {
    return undefined;
  }

  return key.slice(0, key.indexOf(':'));
}

export function hasClosedPropModel(renderer: RendererDefinition): boolean {
  return Object.keys(renderer.propSchema ?? {}).length > 0 || Object.keys(renderer.propContracts ?? {}).length > 0;
}

export function getAcceptedSchemaKeys(renderer: RendererDefinition): Set<string> {
  const keys = new Set<string>(['type']);

  for (const key of META_FIELDS) {
    keys.add(key);
  }

  for (const key of Object.keys(renderer.defaultSchema ?? {})) {
    keys.add(key);
  }

  for (const key of Object.keys(renderer.propSchema ?? {})) {
    keys.add(key);
  }

  for (const key of Object.keys(renderer.propContracts ?? {})) {
    keys.add(key);
  }

  for (const region of renderer.regions ?? []) {
    keys.add(region);
  }

  for (const field of renderer.fields ?? []) {
    keys.add(field.key);
  }

  return keys;
}
