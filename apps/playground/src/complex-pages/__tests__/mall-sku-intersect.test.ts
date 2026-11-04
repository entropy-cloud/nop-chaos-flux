import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv, ScopeRef } from '@nop-chaos/flux-core';
import { describe, expect, it } from 'vitest';

/**
 * Plan 812 — G16 规格求交 formula 编排确定性单测（D4 §3.3 ①：求交表达式
 * × 缺货边界）。机制：import mall-sku-picker.json → walk 提取 schema 内的
 * 纯求交表达式串（sundial schema-dataflow walk 先例）→ flux-formula
 * compileExpression 对 fixture skuMatrix 求值——证明「两列×各 3 值（D4 §2.1
 * 口径，含 1 缺货行）」的纯前端求交可表达，e2e 再以 skuLocate=0 闭环（§3.3 ②）。
 * 仅取纯表达式（整个字符串恰为一个 ${...}）——混合模板（文本前缀+插值）不经
 * 纯表达式编译路径。
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(
  readFileSync(path.join(here, '..', 'page-schemas', 'mall-sku-picker.json'), 'utf8'),
) as unknown;

function collectPureExpressions(node: unknown, found: string[] = []): string[] {
  if (typeof node === 'string') {
    if (node.startsWith('${') && node.endsWith('}') && node.includes('ARRAYFILTER')) {
      found.push(node);
    }
  } else if (Array.isArray(node)) {
    for (const entry of node) collectPureExpressions(entry, found);
  } else if (node && typeof node === 'object') {
    for (const value of Object.values(node)) collectPureExpressions(value, found);
  }
  return found;
}

const pureExpressions = collectPureExpressions(schema);
/** 两维全匹配缺货闸（footer disabled + stock-badge family，纯表达式）。 */
const stockGateExpr = pureExpressions.find(
  (expr) => expr.includes('r?.specs?.color === selectedColor') && expr.includes('<= 0'),
)!;
/** 加购/直购 payload 的 skuId 内联求交写回面（纯表达式；plan 855 芯片化后
 * 选择器不再携带 onChange 写回，skuId 由 payload 表达式按 selectedColor/
 * selectedSize 读时求交）。 */
const payloadSkuExpr = pureExpressions.find(
  (expr) => expr.includes('r?.specs?.color === selectedColor') && expr.includes('skuId'),
)!;

const fixtureSkuMatrix = [
  { skuId: 'sku-001', specs: { color: '曜石黑', size: '128G' }, price: 4099, stock: 19, image: '' },
  { skuId: 'sku-006', specs: { color: '冰川白', size: '512G' }, price: 4299, stock: 0, image: '' },
  { skuId: 'sku-009', specs: { color: '霞光紫', size: '512G' }, price: 4299, stock: 12, image: '' },
];

const compiler = createFormulaCompiler();

function evaluateInScope<T = unknown>(expression: string, scopeData: Record<string, unknown>): T {
  const source = expression.trim().slice(2, -1);
  const compiled = compiler.compileExpression<T>(source);
  const _scope = {
    id: 'test-scope',
    path: '/',
    value: scopeData,
    get: (path: string) => scopeData[path],
    has: (path: string) => path in scopeData,
    readOwn: () => scopeData,
    readVisible: () => scopeData,
    materializeVisible: () => scopeData,
    update() {},
    merge() {},
  } as unknown as ScopeRef;
  const env = { notify: () => {}, confirm: () => Promise.resolve(true) } as unknown as RendererEnv;
  return compiled.exec(
    {
      resolve: (path: string) => scopeData[path],
      has: (path: string) => path in scopeData,
      materialize: () => scopeData,
    },
    env,
  );
}

describe('G16 SKU 规格求交 formula 编排（plan 812，D4 §3.3 ①）', () => {
  it('schema 内存在两维缺货闸与颜色侧写回纯表达式（family walk 命中）', () => {
    expect(stockGateExpr, '两维缺货闸表达式必须在 schema 内').toBeTruthy();
    expect(payloadSkuExpr, '规格求交 skuId 内联表达式必须在 schema 内').toBeTruthy();
  });

  it('满配有货组合：曜石黑 128G → 缺货闸放行（有货）', () => {
    const badge = evaluateInScope<string>(stockGateExpr, {
      goodsDetail: { skuMatrix: fixtureSkuMatrix },
      selectedColor: '曜石黑',
      selectedSize: '128G',
    });
    expect(badge).toBe('有货');
  });

  it('缺货组合：冰川白 512G → 缺货闸拦截（缺货）', () => {
    const badge = evaluateInScope<string>(stockGateExpr, {
      goodsDetail: { skuMatrix: fixtureSkuMatrix },
      selectedColor: '冰川白',
      selectedSize: '512G',
    });
    expect(badge).toBe('缺货');
  });

  it('未选全边界：selectedSize 空 → 求交空集 → 缺货闸拦截（缺货）', () => {
    const badge = evaluateInScope<string>(stockGateExpr, {
      goodsDetail: { skuMatrix: fixtureSkuMatrix },
      selectedColor: '曜石黑',
      selectedSize: '',
    });
    expect(badge).toBe('缺货');
  });

  it('芯片选择写回面：selectedColor=冰川白 × selectedSize=512G → payload 求交命中 sku-006（plan 855 芯片化口径）', () => {
    const skuId = evaluateInScope<string>(payloadSkuExpr, {
      goodsDetail: { skuMatrix: fixtureSkuMatrix },
      selectedColor: '冰川白',
      selectedSize: '512G',
    });
    expect(skuId).toBe('sku-006');
  });
});
