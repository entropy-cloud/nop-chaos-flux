import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// plan 481 视觉质量守卫（477 先例：report-field-panel-css.test.ts）。
//
// ①「禁新增字面 hex / 禁新增语义色类（blue/red/green/amber 等色相类）」——
//   枚举修复面逐文件清零口径（review 三轮共识）：只断言本 plan 枚举的修复面
//   文件；未列入修复面的残余不在此断言面内（如需豁免走 ALLOWLIST 显式登记）。
//   对修复前代码为红（Proof 先红）。
// ②全包中性灰（gray/slate/zinc/neutral/stone）utility 计数不高于落地基线
//   （禁新增）。基线为本 plan 落地后的实count，只允许下降不允许回弹。
//
// allowlist 常驻登记（变更需随证据卡 docs/audits/visual-quality/scheduling.md 同步）：
// - barcode-input/**  恒暗表面设计族（R9 watch-only）
// - calendar/utils/calendar-print.css  打印介质白底（R12 watch-only）
// - calendar/hooks/use-calendar-export.ts / kanban/utils/kanban-export.ts  导出白底（R10 watch-only）
const SRC_DIR = import.meta.dirname;

const HEX_LITERAL = /#[0-9a-fA-F]{3,8}\b/g;
// Tailwind 色相类（含 hover:/focus: 等前缀命中、/透明度修饰）；white/black 同属
// 字面语义色（R8/R11 家族），muted/primary/destructive 等 token 类不在禁用列。
const HUE_CLASS = /\b(?:bg|text|border|ring|fill|stroke|from|to|via|divide|outline|decoration|accent|caret|shadow)-(?:red|blue|green|amber|yellow|orange|purple|violet|pink|rose|emerald|teal|cyan|sky|indigo|fuchsia|lime|white|black)(?:-\d{2,3})?(?:\/\d{1,3})?\b/g;
const NEUTRAL_CLASS = /\b(?:bg|text|border|ring|divide|outline|decoration|placeholder|accent|caret|from|to|via|shadow)-(?:gray|slate|zinc|neutral|stone)-\d{2,3}(?:\/\d{1,3})?\b/g;

const ALLOWLIST: Array<{ file: string; reason: string }> = [
  { file: 'barcode-input/', reason: 'R9 barcode-scanner-overlay 恒暗表面设计族（watch-only 常驻）' },
  { file: 'calendar/utils/calendar-print.css', reason: 'R12 打印介质固定白底（watch-only 常驻）' },
  { file: 'calendar/hooks/use-calendar-export.ts', reason: 'R10 导出介质固定白底 #ffffff（watch-only 常驻）' },
  { file: 'kanban/utils/kanban-export.ts', reason: 'R10 导出介质固定白底 #ffffff（watch-only 常驻）' },
  // 未列残余显式登记：data 驱动 tag 色 chip 上的 text-white —— 用户自选底色的
  // 对比度语义，无 token 可替（R9 barcode 恒暗白字同族判例，watch-only）。
  { file: 'kanban/components/kanban-tag-filter.tsx', reason: '数据驱动 tag 色上的对比度白字（R9 同族 watch-only 常驻）' },
];

// plan 481 枚举修复面（Scope + Fix 行点名文件；行号以 2026-09-21 master 为基线）。
// gantt-layout / kanban-toolbar / kanban-column / kanban-card-tags / kanban-tag-filter
// 为执行轮「未列残余」显式纳入断言面（前三者已 token 化清零，tag-filter 走 allowlist）。
const FIX_FACE: Record<'gantt' | 'calendar' | 'kanban', string[]> = {
  gantt: [
    'gantt/gantt-bars.tsx',
    'gantt/gantt-grid.tsx',
    'gantt/gantt-cellgrid.tsx',
    'gantt/gantt-layout.tsx',
    'gantt/components/baseline-bars.tsx',
    'gantt/gantt-markers.tsx',
    'gantt/hooks/use-gantt-link-draw.ts',
    'gantt/hooks/use-gantt-drag.ts',
    'gantt/gantt.css',
  ],
  calendar: [
    'calendar/calendar.css',
    'calendar/calendar.tsx',
    'calendar/components/calendar-event-block.tsx',
    'calendar/components/calendar-month-view.tsx',
    'calendar/components/calendar-week-view.tsx',
    'calendar/components/calendar-day-view.tsx',
    'calendar/utils/calendar-cross-day-lines.ts',
  ],
  kanban: [
    'kanban/kanban-column-header.tsx',
    'kanban/components/kanban-column-adder.tsx',
    'kanban/kanban-card.tsx',
    'kanban/kanban-column.tsx',
    'kanban/components/kanban-toolbar.tsx',
    'kanban/components/kanban-card-tags.tsx',
  ],
};

// 落地基线：plan 481 落地后全包中性灰 utility 实count（修复前 59，只降不升）。
const NEUTRAL_GRAY_BASELINE = 30;

function isAllowlisted(rel: string): boolean {
  return ALLOWLIST.some((entry) => rel.startsWith(entry.file));
}

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name.endsWith('.test.ts') || name.endsWith('.test.tsx')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listSourceFiles(full));
    else if (/\.(ts|tsx|css)$/.test(name)) out.push(full);
  }
  return out;
}

function scan(file: string, regexes: RegExp[]): string[] {
  const src = readFileSync(join(SRC_DIR, file), 'utf8');
  const hits: string[] = [];
  for (const regex of regexes) {
    for (const match of src.matchAll(regex)) hits.push(match[0]);
  }
  return hits;
}

describe('scheduling visual token discipline guard (plan 481)', () => {
  describe('① enumerated fix face — zero literal hex / hue color classes per file', () => {
    for (const [group, files] of Object.entries(FIX_FACE)) {
      it(`${group} fix face is clean`, () => {
        const violations: string[] = [];
        for (const file of files) {
          if (isAllowlisted(file)) continue;
          const hits = scan(file, [HEX_LITERAL, HUE_CLASS]);
          if (hits.length > 0) violations.push(`${file}: ${hits.join(', ')}`);
        }
        expect(violations, violations.join('\n')).toEqual([]);
      });
    }
  });

  describe('② whole-package neutral gray utility count (no additions)', () => {
    it(`count stays at or below landed baseline (${NEUTRAL_GRAY_BASELINE})`, () => {
      const all = listSourceFiles(SRC_DIR).map((f) => relative(SRC_DIR, f).split('\\').join('/'));
      let count = 0;
      for (const file of all) {
        if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) continue;
        count += scan(file, [NEUTRAL_CLASS]).length;
      }
      expect(count).toBeLessThanOrEqual(NEUTRAL_GRAY_BASELINE);
    });
  });
});
