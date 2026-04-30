import { describe, expect, it } from 'vitest';
import {
  createRendererRegistry,
  type RendererDefinition,
  type TemplateNode,
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaCompiler } from './index';

const textRenderer: RendererDefinition = {
  type: 'text',
  component: () => null,
  staticCapable: true,
};

const containerRenderer: RendererDefinition = {
  type: 'container',
  component: () => null,
  regions: ['body'],
  staticCapable: true,
};

const iconRenderer: RendererDefinition = {
  type: 'icon',
  component: () => null,
  staticCapable: true,
};

const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: () => null,
  fields: [{ key: 'onClick', kind: 'event' }],
  staticCapable: false,
};

const inputRenderer: RendererDefinition = {
  type: 'input-text',
  component: () => null,
  staticCapable: false,
};

const formRenderer: RendererDefinition = {
  type: 'form',
  component: () => null,
  regions: ['body'],
  scopePolicy: 'form',
  staticCapable: false,
};

function createTestCompiler(renderers: RendererDefinition[]) {
  const registry = createRendererRegistry(renderers);
  return createSchemaCompiler({
    registry,
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
}

describe('static analysis', () => {
  describe('staticCapable renderer detection', () => {
    it('marks text with static props as static', () => {
      const compiler = createTestCompiler([textRenderer]);
      const compiled = compiler.compile({ type: 'text', text: 'Hello World' });
      const root = compiled.root as TemplateNode;

      expect(root.staticAnalysis).toBeDefined();
      expect(root.staticAnalysis?.isStaticContent).toBe(true);
      expect(root.staticAnalysis?.dependencies).toEqual([]);
    });

    it('marks text with expression as not static', () => {
      const compiler = createTestCompiler([textRenderer]);
      const compiled = compiler.compile({ type: 'text', text: '${message}' });
      const root = compiled.root as TemplateNode;

      expect(root.staticAnalysis).toBeDefined();
      expect(root.staticAnalysis?.isStaticContent).toBe(false);
    });

    it('marks input as not static (interactive renderer)', () => {
      const compiler = createTestCompiler([inputRenderer]);
      const compiled = compiler.compile({ type: 'input-text', placeholder: 'Enter text' });
      const root = compiled.root as TemplateNode;

      expect(root.staticAnalysis).toBeDefined();
      expect(root.staticAnalysis?.isStaticContent).toBe(false);
    });

    it('marks button as not static (interactive renderer)', () => {
      const compiler = createTestCompiler([buttonRenderer]);
      const compiled = compiler.compile({ type: 'button', label: 'Click me' });
      const root = compiled.root as TemplateNode;

      expect(root.staticAnalysis).toBeDefined();
      expect(root.staticAnalysis?.isStaticContent).toBe(false);
    });
  });

  describe('container with children', () => {
    it('marks container as static if all children are static', () => {
      const compiler = createTestCompiler([containerRenderer, textRenderer, iconRenderer]);
      const compiled = compiler.compile({
        type: 'container',
        body: [
          { type: 'text', text: 'Hello' },
          { type: 'icon', icon: 'star' },
        ],
      });
      const root = compiled.root as TemplateNode;

      expect(root.staticAnalysis).toBeDefined();
      expect(root.staticAnalysis?.isStaticContent).toBe(true);
    });

    it('marks container as not static if any child is not static', () => {
      const compiler = createTestCompiler([containerRenderer, textRenderer, inputRenderer]);
      const compiled = compiler.compile({
        type: 'container',
        body: [
          { type: 'text', text: 'Static content' },
          { type: 'input-text', placeholder: 'Interactive' },
        ],
      });
      const root = compiled.root as TemplateNode;

      expect(root.staticAnalysis).toBeDefined();
      expect(root.staticAnalysis?.isStaticContent).toBe(false);
    });

    it('marks container as not static if child has expression', () => {
      const compiler = createTestCompiler([containerRenderer, textRenderer]);
      const compiled = compiler.compile({
        type: 'container',
        body: [{ type: 'text', text: '${dynamicText}' }],
      });
      const root = compiled.root as TemplateNode;

      expect(root.staticAnalysis).toBeDefined();
      expect(root.staticAnalysis?.isStaticContent).toBe(false);
    });

    it('marks empty container as static', () => {
      const compiler = createTestCompiler([containerRenderer]);
      const compiled = compiler.compile({
        type: 'container',
        body: [],
      });
      const root = compiled.root as TemplateNode;

      expect(root.staticAnalysis).toBeDefined();
      expect(root.staticAnalysis?.isStaticContent).toBe(true);
    });
  });

  describe('name binding detection', () => {
    it('marks node with name binding as not static', () => {
      const compiler = createTestCompiler([textRenderer]);
      const compiled = compiler.compile({ type: 'text', name: 'myText', text: 'Hello' });
      const root = compiled.root as TemplateNode;

      expect(root.staticAnalysis).toBeDefined();
      expect(root.staticAnalysis?.isStaticContent).toBe(false);
    });
  });

  describe('event handler detection', () => {
    it('marks node with event handlers as not static', () => {
      const compiler = createTestCompiler([buttonRenderer]);
      const compiled = compiler.compile({
        type: 'button',
        label: 'Click me',
        onClick: { type: 'alert', message: 'clicked' },
      });
      const root = compiled.root as TemplateNode;

      expect(root.staticAnalysis).toBeDefined();
      expect(root.staticAnalysis?.isStaticContent).toBe(false);
    });
  });

  describe('scope creation detection', () => {
    it('marks form as not static (creates scope)', () => {
      const compiler = createTestCompiler([formRenderer, textRenderer]);
      const compiled = compiler.compile({
        type: 'form',
        body: [{ type: 'text', text: 'Static text inside form' }],
      });
      const root = compiled.root as TemplateNode;

      expect(root.staticAnalysis).toBeDefined();
      expect(root.staticAnalysis?.isStaticContent).toBe(false);
    });
  });

  describe('nested static analysis', () => {
    it('propagates static status through deeply nested containers', () => {
      const compiler = createTestCompiler([containerRenderer, textRenderer]);
      const compiled = compiler.compile({
        type: 'container',
        body: [
          {
            type: 'container',
            body: [
              {
                type: 'container',
                body: [{ type: 'text', text: 'Deep static text' }],
              },
            ],
          },
        ],
      });
      const root = compiled.root as TemplateNode;

      expect(root.staticAnalysis?.isStaticContent).toBe(true);
    });

    it('propagates non-static status through deeply nested containers', () => {
      const compiler = createTestCompiler([containerRenderer, textRenderer]);
      const compiled = compiler.compile({
        type: 'container',
        body: [
          {
            type: 'container',
            body: [
              {
                type: 'container',
                body: [{ type: 'text', text: '${dynamic}' }],
              },
            ],
          },
        ],
      });
      const root = compiled.root as TemplateNode;

      expect(root.staticAnalysis?.isStaticContent).toBe(false);
    });
  });

  describe('meta expressions', () => {
    it('marks node with visible expression as not static', () => {
      const compiler = createTestCompiler([textRenderer]);
      const compiled = compiler.compile({
        type: 'text',
        text: 'Conditionally visible',
        visible: '${showText}',
      });
      const root = compiled.root as TemplateNode;

      expect(root.staticAnalysis?.isStaticContent).toBe(false);
    });

    it('marks node with disabled expression as not static', () => {
      const compiler = createTestCompiler([textRenderer]);
      const compiled = compiler.compile({
        type: 'text',
        text: 'Hello',
        disabled: '${isDisabled}',
      });
      const root = compiled.root as TemplateNode;

      expect(root.staticAnalysis?.isStaticContent).toBe(false);
    });

    it('marks node with static visible value as static', () => {
      const compiler = createTestCompiler([textRenderer]);
      const compiled = compiler.compile({
        type: 'text',
        text: 'Always visible',
        visible: true,
      });
      const root = compiled.root as TemplateNode;

      expect(root.staticAnalysis?.isStaticContent).toBe(true);
    });
  });

  describe('array root compilation', () => {
    it('computes static analysis for each node in array root', () => {
      const compiler = createTestCompiler([textRenderer, inputRenderer]);
      const compiled = compiler.compile([{ type: 'text', text: 'Static' }, { type: 'input-text' }]);
      const roots = compiled.root as TemplateNode[];

      expect(Array.isArray(roots)).toBe(true);
      expect(roots[0].staticAnalysis?.isStaticContent).toBe(true);
      expect(roots[1].staticAnalysis?.isStaticContent).toBe(false);
    });
  });
});
