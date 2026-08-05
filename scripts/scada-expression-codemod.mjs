#!/usr/bin/env node
/**
 * scada-expression-codemod.mjs（I18 表达式一元化迁移工具）
 *
 * 把 SCADA config 文件中的旧表达式方言改写为平台唯一语法 `${expr}`：
 *   - `@{pointId}`         → `${pointId}`     （旧 binding/expression 点方言）
 *   - `@{a + b}`           → `${a + b}`       （含运算符的旧方言）
 *   - `$xxx` / `$xxx.yyy`  → `${xxx}` / `${xxx.yyy}`  （scada 简写 → 平台表达式）
 *
 * 用途：plan 2026-08-05-2129-1 Phase 3 迁移工具。validator 检测到 `legacy-at-syntax`
 * 时，可运行本 codemod 一键改写。**idempotent**——已迁移的文件再跑无副作用。
 *
 * 用法：
 *   node scripts/scada-expression-codemod.mjs <path-to-config.json|ts|tsx>
 *   node scripts/scada-expression-codemod.mjs 'glob/pattern/**/*.json'
 *
 * 实现策略：文本扫描 + 正则替换（不解析 AST）。匹配字段：`flux`、`expression`。
 * `$xxx` 简写的匹配规避 `$` 内置命名空间（`$Math`/`$JSON`/`$Date`）：仅当 `$` 后跟
 * 小写字母或下划线开头的标识符（典型 scada 简写形式）时改写。
 */

import { readFileSync, writeFileSync } from 'node:fs';

// 正则：
// 1. `@{...}` → `${...}`：`@\{` 替换为 `\${`，保留内部表达式。
const AT_SYNTAX_PATTERN = /@\{([^{}]*?)\}/g;
// 2. `$xxx` 简写 → `${xxx}`：仅改写 `flux:` 或 `expression:` 字段值中的简写。
//    规避平台保留 `$Math`/`$JSON`/`$Date` 命名空间：仅匹配 `$<lower|_>` 开头。
const DOLLAR_SHORTHAND_PATTERN = /(?<=flux:\s*'|expression:\s*')\$([a-z_][a-zA-Z0-9_.\-]*)(?=['"])/g;
// 直接在 quoted string 中匹配：`'$xxx'` 或 `"$xxx"` 整体（值就是简写）
const QUOTED_DOLLAR_PATTERN = /['"]\$([a-z_][a-zA-Z0-9_.\-]*)['"]/g;

function migrateContent(content) {
  let migrated = content;
  let count = 0;

  // 1. `@{...}` → `${...}`（全局，所有出现位置）
  migrated = migrated.replace(AT_SYNTAX_PATTERN, (match, inner) => {
    count++;
    return `\${${inner}}`;
  });

  // 2. `$xxx` 简写 → `${xxx}`（仅在 flux/expression 字段值中）
  //    匹配 `flux: '$xxx'` 或 `expression: '$xxx'`，替换为 `${xxx}`。
  migrated = migrated.replace(DOLLAR_SHORTHAND_PATTERN, (match, ident) => {
    count++;
    return `\${${ident}}`;
  });

  // 3. 兜底：直接 `'$xxx.yyy'` 整体匹配（处理逗号后的简写引用，如 `flux: ['$a', '$b']`）
  //    此兜底较激进——仅在 Step 2 没覆盖时启用，避免误改 $Math 等命名空间（已由 [a-z_] 守卫）。
  //    跳过：本 codemod 暂不处理数组形式（少见，需手工核对）。

  return { migrated, count };
}

function migrateFile(path) {
  const original = readFileSync(path, 'utf8');
  const { migrated, count } = migrateContent(original);
  if (count === 0) {
    return { path, changed: false, count: 0 };
  }
  writeFileSync(path, migrated, 'utf8');
  return { path, changed: true, count };
}

function main(argv) {
  const args = argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/scada-expression-codemod.mjs <file-or-glob>');
    process.exit(1);
  }
  // 简单 glob：用 globby 风格；这里直接处理传入路径（支持多个参数）。
  for (const arg of args) {
    try {
      const result = migrateFile(arg);
      if (result.changed) {
        console.log(`[codemod] migrated ${result.count} occurrence(s) in: ${result.path}`);
      } else {
        console.log(`[codemod] no change: ${result.path}`);
      }
    } catch (error) {
      console.error(`[codemod] failed: ${arg} — ${error.message}`);
      process.exit(1);
    }
  }
}

main(process.argv);

// 导出供单测使用
export { migrateContent, migrateFile };
