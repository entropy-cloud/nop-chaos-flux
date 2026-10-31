#!/usr/bin/env node
/**
 * ApiResponse 标准信封门禁（docs/architecture/api-response-envelope.md）。
 *
 * 检查项：
 *   [CHK-1a] ApiResponse 形 mock（对象字面量 status 与 ok 相邻）不得含冗余 ok
 *   [CHK-1b] ApiResponse 形 mock 的 status 不得为 100-399（HTTP 成功/重定向码在 status === 0 判定下是失败，读起来却像成功）
 *   [CHK-2]  错误消息主路径从 response.msg 提取
 *   [CHK-3]  消费者无 'data' in payload 信封解包启发式
 *   [CHK-4]  消费者无 isActionResult 嗅探
 *   [CHK-5]  ApiResponse 类型含 code/msg/errors/status 且不含 ok
 *   [CHK-6]  ApiSchema/ExecutableApiRequest 有 selection 字段
 *   [CHK-7]  测试类型注解不含 ok 字段
 *
 * 行尾注释 `envelope-gate: allow` 豁免该行（仅限有意构造的异常信封）。
 * 用法：node scripts/verify-api-response-envelope.mjs [--root <dir>] [--only CHK-1a,CHK-1b]
 * 退出码：0 = 通过，1 = 发现违规，2 = 脚本错误。
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const rootDir = readOption('--root') ?? join(__dirname, '..');
const onlyChecks = readOption('--only')?.split(',');
function isMisleadingStatus(status) {
  return status >= 100 && status <= 399;
}
const ALLOW_MARKER = 'envelope-gate: allow';

function shouldRun(check) {
  return !onlyChecks || onlyChecks.includes(check);
}

async function readTarget(check, file) {
  try {
    return await readFile(file, 'utf-8');
  } catch {
    addViolation(check, file, 0, '(missing target file)', '门禁目标文件不存在：更新脚本中的路径，不得静默跳过');
    return undefined;
  }
}

const violations = [];
let checksRun = 0;

function addViolation(check, file, line, lineContent, suggestion) {
  violations.push({ check, file: relative(rootDir, file), line, lineContent: lineContent.trim(), suggestion });
}

// ─── File walker ───────────────────────────────────────────────────────────

async function walk(dir, extensions, visitor) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' || entry.name === '.bare') continue;
    const fp = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fp, extensions, visitor);
      continue;
    }
    if (!extensions.some((ext) => entry.name.endsWith(ext))) continue;
    try {
      const content = await readFile(fp, 'utf-8');
      await visitor(fp, content);
    } catch {}
  }
}

// ─── CHK-1: ApiResponse-shaped mock literals ───────────────────────────────

// Envelope literals put `ok` first (`{ ok, status, data }`); `status, ok, error` objects are
// replica-kit face payloads whose ok/error are business fields mirrored into data.
const REDUNDANT_OK = /\{\s*ok:\s*(?:true|false)\s*,\s*status:/;
const ENVELOPE_STATUS = /\{\s*(?:ok:\s*(?:true|false)\s*,\s*)?status:\s*(-?\d+)\s*,\s*(?:data|msg|code|errors)\s*:/g;

async function checkMockEnvelopes() {
  const runA = shouldRun('CHK-1a');
  const runB = shouldRun('CHK-1b');
  if (!runA && !runB) return;
  checksRun++;
  const scanDirs = [join(rootDir, 'apps/playground/src'), join(rootDir, 'packages')];
  for (const scanDir of scanDirs) {
    await walk(scanDir, ['.ts', '.tsx'], (fp, content) => {
      if (fp.includes('types/renderer-api') || fp.includes('verify-api-response-envelope')) return;
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes(ALLOW_MARKER)) continue;
        if (runA && REDUNDANT_OK.test(line)) {
          addViolation('CHK-1a', fp, i + 1, line, '删除冗余 ok：成功判定只看 status === 0');
        }
        if (runB) {
          for (const match of line.matchAll(ENVELOPE_STATUS)) {
            const status = Number(match[1]);
            if (isMisleadingStatus(status)) {
              addViolation('CHK-1b', fp, i + 1, line, `status ${status} 是 HTTP 成功/重定向码，在 status === 0 判定下实为失败：成功写 { status: 0, data }，失败写 { status: -1, msg }`);
            }
          }
        }
      }
    });
  }
}

// ─── CHK-2: error message from data.message/data.msg in request-runtime ─────

async function checkErrorMessageExtraction() {
  if (!shouldRun('CHK-2')) return;
  checksRun++;
  const targetFile = join(rootDir, 'packages/flux-runtime/src/async-data/request-runtime.ts');

  {
    const content = await readTarget('CHK-2', targetFile);
    if (content === undefined) return;
    const lines = content.split('\n');

    // Check that readResponseErrorMessage is used as fallback, not primary
    // The primary should be response.msg
    let foundResponseMsg = false;
    for (let i = 0; i < lines.length; i++) {
      if (/response\.msg\b/.test(lines[i]) || /\.msg\s*[?!]?[|&]/.test(lines[i])) {
        foundResponseMsg = true;
      }
    }
    if (!foundResponseMsg) {
      // Check createApiResponseError — it should reference response.msg
      for (let i = 0; i < lines.length; i++) {
        if (/createApiResponseError/.test(lines[i])) {
          // Look ahead 15 lines for response.msg
          const block = lines.slice(i, i + 20).join('\n');
          if (!/response\.msg/.test(block)) {
            addViolation('CHK-2', targetFile, i + 1, lines[i], 'createApiResponseError 应从 response.msg 提取错误消息');
          }
          break;
        }
      }
    }
  }
}

// ─── CHK-3: 'data' in payload heuristic in consumers ───────────────────────

async function checkConsumerEnvelopeUnwrap() {
  if (!shouldRun('CHK-3')) return;
  checksRun++;
  const targets = [
    join(rootDir, 'packages/flux-renderers-form/src/renderers/form.tsx'),
    join(rootDir, 'packages/flux-renderers-basic/src/page.tsx'),
  ];

  for (const fp of targets) {
    const content = await readTarget('CHK-3', fp);
    if (content === undefined) continue;
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/'data'\s+in\s+payload/.test(lines[i])) {
        addViolation('CHK-3', fp, i + 1, lines[i], '删除信封解包启发式，直接使用 result.data');
      }
    }
  }
}

// ─── CHK-4: isActionResult heuristic in dynamic-renderer ────────────────────

async function checkIsActionResultSniff() {
  if (!shouldRun('CHK-4')) return;
  checksRun++;
  const target = join(rootDir, 'packages/flux-renderers-basic/src/dynamic-renderer.tsx');

  {
    const content = await readTarget('CHK-4', target);
    if (content === undefined) return;
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/isActionResult/.test(lines[i]) && !/function isActionResult/.test(lines[i])) {
        // Check if the function definition still exists (it should be deleted)
        addViolation('CHK-4', target, i + 1, lines[i], '删除 isActionResult 嗅探，直接使用 result.data');
      }
    }
    // Also check if the function definition still exists
    for (let i = 0; i < lines.length; i++) {
      if (/function isActionResult/.test(lines[i])) {
        addViolation('CHK-4', target, i + 1, lines[i], '删除 isActionResult 函数定义');
      }
    }
  }
}

// ─── CHK-5: ApiResponse type has code/msg/errors/status and no ok ─────────

async function checkApiResponseType() {
  if (!shouldRun('CHK-5')) return;
  checksRun++;
  const target = join(rootDir, 'packages/flux-core/src/types/renderer-api.ts');
  const content = await readTarget('CHK-5', target);
  if (content === undefined) return;
  const block = /export interface ApiResponse<[^>]*>\s*\{([\s\S]*?)\n\}/.exec(content)?.[1];
  if (!block) {
    addViolation('CHK-5', target, 0, '(missing ApiResponse interface)', '未找到 ApiResponse 接口声明');
    return;
  }
  const declared = new Set([...block.matchAll(/^\s*(\w+)\??\s*:/gm)].map((match) => match[1]));
  for (const field of ['code', 'msg', 'errors', 'status']) {
    if (!declared.has(field)) {
      addViolation('CHK-5', target, 0, `(missing field: ${field})`, `ApiResponse 类型缺少 ${field} 字段`);
    }
  }
  if (declared.has('ok')) {
    addViolation('CHK-5', target, 0, '(redundant field: ok)', 'ApiResponse 不得声明 ok：成功判定只看 status === 0');
  }
}

// ─── CHK-6: ApiSchema/ExecutableApiRequest has selection ───────────────────

async function checkSelectionField() {
  if (!shouldRun('CHK-6')) return;
  checksRun++;
  const target = join(rootDir, 'packages/flux-core/src/types/schema-base-types.ts');

  {
    const content = await readTarget('CHK-6', target);
    if (content === undefined) return;

    // Count occurrences of selection in ApiSchema and ExecutableApiRequest
    const selectionCount = (content.match(/\bselection\s*[?:]/g) || []).length;
    if (selectionCount < 2) {
      addViolation('CHK-6', target, 0, `(found ${selectionCount} selection fields, expected >= 2)`, 'ApiSchema 和 ExecutableApiRequest 都需要 selection?: string');
    }
  }
}

// ─── CHK-7: Extra check — no { ok: true, status: 200 } in test type annotations ─

async function checkTestTypeAnnotations() {
  if (!shouldRun('CHK-7')) return;
  checksRun++;
  await walk(join(rootDir, 'packages'), ['.ts', '.tsx'], (fp, content) => {
    if (!fp.includes('__tests__') && !fp.includes('.test.')) return;

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      // Look for fetcher return type annotations like Promise<{ ok: true; status: number; data: T }>
      // Require `status` as an immediate sibling of `ok` (ok: true[;,] status:) to avoid false
      // positives on import-action result shapes (Promise<{ ok: true }>) and on payloads whose
      // `data` object happens to contain a `status` field (data: { status: string }).
      const hasFetcherTypeAnnotation =
        /Promise<\{\s*ok:\s*true[;,]\s*status:/.test(lines[i]) ||
        /FetchResult\s*=\s*\{\s*ok:\s*true[;,]\s*status:/.test(lines[i]);
      if (hasFetcherTypeAnnotation) {
        addViolation('CHK-7', fp, i + 1, lines[i], '类型注解应删除 ok 字段，改为 { status: number; data: T }');
      }
    }
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('ApiResponse 标准信封对齐验证\n' + '='.repeat(50));

  await checkMockEnvelopes();
  await checkErrorMessageExtraction();
  await checkConsumerEnvelopeUnwrap();
  await checkIsActionResultSniff();
  await checkApiResponseType();
  await checkSelectionField();
  await checkTestTypeAnnotations();

  console.log(`\n运行检查: ${checksRun}`);

  if (violations.length === 0) {
    console.log('\n✅ 全部通过 — 无残留旧模式\n');
    process.exit(0);
  }

  console.log(`\n❌ 发现 ${violations.length} 处残留旧模式:\n`);

  const grouped = {};
  for (const v of violations) {
    if (!grouped[v.check]) grouped[v.check] = [];
    grouped[v.check].push(v);
  }

  const checkNames = {
    'CHK-1a': 'ApiResponse 形 mock 含冗余 ok',
    'CHK-1b': 'ApiResponse 形 mock 使用 HTTP 成功/重定向 status',
    'CHK-2': '错误消息未从 response.msg 主路径提取',
    'CHK-3': '消费者残留信封解包启发式 (data in payload)',
    'CHK-4': 'dynamic-renderer 残留 isActionResult 嗅探',
    'CHK-5': 'ApiResponse 类型字段不符（缺字段或含 ok）',
    'CHK-6': 'ApiSchema/ExecutableApiRequest 缺少 selection',
    'CHK-7': '测试类型注解残留 ok 字段',
  };

  for (const [check, items] of Object.entries(grouped)) {
    console.log(`  ${check}: ${checkNames[check] || ''} (${items.length} 处)`);
    for (const item of items.slice(0, 10)) {
      console.log(`    ${item.file}:${item.line}`);
      if (item.lineContent && !item.lineContent.startsWith('(missing')) {
        console.log(`      > ${item.lineContent.substring(0, 120)}`);
      }
      if (item.suggestion) {
        console.log(`      → ${item.suggestion}`);
      }
    }
    if (items.length > 10) {
      console.log(`    ... 还有 ${items.length - 10} 处`);
    }
    console.log();
  }

  process.exit(1);
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(2);
});
