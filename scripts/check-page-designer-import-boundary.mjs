import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');

// design-architecture.md §10.2（L6 S1 终裁，roadmap 登记册 A-9）：page-designer 两包的
// import 图中禁止出现六域设计器内部模块——import 即越界。豁免表预留、缺省零豁免；
// 任何豁免必须逐项登记并给出决策引用（先例：check-oversized-code-files.mjs 的
// OVERSIZED_EXEMPTIONS）。注意：本 gate 只扫 import 语句面（from / import() /
// import / require），page-designer-core classify.ts 中六域包名的字符串字面量
// （sourcePackage 兜底数据）不是 import，不在扫描语义内。
const SCANNED_PREFIXES = [
  'packages/page-designer-core/src/',
  'packages/page-designer-renderers/src/',
];
const codeExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const FORBIDDEN_PACKAGES = new Set([
  '@nop-chaos/flow-designer-core',
  '@nop-chaos/flow-designer-renderers',
  '@nop-chaos/report-designer-core',
  '@nop-chaos/report-designer-renderers',
  '@nop-chaos/spreadsheet-core',
  '@nop-chaos/spreadsheet-renderers',
  '@nop-chaos/flux-print-core',
  '@nop-chaos/flux-print-renderers',
  '@nop-chaos/flux-renderers-industrial',
]);
const FORBIDDEN_PACKAGE_PREFIXES = ['@nop-chaos/word-editor-'];
const OVERSIZED_EXEMPTIONS = [];
const exemptSpecifiers = new Set(OVERSIZED_EXEMPTIONS.map((entry) => entry.specifier));

const importPattern = /(?:from\s+|import\s*\(\s*|import\s+|require\(\s*)['"]([^'"]+)['"]/g;

function isScanned(filePath) {
  return (
    SCANNED_PREFIXES.some((prefix) => filePath.startsWith(prefix)) &&
    codeExtensions.has(path.extname(filePath))
  );
}

async function getScannedFiles() {
  // Untracked sources are merged in (manifest-deps 先例)：包拆分/迁移中间态的
  // 未提交越界 import 必须本地即红，而不是等到 CI。
  const [tracked, untracked] = await Promise.all([
    execFileAsync('git', ['ls-files'], { cwd: rootDir, maxBuffer: 10 * 1024 * 1024 }),
    execFileAsync('git', ['ls-files', '--others', '--exclude-standard'], {
      cwd: rootDir,
      maxBuffer: 10 * 1024 * 1024,
    }),
  ]);

  const seen = new Set();
  const files = [];
  for (const line of [...tracked.stdout.split(/\r?\n/), ...untracked.stdout.split(/\r?\n/)]) {
    const filePath = line.trim();
    if (!filePath || seen.has(filePath) || !isScanned(filePath)) continue;
    seen.add(filePath);
    files.push(filePath);
  }
  return files;
}

function isForbiddenSpecifier(specifier) {
  if (!specifier.startsWith('@nop-chaos/')) return false;
  // 归一化到包名（前两段），使 `@nop-chaos/flux-renderers-industrial/editor`
  // 等子路径导入同样命中（§10.2「含 /editor 子路径」）。
  const parts = specifier.split('/');
  const pkg = parts.slice(0, 2).join('/');
  if (FORBIDDEN_PACKAGES.has(pkg)) return true;
  return FORBIDDEN_PACKAGE_PREFIXES.some((prefix) => pkg.startsWith(prefix));
}

async function main() {
  const files = await getScannedFiles();
  const violations = [];

  for (const filePath of files) {
    let content;
    try {
      content = await readFile(path.join(rootDir, filePath), 'utf8');
    } catch {
      continue;
    }
    for (const match of content.matchAll(importPattern)) {
      const specifier = match[1];
      if (isForbiddenSpecifier(specifier) && !exemptSpecifiers.has(specifier)) {
        violations.push({ filePath, specifier });
      }
    }
  }

  if (violations.length > 0) {
    console.error(
      `[check-page-designer-import-boundary] ERROR: ${violations.length} six-domain import violation(s) in page-designer sources (design-architecture §10.2):`,
    );
    for (const item of violations) {
      console.error(`  - ${item.filePath}: ${item.specifier}`);
    }
    process.exit(1);
  }

  console.log(
    `[check-page-designer-import-boundary] page-designer import boundary clean (${SCANNED_PREFIXES.length} packages, ${files.length} files scanned)`,
  );
}

main().catch((error) => {
  console.error('[check-page-designer-import-boundary] Error:', error);
  process.exit(1);
});
