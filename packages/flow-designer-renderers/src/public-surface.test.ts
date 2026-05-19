import { describe, expect, it } from 'vitest';
import * as flowDesigner from './index.js';
import * as flowDesignerUnstable from './unstable.js';
import type { DesignerPageSchemaInput } from './schemas.js';

describe('flow-designer-renderers public surface', () => {
  it('keeps xyflow internals and renderer-only helpers off the root entry', () => {
    expect('DesignerXyflowCanvasBridge' in flowDesigner).toBe(false);
    expect('renderDesignerCanvasBridge' in flowDesigner).toBe(false);
    expect('DesignerXyflowCanvas' in flowDesigner).toBe(false);
    expect('DesignerXyflowNode' in flowDesigner).toBe(false);
    expect('DesignerXyflowEdge' in flowDesigner).toBe(false);
    expect('DesignerPaletteContent' in flowDesigner).toBe(false);
    expect('DesignerCanvasContent' in flowDesigner).toBe(false);
    expect('DefaultInspector' in flowDesigner).toBe(false);
    expect('DesignerContext' in flowDesigner).toBe(false);
    expect('useDesignerContext' in flowDesigner).toBe(false);
    expect('useNodeTypeConfig' in flowDesigner).toBe(false);
    expect('compileDesignerConfig' in flowDesigner).toBe(false);
    expect('validateDesignerConfigToolbar' in flowDesigner).toBe(false);
  });

  it('exposes renderer internals through the unstable entry', () => {
    expect(typeof flowDesignerUnstable.DesignerXyflowCanvasBridge).toBe('function');
    expect(typeof flowDesignerUnstable.renderDesignerCanvasBridge).toBe('function');
    expect(typeof flowDesignerUnstable.DesignerXyflowCanvas).toBe('function');
    expect(typeof flowDesignerUnstable.DesignerXyflowNode).toBe('function');
    expect(typeof flowDesignerUnstable.DesignerXyflowEdge).toBe('function');
    expect(typeof flowDesignerUnstable.DesignerPaletteContent).toBe('function');
    expect(typeof flowDesignerUnstable.DesignerCanvasContent).toBe('function');
    expect(typeof flowDesignerUnstable.DefaultInspector).toBe('function');
    expect(flowDesignerUnstable.DesignerContext).toBeTruthy();
    expect(typeof flowDesignerUnstable.useDesignerContext).toBe('function');
    expect(typeof flowDesignerUnstable.useNodeTypeConfig).toBe('function');
  });

  it('exports the peer-style designer page schema helper and host-page inputs', () => {
    expect(typeof flowDesigner.defineDesignerPageSchema).toBe('function');

    const schema = flowDesigner.defineDesignerPageSchema({
      type: 'designer-page',
      title: 'Designer',
      className: 'designer-page',
      visible: '${showDesigner}',
      hidden: '${hideDesigner}',
      disabled: '${busy}',
      statusPath: 'designerStatus',
      document: {
        id: 'doc-1',
        kind: 'flow',
        name: 'Flow',
        version: '1.0.0',
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      config: { nodeTypes: [], edgeTypes: [], palette: { groups: [] } },
    });

    expect(schema).toMatchObject({
      type: 'designer-page',
      title: 'Designer',
      className: 'designer-page',
      visible: '${showDesigner}',
      hidden: '${hideDesigner}',
      disabled: '${busy}',
      statusPath: 'designerStatus',
    });
  });

  it('preserves the caller input type at the helper boundary', () => {
    const schema = flowDesigner.defineDesignerPageSchema({
      type: 'designer-page',
      title: 'Designer',
      config: { nodeTypes: [], edgeTypes: [], palette: { groups: [] } },
      customHostField: 'host-only',
    });

    const typedSchema: typeof schema & { customHostField: string } = schema;
    const inputSchema: DesignerPageSchemaInput = schema;

    expect(typedSchema.customHostField).toBe('host-only');
    expect(inputSchema.type).toBe('designer-page');
  });
});
