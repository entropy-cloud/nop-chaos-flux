import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 统一延迟加载守护（源级）：宿主注册路径（renderer-definitions.ts / index.ts 的
 * `registerScadaRenderers`）不得静态 import leafer 或 renderer/engine/symbols 实现模块——
 * 只能经 `scada-canvas-lazy.ts` 的 `import('./renderer/scada-canvas.js')` 异步装载
 * （flux-react `createLazyRendererComponent`，图元注册随同一 chunk）。
 * index.ts 对 `registerScadaSymbols` 的 `export ... from` 是面向 designer-host 的公共面
 * （SCADA_EDITOR_DEMO_RECIPE 显式消费），不属于注册路径，豁免；守卫的是 import 语句。
 * `import type` 编译期擦除，不算边。
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

describe('scada-canvas unified lazy-loading guard', () => {
  it('definitions delegate the component to the lazy wrapper (scada-canvas-lazy)', async () => {
    const source = await readSource('renderer-definitions.ts');
    expect(source).toContain("LazyScadaCanvasRenderer } from './scada-canvas-lazy.js'");
    expect(source).toContain('component: LazyScadaCanvasRenderer');
  });

  it('renderer-definitions has no static import of leafer or the renderer/engine/symbols modules', async () => {
    const source = await readSource('renderer-definitions.ts');
    for (const specifier of [
      'leafer-ui',
      '@leafer-in/editor',
      '@leafer-in/viewport',
      './renderer/scada-canvas.js',
      './engine/scada-engine.js',
      './symbols/register-builtin.js',
    ]) {
      expect(findStaticImports(source, specifier), `static import of ${specifier}`).toEqual([]);
    }
  });

  it('scada-canvas-lazy composes symbol registration into the chunk load path', async () => {
    const source = await readSource('scada-canvas-lazy.ts');
    expect(source).toContain('createLazyRendererComponent');
    expect(source).toContain("import('./symbols/register-builtin.js')");
    expect(source).toContain('registerScadaSymbols');
  });

  it('index.ts registerScadaRenderers no longer statically imports register-builtin (eager call removed)', async () => {
    const source = await readSource('index.ts');
    expect(source).not.toMatch(/^[ \t]*import\s+\{[^}]*registerScadaSymbols[^}]*\}\s+from\s+['"]\.\/symbols\/register-builtin\.js['"]/m);
  });
});
