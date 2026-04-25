import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');

const ignoredPathParts = ['dist/', 'node_modules/', 'coverage/', 'test-results/', '.turbo/', '.opencode/'];
const rootPrefixes = ['apps/', 'packages/', 'scripts/', 'tests/', 'docs/'];

const CODE_EXT = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript (React)',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript (React)',
  '.mjs': 'JavaScript (ESM)',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.json': 'JSON',
  '.md': 'Markdown',
  '.html': 'HTML',
  '.svg': 'SVG',
  '.sh': 'Shell',
  '.py': 'Python',
};

const CODE_ONLY_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css', '.scss']);

function isTracked(filePath) {
  if (!rootPrefixes.some(p => filePath.startsWith(p))) return false;
  if (ignoredPathParts.some(p => filePath.includes(p))) return false;
  return true;
}

async function getFiles() {
  const { stdout } = await execFileAsync('git', ['ls-files'], { cwd: rootDir, maxBuffer: 20 * 1024 * 1024 });
  return stdout.split('\n').filter(Boolean).filter(isTracked);
}

function countLines(content) {
  const lines = content.split('\n');
  const total = lines.length;
  let blank = 0;
  let comment = 0;
  let inBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') { blank++; continue; }
    if (inBlock) {
      comment++;
      if (trimmed.includes('*/')) inBlock = false;
      continue;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      comment++;
      if (trimmed.startsWith('/*') && !trimmed.includes('*/')) {
        inBlock = true;
      }
      continue;
    }
    if (trimmed.startsWith('#') || trimmed.startsWith('<!--')) {
      comment++;
      continue;
    }
  }

  return { total, blank, comment, code: total - blank - comment };
}

function getPackage(filePath) {
  const match = filePath.match(/^(apps|packages)\/([^/]+)/);
  return match ? `${match[1]}/${match[2]}` : filePath.split('/')[0];
}

function isTestFile(filePath) {
  return filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__');
}

function isE2eFile(filePath) {
  return filePath.includes('.spec.') || filePath.startsWith('tests/e2e');
}

function analyzeTsComplexity(content, filePath) {
  const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
  const patterns = [
    { re: /\bfunction\s+\w+/g, kind: 'function' },
    { re: /\bconst\s+\w+\s*=\s*(\([^)]*\)|[a-zA-Z_]\w*)\s*=>/g, kind: 'arrow' },
    { re: /\bconst\s+\w+\s*=\s*function/g, kind: 'function-expr' },
  ];

  if (isTsx) {
    patterns.push(
      { re: /\bexport\s+default\s+function\s+\w+/g, kind: 'component' },
      { re: /\bfunction\s+\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\{[^]*?return\s*[(<]/g, kind: 'component' },
    );
  }

  let functionCount = 0;
  for (const { re } of patterns) {
    const matches = content.match(re);
    if (matches) functionCount += matches.length;
  }

  const lines = content.split('\n');
  let codeLineCount = 0;
  for (const line of lines) {
    const t = line.trim();
    if (t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')) codeLineCount++;
  }

  const branches = (content.match(/\bif\s*\(/g) || []).length
    + (content.match(/\belse\s+if\b/g) || []).length
    + (content.match(/\bswitch\s*\(/g) || []).length
    + (content.match(/\bcase\s+/g) || []).length
    + (content.match(/\?\s*.+\s*:/g) || []).length;

  const loops = (content.match(/\bfor\s*\(/g) || []).length
    + (content.match(/\bwhile\s*\(/g) || []).length
    + (content.match(/\bfor await/g) || []).length
    + (content.match(/\.\w+\(/g) || []).length;

  const imports = (content.match(/^import\s/gm) || []).length;
  const exports = (content.match(/^export\s/gm) || []).length;

  return { functionCount, codeLines: codeLineCount, branches, loops, imports, exports };
}

function formatNumber(n) {
  return n.toLocaleString('en-US');
}

function bar(value, max, width = 30) {
  const filled = max > 0 ? Math.round((value / max) * width) : 0;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(width - filled);
}

function printSection(title) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(70));
}

async function main() {
  const files = await getFiles();
  console.log(`\n  nop-chaos-flux Code Statistics`);
  console.log(`  Generated: ${new Date().toISOString().slice(0, 10)}`);
  console.log(`  Tracked files analyzed: ${formatNumber(files.length)}`);

  const packageData = new Map();
  const langData = new Map();
  let totalLoc = 0, totalBlank = 0, totalComment = 0, totalCode = 0;
  let srcFiles = 0, testFiles = 0, otherFiles = 0;
  let srcCode = 0, testCode = 0, srcLoc = 0, testLoc = 0;
  let unitFiles = 0, unitCode = 0, unitLoc = 0;
  let e2eFiles = 0, e2eCode = 0, e2eLoc = 0;
  const docsCategories = new Map();
  let docsTotalFiles = 0, docsTotalLoc = 0;
  const complexityAcc = { functionCount: 0, codeLines: 0, branches: 0, loops: 0, imports: 0, exports: 0 };
  const packageComplexity = new Map();
  const fileSizes = [];

  for (const filePath of files) {
    const ext = path.extname(filePath);
    const lang = CODE_EXT[ext];
    if (!lang) continue;

    let content;
    try {
      content = await readFile(path.join(rootDir, filePath), 'utf-8');
    } catch {
      continue;
    }

    const lc = countLines(content);
    const pkg = getPackage(filePath);
    const isTest = isTestFile(filePath);
    const isE2e = isE2eFile(filePath);

    if (!packageData.has(pkg)) {
      packageData.set(pkg, {
        files: 0, loc: 0, blank: 0, comment: 0, code: 0,
        srcFiles: 0, testFiles: 0, otherFiles: 0, langs: new Map(),
      });
    }
    const pd = packageData.get(pkg);
    pd.files++;
    pd.loc += lc.total;
    pd.blank += lc.blank;
    pd.comment += lc.comment;
    pd.code += lc.code;
    if (isTest) pd.testFiles++;
    else if (CODE_ONLY_EXT.has(ext)) pd.srcFiles++;
    else pd.otherFiles++;

    const langKey = lang;
    if (!pd.langs.has(langKey)) pd.langs.set(langKey, { files: 0, code: 0 });
    pd.langs.get(langKey).files++;
    pd.langs.get(langKey).code += lc.code;

    if (!langData.has(langKey)) langData.set(langKey, { files: 0, loc: 0, blank: 0, comment: 0, code: 0 });
    const ld = langData.get(langKey);
    ld.files++;
    ld.loc += lc.total;
    ld.blank += lc.blank;
    ld.comment += lc.comment;
    ld.code += lc.code;

    totalLoc += lc.total;
    totalBlank += lc.blank;
    totalComment += lc.comment;
    totalCode += lc.code;

    if (isTest) testFiles++;
    else if (CODE_ONLY_EXT.has(ext)) srcFiles++;
    else otherFiles++;

    if (isTest) { testCode += lc.code; testLoc += lc.total; }
    else if (CODE_ONLY_EXT.has(ext)) { srcCode += lc.code; srcLoc += lc.total; }

    if (isTest && isE2e) { e2eFiles++; e2eCode += lc.code; e2eLoc += lc.total; }
    else if (isTest) { unitFiles++; unitCode += lc.code; unitLoc += lc.total; }

    if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx' || ext === '.mjs') {
      const cx = analyzeTsComplexity(content, filePath);
      complexityAcc.functionCount += cx.functionCount;
      complexityAcc.codeLines += cx.codeLines;
      complexityAcc.branches += cx.branches;
      complexityAcc.loops += cx.loops;
      complexityAcc.imports += cx.imports;
      complexityAcc.exports += cx.exports;

      if (!packageComplexity.has(pkg)) {
        packageComplexity.set(pkg, { functionCount: 0, codeLines: 0, branches: 0, imports: 0, exports: 0, files: 0 });
      }
      const pc = packageComplexity.get(pkg);
      pc.functionCount += cx.functionCount;
      pc.codeLines += cx.codeLines;
      pc.branches += cx.branches;
      pc.imports += cx.imports;
      pc.exports += cx.exports;
      pc.files++;
    }

    if (filePath.startsWith('docs/') && ext === '.md') {
      const parts = filePath.split('/');
      const category = parts.length > 2 ? parts[1] : 'root';
      if (!docsCategories.has(category)) {
        docsCategories.set(category, { files: 0, loc: 0, code: 0 });
      }
      const dc = docsCategories.get(category);
      dc.files++;
      dc.loc += lc.total;
      dc.code += lc.code;
      docsTotalFiles++;
      docsTotalLoc += lc.total;
    }

    fileSizes.push({ path: filePath, loc: lc.total, code: lc.code, ext });
  }

  printSection('Overall Summary');
  console.log(`
  Total files        : ${formatNumber(files.length)}
  Source files (code) : ${formatNumber(srcFiles)}
  Test files          : ${formatNumber(testFiles)}
  Other files         : ${formatNumber(otherFiles)}

  Total lines         : ${formatNumber(totalLoc)}
  Code lines          : ${formatNumber(totalCode)} (${(totalCode / totalLoc * 100).toFixed(1)}%)
  Comment lines       : ${formatNumber(totalComment)} (${(totalComment / totalLoc * 100).toFixed(1)}%)
  Blank lines         : ${formatNumber(totalBlank)} (${(totalBlank / totalLoc * 100).toFixed(1)}%)

  Test-to-source ratio: ${srcFiles > 0 ? (testFiles / srcFiles).toFixed(2) : 'N/A'}
  Avg LOC per file    : ${(totalLoc / files.length).toFixed(1)}
  Avg code per file   : ${(totalCode / files.length).toFixed(1)}

  ── Test vs Source ──────────────────────────────────────
                        Files       LOC      Code
  Source files        : ${formatNumber(srcFiles).padStart(5)}  ${formatNumber(srcLoc).padStart(9)}  ${formatNumber(srcCode).padStart(9)}
  Unit test files     : ${formatNumber(unitFiles).padStart(5)}  ${formatNumber(unitLoc).padStart(9)}  ${formatNumber(unitCode).padStart(9)}
  E2E test files      : ${formatNumber(e2eFiles).padStart(5)}  ${formatNumber(e2eLoc).padStart(9)}  ${formatNumber(e2eCode).padStart(9)}
  All test files      : ${formatNumber(testFiles).padStart(5)}  ${formatNumber(testLoc).padStart(9)}  ${formatNumber(testCode).padStart(9)}

  Unit/Source (code)  : ${srcCode > 0 ? (unitCode / srcCode).toFixed(2) : 'N/A'}
  E2E/Source  (code)  : ${srcCode > 0 ? (e2eCode / srcCode).toFixed(2) : 'N/A'}
  All/Source  (code)  : ${srcCode > 0 ? (testCode / srcCode).toFixed(2) : 'N/A'}

  ── Documentation ───────────────────────────────────────
  ${'Category'.padEnd(18)} ${'Files'.padStart(6)} ${'LOC'.padStart(8)} ${'Size (est.)'.padStart(12)}
  ${'─'.repeat(48)}
${[...docsCategories.entries()]
    .sort((a, b) => b[1].loc - a[1].loc)
    .map(([cat, d]) => {
      const kb = Math.round(d.loc * 45 / 1024);
      const sizeStr = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${formatNumber(kb)} KB`;
      return `  ${cat.padEnd(18)} ${formatNumber(d.files).padStart(6)} ${formatNumber(d.loc).padStart(8)} ${sizeStr.padStart(12)}`;
    })
    .join('\n')}
  ${'─'.repeat(48)}
  ${'TOTAL'.padEnd(18)} ${formatNumber(docsTotalFiles).padStart(6)} ${formatNumber(docsTotalLoc).padStart(8)} ${formatNumber(Math.round(docsTotalLoc * 45 / 1024)).padStart(10)} KB
  Docs/Source (LOC)  : ${srcLoc > 0 ? (docsTotalLoc / srcLoc).toFixed(2) : 'N/A'}`);

  printSection('By Language');
  const langRows = [...langData.entries()]
    .sort((a, b) => b[1].code - a[1].code)
    .map(([lang, d]) => ({ lang, ...d }));
  const maxLangCode = Math.max(...langRows.map(r => r.code));

  console.log(`
  ${'Language'.padEnd(22)} ${'Files'.padStart(7)} ${'LOC'.padStart(9)} ${'Code'.padStart(9)} ${'Comment'.padStart(9)} ${'Blank'.padStart(9)}  Distribution`);
  console.log('  ' + '-'.repeat(95));
  for (const r of langRows) {
    console.log(
      `  ${r.lang.padEnd(22)} ${formatNumber(r.files).padStart(7)} ${formatNumber(r.loc).padStart(9)} ${formatNumber(r.code).padStart(9)} ${formatNumber(r.comment).padStart(9)} ${formatNumber(r.blank).padStart(9)}  ${bar(r.code, maxLangCode, 20)}`
    );
  }

  printSection('By Package (sorted by code lines)');
  const pkgRows = [...packageData.entries()]
    .sort((a, b) => b[1].code - a[1].code);
  const maxPkgCode = Math.max(...pkgRows.map(([, d]) => d.code));

  console.log(`
  ${'Package'.padEnd(42)} ${'Files'.padStart(5)} ${'Code'.padStart(8)} ${'Cmt'.padStart(6)} ${'Test'.padStart(5)} ${'Src'.padStart(5)}  Distribution`);
  console.log('  ' + '-'.repeat(100));
  for (const [pkg, d] of pkgRows) {
    console.log(
      `  ${pkg.padEnd(42)} ${formatNumber(d.files).padStart(5)} ${formatNumber(d.code).padStart(8)} ${formatNumber(d.comment).padStart(6)} ${formatNumber(d.testFiles).padStart(5)} ${formatNumber(d.srcFiles).padStart(5)}  ${bar(d.code, maxPkgCode, 15)}`
    );
  }

  printSection('Complexity (TS/JS files only)');
  const avgFuncLen = complexityAcc.functionCount > 0
    ? (complexityAcc.codeLines / complexityAcc.functionCount).toFixed(1)
    : 'N/A';
  const branchDensity = complexityAcc.codeLines > 0
    ? ((complexityAcc.branches / complexityAcc.codeLines) * 1000).toFixed(1)
    : '0';

  console.log(`
  Functions/methods   : ${formatNumber(complexityAcc.functionCount)}
  Total code lines    : ${formatNumber(complexityAcc.codeLines)}
  Avg function length : ${avgFuncLen} lines
  Branch statements   : ${formatNumber(complexityAcc.branches)}
  Branch density      : ${branchDensity} per 1000 LOC
  Import statements   : ${formatNumber(complexityAcc.imports)}
  Export statements   : ${formatNumber(complexityAcc.exports)}
  Import/Export ratio : ${complexityAcc.exports > 0 ? (complexityAcc.imports / complexityAcc.exports).toFixed(2) : 'N/A'}`);

  const pkgCxRows = [...packageComplexity.entries()]
    .filter(([, c]) => c.codeLines > 0)
    .sort((a, b) => b[1].codeLines - a[1].codeLines);
  const maxCxCode = Math.max(...pkgCxRows.map(([, c]) => c.codeLines));

  console.log('\n  Per-package complexity:');
  console.log(`  ${'Package'.padEnd(42)} ${'Funcs'.padStart(6)} ${'Code'.padStart(8)} ${'AvgLen'.padStart(7)} ${'Branch'.padStart(7)} ${'Imp'.padStart(5)} ${'Exp'.padStart(5)}  Size`);
  console.log('  ' + '-'.repeat(100));
  for (const [pkg, c] of pkgCxRows) {
    const avgLen = c.functionCount > 0 ? (c.codeLines / c.functionCount).toFixed(1) : '-';
    console.log(
      `  ${pkg.padEnd(42)} ${formatNumber(c.functionCount).padStart(6)} ${formatNumber(c.codeLines).padStart(8)} ${avgLen.padStart(7)} ${formatNumber(c.branches).padStart(7)} ${formatNumber(c.imports).padStart(5)} ${formatNumber(c.exports).padStart(5)}  ${bar(c.codeLines, maxCxCode, 10)}`
    );
  }

  printSection('Largest Source Files (by code lines, top 20)');
  const topFiles = fileSizes
    .filter(f => f.ext === '.ts' || f.ext === '.tsx' || f.ext === '.js' || f.ext === '.jsx' || f.ext === '.mjs')
    .filter(f => !isTestFile(f.path))
    .sort((a, b) => b.code - a.code)
    .slice(0, 20);

  console.log(`\n  ${'File'.padEnd(65)} ${'LOC'.padStart(6)} ${'Code'.padStart(6)}`);
  console.log('  ' + '-'.repeat(80));
  for (const f of topFiles) {
    console.log(`  ${f.path.padEnd(65)} ${formatNumber(f.loc).padStart(6)} ${formatNumber(f.code).padStart(6)}`);
  }

  printSection('Largest Test Files (by code lines, top 10)');
  const topTests = fileSizes
    .filter(f => isTestFile(f.path))
    .sort((a, b) => b.code - a.code)
    .slice(0, 10);

  console.log(`\n  ${'File'.padEnd(65)} ${'LOC'.padStart(6)} ${'Code'.padStart(6)}`);
  console.log('  ' + '-'.repeat(80));
  for (const f of topTests) {
    console.log(`  ${f.path.padEnd(65)} ${formatNumber(f.loc).padStart(6)} ${formatNumber(f.code).padStart(6)}`);
  }

  printSection('Package Dependency Overview');
  const pkgNames = [...packageData.keys()].filter(p => p.startsWith('packages/'));
  console.log('');
  for (const pkg of pkgNames.sort()) {
    const pkgJsonPath = path.join(rootDir, pkg, 'package.json');
    let deps;
    try {
      const raw = await readFile(pkgJsonPath, 'utf-8');
      const parsed = JSON.parse(raw);
      deps = {
        dependencies: Object.keys(parsed.dependencies || {}),
        devDependencies: Object.keys(parsed.devDependencies || {}),
        peerDependencies: Object.keys(parsed.peerDependencies || {}),
      };
    } catch {
      continue;
    }
    const internalDeps = [...deps.dependencies, ...deps.peerDependencies].filter(d => d.startsWith('@nop-chaos/'));
    if (internalDeps.length === 0 && deps.dependencies.length === 0) continue;

    const pd = packageData.get(pkg);
    console.log(`  ${pkg} (${pd?.files ?? '?'} files, ${formatNumber(pd?.code ?? 0)} code lines)`);
    if (internalDeps.length > 0) {
      console.log(`    internal deps: ${internalDeps.join(', ')}`);
    }
    const externalDeps = deps.dependencies.filter(d => !d.startsWith('@nop-chaos/'));
    if (externalDeps.length > 0) {
      console.log(`    external deps: ${externalDeps.length} (${externalDeps.slice(0, 5).join(', ')}${externalDeps.length > 5 ? ', ...' : ''})`);
    }
  }

  console.log('\n');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
