import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 统一延迟加载守护（源级，plan 2474 Phase 1）：bundle 注册面（/definitions 轻子路径
 * = assembly/renderer.ts + assembly/compile-service.ts）不得静态 import 重实现模块
 * （xlang-debug-editor.js 携 CE/lezer 重图、@codemirror/*、@lezer/*、flux-code-editor、
 * flux-xlang-lang）——只能经 `import('./xlang-debug-editor.js')` 异步装载
 * （flux-react `createLazyRendererComponent`，three-canvas 先例）。
 * `import type` 编译期擦除，不算边；flux-xlang-lang 仅允许 type 形态。
 */
const dir = path.dirname(fileURLToPath(import.meta.url));

function readSource(file: string): Promise<string> {
  return readFile(path.join(dir, file), 'utf8');
}

/** 静态边 = 顶层 `import ... from 'x'` / 裸 `import 'x'` / `export ... from 'x'`；
 * specifier 按前缀匹配（@codemirror/@lezer 作用域包子路径均算边）；
 * 行内动态 `import(...)` 不匹配（import 后跟 `(` 不符 from/裸形态）。 */
export function findStaticImports(source: string, specifierPrefix: string): string[] {
  const escaped = specifierPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const suffix = `(/[^'"]*)?`;
  const patterns = [
    new RegExp(`^[ \\t]*import\\s+(?!type\\b)[^;\\n]*from\\s*['"]${escaped}${suffix}['"]`, 'gm'),
    new RegExp(`^[ \\t]*import\\s*['"]${escaped}${suffix}['"]`, 'gm'),
    new RegExp(`^[ \\t]*export\\s+[^;\\n]*from\\s*['"]${escaped}${suffix}['"]`, 'gm'),
  ];
  return patterns.flatMap((pattern) => source.match(pattern) ?? []);
}

const HEAVY_SPECIFIERS = [
  './xlang-debug-editor.js',
  '@codemirror',
  '@lezer',
  '@nop-chaos/flux-code-editor',
  '@nop-chaos/flux-xlang-lang',
];
const LIGHT_FILES = ['assembly/renderer.ts', 'assembly/compile-service.ts'];

describe('xlang-debug unified lazy-loading guard (/definitions is the bundle registration path)', () => {
  it('registers via createLazyRendererComponent + dynamic import of the heavy module', async () => {
    const source = await readSource('assembly/renderer.ts');
    expect(source).toContain('createLazyRendererComponent');
    expect(source).toContain("import('./xlang-debug-editor.js')");
  });

  it('light registration path has no static edge to heavy modules', async () => {
    for (const file of LIGHT_FILES) {
      const source = await readSource(file);
      for (const specifier of HEAVY_SPECIFIERS) {
        expect(findStaticImports(source, specifier), `${file}: static import of ${specifier}`).toEqual([]);
      }
    }
  });

  it('compile-service touches flux-xlang-lang only via import type', async () => {
    const source = await readSource('assembly/compile-service.ts');
    const langEdges = source.match(/^[ \t]*import[^;\n]*from\s*['"]@nop-chaos\/flux-xlang-lang['"]/gm) ?? [];
    for (const edge of langEdges) {
      expect(edge, `value-form import of flux-xlang-lang: ${edge}`).toMatch(/import\s+type\b/);
    }
  });
});
