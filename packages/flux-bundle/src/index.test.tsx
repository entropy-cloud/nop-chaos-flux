/// <reference types="node" />

// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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

describe('@nop-chaos/flux public entry contract', () => {
  it('exposes the root stylesheet export and host-owned peers', () => {
    expect(packageJsonFromCwd.exports?.['./style.css']).toBe('./dist/style.css');
    expect(packageJsonFromCwd.peerDependencies).toMatchObject({
      '@nop-chaos/ui': '*',
      'lucide-react': '^1.7.0',
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
    expect(registerDefaultFluxRenderers(registry)).toBe(registry);
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

  it('keeps facade stylesheet selectors scoped to the flux root', () => {
    expect(styles).toContain(`.${FLUX_ROOT_CLASS} {`);
    expect(styles).toContain(`.${FLUX_ROOT_CLASS} [data-slot='select-wrapper']`);
    expect(styles).toContain(`.${FLUX_ROOT_CLASS} .nop-node-error [data-slot='node-error-message']`);
    expect(styles).toContain(`.${FLUX_ROOT_CLASS} .nop-node-error [data-slot='node-error-retry']`);
    expect(styles).not.toContain('.nop-node-error__message');
    expect(styles).not.toContain('.nop-node-error__retry');
    expect(styles).not.toContain('\n[data-slot=\'select-wrapper\']');
    expect(styles).not.toContain('\nhtml {');
    expect(styles).not.toContain('\nbody {');
    expect(styles).not.toContain('\n:root {');
  });
});
