#!/usr/bin/env node
/**
 * E3 engine-replacement codemod: Playwright spec → flux-test `.flux-spec.ts` draft.
 *
 * Mechanical step 1 of the two-step migration (design doc §5.2 T2): translate
 * the common `page.*` / `expect(locator)...` patterns onto the flux-test
 * driver, and mark everything out of reach with `TODO(migrate)` so the human
 * (or agent) refinement step knows exactly where judgment is needed.
 *
 * Usage: node scripts/e2e-migrate-codemod.mjs tests/e2e/foo.spec.ts [out.ts]
 * Output defaults to the sibling `foo.flux-spec.ts`.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const WEB_ASSERTS = 'toBeVisible|toBeHidden|toContainText|toHaveText|toHaveAttribute|toHaveValue|toHaveCount|toBeEnabled|toBeDisabled';

/** Rewrite Playwright `expect(locator).<assert>({timeout})` → flux `ft.expectWeb(locator).<assert>({timeoutMs})`. */
function rewriteWebAsserts(source) {
  // expect(<page-locator-expr>).not.<assert>(args) | expect(...).<assert>(args)
  const chain = new RegExp(`(\\bawait\\s+)?expect\\(\\s*(page\\.(?:locator|getByTestId|getByRole)\\([^)]*\\)(?:\\.(?:first|last|nth)\\([^)]*\\))*)\\s*\\)\\s*\\.\\s*(not\\.)?\\s*(${WEB_ASSERTS})\\(`, 'g');
  source = source.replace(chain, (_m, awaited, loc, not, assert) => `${awaited ? 'await ' : ''}ft.expectWeb(ft.${loc.replace(/^page\./, '')}).${not ?? ''}${assert}(`);
  // timeout option rename in assert call tails — safe: only inside rewritten call? apply globally to assert-shaped options
  source = source.replace(/(toBe(?:Visible|Hidden|Enabled|Disabled)|toContainText|toHaveText|toHaveAttribute|toHaveValue|toHaveCount)\(([^()]*)\)\s*;/g, (m, assert, args) => m);
  return source;
}

function renameTimeoutToTimeoutMs(source) {
  // rename { timeout: } only inside web-assert call option objects
  return source.replace(
    new RegExp(`(${WEB_ASSERTS})\\(((?:[^()]|\\([^)]*\\))*)\\)`, 'g'),
    (_m, assert, args) => {
      const inner = /^\((.*)\)$/s.test(args) ? args.slice(1, -1) : args;
      return `${assert}(${inner.replace(/\btimeout\s*:/g, 'timeoutMs:')})`;
    },
  );
}

const RULES = [
  // imports
  [/import\s*\{[^}]*\}\s*from\s*'@playwright\/test';?\s*\n?/g, ''],
  [/import\s*\{[^}]*\}\s*from\s*'\.\/fixtures\.js';?\s*\n?/g, ''],
  [/\bawait\s+assertTrackedPageErrors\s*\(\s*page\s*\)\s*;?/g, 'await expectNoPageErrors(ft);'],
  [/\bassertTrackedPageErrors\s*\(\s*page\s*\)\s*;?/g, 'await expectNoPageErrors(ft);'],
  // describe/test scaffolding (line-anchored: body stays in place; the human
  // refinement step drops the two wrapper `});` braces at file end)
  [/^[ \t]*test\.describe\(\s*(['"`])(.*?)\1\s*,\s*\(\)\s*=>\s*\{[ \t]*$/gm, (_m, _q, title) => `// describe: ${title}`],
  [/^[ \t]*test\(\s*(['"`])(.*?)\1\s*,\s*async\s*\(\s*\{\s*page\s*\}\s*\)\s*=>\s*\{[ \t]*$/gm, (_m, _q, title) => `// test: ${title}`],
  // page helpers
  [/\bpage\.locator\(/g, 'ft.locator('],
  [/\bpage\.getByTestId\(/g, 'ft.getByTestId('],
  [/\bpage\.getByRole\(/g, 'ft.getByRole('],
  [/\bawait\s+page\.goto\(/g, 'await ft.goto('],
  [/\bpage\.goto\(/g, 'ft.goto('],
  [/\bawait\s+page\.reload\(\)/g, 'await ft.reload()'],
  [/\bpage\.reload\(\)/g, 'ft.reload()'],
  [/\bawait\s+page\.evaluate\(/g, 'await ft.evaluate('],
  [/\bpage\.evaluate\(/g, 'ft.evaluate('],
  [/\bawait\s+page\.mouse\.move\(/g, 'await ft.mouse.move('],
  [/\bpage\.mouse\.move\(/g, 'ft.mouse.move('],
  [/\bawait\s+page\.mouse\.down\(/g, 'await ft.mouse.down('],
  [/\bpage\.mouse\.down\(/g, 'ft.mouse.down('],
  [/\bawait\s+page\.mouse\.up\(/g, 'await ft.mouse.up('],
  [/\bpage\.mouse\.up\(/g, 'ft.mouse.up('],
  [/\bawait\s+page\.mouse\.click\(/g, 'await ft.mouse.click('],
  [/\bpage\.mouse\.click\(/g, 'ft.mouse.click('],
  [/\bawait\s+page\.mouse\.wheel\(/g, 'await ft.mouse.wheel('],
  [/\bpage\.mouse\.wheel\(/g, 'ft.mouse.wheel('],
  [/\bawait\s+page\.keyboard\.press\(/g, 'await ft.keyboard.press('],
  [/\bpage\.keyboard\.press\(/g, 'ft.keyboard.press('],
  [/\bawait\s+page\.keyboard\.type\(/g, 'await ft.keyboard.type('],
  [/\bpage\.keyboard\.type\(/g, 'ft.keyboard.type('],
  [/\bawait\s*page\.waitForSelector\(\s*(['"`])([\s\S]*?)\1\s*(?:,\s*\{[^}]*\})?\)/g, "await ft.locator('$2').waitFor('attached')"],
  [/\bawait\s*page\.setViewportSize\(\s*\{\s*width:\s*(\d+)\s*,\s*height:\s*(\d+)\s*\}\s*\)/g, 'await ft.setViewportSize($1, $2)'],
];

const TODO_MARKERS = [
  [/\bpage\./g, 'page.* API'],
  [/\bexpect\.poll\b/g, 'expect.poll → ft.waitFor(scope/stability)'],
  [/\bexpect\(/g, 'raw expect(...) (non-locator assertion)'],
  [/\btest\./g, 'test.* API'],
  [/\bkeyboard\./g, 'keyboard.* (raw handle)'],
  [/\bmouse\./g, 'mouse.* (raw handle)'],
];

export function codemod(source) {
  let out = source;
  out = rewriteWebAsserts(out);
  for (const [pattern, replacement] of RULES) {
    out = typeof replacement === 'string' ? out.replace(pattern, replacement) : out.replace(pattern, replacement);
  }
  out = renameTimeoutToTimeoutMs(out);

  const todos = [];
  for (const [pattern, label] of TODO_MARKERS) {
    const matches = out.match(pattern);
    if (matches) todos.push(`- ${label} ×${matches.length}`);
  }

  const header = [
    '// GENERATED by scripts/e2e-migrate-codemod.mjs — engine-replacement DRAFT.',
    '// Step 1 (mechanical swap) is applied; refine by hand before running.',
    '// Refinement: fix imports/relative paths, drop leftover describe/test `});` braces.',
    '// Step 2 (semantic rewrite: DOM assertions → ft.expect) happens AFTER green.',
    ...(todos.length > 0 ? ['//\n// TODO(migrate) unresolved:', ...todos.map((t) => `//   ${t}`)] : []),
    '',
    "import type { FtGlobal } from '@nop-chaos/flux-test-driver';",
    "import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';",
    '',
    'export default async function migrated(ft: FtGlobal): Promise<void> {',
  ].join('\n');
  const footer = '\n}\n';
  return `${header}${out.trimStart()}\n${footer}`;
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith('e2e-migrate-codemod.mjs');
if (isDirectRun) {
  const input = process.argv[2];
  if (!input) {
    console.error('usage: node scripts/e2e-migrate-codemod.mjs <spec.ts> [out.ts]');
    process.exit(2);
  }
  const source = readFileSync(input, 'utf8');
  const output = codemod(source);
  const outPath = process.argv[3] ?? input.replace(/\.spec\.ts$/, '.flux-spec.ts');
  writeFileSync(outPath, output);
  const todoCount = (output.match(/TODO\(migrate\)/g) ?? []).length;
  console.log(`wrote ${outPath}${todoCount > 0 ? ` (${todoCount} TODO(migrate) markers)` : ''}`);
}
