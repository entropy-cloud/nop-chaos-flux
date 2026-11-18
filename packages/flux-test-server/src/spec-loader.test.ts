import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { bundleSpec, specEvaluateExpression } from './spec-loader.js';

const tempDirs: string[] = [];
function writeTempSpec(content: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'flux-spec-'));
  tempDirs.push(dir);
  const file = path.join(dir, 'demo.flux-spec.ts');
  writeFileSync(file, content);
  return file;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('bundleSpec', () => {
  it('bundles a default-exported handler into an IIFE exposing __flux_spec__', async () => {
    const file = writeTempSpec(`export default async function (ft: unknown) { return (ft as { marker: string }).marker; }`);
    const bundled = await bundleSpec(file);
    expect(bundled.code).toContain('__flux_spec__');

    // Execute the bundle in a bare function scope: the handler must be exposed and callable.
    // eslint-disable-next-line no-new-func -- 被测对象就是"注入页面的可执行产物"，需在 Node 里求值验证
    const handler = new Function(`${bundled.code}\n;return __flux_spec__.default ?? __flux_spec__;`)() as (ft: unknown) => Promise<string>;
    const value = await handler({ marker: 'flux-e2e' });
    expect(value).toBe('flux-e2e');
  });

  it('bundles multi-statement specs with local imports resolved away (no import statements remain)', async () => {
    const file = writeTempSpec(`const helper = (n: number) => n * 2;\nexport default async () => helper(21);`);
    const bundled = await bundleSpec(file);
    expect(bundled.code).not.toMatch(/^\s*import\s/m);
    // eslint-disable-next-line no-new-func -- 同上：验证打包产物可执行
    const handler = new Function(`${bundled.code}\n;return __flux_spec__.default ?? __flux_spec__;`)() as () => Promise<number>;
    expect(await handler()).toBe(42);
  });

  it('produces an expression that hands window.__FLUX_FT__ to the handler', async () => {
    const file = writeTempSpec(`export default async (ft: unknown) => (ft as { tag: string }).tag;`);
    const bundled = await bundleSpec(file);
    const expression = specEvaluateExpression(bundled);
    expect(expression).toContain('window.__FLUX_FT__');
    // CDP Runtime.evaluate 取脚本完成值（最后一个表达式语句），Node 侧需显式 return 才能对齐。
    // eslint-disable-next-line no-new-func -- 同上：验证 evaluate 表达式形状
    const result = await new Function('window', `return ${expression}`)({ __FLUX_FT__: { tag: 'bound' } });
    expect(result).toBe('bound');
  });
});
