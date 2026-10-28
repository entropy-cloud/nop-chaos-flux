import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerMobileRenderers } from '@nop-chaos/flux-renderers-mobile';

export const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
registerContentRenderers(registry);
registerLayoutRenderers(registry);
registerMobileRenderers(registry);

export const SchemaRenderer = createSchemaRenderer();

export type SchemaRendererComponent = typeof SchemaRenderer;
