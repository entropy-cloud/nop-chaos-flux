import {
  createRendererRegistry,
  resolveRendererPropContracts,
  resolveRendererScopeExports,
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { describe, expect, it } from 'vitest';
import { validateSchema } from '@nop-chaos/flux-compiler';
import { flowDesignerRendererDefinitions } from './index.js';

describe('flowDesignerRendererDefinitions', () => {
  it('includes designer-page renderer', () => {
    const rendererTypes = flowDesignerRendererDefinitions.map((definition) => definition.type);
    expect(rendererTypes).toContain('designer-page');
  });

  it('includes designer-canvas renderer', () => {
    const rendererTypes = flowDesignerRendererDefinitions.map((definition) => definition.type);
    expect(rendererTypes).toContain('designer-canvas');
  });

  it('includes designer-palette renderer', () => {
    const rendererTypes = flowDesignerRendererDefinitions.map((definition) => definition.type);
    expect(rendererTypes).toContain('designer-palette');
  });

  it('designer-canvas and designer-palette remain live registered renderer wrappers', () => {
    const canvasDef = flowDesignerRendererDefinitions.find((definition) => definition.type === 'designer-canvas');
    const paletteDef = flowDesignerRendererDefinitions.find((definition) => definition.type === 'designer-palette');

    expect(canvasDef?.component).toBeTruthy();
    expect(paletteDef?.component).toBeTruthy();
    expect(canvasDef?.fields).toEqual([]);
    expect(paletteDef?.fields).toEqual([]);
    expect(canvasDef?.component?.name).toBe('DesignerCanvasRenderer');
    expect(paletteDef?.component?.name).toBe('DesignerPaletteRenderer');
  });

  it('designer-page renderer includes hostContract metadata', () => {
    const designerPageDef = flowDesignerRendererDefinitions.find(
      (definition) => definition.type === 'designer-page',
    );
    expect(designerPageDef).toBeTruthy();
    expect(designerPageDef?.hostContract).toBeTruthy();
    expect(designerPageDef?.rendererClass).toBe('domain-host-renderer');
    expect(designerPageDef?.rendererTraits).toEqual(
      expect.arrayContaining(['workbench-shell', 'builder-facing']),
    );
    expect(resolveRendererPropContracts(designerPageDef!).config?.required).toBe(true);
    expect(resolveRendererPropContracts(designerPageDef!).statusPath).toBeTruthy();
    expect(resolveRendererScopeExports(designerPageDef!)).toEqual({});
    expect(designerPageDef?.hostContract?.family).toBe('designer');
    expect(designerPageDef?.hostContract?.defaultVersion).toBe('1.0');
    expect(designerPageDef?.hostContract?.capabilityPublication).toMatchObject({
      mode: 'region-scoped',
      capableRegions: ['toolbar', 'inspector', 'dialogs'],
      transitiveInheritance: true,
    });
  });

  it('publishes document prerequisites through schema validation', () => {
    const registry = createRendererRegistry(flowDesignerRendererDefinitions);
    const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

    const graphDiagnostics = validateSchema({
      schema: { type: 'designer-page', config: { nodeTypes: [], edgeTypes: [] } },
      registry,
      expressionCompiler,
    });
    const treeDiagnostics = validateSchema({
      schema: {
        type: 'designer-page',
        config: { documentMode: 'tree', nodeTypes: [], edgeTypes: [] },
      },
      registry,
      expressionCompiler,
    });
    const validTreeDiagnostics = validateSchema({
      schema: {
        type: 'designer-page',
        treeDocument: { id: 'tree-1', kind: 'tree', name: 'Tree', version: '1.0.0', nodes: [] },
        config: { documentMode: 'tree', nodeTypes: [], edgeTypes: [] },
      },
      registry,
      expressionCompiler,
    });

    expect(graphDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing-required-field',
          path: '/document',
        }),
      ]),
    );
    expect(treeDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing-required-field',
          path: '/treeDocument',
        }),
      ]),
    );
    expect(validTreeDiagnostics).toEqual([]);
  });
});
