/**
 * check:audit-event-dispatch-ctx — schema event dispatch ctx completeness gate.
 *
 * Contract (renderer-runtime.md:685-690, CX-10 / bug-83 family): schema event
 * dispatch points must pass a second dispatch-arg ctx
 * `{ event, evaluationBindings, scope }` (payload doubles as bindings) so action
 * args templates (`${surfaceId}`, `${item.url}`, `${nodeId}`, ...) resolve to
 * real values — `getEvaluationScope` merges only `evaluationBindings` + scope.
 *
 * Scans renderer package src dirs (packages/flux-renderers-*) (non-test) for
 * dispatch call sites and
 * flags those whose second arg is missing / lacks `event` + `evaluationBindings`.
 *
 * Covered forms:
 *   1. direct: `props.events.<name>?.(payload, ctx)` / `eventHandlers.<name>?.(...)`
 *   2. dynamic index: `const handler = props.events[type]` then `void handler(payload, ctx)`
 *      (graph fireNodeEvent form; the handler call site is checked like a direct call)
 *   3. optional-call `?.()` is the primary shape but plain `()` is matched too.
 *
 * Compliant second args:
 *   - object literal containing both `event` and `evaluationBindings` keys
 *   - a helper call (e.g. `eventCtx(payload)`) or bare identifier (e.g. `ctx`)
 *     whose name carries `ctx`/`event` — the helper/variable builds the canonical ctx
 *
 * Not flagged (adjudicated contract categories):
 *   - zero-arg notification dispatches (`onAdd?.()`) — no payload, no keys to
 *     bind; C3.x 空参契约裁决 (component-audit-checklist v2 dim 7)
 *   - dynamic-index lifecycle dispatches whose first arg is `undefined`/`null`
 *     (form lifecycle actions `submitAction(undefined, { scope, form, ... })`)
 *   - native DOM / React synthetic event forwards (renderer-runtime.md:673-675,
 *     CG C3.x ruling) — registered in ALLOWLIST below
 */

import { readFile } from 'fs/promises';
import { collectSourceFiles, getLineNumber, getLineText, isTestFile, rootDir, toPosixPath } from './shared.mjs';

const LABEL = 'find-event-dispatch-without-ctx';

// Adjudicated dispatch sites that intentionally lack the event ctx. Key:
// `file:line` (line of the dispatch call). Categories:
//  - native DOM / React synthetic event forwarding (renderer-runtime.md:673-675)
//    — CG C3.x adjudicated pass; runtime normalizes the event via
//    `normalizeActionEvent`.
const ALLOWLIST = new Set([
  // notice-bar onClose/onClick forward the native React MouseEvent / KeyboardEvent
  // (renderer-runtime.md:673-675 requires DOM entry points to forward the event).
  // Line numbers shifted by the 20-03 pause/reduced-motion fix (2026-08-07).
  'packages/flux-renderers-mobile/src/notice-bar.tsx:198',
  'packages/flux-renderers-mobile/src/notice-bar.tsx:204',
  'packages/flux-renderers-mobile/src/notice-bar.tsx:210',
  // button onClick forwards the native React MouseEvent (C3.x adjudicated).
  'packages/flux-renderers-basic/src/button.tsx:220',
  // chart onClick/onHover forward the native event; the `{}` dispatch ctx is
  // intentional (no payload keys — normalizeActionEvent handles the event).
  'packages/flux-renderers-data/src/chart-renderer.tsx:605',
  'packages/flux-renderers-data/src/chart-renderer.tsx:609',
  'packages/flux-renderers-data/src/chart-renderer.tsx:612',
]);

const DISPATCH_RECEIVER = /(?:props\.events|eventHandlers)\.([A-Za-z_$][\w$]*)(\?\.)?\(/g;
const DYNAMIC_INDEX = /props\.events\s*\[/g;
const HELPER_CALL = /^[A-Za-z_$][\w$]*\s*\(/;
const BARE_IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function isCodePosition(content, index) {
  let inString = false;
  let stringQuote = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < index; i += 1) {
    const char = content[i];
    const nextChar = content[i + 1] ?? '';

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      if (char === '\\') {
        i += 1;
        continue;
      }
      if (char === stringQuote) {
        inString = false;
        stringQuote = '';
      }
      continue;
    }

    if (char === '/' && nextChar === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      inString = true;
      stringQuote = char;
      continue;
    }
  }

  return !inString && !inLineComment && !inBlockComment;
}

function scanBalanced(content, startIndex) {
  let inString = false;
  let stringQuote = '';
  let inLineComment = false;
  let inBlockComment = false;
  let depth = 0;

  for (let index = startIndex; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1] ?? '';

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === stringQuote) {
        inString = false;
        stringQuote = '';
      }
      continue;
    }

    if (char === '/' && nextChar === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      inString = true;
      stringQuote = char;
      continue;
    }

    if (char === '(') depth += 1;
    if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function splitTopLevelArgs(argsText) {
  const parts = [];
  let inString = false;
  let stringQuote = '';
  let inLineComment = false;
  let inBlockComment = false;
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let start = 0;

  for (let index = 0; index < argsText.length; index += 1) {
    const char = argsText[index];
    const nextChar = argsText[index + 1] ?? '';

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === stringQuote) {
        inString = false;
        stringQuote = '';
      }
      continue;
    }

    if (char === '/' && nextChar === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      inString = true;
      stringQuote = char;
      continue;
    }

    if (char === '(') parenDepth += 1;
    if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
    if (char === '{') braceDepth += 1;
    if (char === '}') braceDepth = Math.max(0, braceDepth - 1);
    if (char === '[') bracketDepth += 1;
    if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);

    if (
      char === ',' &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0
    ) {
      parts.push(argsText.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(argsText.slice(start));
  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

function isCompliantSecondArg(secondArg) {
  if (!secondArg) {
    return false;
  }
  if (secondArg.startsWith('{')) {
    return secondArg.includes('evaluationBindings') && secondArg.includes('event');
  }
  // Helper-call form (kanban/gantt/ai `eventCtx(payload)` family) or bare
  // identifier form (ai-bubble `ctx` variable) — both build the canonical ctx;
  // the name must carry ctx/event to qualify.
  const calleeMatch = secondArg.match(HELPER_CALL) ?? secondArg.match(BARE_IDENTIFIER);
  if (calleeMatch) {
    return /ctx|event/i.test(calleeMatch[0]);
  }
  return false;
}

function checkCallArgs({ content, relativePath, line, callOpenIndex }) {
  const closeIndex = scanBalanced(content, callOpenIndex);
  if (closeIndex < 0) {
    return null;
  }
  const argsText = content.slice(callOpenIndex + 1, closeIndex);
  const args = splitTopLevelArgs(argsText);
  // Zero-arg notification dispatches have no payload, hence nothing to bind —
  // adjudicated contract category (C3.x 空参契约裁决), not a ctx gap.
  if (args.length === 0) {
    return null;
  }
  if (args.length >= 2 && isCompliantSecondArg(args[1])) {
    return null;
  }
  return {
    filePath: relativePath,
    line: getLineNumber(content, callOpenIndex),
    lineText: getLineText(content, getLineNumber(content, callOpenIndex)).trim(),
    args,
  };
}

async function main() {
  const files = [];
  for (const root of ['apps', 'packages', 'tests']) {
    files.push(...(await collectSourceFiles(`${rootDir}/${root}`)));
  }

  const results = [];
  const allowlisted = [];

  for (const filePath of files) {
    const relativePath = toPosixPath(filePath);
    if (!/^packages\/flux-renderers-/.test(relativePath)) {
      continue;
    }
    if (isTestFile(relativePath)) {
      continue;
    }

    const content = await readFile(filePath, 'utf8');

    // Form 1/3: direct receiver dispatch (props.events.<name> / eventHandlers.<name>).
    const direct = new RegExp(DISPATCH_RECEIVER.source, DISPATCH_RECEIVER.flags);
    let match;
    while ((match = direct.exec(content)) !== null) {
      if (!isCodePosition(content, match.index)) {
        continue;
      }
      const callOpenIndex = direct.lastIndex - 1;
      const hit = checkCallArgs({ content, relativePath, callOpenIndex });
      if (!hit) {
        continue;
      }
      const key = `${hit.filePath}:${hit.line}`;
      if (ALLOWLIST.has(key)) {
        allowlisted.push(hit);
        continue;
      }
      results.push(hit);
    }

    // Form 2: dynamic index `props.events[<expr>]` — resolve the local handler
    // variable and check its call sites (graph fireNodeEvent form).
    const dynamic = new RegExp(DYNAMIC_INDEX.source, DYNAMIC_INDEX.flags);
    const localHandlers = new Set();
    let dynamicMatch;
    while ((dynamicMatch = dynamic.exec(content)) !== null) {
      if (!isCodePosition(content, dynamicMatch.index)) {
        continue;
      }
      // `const <name> = props.events[` — capture the assigned variable.
      const lineStart = content.lastIndexOf('\n', dynamicMatch.index) + 1;
      const before = content.slice(lineStart, dynamicMatch.index);
      const varMatch = before.match(/const\s+([A-Za-z_$][\w$]*)\s*=\s*$/);
      if (!varMatch) {
        continue;
      }
      localHandlers.add(varMatch[1]);
    }

    for (const handlerName of localHandlers) {
      const handlerCall = new RegExp(
        `(?:void\\s+)?${handlerName}\\s*\\(`,
        'g',
      );
      let handlerMatch;
      while ((handlerMatch = handlerCall.exec(content)) !== null) {
        if (!isCodePosition(content, handlerMatch.index)) {
          continue;
        }
        const callOpenIndex = handlerCall.lastIndex - 1;
        const closeIndex = scanBalanced(content, callOpenIndex);
        if (closeIndex < 0) {
          continue;
        }
        const argsText = content.slice(callOpenIndex + 1, closeIndex);
        const args = splitTopLevelArgs(argsText);
        // Lifecycle dispatches (`props.events['initAction']` family) call with
        // `undefined` first arg — no payload, no ctx keys to lose; skip.
        if (args.length === 0 || args[0] === 'undefined' || args[0] === 'null') {
          continue;
        }
        if (args.length >= 2 && isCompliantSecondArg(args[1])) {
          continue;
        }
        const hit = {
          filePath: relativePath,
          line: getLineNumber(content, callOpenIndex),
          lineText: getLineText(content, getLineNumber(content, callOpenIndex)).trim(),
          args,
        };
        const key = `${hit.filePath}:${hit.line}`;
        if (ALLOWLIST.has(key)) {
          allowlisted.push(hit);
          continue;
        }
        results.push(hit);
      }
    }
  }

  results.sort((a, b) => a.filePath.localeCompare(b.filePath) || a.line - b.line);

  if (results.length === 0) {
    console.log(`[${LABEL}] No schema event dispatch without full ctx (allowlisted ${allowlisted.length} adjudicated native-DOM forwards).`);
    return;
  }

  console.log(
    `[${LABEL}] Found ${results.length} schema event dispatch point(s) without { event, evaluationBindings, scope } ctx:`,
  );
  for (const result of results) {
    console.log(`  ${result.filePath}:${result.line}`);
    console.log(`    ${result.lineText}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(`[${LABEL}] Error:`, error);
  process.exit(1);
});
