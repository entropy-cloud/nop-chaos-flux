import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';
export declare function createRendererRegistry(initialDefinitions?: RendererDefinition[]): RendererRegistry;
export declare function registerRendererDefinitions(registry: RendererRegistry, definitions: ReadonlyArray<RendererDefinition>): RendererRegistry;
