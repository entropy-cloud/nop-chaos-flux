import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 统一延迟加载守护（源级）：宿主注册路径（renderer-definitions.ts）不得静态 import
 * three.js 或 renderer/engine 实现模块——只能经 `import('./renderer/three-canvas.js')`
 * 异步装载（flux-react `createLazyRendererComponent`）。`import type` 编译期擦除，不算边。
 */
const dir = path.dirname(fileURLToPath(import.meta.url));

function readSource(file: string): Promise<string> {
  return readFile(path.join(dir, file), 'utf8');
}

/** 静态边 = 顶层 `import ... from 'x'` / 裸 `import 'x'` / `export ... from 'x'`。 */
export function findStaticImports(source: string, specifier: string): string[] {
  const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    // closure audit M-1 家族镜像（plan 2474）：有界跨行——prettier 多行折叠 import 不再漏检
    new RegExp(`^[ \\t]*import\\s+(?!type\\b)[\\s\\S]{0,400}?from\\s*['"]${escaped}['"]`, 'gm'),
    new RegExp(`^[ \\t]*import\\s*\\(?\\s*['"]${escaped}['"]`, 'gm'),
    new RegExp(`^[ \\t]*export\\s+[\\s\\S]{0,400}?from\\s*['"]${escaped}['"]`, 'gm'),
  ];
  return patterns.flatMap((pattern) => source.match(pattern) ?? []);
}

describe('three-canvas unified lazy-loading guard (renderer-definitions is the host registration path)', () => {
  it('registers via createLazyRendererComponent + dynamic import of three-canvas', async () => {
    const source = await readSource('renderer-definitions.ts');
    expect(source).toContain('createLazyRendererComponent');
    expect(source).toContain("import('./renderer/three-canvas.js')");
  });

  it('has no static import of three or the renderer/engine implementation modules', async () => {
    const source = await readSource('renderer-definitions.ts');
    for (const specifier of ['three', './renderer/three-canvas.js', './engine/scene-manager.js', './engine/model-loader.js']) {
      expect(findStaticImports(source, specifier), `static import of ${specifier}`).toEqual([]);
    }
  });

  it('package entry has no static edge to three (heavy re-exports trimmed)', async () => {
    const source = await readSource('index.ts');
    for (const specifier of ['three', './renderer/three-canvas.js', './engine/scene-manager.js', './engine/model-loader.js']) {
      expect(findStaticImports(source, specifier), `static import of ${specifier}`).toEqual([]);
    }
  });
});
