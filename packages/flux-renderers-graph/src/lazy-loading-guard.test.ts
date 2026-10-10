import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 统一延迟加载守护（源级）：宿主注册路径（graph-definitions.ts）不得静态 import
 * @xyflow/react / dagre 或 renderer 实现模块——只能经 `import('./graph-renderer.js')`
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

describe('graph unified lazy-loading guard (graph-definitions is the host registration path)', () => {
  it('registers via createLazyRendererComponent + dynamic import of graph-renderer', async () => {
    const source = await readSource('graph-definitions.ts');
    expect(source).toContain('createLazyRendererComponent');
    expect(source).toContain("import('./graph-renderer.js')");
  });

  it('has no static import of @xyflow/react, dagre, or the renderer implementation modules', async () => {
    const source = await readSource('graph-definitions.ts');
    for (const specifier of ['@xyflow/react', 'dagre', './graph-renderer.js', './xyflow-canvas.js']) {
      expect(findStaticImports(source, specifier), `static import of ${specifier}`).toEqual([]);
    }
  });

  it('package entry has no static edge to the graph canvas implementation', async () => {
    const source = await readSource('index.ts');
    for (const specifier of ['@xyflow/react', 'dagre', './graph-renderer.js', './xyflow-canvas.js']) {
      expect(findStaticImports(source, specifier), `static import of ${specifier}`).toEqual([]);
    }
  });
});
