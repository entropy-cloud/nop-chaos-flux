import { describe, expect, it } from 'vitest';
import type {
  RendererDefinition,
  TemplateNode,
  CompiledValidationNode,
} from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaCompiler } from './index';
import { collectValidationModel } from './schema-compiler/validation-collection';

const formRenderer: RendererDefinition = {
  type: 'form',
  component: () => null,
  regions: ['body'],
  scopePolicy: 'form',
  validation: {
    kind: 'container',
  },
};

const inputRenderer: RendererDefinition = {
  type: 'input-text',
  component: () => null,
  validation: {
    kind: 'field',
    getFieldPath(schema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [];
    },
  },
};

const arrayInputRenderer: RendererDefinition = {
  type: 'array-input',
  component: () => null,
  validation: {
    kind: 'field',
    valueKind: 'array',
    getFieldPath(schema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [];
    },
    getChildFieldPathPrefix() {
      return undefined;
    },
  },
};

const objectInputRenderer: RendererDefinition = {
  type: 'object-input',
  component: () => null,
  validation: {
    kind: 'field',
    valueKind: 'object',
    getFieldPath(schema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [];
    },
  },
};

const blockingInputRenderer: RendererDefinition = {
  type: 'blocking-input',
  component: () => null,
  validation: {
    kind: 'field',
    getFieldPath(schema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [];
    },
    getChildFieldPathPrefix() {
      return false;
    },
  },
};

const childPrefixRenderer: RendererDefinition = {
  type: 'prefix-input',
  component: () => null,
  regions: ['body'],
  validation: {
    kind: 'field',
    getFieldPath(schema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [];
    },
    getChildFieldPathPrefix() {
      return 'items';
    },
  },
};

describe('collectValidationModel', () => {
  it('returns undefined for null input', () => {
    expect(collectValidationModel(null)).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(collectValidationModel(undefined)).toBeUndefined();
  });

  it('builds root form node with default behavior', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'form',
      body: { type: 'input-text', name: 'email' },
    });

    const root = compiled.root as TemplateNode;
    expect(root.validationPlan).toBeDefined();
    const nodes = root.validationPlan!.nodes as Record<string, CompiledValidationNode>;

    expect(nodes['']).toBeDefined();
    expect(nodes[''].kind).toBe('form');
    expect(nodes[''].path).toBe('');
    expect(nodes['email']).toBeDefined();
    expect(nodes['email'].kind).toBe('field');
    expect(nodes['email'].path).toBe('email');
    expect(nodes[''].children).toContain('email');
    expect(root.validationOwnerPlan).toEqual({
      boundary: 'create-owner',
      childContractMode: 'ignore',
    });
  });

  it('records explicit child owner metadata for non-form create-owner renderers', () => {
    const detailRenderer: RendererDefinition = {
      type: 'detail-view',
      component: () => null,
      regions: ['content'],
      scopePolicy: 'form',
      validation: {
        kind: 'container',
        ownerResolution: 'create-owner',
        childContractMode: 'summary-gate',
      },
    };

    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, detailRenderer, inputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'form',
      body: {
        type: 'detail-view',
        content: { type: 'input-text', name: 'title', required: true },
      },
    });

    const root = compiled.root as TemplateNode;
    const detailNode = root.regions.body.node as TemplateNode;

    expect(detailNode.validationOwnerPlan).toEqual({
      boundary: 'create-owner',
      childContractMode: 'summary-gate',
    });
    expect(detailNode.validationPlan).toBeDefined();
  });

  it('collects validation rules from schema', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'form',
      body: { type: 'input-text', name: 'email', required: true, minLength: 5 },
    });

    const root = compiled.root as TemplateNode;
    const nodes = root.validationPlan!.nodes as Record<string, CompiledValidationNode>;

    expect(nodes['email'].rules).toHaveLength(2);
    expect(nodes['email'].rules.map((r) => r.rule.kind)).toEqual(['required', 'minLength']);
  });

  it('uses array valueKind for array validation nodes', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, arrayInputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'form',
      body: { type: 'array-input', name: 'items' },
    });

    const root = compiled.root as TemplateNode;
    const nodes = root.validationPlan!.nodes as Record<string, CompiledValidationNode>;

    expect(nodes['items'].kind).toBe('array');
  });

  it('uses object valueKind for object validation nodes', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, objectInputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'form',
      body: { type: 'object-input', name: 'address' },
    });

    const root = compiled.root as TemplateNode;
    const nodes = root.validationPlan!.nodes as Record<string, CompiledValidationNode>;

    expect(nodes['address'].kind).toBe('object');
  });

  it('extracts label from schema', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'form',
      body: { type: 'input-text', name: 'email', label: 'Email Address' },
    });

    const root = compiled.root as TemplateNode;
    const nodes = root.validationPlan!.nodes as Record<string, CompiledValidationNode>;

    expect(nodes['email'].label).toBe('Email Address');
  });

  it('handles form with single field and no rules', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'form',
      body: { type: 'input-text', name: 'email' },
    });

    const root = compiled.root as TemplateNode;
    expect(root.validationPlan).toBeDefined();
    const nodes = root.validationPlan!.nodes as Record<string, CompiledValidationNode>;
    expect(nodes['']).toBeDefined();
    expect(nodes[''].kind).toBe('form');
    expect(nodes['email']).toBeDefined();
    expect(nodes['email'].rules).toEqual([]);
  });

  it('handles nested field paths with dot notation', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'form',
      body: [
        { type: 'input-text', name: 'address.street' },
        { type: 'input-text', name: 'address.city' },
      ],
    });

    const root = compiled.root as TemplateNode;
    const nodes = root.validationPlan!.nodes as Record<string, CompiledValidationNode>;

    expect(nodes['address.street']).toBeDefined();
    expect(nodes['address.street'].parent).toBe('address');
    expect(nodes['address.street'].kind).toBe('field');
    expect(nodes['address.city']).toBeDefined();
    expect(nodes['address.city'].parent).toBe('address');
    expect(nodes['address.city'].kind).toBe('field');
  });

  it('stops traversal when getChildFieldPathPrefix returns false', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, blockingInputRenderer, inputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'form',
      body: [
        { type: 'blocking-input', name: 'blocked' },
        { type: 'input-text', name: 'visible' },
      ],
    });

    const root = compiled.root as TemplateNode;
    const nodes = root.validationPlan!.nodes as Record<string, CompiledValidationNode>;

    expect(nodes['blocked']).toBeDefined();
    expect(nodes['visible']).toBeDefined();
  });

  it('uses childFieldPathPrefix for nested validation', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, childPrefixRenderer, inputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'form',
      body: {
        type: 'prefix-input',
        name: 'container',
        body: { type: 'input-text', name: 'field1' },
      },
    });

    const root = compiled.root as TemplateNode;
    const nodes = root.validationPlan!.nodes as Record<string, CompiledValidationNode>;

    expect(nodes['container']).toBeDefined();
    expect(nodes['items.field1']).toBeDefined();
    expect(nodes['items.field1'].parent).toBe('items');
  });

  it('respects form-level validateOn and showErrorOn', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'form',
      validateOn: ['change'],
      showErrorOn: ['dirty'],
      body: { type: 'input-text', name: 'email' },
    });

    const root = compiled.root as TemplateNode;
    expect(root.validationPlan).toBeDefined();
    expect(root.validationPlan!.behavior.triggers).toEqual(['change']);
    expect(root.validationPlan!.behavior.showErrorOn).toEqual(['dirty']);
  });

  it('handles form hiddenFieldPolicy', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'form',
      hiddenFieldPolicy: 'validate-and-submit',
      body: { type: 'input-text', name: 'email' },
    });

    const root = compiled.root as TemplateNode;
    expect(root.validationPlan?.defaultHiddenFieldPolicy).toBe('validate-and-submit');
  });

  it('handles array of template nodes at root', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'form',
      body: [
        { type: 'input-text', name: 'a' },
        { type: 'input-text', name: 'b' },
      ],
    });

    const root = compiled.root as TemplateNode;
    const nodes = root.validationPlan!.nodes as Record<string, CompiledValidationNode>;

    expect(nodes['a']).toBeDefined();
    expect(nodes['b']).toBeDefined();
    expect(nodes[''].children).toContain('a');
    expect(nodes[''].children).toContain('b');
  });

  it('uses field-level validateOn overrides', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'form',
      validateOn: ['change'],
      body: { type: 'input-text', name: 'email', validateOn: ['blur'] },
    });

    const root = compiled.root as TemplateNode;
    const nodes = root.validationPlan!.nodes as Record<string, CompiledValidationNode>;

    expect(nodes['email']!.behavior!.triggers).toEqual(['blur']);
  });

  it('handles non-field renderer without getFieldPath', () => {
    const nonFieldRenderer: RendererDefinition = {
      type: 'display',
      component: () => null,
      validation: {
        kind: 'container',
      },
    };

    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, nonFieldRenderer, inputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'form',
      body: [{ type: 'display' }, { type: 'input-text', name: 'email' }],
    });

    const root = compiled.root as TemplateNode;
    const nodes = root.validationPlan!.nodes as Record<string, CompiledValidationNode>;

    expect(nodes['email']).toBeDefined();
    expect(nodes[''].children).toContain('email');
  });

  it('stops validation collection at create-owner boundaries', () => {
    const nestedFormRenderer: RendererDefinition = {
      type: 'nested-form',
      component: () => null,
      regions: ['body'],
      scopePolicy: 'form',
      validation: {
        kind: 'container',
      },
    };

    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, nestedFormRenderer, inputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'form',
      body: [
        { type: 'input-text', name: 'parentField' },
        {
          type: 'nested-form',
          body: [
            { type: 'input-text', name: 'childField1' },
            { type: 'input-text', name: 'childField2' },
          ],
        },
        { type: 'input-text', name: 'afterNested' },
      ],
    });

    const root = compiled.root as TemplateNode;
    const nodes = root.validationPlan!.nodes as Record<string, CompiledValidationNode>;

    expect(nodes['parentField']).toBeDefined();
    expect(nodes['afterNested']).toBeDefined();
    expect(nodes['childField1']).toBeUndefined();
    expect(nodes['childField2']).toBeUndefined();
  });

  it('stops validation collection at detail-view create-owner boundary', () => {
    const detailRenderer: RendererDefinition = {
      type: 'detail-view',
      component: () => null,
      regions: ['content'],
      scopePolicy: 'form',
      validation: {
        kind: 'container',
        ownerResolution: 'create-owner',
        childContractMode: 'summary-gate',
      },
    };

    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, detailRenderer, inputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'form',
      body: [
        { type: 'input-text', name: 'name' },
        {
          type: 'detail-view',
          content: { type: 'input-text', name: 'draftTitle', required: true },
        },
      ],
    });

    const root = compiled.root as TemplateNode;
    const nodes = root.validationPlan!.nodes as Record<string, CompiledValidationNode>;

    expect(nodes['name']).toBeDefined();
    expect(nodes['draftTitle']).toBeUndefined();

    const detailNode = (root.regions.body.node as TemplateNode[])[1] as TemplateNode;
    expect(detailNode.validationPlan).toBeDefined();
    const detailNodes = detailNode.validationPlan!.nodes as Record<string, CompiledValidationNode>;
    expect(detailNodes['draftTitle']).toBeDefined();
  });

  it('pools identical behaviors', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'form',
      body: [
        { type: 'input-text', name: 'a' },
        { type: 'input-text', name: 'b' },
      ],
    });

    const root = compiled.root as TemplateNode;
    const nodes = root.validationPlan!.nodes as Record<string, CompiledValidationNode>;

    expect(nodes['a'].behavior).toBe(nodes['b'].behavior);
  });
});
