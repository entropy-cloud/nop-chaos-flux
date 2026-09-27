/**
 * classifyNode 测试矩阵（S1 §10.1 含 review Major-1 修订）。
 *
 * rendererClass 三路径（domain-host-renderer → opaque-leaf；核心值 → page；缺失 → 兜底）
 * + sourcePackage 六域包兜底（六域清单逐个 + 核心家族不误判）。
 */

import { describe, expect, it } from 'vitest';
import { classifyNode, isOpaqueLeaf, DOMAIN_SOURCE_PACKAGE_PREFIXES } from './classify.js';
import type { RendererDefinition } from '@nop-chaos/flux-core';

function def(partial: Partial<RendererDefinition>): RendererDefinition {
  return { type: 'demo', ...partial } as RendererDefinition;
}

const SIX_DOMAIN_PACKAGES = [
  '@nop-chaos/flow-designer-core',
  '@nop-chaos/flow-designer-renderers',
  '@nop-chaos/report-designer-core',
  '@nop-chaos/report-designer-renderers',
  '@nop-chaos/word-editor-core',
  '@nop-chaos/word-editor-renderers',
  '@nop-chaos/flux-print-core',
  '@nop-chaos/flux-print-renderers',
  '@nop-chaos/flux-renderers-industrial',
  '@nop-chaos/spreadsheet-core',
  '@nop-chaos/spreadsheet-renderers',
];

describe('classifyNode', () => {
  it('rendererClass === domain-host-renderer → opaque-leaf', () => {
    expect(classifyNode(def({ type: 'flow-canvas', rendererClass: 'domain-host-renderer' }))).toBe('opaque-leaf');
  });

  it('core rendererClass values → page', () => {
    expect(classifyNode(def({ rendererClass: 'instance-renderer' }))).toBe('page');
    expect(classifyNode(def({ rendererClass: 'flux-owner-renderer' }))).toBe('page');
  });

  it('missing rendererClass with non-domain sourcePackage → page', () => {
    expect(classifyNode(def({ sourcePackage: '@nop-chaos/flux-renderers-basic' }))).toBe('page');
    expect(classifyNode(def({}))).toBe('page');
  });

  it('sourcePackage fallback catches all six-domain packages regardless of declared class', () => {
    for (const sourcePackage of SIX_DOMAIN_PACKAGES) {
      expect(classifyNode(def({ sourcePackage }))).toBe('opaque-leaf');
      // 关键回归（review Major-1）：industrial 声明 instance-renderer 也必须收敛为叶子。
      expect(
        classifyNode(def({ sourcePackage, rendererClass: 'instance-renderer' })),
      ).toBe('opaque-leaf');
    }
  });

  it('domain-source prefix matching does not swallow core families', () => {
    for (const prefix of DOMAIN_SOURCE_PACKAGE_PREFIXES) {
      expect(classifyNode(def({ sourcePackage: `${prefix}-internal` }))).toBe('opaque-leaf');
    }
    // 核心家族近似名不误判（非前缀命中）。
    expect(classifyNode(def({ sourcePackage: '@nop-chaos/flux-renderers-industrial-core-x' }))).toBe('opaque-leaf');
    expect(classifyNode(def({ sourcePackage: '@nop-chaos/flux-renderers-layout' }))).toBe('page');
    expect(classifyNode(def({ sourcePackage: '@nop-chaos/flux-print-something' }))).toBe('opaque-leaf');
  });

  it('isOpaqueLeaf mirrors classifyNode', () => {
    expect(isOpaqueLeaf(def({ rendererClass: 'domain-host-renderer' }))).toBe(true);
    expect(isOpaqueLeaf(def({ rendererClass: 'instance-renderer' }))).toBe(false);
  });
});
