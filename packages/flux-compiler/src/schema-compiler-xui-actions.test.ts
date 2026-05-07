import { describe, expect, it } from 'vitest';
import type { RendererDefinition, TemplateNode } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createSchemaCompiler } from './index.js';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';

const containerRenderer: RendererDefinition = {
  type: 'container',
  component: () => null,
  fields: [{ key: 'body', kind: 'region' }],
};

const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: () => null,
  fields: [{ key: 'onClick', kind: 'event' }],
};

function createCompiler(...definitions: RendererDefinition[]) {
  return createSchemaCompiler({
    registry: createRendererRegistry(definitions),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
}

describe('xui:actions compilation', () => {
  it('compiles xui:actions into namedActionPlans on TemplateNode', () => {
    const compiler = createCompiler(buttonRenderer);
    const compiled = compiler.compile({
      type: 'button',
      'xui:actions': {
        save: { action: 'ajax', args: { url: '/api/save' } },
      },
      onClick: { action: 'save' },
    });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(root.namedActionPlans).toBeDefined();
    expect(Object.keys(root.namedActionPlans!)).toEqual(['save']);
    expect(root.namedActionPlans!.save.nodes).toHaveLength(1);
    expect(root.namedActionPlans!.save.nodes[0].action).toBe('ajax');
  });

  it('leaves namedActionPlans undefined when xui:actions is absent', () => {
    const compiler = createCompiler(buttonRenderer);
    const compiled = compiler.compile({ type: 'button' });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(root.namedActionPlans).toBeUndefined();
  });

  it('leaves namedActionPlans undefined when xui:actions is empty object', () => {
    const compiler = createCompiler(buttonRenderer);
    const compiled = compiler.compile({
      type: 'button',
      'xui:actions': {},
    });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(root.namedActionPlans).toBeUndefined();
  });

  it('compiles multiple named actions', () => {
    const compiler = createCompiler(buttonRenderer);
    const compiled = compiler.compile({
      type: 'button',
      'xui:actions': {
        save: { action: 'ajax', args: { url: '/save' } },
        reset: { action: 'setValue', args: { path: 'form', value: {} } },
      },
    });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(Object.keys(root.namedActionPlans!)).toEqual(['save', 'reset']);
  });

  it('compiles action chains with then', () => {
    const compiler = createCompiler(buttonRenderer);
    const compiled = compiler.compile({
      type: 'button',
      'xui:actions': {
        saveAndClose: {
          action: 'ajax',
          args: { url: '/save' },
          then: { action: 'closeDialog' },
        },
      },
    });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    const plan = root.namedActionPlans!.saveAndClose;
    expect(plan.nodes[0].action).toBe('ajax');
    expect(plan.nodes[0].then).toBeDefined();
    expect(plan.nodes[0].then![0].action).toBe('closeDialog');
  });

  it('ignores xui:actions during prop compilation', () => {
    const compiler = createCompiler(buttonRenderer);
    const compiled = compiler.compile({
      type: 'button',
      label: 'Click',
      'xui:actions': {
        save: { action: 'ajax' },
      },
    });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(root.propsProgram.value).toEqual({ type: 'button', label: 'Click' });
    expect(root.namedActionPlans).toBeDefined();
  });

  it('child node inherits parent xui:actions via symbol table', () => {
    const compiler = createCompiler(containerRenderer, buttonRenderer);
    const compiled = compiler.compile({
      type: 'container',
      'xui:actions': {
        save: { action: 'ajax', args: { url: '/save' } },
      },
      body: {
        type: 'button',
        onClick: { action: 'save' },
      },
    });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(root.namedActionPlans).toBeDefined();
    expect(root.namedActionPlans!.save.nodes[0].action).toBe('ajax');
    const childNode = root.regions.body.node as TemplateNode;
    expect(childNode).toBeDefined();
    expect(childNode.eventPlans.onClick.nodes[0].action).toBe('save');
  });

  it('child node with own xui:actions shadows parent', () => {
    const compiler = createCompiler(containerRenderer, buttonRenderer);
    const compiled = compiler.compile({
      type: 'container',
      'xui:actions': {
        save: { action: 'ajax', args: { url: '/parent-save' } },
      },
      body: {
        type: 'button',
        'xui:actions': {
          save: { action: 'ajax', args: { url: '/child-save' } },
        },
        onClick: { action: 'save' },
      },
    });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    const childNode = root.regions.body.node as TemplateNode;

    expect(root.namedActionPlans!.save.nodes[0].source.args!.url).toBe('/parent-save');
    expect(childNode.namedActionPlans!.save.nodes[0].source.args!.url).toBe('/child-save');
  });

  it('handles xui:actions with expression args', () => {
    const compiler = createCompiler(buttonRenderer);
    const compiled = compiler.compile({
      type: 'button',
      'xui:actions': {
        dynamicSave: { action: 'ajax', args: { url: '${apiUrl}', data: '${formData}' } },
      },
    });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(root.namedActionPlans!.dynamicSave.isFullyStatic).toBe(false);
  });

  it('handles invalid xui:actions entry gracefully', () => {
    const compiler = createCompiler(buttonRenderer);
    const compiled = compiler.compile({
      type: 'button',
      'xui:actions': {
        bad: null,
        good: { action: 'ajax' },
      },
    });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(root.namedActionPlans).toBeDefined();
    expect(root.namedActionPlans!.bad.nodes[0].action).toBe('noop');
    expect(root.namedActionPlans!.good.nodes[0].action).toBe('ajax');
  });
});
