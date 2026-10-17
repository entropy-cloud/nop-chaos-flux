/// <reference types="node" />

import { readFileSync } from 'node:fs';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { xlangDebugEditorRendererDefinition } from '@nop-chaos/flux-xlang-debug/definitions';
import {
  FLUX_ROOT_CLASS,
  createDefaultFluxEnv,
  createFluxRendererRegistry,
  createFluxSchemaRenderer,
  registerDefaultFluxRenderers,
} from './index.js';

const packageJsonFromCwd = JSON.parse(readFileSync('package.json', 'utf8')) as {
  exports?: Record<string, unknown>;
  peerDependencies?: Record<string, string>;
};

const styles = readFileSync('src/style.css', 'utf8');
const defaultSpacingStyles = readFileSync('../flux-react/src/default-spacing.css', 'utf8');
const formRendererStyles = readFileSync('../flux-renderers-form/src/styles.css', 'utf8');

describe('@nop-chaos/flux public entry contract', () => {
  it('exposes the root stylesheet export and host-owned peers', () => {
    const styleExport = packageJsonFromCwd.exports?.['./style.css'];
    const stylePath = typeof styleExport === 'string' ? styleExport : (styleExport as Record<string, string>)?.default;
    expect(stylePath).toBe('./dist/style.css');
    expect(packageJsonFromCwd.peerDependencies).toMatchObject({
      '@nop-chaos/ui': 'workspace:*',
      'lucide-react': '^1.17.0',
      react: '^19.0.0',
      'react-dom': '^19.0.0',
      zustand: '^5.0.12',
    });
  });

  it('registers the default renderer stack into a caller-owned registry', () => {
    const registry = createFluxRendererRegistry();
    expect(registry.has('page')).toBe(true);
    expect(registry.has('form')).toBe(true);
    expect(registry.has('table')).toBe(true);
    expect(registry.has('object-field')).toBe(true);
    expect(registry.has('array-field')).toBe(true);
    expect(registry.has('separator')).toBe(true);
    expect(registry.has('grid')).toBe(true);
    expect(registry.has('kanban')).toBe(true);
    expect(registry.has('calendar')).toBe(true);
    expect(registry.has('gantt')).toBe(true);
    // plan 2474：xlang 在线调试编辑器随默认栈注册（definition 同步、实现异步 chunk）
    expect(registry.has('xlang-debug-editor')).toBe(true);
    expect(registry.has('barcode-input')).toBe(true);
    expect(registerDefaultFluxRenderers(registry)).toBe(registry);
  });

  it('registers xlang-debug-editor definition synchronously with lazy implementation (plan 2474)', () => {
    const registry = createFluxRendererRegistry();
    const definition = registry.get('xlang-debug-editor');
    expect(definition).toBeDefined();
    // 懒边界：definition/fields 同步可见，组件为 createLazyRendererComponent 包装
    expect(definition?.fields?.map((f) => f.key)).toEqual(['sourcePath', 'serverUrl', 'initialSource']);
    // registry 契约：同 definition 对象重复注册不抛（幂等）——以轻子路径导出的
    // RegisteredRendererDefinition 原对象为准（get() 的宽类型不带 sourcePackage 面）
    expect(() => registry.register(xlangDebugEditorRendererDefinition)).not.toThrow();
  });

  it('uses the core renderer contract at the facade boundary', () => {
    const registry = createFluxRendererRegistry();
    const definition: RendererDefinition | undefined = registry.get('page');

    expect(definition?.type).toBe('page');
    expect(typeof definition?.component).toBe('function');
  });

  it('ships narrowed public type declarations for env and registry bridges', () => {
    const publicTypes = readFileSync('types/public-types.d.ts', 'utf8');

    expect(publicTypes).toContain('export type FluxRendererEnv = RendererEnv;');
    expect(publicTypes).toContain('export type FluxRendererRegistry = RendererRegistry;');
    expect(publicTypes).toContain('export type FluxApiRequest = ExecutableApiRequest;');
    expect(publicTypes).not.toContain('as unknown as');
  });

  it('renders the default schema stack through the facade wrapper', async () => {
    const SchemaRenderer = createFluxSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://bundle-schema.json"
        schema={{ type: 'text', text: 'Facade hello' }}
        env={createDefaultFluxEnv()}
      />,
    );

    expect(screen.getByText('Facade hello')).toBeTruthy();
    expect(document.querySelector(`.${FLUX_ROOT_CLASS}`)).toBeTruthy();
  });

  it('composes facade styling from canonical package stylesheets', () => {
    expect(styles).toContain(`.${FLUX_ROOT_CLASS} {`);
    expect(styles).toContain("@import '@nop-chaos/flux-react/default-spacing.css';");
    expect(styles).toContain("@import '@nop-chaos/flux-renderers-form/styles.css';");
    expect(styles).toContain("@import '@nop-chaos/flux-renderers-content/styles.css';");
    expect(styles).toContain("@import '@nop-chaos/flux-renderers-layout/styles.css';");
    expect(styles).toContain("@import '@nop-chaos/flux-renderers-scheduling/styles.css';");
    expect(defaultSpacingStyles).toContain(".nop-field [data-slot='field-label']");
    expect(defaultSpacingStyles).toContain(".nop-schema-root-fallback[data-mode='loading']");
    expect(defaultSpacingStyles).toContain(".nop-schema-root-fallback [data-slot='schema-root-fallback-message']");
    expect(formRendererStyles).toContain(".nop-form [data-slot='radio-group-wrapper']");
    expect(defaultSpacingStyles).not.toContain(`.${FLUX_ROOT_CLASS} .nop-page`);
    expect(defaultSpacingStyles).not.toContain(`.${FLUX_ROOT_CLASS} .nop-form`);
    expect(formRendererStyles).not.toContain(`.${FLUX_ROOT_CLASS} [data-slot='select-wrapper']`);
  });
});
