#!/usr/bin/env node
/**
 * ApiResponse 标准信封对齐验证脚本
 *
 * 运行: node scripts/verify-api-response-envelope.mjs
 * 退出码: 0=全部通过, 1=发现残留旧模式
 *
 * 检查项:
 *   [CHK-1] mock fetcher 不再返回 {ok: true/false, status: 200/4xx/5xx}
 *           — 应改为 {status: 0, data} / {status: 1, msg}
 *   [CHK-2] 错误消息主路径从 response.msg 提取，不从 data.message/data.msg 猜测
 *           — readResponseErrorMessage 应降级为 fallback
 *   [CHK-3] 消费者无 'data' in payload 信封解包启发式
 *   [CHK-4] 消费者无 isActionResult 嗅探
 *   [CHK-5] ApiResponse 类型有 code/msg/errors 字段
 *   [CHK-6] ApiSchema/ExecutableApiRequest 有 selection 字段
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

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

// ─── CHK-1: mock fetcher returning old {ok: true/false, status: 200/4xx/5xx} ─

async function checkMockFetcherFormat() {
  checksRun++;
  const pattern = /\{\s*ok:\s*(true|false)\s*,\s*status:\s*\d+/g;
  const skipDirs = ['node_modules', 'dist', '.git', '.bare'];

  // Only scan source dirs where fetchers live
  const scanDirs = [
    join(rootDir, 'apps/playground/src'),
    join(rootDir, 'packages'),
  ];

  for (const scanDir of scanDirs) {
    await walk(scanDir, ['.ts', '.tsx'], (fp, content) => {
      // Skip the type definition file — it legitimately declares the type
      if (fp.includes('renderer-api.ts') || fp.includes('types/renderer-api')) return;
      // Skip the plan doc and this script
      if (fp.includes('verify-api-response-envelope')) return;

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = pattern.exec(line);
        if (match) {
          // Check context: is this a fetcher return or a type annotation?
          const ctx = lines.slice(Math.max(0, i - 3), i + 3).join(' ');
          // Skip if it's a type annotation (interface/type declaration)
          if (/\b(interface|type)\s+\w+/.test(ctx) && /=\s*\{/.test(ctx)) continue;
          addViolation('CHK-1', fp, i + 1, line, '改为 { status: 0, data: ... } 或 { status: 1, msg: "..." }');
        }
        pattern.lastIndex = 0;
      }
    });
  }
}

// ─── CHK-2: error message from data.message/data.msg in request-runtime ─────

async function checkErrorMessageExtraction() {
  checksRun++;
  const targetFile = join(rootDir, 'packages/flux-runtime/src/async-data/request-runtime.ts');

  try {
    const content = await readFile(targetFile, 'utf-8');
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
  } catch {}
}

// ─── CHK-3: 'data' in payload heuristic in consumers ───────────────────────

async function checkConsumerEnvelopeUnwrap() {
  checksRun++;
  const targets = [
    join(rootDir, 'packages/flux-renderers-form/src/renderers/form.tsx'),
    join(rootDir, 'packages/flux-renderers-basic/src/page.tsx'),
  ];

  for (const fp of targets) {
    try {
      const content = await readFile(fp, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (/'data'\s+in\s+payload/.test(lines[i])) {
          addViolation('CHK-3', fp, i + 1, lines[i], '删除信封解包启发式，直接使用 result.data');
        }
      }
    } catch {}
  }
}

// ─── CHK-4: isActionResult heuristic in dynamic-renderer ────────────────────

async function checkIsActionResultSniff() {
  checksRun++;
  const target = join(rootDir, 'packages/flux-renderers-basic/src/dynamic-renderer.tsx');

  try {
    const content = await readFile(target, 'utf-8');
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
  } catch {}
}

// ─── CHK-5: ApiResponse type has code/msg/errors ───────────────────────────

async function checkApiResponseType() {
  checksRun++;
  const target = join(rootDir, 'packages/flux-core/src/types/renderer-api.ts');

  try {
    const content = await readFile(target, 'utf-8');
    const requiredFields = ['code', 'msg', 'errors', 'status', 'ok'];

    for (const field of requiredFields) {
      const re = new RegExp(`\\b${field}\\s*[?:]`, 'm');
      if (!re.test(content)) {
        addViolation('CHK-5', target, 0, `(missing field: ${field})`, `ApiResponse 类型缺少 ${field} 字段`);
      }
    }
  } catch {}
}

// ─── CHK-6: ApiSchema/ExecutableApiRequest has selection ───────────────────

async function checkSelectionField() {
  checksRun++;
  const target = join(rootDir, 'packages/flux-core/src/types/schema-base-types.ts');

  try {
    const content = await readFile(target, 'utf-8');

    // Count occurrences of selection in ApiSchema and ExecutableApiRequest
    const selectionCount = (content.match(/\bselection\s*[?:]/g) || []).length;
    if (selectionCount < 2) {
      addViolation('CHK-6', target, 0, `(found ${selectionCount} selection fields, expected >= 2)`, 'ApiSchema 和 ExecutableApiRequest 都需要 selection?: string');
    }
  } catch {}
}

// ─── CHK-7: Extra check — no { ok: true, status: 200 } in test type annotations ─

async function checkTestTypeAnnotations() {
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

  await checkMockFetcherFormat();
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
    'CHK-1': 'mock fetcher 返回旧格式 {ok, status: 200}',
    'CHK-2': '错误消息未从 response.msg 主路径提取',
    'CHK-3': '消费者残留信封解包启发式 (data in payload)',
    'CHK-4': 'dynamic-renderer 残留 isActionResult 嗅探',
    'CHK-5': 'ApiResponse 类型缺少字段',
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
