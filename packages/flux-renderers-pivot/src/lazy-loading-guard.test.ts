import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 统一延迟加载守护（源级）：宿主注册路径（pivot-renderer-definitions.ts）不得静态 import
 * @visactor/vtable 或 renderer 实现模块——只能经 `import('./pivot-renderer.js')`
 * 异步装载（flux-react `createLazyRendererComponent`）。`import type` 编译期擦除，不算边。
 */
const dir = path.dirname(fileURLToPath(import.meta.url));

function readSource(file: string): Promise<string> {
  return readFile(path.join(dir, file), 'utf8');
}

/** 静态边 = 顶层 `import ... from 'x'` / 裸 `import 'x'` / `export ... from 'x'`。 */
function findStaticImports(source: string, specifier: string): string[] {
  const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`^[ \\t]*import\\s+(?!type\\b)[^;\\n]*from\\s*['"]${escaped}['"]`, 'gm'),
    new RegExp(`^[ \\t]*import\\s*\\(?\\s*['"]${escaped}['"]`, 'gm'),
    new RegExp(`^[ \\t]*export\\s+[^;\\n]*from\\s*['"]${escaped}['"]`, 'gm'),
  ];
  return patterns.flatMap((pattern) => source.match(pattern) ?? []);
}

describe('pivot-table unified lazy-loading guard (pivot-renderer-definitions is the host registration path)', () => {
  it('registers via createLazyRendererComponent + dynamic import of pivot-renderer', async () => {
    const source = await readSource('pivot-renderer-definitions.ts');
    expect(source).toContain('createLazyRendererComponent');
    expect(source).toContain("import('./pivot-renderer.js')");
  });

  it('has no static import of @visactor/vtable or the renderer implementation module', async () => {
    const source = await readSource('pivot-renderer-definitions.ts');
    for (const specifier of ['@visactor/vtable', './pivot-renderer.js']) {
      expect(findStaticImports(source, specifier), `static import of ${specifier}`).toEqual([]);
    }
  });

  it('package entry has no static edge to the vtable renderer implementation', async () => {
    const source = await readSource('index.ts');
    for (const specifier of ['@visactor/vtable', './pivot-renderer.js']) {
      expect(findStaticImports(source, specifier), `static import of ${specifier}`).toEqual([]);
    }
  });
});
