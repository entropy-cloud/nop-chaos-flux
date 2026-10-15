#!/usr/bin/env node
/**
 * Designer contract conformance guard（P5.1，plan 560；editor-designer-standard.md §2 八层契约）。
 *
 * 只做契约存在性与一致性断言（文件/字符串级，非视觉）。豁免家族按
 * editor-designer-standard.md §5.2 豁免登记表分档检查（EXEMPTIONS 为该表机器镜像，
 * 表变更时同步；断言 8 校验两处对齐）。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// plan 538：可选 `--root <dir>`（fixtures 判别用，缺省 live repo）与 `--families <id,...>`（家族子集）。
// 无参调用行为与参数化前逐字节等价。
function parseArgs(argv) {
  const args = { root: join(import.meta.dirname, '..'), families: null };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--root') {
      args.root = resolve(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--families') {
      args.families = argv[i + 1].split(',').map((id) => id.trim());
      i += 1;
    }
  }
  return args;
}
const { root: ROOT, families: FAMILIES_FILTER } = parseArgs(process.argv);

// editor-designer-standard.md §5.2 豁免登记表机器镜像（该表变更时同步）。
// 值 = 豁免的标准 §2 层号。
const EXEMPTIONS = {
  flow: ['2.1'], // 裁决①：自研 history
  page: ['2.2', '2.3', '2.4', '2.7'], // 裁决②：隔离架构
  print: ['2.2', '2.3', '2.4', '2.7'], // 裁决②：独立组件
};

// plan 538：family mapping 声明有侧板的家族（designer-workbench-shell.md Family Mapping 节，
// 含该节硬化条款）必须接线 WorkbenchShell collapsed 契约；spreadsheet（无侧板）/page/print
// （豁免②隔离架构）不在此列。
const COLLAPSED_WIRED_FAMILIES = new Set(['flow', 'report', 'word', 'scada', 'dashboard']);

// 档位标定（P0-P4 落地后的 conformed baseline；editor-designer-standard.md §2.6 裁定④ + §3 基线）：
// - fields 内联事件契约断言仅适用推送事件家族（dashboard/scada/word）；pull 型（flow/page/report/spreadsheet）
//   经命令面 + statusPath 满足（§2.6 裁定④），print 为豁免② props 契约档。
//   RM-5（plan 607）后事件契约单源为 fields `kind: 'event'` 条目（带 contract 载体），
//   门禁锚随之重锚：`kind: 'event'` 声明 + `payload:` 载体双锚（旧 `eventContracts` 字面锚随字段删除失效）。
// - word 内核 = canvas-editor 引擎（roadmap §3 基线 ✗，未列迁移项）→ needsEditorCore: false。
const FAMILIES = [
  { family: 'flow', renderers: 'packages/flow-designer-renderers', core: 'packages/flow-designer-core', needsManifest: true, needsEditorCore: false, needsEventContracts: false, i18nPrefix: 'flux.flowDesigner' },
  { family: 'page', renderers: 'packages/page-designer-renderers', core: 'packages/page-designer-core', needsManifest: false, needsEditorCore: false, needsEventContracts: false, i18nPrefix: 'flux.pageDesigner' },
  { family: 'report', renderers: 'packages/report-designer-renderers', core: 'packages/report-designer-core', needsManifest: true, needsEditorCore: true, needsEventContracts: false, i18nPrefix: 'flux.reportDesigner' },
  { family: 'spreadsheet', renderers: 'packages/spreadsheet-renderers', core: 'packages/spreadsheet-core', needsManifest: true, needsEditorCore: true, needsEventContracts: false, i18nPrefix: 'flux.spreadsheet' },
  { family: 'word', renderers: 'packages/word-editor-renderers', core: 'packages/word-editor-core', needsManifest: true, needsEditorCore: false, needsEventContracts: true, i18nPrefix: 'flux.wordEditor' },
  { family: 'scada', renderers: 'packages/flux-renderers-industrial', core: 'packages/flux-renderers-industrial', needsManifest: true, needsEditorCore: true, needsEventContracts: true, i18nPrefix: 'industrial.scada' },
  { family: 'dashboard', renderers: 'packages/flux-renderers-dashboard', core: 'packages/flux-renderers-dashboard', needsManifest: true, needsEditorCore: true, needsEventContracts: true, i18nPrefix: 'flux.dashboard' },
  { family: 'print', renderers: 'packages/flux-print-renderers', core: 'packages/flux-print-core', needsManifest: false, needsEditorCore: false, needsEventContracts: false, i18nPrefix: 'flux.print' },
];

const EXCLUDED = /(\.test\.|__tests__|node_modules|dist[/\\])/;

function dirContains(dir, needle) {
  if (!existsSync(dir)) return false;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (EXCLUDED.test(full)) continue;
    if (entry.isDirectory()) {
      if (dirContains(full, needle)) return true;
    } else if (/\.(ts|tsx|json|css)$/.test(entry.name) && readFileSync(full, 'utf8').includes(needle)) {
      return true;
    }
  }
  return false;
}

const failures = [];

function assertCheck(family, label, ok) {
  if (!ok) failures.push(`[${family}] ${label}`);
}

for (const f of FAMILIES) {
  if (FAMILIES_FILTER && !FAMILIES_FILTER.includes(f.family)) continue;
  const exempt = EXEMPTIONS[f.family] ?? [];
  const renderersSrc = join(ROOT, f.renderers, 'src');
  const coreSrc = join(ROOT, f.core, 'src');
  const corePkg = join(ROOT, f.core, 'package.json');

  // 1. manifest 存在
  if (f.needsManifest && !exempt.includes('2.3')) {
    assertCheck(f.family, 'manifest V1 存在', dirContains(join(ROOT, f.renderers), 'MANIFEST_V1'));
  }

  // 2. 事件有 fields 内联契约（仅推送事件家族；pull 型经命令面+statusPath，§2.6 裁定④）
  // RM-5（plan 607）重锚：fields kind:'event' 声明 + contract payload 载体双锚，
  // 保证语义“该 family 声明了事件契约”（裸 event 条目不满足 payload 锚）。
  if (f.needsEventContracts) {
    assertCheck(
      f.family,
      '事件契约声明存在（fields kind:event + contract payload）',
      dirContains(renderersSrc, "kind: 'event'") && dirContains(renderersSrc, 'payload:'),
    );
  }

  // 3. statusPath 发布
  if (!exempt.includes('2.4')) {
    assertCheck(
      f.family,
      'statusPath 发布（useStatusPathPublication）',
      dirContains(renderersSrc, 'useStatusPathPublication'),
    );
  }

  // 4. 内核来源 + 5. editor-core 消费（word 内核=canvas-editor 引擎，roadmap §3 基线未列迁移）
  if (f.needsEditorCore) {
    const pkg = existsSync(corePkg) ? readFileSync(corePkg, 'utf8') : '';
    assertCheck(f.family, 'editor-core 依赖（内核来源）', pkg.includes('@nop-chaos/editor-core'));
    assertCheck(
      f.family,
      'editor-core 消费（import 面）',
      dirContains(coreSrc, '@nop-chaos/editor-core') || dirContains(renderersSrc, '@nop-chaos/editor-core'),
    );
  }

  // 6. i18n 键前缀（键完整性归 check:i18n-keys，不重复）
  assertCheck(
    f.family,
    `i18n 键前缀 ${f.i18nPrefix}.*`,
    dirContains(renderersSrc, `${f.i18nPrefix}.`) || dirContains(coreSrc, `${f.i18nPrefix}.`),
  );

  // 7. marker 规范（nop-<family> 或既有 data-slot 契约存在性）
  assertCheck(
    f.family,
    'marker 规范（nop-<family>/data-slot）',
    dirContains(renderersSrc, `nop-${f.family}`) ||
      dirContains(coreSrc, `nop-${f.family}`) ||
      dirContains(renderersSrc, 'data-slot'),
  );

  // 9. collapsed 契约接线（plan 538；designer-workbench-shell.md Family Mapping 硬化条款）：
  // 有侧板家族的 renderers 必须含 onLeftToggle/onRightToggle 接线（resize-only 不合规）。
  // 仅当 renderers 目录存在于扫描 root 时断言（live 恒存在；fixtures 子集树不误报缺席家族）。
  if (COLLAPSED_WIRED_FAMILIES.has(f.family) && existsSync(join(ROOT, f.renderers))) {
    assertCheck(f.family, 'collapsed 契约接线（onLeftToggle）', dirContains(renderersSrc, 'onLeftToggle'));
    assertCheck(f.family, 'collapsed 契约接线（onRightToggle）', dirContains(renderersSrc, 'onRightToggle'));
  }
}

// 8. 豁免表对齐（守卫 EXEMPTIONS 家族集合 ⊆ 标准文档 §5.2 登记行集合）。
// 标准 doc 在 fixtures 子集 root 下不存在 → 跳过该对账（live 恒存在，保证不变）。
const standardPath = join(ROOT, 'docs', 'architecture', 'editor-designer-standard.md');
if (existsSync(standardPath)) {
  const standard = readFileSync(standardPath, 'utf8');
  const sectionStart = standard.indexOf('### 5.2 豁免登记表');
  const sectionEnd = standard.indexOf('## 6.', sectionStart);
  const registrySection = standard.slice(sectionStart, sectionEnd);
  for (const family of Object.keys(EXEMPTIONS)) {
    assertCheck('exemptions', `豁免表登记：${family}`, registrySection.includes(`| ${family}`));
  }
}

if (failures.length > 0) {
  console.error(`[check-designer-conformance] ${failures.length} contract gap(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('[check-designer-conformance] all designer contract conformance checks passed');
