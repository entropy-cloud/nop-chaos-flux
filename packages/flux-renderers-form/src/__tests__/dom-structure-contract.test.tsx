import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

/**
 * DOM 结构契约冻结测试（docs/audits/dom-structure-checklist.md；plan 529 / W2）。
 * 逐通道断言根锚三件套的落点：
 * - FieldFrame 通道（wrap:true）：帧根 .nop-field 携带 data-field + data-renderer
 *   + data-cid；控件输出根不得重复携带（实例锚单点原则）。
 * - 无帧通道（wrap 缺省或 frameWrap:false）：控件输出根由 NodeFrameWrapper 的
 *   UnframedAnchoredRenderer 补章 data-renderer + data-cid。
 * - 裸输出豁免（hidden）：登记于审计卡，不携带锚。
 * - owner 渲染器（form/fieldset）：无帧通道，根自带 nop-class + cid，盖章补 renderer。
 */
const SchemaRenderer = createSchemaRenderer([
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  formStateProbeRenderer,
]);
const formulaCompiler = createFormulaCompiler();

afterEach(() => cleanup());

function renderForm(body: Record<string, unknown>[]) {
  return render(
    <SchemaRenderer
      schemaUrl="test://dom-structure-contract-form"
      schema={{ type: 'form', body } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('form dom-structure contract (root anchors, plan 529)', () => {
  it('wrapped input-text: frame root carries the full anchor set, control root stays clean', () => {
    const { container } = renderForm([{ type: 'input-text', name: 'a', label: 'A' }]);
    const fieldRoot = container.querySelector('.nop-field[data-field="a"]')!;
    expect(fieldRoot).toBeTruthy();
    expect(fieldRoot.getAttribute('data-renderer')).toBe('input-text');
    expect(fieldRoot.getAttribute('data-cid')).toBeTruthy();

    const control = container.querySelector('.nop-input-text')!;
    expect(control).toBeTruthy();
    expect(control.getAttribute('data-renderer')).toBeNull();
    expect(control.getAttribute('data-cid')).toBeNull();
  });

  it('unwrapped input-text (frameWrap:false): explicit frame-contract opt-out, anchors exempt', () => {
    const { container } = renderForm([
      { type: 'input-text', name: 'b', label: 'B', frameWrap: false },
    ]);
    const control = container.querySelector('.nop-input-text')!;
    expect(control).toBeTruthy();
    // schema frameWrap:false 是作者显式退出帧契约：FieldFrame 锚点被移除，
    // 实例锚随之豁免（审计卡登记），不做内层补章以免双层标记。
    expect(control.getAttribute('data-renderer')).toBeNull();
  });

  it('wrapped checkbox (label frame): field root carries anchors', () => {
    const { container } = renderForm([{ type: 'checkbox', name: 'c', label: 'C' }]);
    const fieldRoot = container.querySelector('.nop-field[data-field="c"]')!;
    expect(fieldRoot).toBeTruthy();
    expect(fieldRoot.getAttribute('data-renderer')).toBe('checkbox');
    expect(fieldRoot.getAttribute('data-cid')).toBeTruthy();
  });

  it('wrapped radio-group (group frame): fieldset frame root carries anchors', () => {
    const { container } = renderForm([
      {
        type: 'radio-group',
        name: 'd',
        label: 'D',
        options: [
          { label: '1', value: '1' },
          { label: '2', value: '2' },
        ],
      },
    ]);
    const fieldRoot = container.querySelector('.nop-field[data-field="d"]')!;
    expect(fieldRoot).toBeTruthy();
    expect(fieldRoot.getAttribute('data-renderer')).toBe('radio-group');
    expect(fieldRoot.getAttribute('data-cid')).toBeTruthy();
  });

  it('wrapped select: field root carries anchors, hand-written wrapper cid stays single', () => {
    const { container } = renderForm([
      {
        type: 'select',
        name: 'e',
        label: 'E',
        options: [{ label: '1', value: '1' }],
      },
    ]);
    const fieldRoot = container.querySelector('.nop-field[data-field="e"]')!;
    expect(fieldRoot).toBeTruthy();
    expect(fieldRoot.getAttribute('data-renderer')).toBe('select');
    const wrapper = container.querySelector('[data-slot="select-wrapper"]')!;
    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute('data-renderer')).toBeNull();
  });

  it('hidden: bare input root carries the stamped renderer anchor (no wrap channel)', () => {
    const { container } = renderForm([{ type: 'hidden', name: 'h' }]);
    const input = container.querySelector('input[type="hidden"][data-slot="hidden-input"]')!;
    expect(input).toBeTruthy();
    // hidden 定义无 wrap：走无帧通道，data-renderer 由 stamp 补齐；data-cid/
    // data-field 仍豁免（裸输入单点锚语义，审计卡登记）。
    expect(input.getAttribute('data-renderer')).toBe('hidden');
    expect(input.getAttribute('data-cid')).toBeNull();
    expect(input.getAttribute('data-field')).toBeNull();
  });

  it('form owner root: nop-form + stamped data-renderer + cid', () => {
    const { container } = renderForm([{ type: 'text', text: 'x' }]);
    const formRoot = container.querySelector('section.nop-form')!;
    expect(formRoot).toBeTruthy();
    expect(formRoot.getAttribute('data-renderer')).toBe('form');
    expect(formRoot.getAttribute('data-cid')).toBeTruthy();
    expect(container.querySelector('[data-slot="form-body"]')).toBeTruthy();
  });

  it('fieldset owner root: nop-fieldset + stamped data-renderer + cid', () => {
    const { container } = renderForm([
      { type: 'fieldset', title: 'G', body: [{ type: 'text', text: 'x' }] },
    ]);
    const fieldsetRoot = container.querySelector('fieldset.nop-fieldset')!;
    expect(fieldsetRoot).toBeTruthy();
    expect(fieldsetRoot.getAttribute('data-renderer')).toBe('fieldset');
    expect(fieldsetRoot.getAttribute('data-cid')).toBeTruthy();
  });

  it('label-wrapped inputs keep the frozen control id hook (name-control)', () => {
    renderForm([{ type: 'input-text', name: 'k', label: 'K' }]);
    expect(document.getElementById('k-control')).toBeTruthy();
  });

  it('marker class stays type-level only: no testid/cid on inner markers (uniqueness)', () => {
    renderForm([{ type: 'input-number', name: 'n', label: 'N' }]);
    const marker = container_marker();
    function container_marker() {
      return document.querySelector('.nop-input-number')!;
    }
    expect(marker).toBeTruthy();
    expect(marker.getAttribute('data-testid')).toBeNull();
    expect(marker.getAttribute('data-cid')).toBeNull();
    void screen;
  });
});
