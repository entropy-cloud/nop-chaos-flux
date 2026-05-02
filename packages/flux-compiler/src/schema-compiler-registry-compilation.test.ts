import { describe, expect, it } from 'vitest';
import {
  createRendererRegistry,
  type RendererDefinition,
  type TemplateNode,
} from '@nop-chaos/flux-core';
import {
  textRenderer,
  pageRenderer,
  cardRenderer,
  actionButtonRenderer,
  formRenderer,
  inputRenderer,
  createTestCompiler,
} from './schema-compiler-registry-fixtures';
import { createSchemaCompiler } from './index';

type CompiledNode = TemplateNode & {
  propsProgram: { kind: 'static'; value: Record<string, unknown> };
};

describe('createSchemaCompiler', () => {
  it('compiles regions and dynamic props', () => {
    const compiler = createTestCompiler([pageRenderer, textRenderer]);

    const compiled = compiler.compile({
      type: 'page',
      body: [{ type: 'text', text: '${message}' }],
    });

    expect(Array.isArray(compiled)).toBe(false);
    const root = compiled.root as TemplateNode;
    expect(root.regions.body.node).toBeTruthy();
  });

  it('treats value-or-region fields as plain props when given plain values', () => {
    const compiler = createTestCompiler([cardRenderer, textRenderer]);

    const compiled = compiler.compile({
      type: 'card',
      title: 'Profile',
      body: [{ type: 'text', text: 'body' }],
    });
    const node = compiled.root as CompiledNode;

    expect(node.regions.title).toBeUndefined();
    expect(node.propsProgram.kind).toBe('static');
    expect(node.propsProgram.value.title).toBe('Profile');
  });

  it('treats value-or-region fields as compiled regions when given schema input', () => {
    const compiler = createTestCompiler([cardRenderer, textRenderer]);

    const compiled = compiler.compile({
      type: 'card',
      title: { type: 'text', text: 'Profile' },
      body: [{ type: 'text', text: 'body' }],
    } as any);
    const node = compiled.root as CompiledNode;

    expect(node.regions.title.node).toBeTruthy();
    expect(node.propsProgram.kind).toBe('static');
    expect(node.propsProgram.value.title).toBeUndefined();
  });

  it('delivers name through normalized props channel, not meta', () => {
    const compiler = createTestCompiler([inputRenderer]);

    const compiled = compiler.compile({
      type: 'input-text',
      name: 'user.email',
    });
    const node = compiled.root as CompiledNode;

    expect(node.propsProgram.value.name).toBe('user.email');
    expect((node.metaProgram as Record<string, unknown>).name).toBeUndefined();
  });

  it('tracks event fields separately from normal props and regions', () => {
    const compiler = createTestCompiler([actionButtonRenderer]);

    const compiled = compiler.compile({
      type: 'action-button',
      onClick: {
        action: 'setValue',
        args: {
          path: 'message',
          value: 'clicked',
        },
      },
    });
    const node = compiled.root as CompiledNode;

    expect(node.regions.onClick).toBeUndefined();
    expect(node.propsProgram.value.onClick).toBeUndefined();
    expect(node.eventPlans.onClick).toMatchObject({
      isFullyStatic: true,
      nodes: [
        expect.objectContaining({
          action: 'setValue',
          payload: expect.objectContaining({
            args: expect.objectContaining({
              isStatic: true,
              value: expect.objectContaining({
                path: 'message',
                value: 'clicked',
              }),
            }),
          }),
        }),
      ],
    });
  });

  it('compiles lifecycle actions outside eventActions', () => {
    const compiler = createTestCompiler([textRenderer]);

    const compiled = compiler.compile({
      type: 'text',
      text: 'Lifecycle text',
      onMount: { action: 'probe:mount' },
      onUnmount: { action: 'probe:unmount' },
    });
    const node = compiled.root as TemplateNode;

    expect(node.lifecycleActions).toEqual({
      onMount: {
        isFullyStatic: true,
        nodes: [expect.objectContaining({ action: 'probe:mount' })],
      },
      onUnmount: {
        isFullyStatic: true,
        nodes: [expect.objectContaining({ action: 'probe:unmount' })],
      },
    });
    expect(node.eventPlans.onMount).toBeUndefined();
    expect(node.eventPlans.onUnmount).toBeUndefined();
  });

  it('applies renderer authoringTransform before compilation', () => {
    const transformedRenderer: RendererDefinition = {
      type: 'transform-probe',
      component: () => null,
      authoringTransform: ({ schema }) => {
        const next = { ...schema } as Record<string, unknown>;
        if (next.legacyLabel !== undefined && next.label === undefined) {
          next.label = next.legacyLabel;
          delete next.legacyLabel;
        }
        return next as any;
      },
      propContracts: {
        label: {
          shape: { kind: 'string' },
          displayName: 'Label',
        },
      },
    };

    const compiler = createTestCompiler([transformedRenderer]);

    const compiled = compiler.compile({
      type: 'transform-probe',
      legacyLabel: 'hello',
    });
    const node = compiled.root as CompiledNode;

    expect(node.schema.label).toBe('hello');
    expect(node.schema.legacyLabel).toBeUndefined();
    expect(node.propsProgram.value.label).toBe('hello');
  });

  it('keeps componentId targets selector-based during compile even when the id is unique', () => {
    const compiler = createTestCompiler([pageRenderer, formRenderer, actionButtonRenderer]);

    const compiled = compiler.compile({
      type: 'page',
      body: [
        { type: 'form', id: 'user-form', name: 'userForm' },
        {
          type: 'action-button',
          onClick: {
            action: 'component:validate',
            componentId: 'user-form',
          },
        },
      ],
    });
    const root = compiled.root as TemplateNode;

    const bodyNodes = Array.isArray(root.regions.body.node)
      ? root.regions.body.node
      : [root.regions.body.node];
    const formNode = bodyNodes[0];
    const buttonNode = bodyNodes[1];
    const clickNode = buttonNode.eventPlans.onClick.nodes[0];
    expect(typeof formNode.templateNodeId).toBe('number');
    expect(clickNode.targeting.componentId).toBe('user-form');
    expect(clickNode.targeting._targetCid).toBeUndefined();
  });

  it('assigns template node identity to compiled nodes', () => {
    const registry = createRendererRegistry([pageRenderer, formRenderer, actionButtonRenderer]);
    const compiler = createSchemaCompiler({ registry });
    const compiled = compiler.compile({
      type: 'page',
      body: {
        type: 'form',
        id: 'user-form',
        actions: [
          {
            type: 'action-button',
            onClick: { action: 'component:validate', componentId: 'user-form' },
          },
        ],
      },
    });

    const root = compiled.root as TemplateNode;
    const formNode = root.regions.body.node as TemplateNode;
    const buttonNode = (formNode.regions.actions.node as readonly TemplateNode[])[0];

    expect(typeof root.templateNodeId).toBe('number');
    expect(typeof formNode.templateNodeId).toBe('number');
    expect(typeof buttonNode.templateNodeId).toBe('number');
  });

  it('does not pre-resolve componentName targets during compile', () => {
    const compiler = createTestCompiler([pageRenderer, formRenderer, actionButtonRenderer]);

    const compiled = compiler.compile({
      type: 'page',
      body: [
        { type: 'form', id: 'user-form', name: 'userForm' },
        {
          type: 'action-button',
          onClick: {
            action: 'component:validate',
            componentName: 'userForm',
          },
        },
      ],
    });
    const root = compiled.root as TemplateNode;

    const bodyNodes = Array.isArray(root.regions.body.node)
      ? root.regions.body.node
      : [root.regions.body.node];
    const buttonNode = bodyNodes[1];
    expect(buttonNode.eventPlans.onClick.nodes[0].targeting._targetCid).toBeUndefined();
  });

  it('does not rewrite componentId targets during compile when duplicate ids exist', () => {
    const compiler = createTestCompiler([pageRenderer, formRenderer, actionButtonRenderer]);

    const compiled = compiler.compile({
      type: 'page',
      body: [
        { type: 'form', id: 'dup-form' },
        { type: 'form', id: 'dup-form' },
        {
          type: 'action-button',
          onClick: {
            action: 'component:validate',
            componentId: 'dup-form',
          },
        },
      ],
    });
    const root = compiled.root as TemplateNode;

    const bodyNodes = Array.isArray(root.regions.body.node)
      ? root.regions.body.node
      : [root.regions.body.node];
    const buttonNode = bodyNodes[2];

    expect(buttonNode.eventPlans.onClick.nodes[0].targeting.componentId).toBe('dup-form');
    expect(buttonNode.eventPlans.onClick.nodes[0].targeting._targetCid).toBeUndefined();
  });
});
