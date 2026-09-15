import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// E1.1 类型隔离约束的自动化守卫（E5.1）：echarts 的运行时与类型符号只允许
// 出现在 echarts-setup.ts（官方 tree-shaking 入口集中注册）与 echarts-renderer.tsx
// （type-only + 动态 ./echarts-setup.js import）的实现内部——保证 optional peer
// 缺失时不破坏消费方 .d.ts 解析链、静态可达模块（schema/validator/定义/barrel）
// 不把 echarts 拖进默认渲染路径。
const ECHARTS_IMPORT_PATTERN =
  /from\s+['"]echarts|import\s*\(\s*['"]echarts|import\s+['"]echarts/;

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listTsFiles(full));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const srcDir = join(import.meta.dirname, '..');

describe('echarts import isolation guard', () => {
  it("keeps 'echarts' imports out of every module except echarts-setup.ts and echarts-renderer.tsx", () => {
    const violations: Array<{ file: string; line: number; text: string }> = [];
    for (const file of listTsFiles(srcDir)) {
      if (file.endsWith('echarts-setup.ts')) {
        continue;
      }
      if (file.endsWith('echarts-renderer.tsx')) {
        continue;
      }
      const content = readFileSync(file, 'utf8');
      const lines = content.split('\n');
      lines.forEach((text, index) => {
        if (ECHARTS_IMPORT_PATTERN.test(text)) {
          violations.push({ file, line: index + 1, text: text.trim() });
        }
      });
    }
    expect(
      violations.map((v) => `${v.file}:${v.line}: ${v.text}`),
    ).toEqual([]);
  });

  it('keeps echarts-renderer.tsx free of runtime echarts imports (type-only and setup-module dynamic import only)', () => {
    const content = readFileSync(join(srcDir, 'echarts-renderer.tsx'), 'utf8');
    const lines = content.split('\n');
    const runtimeEchartsImports = lines.filter(
      (line) =>
        !/^\s*import\s+type\b/.test(line) &&
        ECHARTS_IMPORT_PATTERN.test(line.replace("import('./echarts-setup.js')", '')),
    );
    expect(runtimeEchartsImports).toEqual([]);
  });
});
