import { describe, expect, it } from 'vitest';
import { SchemaRenderer, registry } from './schema-renderer';
import { getAppEnv } from './env-instance';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';

describe('schema-renderer wiring', () => {
  it('registers all required renderer families (basic/form/data/content/layout/mobile)', () => {
    const types = new Set(registry.list().map((r) => r.type));
    const required = [
      'page',
      'text',
      'button',
      'form',
      'input-text',
      'crud',
      'table',
      'list',
      'card',
      'tabs',
      'flex',
      'pull-refresh',
      'infinite-scroll',
      'swipe-cell',
      'countdown',
      'notice-bar',
    ];
    for (const type of required) {
      expect(types, `renderer "${type}" should be registered`).toContain(type);
    }
  });

  it('appEnv exposes a functional fetcher + notify + navigate', () => {
    const env = getAppEnv();
    expect(typeof env.fetcher).toBe('function');
    expect(typeof env.notify).toBe('function');
    expect(typeof env.navigate).toBe('function');
  });

  it('SchemaRenderer is a renderable component', () => {
    expect(typeof SchemaRenderer).toBe('function');
    const formulaCompiler = createFormulaCompiler();
    expect(formulaCompiler).toBeDefined();
  });
});
