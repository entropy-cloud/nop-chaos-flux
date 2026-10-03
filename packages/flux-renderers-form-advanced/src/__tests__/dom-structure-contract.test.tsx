import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { assertRendererRootAnchors } from '@nop-chaos/flux-react';
import { createFormSchemaRenderer } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';
import { env } from '../test-support.js';

installFormAdvancedTestHooks();

const formulaCompiler = createFormulaCompiler();

afterEach(cleanup);

function renderForm(body: Record<string, unknown>[], data?: Record<string, unknown>) {
  const SchemaRenderer = createFormSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://dom-structure-contract-advanced"
      schema={{ type: 'form', data, body } as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

// wrapped 通道可见根 class 为 nop-field（帧根设计），类型锚由 data-renderer 承担；
// skip:['marker'] 即登记该通道口径（checklist D1）。

describe('form-advanced dom-structure contract (root anchors, plan 530)', () => {
  it('wrapped array-editor: frame root carries anchors, row layers carry data-slot', () => {
    const { container } = renderForm(
      [{ type: 'array-editor', name: 'reviewers', label: 'Reviewers', itemLabel: 'Reviewer' }],
      { reviewers: ['alice'] },
    );
    const fieldRoot = container.querySelector('.nop-field[data-field="reviewers"]')!;
    expect(fieldRoot).toBeTruthy();
    assertRendererRootAnchors(fieldRoot, { type: 'array-editor', skip: ['marker'] });
    expect(container.querySelector('[data-slot="array-editor-row"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="array-editor-row-body"]')).toBeTruthy();
  });

  it('wrapped key-value: frame root carries anchors, row layers carry data-slot', () => {
    const { container } = renderForm(
      [{ type: 'key-value', name: 'metadata', label: 'Metadata' }],
      { metadata: [{ key: 'k', value: 'v' }] },
    );
    const fieldRoot = container.querySelector('.nop-field[data-field="metadata"]')!;
    expect(fieldRoot).toBeTruthy();
    assertRendererRootAnchors(fieldRoot, { type: 'key-value', skip: ['marker'] });
    expect(container.querySelector('[data-slot="key-value-row"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="key-value-row-body"]')).toBeTruthy();
  });

  it('wrapped input-file: frame root carries anchors, upload list/item carry data-slot', () => {
    const { container } = renderForm(
      [
        {
          type: 'input-file',
          id: 'uf',
          name: 'file',
          label: 'File',
          uploadAction: { action: 'ajax', args: { url: '/api/upload' } },
        },
      ],
      { file: [{ url: 'https://example.com/a.pdf', name: 'a.pdf', size: 1 }] },
    );
    const fieldRoot = container.querySelector('.nop-field[data-field="file"]')!;
    expect(fieldRoot).toBeTruthy();
    assertRendererRootAnchors(fieldRoot, { type: 'input-file', skip: ['marker'] });
    const list = container.querySelector('[data-slot="upload-field-list"]');
    expect(list).toBeTruthy();
    expect(container.querySelector('[data-slot="upload-field-item"]')).toBeTruthy();
  });

  it('wrapped variant-field (self-managed FieldFrame): frame root carries anchors', () => {
    const { container } = renderForm([
      {
        type: 'variant-field',
        name: 'contactMethod',
        label: 'Contact',
        variants: [{ key: 'email', label: 'Email', body: [] }],
      },
    ]);
    const fieldRoot = container.querySelector('.nop-field[data-field="contactMethod"]')!;
    expect(fieldRoot).toBeTruthy();
    assertRendererRootAnchors(fieldRoot, { type: 'variant-field', skip: ['marker'] });
  });

  it('detail-view (no wrap channel): output root is anchor-stamped', () => {
    const { container } = renderForm([
      {
        type: 'detail-view',
        data: { title: '' },
        triggerLabel: 'Edit',
        surface: { mode: 'dialog', title: 'Edit Details' },
        content: [{ type: 'input-text', name: 'title', label: 'Title' }],
      },
    ]);
    const root = container.querySelector('.nop-detail-view')!;
    expect(root).toBeTruthy();
    assertRendererRootAnchors(root, { type: 'detail-view' });
  });
});
