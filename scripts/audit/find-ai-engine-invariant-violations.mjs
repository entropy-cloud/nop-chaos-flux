/**
 * check:ai-engine-invariants — AI engine invariant static violation scanner.
 *
 * Scans `packages/flux-renderers-ai/src/` for static violations of invariants
 * ②③④ from `docs/audits/ai-invariants/invariant-catalog.md`:
 *
 * ② post-await state reads via closure capture (not ref):
 *    In use-conversation.ts, after `await`, bare `activeId` or `conversations`
 *    reads (not `.current` ref) are flagged.
 *
 * ③ catch/finally controller writes without identity guard:
 *    In create-engine.ts, catch/finally blocks that write `draft.abortController`
 *    without `draft.abortController ===/!== abortController` identity check.
 *
 * ④ storage calls without reportStorageError:
 *    In use-conversation.ts, `storage?.<method>(...)` without trailing `.catch`.
 *
 * Pure behavior invariants ①⑤ (isProcessing guard, abort cleanup) are covered
 * by runtime tests (engine-invariants.test.ts / conversation-invariants.test.ts)
 * and are NOT statically scanned (high false-positive rate, low ROI).
 *
 * Ratchet gate: baseline is zero violations on live code. New violations block CI.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { rootDir, toScanRelativePath, getLineNumber } from './shared.mjs';

const LABEL = 'find-ai-engine-invariant-violations';

const TARGET_FILES = [
  'packages/flux-renderers-ai/src/engine/create-engine.ts',
  'packages/flux-renderers-ai/src/adapters/use-conversation.ts',
];

const scanRootOverride = process.env.FLUX_AUDIT_SCAN_ROOT
  ? path.resolve(process.env.FLUX_AUDIT_SCAN_ROOT)
  : null;

function resolveTarget(rel) {
  if (scanRootOverride) return path.join(scanRootOverride, rel);
  return path.join(rootDir, rel);
}

/**
 * Invariant ④ — storage calls without .catch → reportStorageError.
 *
 * Matches `storage?.<method>(...)` that are NOT followed by `.catch`.
 * We check whether `.catch` appears on the same logical statement (within
 * a few lines after the call).
 */
function scanStorageCalls(code, relPath) {
  const violations = [];
  const lines = code.split('\n');
  const storageMethodRe = /storage\?\.(\w+)\s*\(/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    while ((match = storageMethodRe.exec(line)) !== null) {
      const method = match[1];
      // Only check mutating/loading methods (not property reads).
      if (!['saveConversation', 'saveMessages', 'deleteConversation', 'clearAll', 'loadConversations', 'loadMessages'].includes(method)) {
        continue;
      }
      // Check next 5 lines for .catch — if found, this call is guarded.
      const window = lines.slice(i, i + 6).join('\n');
      if (!/\.catch\s*\(/.test(window)) {
        violations.push({
          file: relPath,
          line: i + 1,
          invariant: '④',
          detail: `storage?.${method}(...) without .catch → reportStorageError (invariant ④)`,
        });
      }
    }
  }
  return violations;
}

/**
 * Invariant ③ — catch/finally controller writes without identity guard.
 *
 * Matches `adapter.mutate(...)` recipes inside catch/finally blocks that
 * write `draft.abortController` without `draft.abortController ===/!== abortController`
 * identity check in the same recipe body.
 */
function scanControllerIdentityGuard(code, relPath) {
  const violations = [];
  const lines = code.split('\n');

  // Find catch/finally blocks: `} catch` or `} finally`
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isCatchOrFinally = /^\s*\}\s*(catch|finally)\b/.test(line) || /^\s*(catch|finally)\b/.test(line);
    if (!isCatchOrFinally) continue;

    // Scan the block body (until matching `}`).
    let depth = 0;
    let started = false;
    for (let j = i; j < lines.length; j++) {
      const blockLine = lines[j];
      for (const ch of blockLine) {
        if (ch === '{') { depth++; started = true; }
        if (ch === '}') depth--;
      }
      if (started && depth <= 0) break;

      // Check for abortController write inside adapter.mutate recipe.
      if (/draft\.abortController\s*=/.test(blockLine) || /draft\.abortController\s*=/.test(blockLine)) {
        // Look in surrounding lines (±3) for identity guard.
        const context = lines.slice(Math.max(0, j - 3), j + 4).join('\n');
        if (!/draft\.abortController\s*[=!]==?\s*abortController/.test(context)) {
          violations.push({
            file: relPath,
            line: j + 1,
            invariant: '③',
            detail: `catch/finally writes draft.abortController without identity guard (invariant ③)`,
          });
        }
      }
    }
  }
  return violations;
}

/**
 * Invariant ③ (K1 extension) — success-path completion mutate identity guard.
 *
 * The turn-completion mutate (`draft.requestState = 'completed'`) must be
 * gated by `draft.abortController !== abortController` so a stale turn whose
 * abort raced a new sendMessage (abort during plugin.onTurnStart) cannot
 * clobber the new turn's in-flight state. Scans the whole file (the recipe
 * lives in the try path, not a catch/finally block).
 */
function scanCompletionIdentityGuard(code, relPath) {
  const violations = [];
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/draft\.requestState\s*=\s*'completed'/.test(lines[i])) continue;
    const context = lines.slice(Math.max(0, i - 3), i + 4).join('\n');
    if (!/draft\.abortController\s*!==\s*abortController/.test(context)) {
      violations.push({
        file: relPath,
        line: i + 1,
        invariant: '③',
        detail: `completion-path mutate writes requestState='completed' without controller identity guard (invariant ③)`,
      });
    }
  }
  return violations;
}

/**
 * Invariant ② — post-await bare activeId/conversations reads (not ref).
 *
 * In use-conversation.ts, after `await` statements, flag bare `activeId` or
 * `conversations` reads that are NOT `activeIdRef.current` / `conversationsRef.current`.
 * Conservative: only flags within the same function, after an await line.
 */
function scanPostAwaitClosureReads(code, relPath) {
  const violations = [];
  const lines = code.split('\n');
  let seenAwait = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Reset on function boundary.
    if (/^\s*(async\s+)?function\b/.test(line) || /^\s*(const|let)\s+\w+\s*=\s*(async\s*)?\(/.test(line)) {
      seenAwait = false;
    }

    // Track await.
    if (/\bawait\b/.test(line)) {
      seenAwait = true;
    }

    if (!seenAwait) continue;

    // Flag bare activeId reads (not activeIdRef.current, not in string/comment).
    // Skip lines that are comments or contain "Ref.current".
    const stripped = line.replace(/\/\/.*$/, '');
    if (/activeIdRef\.current/.test(stripped)) continue;
    if (/conversationsRef\.current/.test(stripped)) continue;

    // Match bare `activeId` that's not part of `activeIdRef`, `activeConversationId`, `setActiveId`, or a property key.
    const bareActiveId = stripped.match(/(?<!set)\bactiveId\b(?!Ref|Conversation)/);
    if (bareActiveId) {
      // Skip declarations and property names (but NOT setState calls on the same line).
      if (/const\s+activeId|let\s+activeId/.test(stripped)) continue;
      violations.push({
        file: relPath,
        line: i + 1,
        invariant: '②',
        detail: `post-await bare 'activeId' read (expected activeIdRef.current) (invariant ②)`,
      });
    }

    // Match bare `conversations` that's not part of `conversationsRef`.
    const bareConversations = stripped.match(/\bconversations\b(?!Ref)/);
    if (bareConversations) {
      if (/setConversations|const\s+conversations|let\s+conversations|conversations:|initialConversations/.test(stripped)) continue;
      violations.push({
        file: relPath,
        line: i + 1,
        invariant: '②',
        detail: `post-await bare 'conversations' read (expected conversationsRef.current) (invariant ②)`,
      });
    }
  }
  return violations;
}

/**
 * Invariant ② (K4 extension) — adapter mutating methods must not read bare
 * `conversations`/`activeId` closure state after their first state-change
 * statement (`setConversations`/`setActiveId`/`await`).
 *
 * Discrimination criterion (I4 plan, M2 adjudication): only flag bare reads
 * AFTER the first state-change statement of a mutating method body
 * (createConversation / switchConversation / deleteConversation /
 * renameConversation / clearAll). A read that is the method's FIRST statement
 * (before any state change) operates on the render-time snapshot by design and
 * is exempt — e.g. `switchConversation`'s `const exists = conversations.some(...)`.
 * `renameConversation`'s `const updated = conversations.find(...)` sits after
 * `setConversations` → flagged.
 */
function scanAdapterSyncClosureReads(code, relPath) {
  const violations = [];
  const lines = code.split('\n');
  const mutatingMethods = /^\s*function\s+(createConversation|switchConversation|deleteConversation|renameConversation|clearAll)\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const decl = lines[i].match(mutatingMethods);
    if (!decl) continue;

    // Extract the function body via brace depth from the declaration line.
    let depth = 0;
    let bodyStart = -1;
    let bodyEnd = -1;
    for (let j = i; j < lines.length; j++) {
      const line = lines[j];
      const stripped = line.replace(/\/\/.*$/, '');
      for (const ch of stripped) {
        if (ch === '{') { depth += 1; if (depth === 1 && bodyStart < 0) bodyStart = j; }
        else if (ch === '}') depth -= 1;
      }
      if (bodyStart >= 0 && depth === 0) {
        bodyEnd = j;
        break;
      }
    }
    if (bodyEnd < 0) continue;

    let seenStateChange = false;
    for (let j = bodyStart; j <= bodyEnd; j++) {
      const stripped = lines[j].replace(/\/\/.*$/, '');
      if (/\b(await|setConversations|setActiveId)\b/.test(stripped)) {
        seenStateChange = true;
        continue;
      }
      if (!seenStateChange) continue;
      if (/activeIdRef\.current|conversationsRef\.current/.test(stripped)) continue;

      // Bare `activeId` (not setActiveId / activeIdRef / activeConversationId).
      if (/(?<!set)\bactiveId\b(?!Ref|Conversation)/.test(stripped)) {
        violations.push({
          file: relPath,
          line: j + 1,
          invariant: '②',
          detail: `adapter mutating method reads bare 'activeId' after a state-change statement (expected activeIdRef.current) (invariant ②, K4 sync-read extension)`,
        });
      }
      // Bare `conversations` (not conversationsRef / setConversations).
      if (/\bconversations\b(?!Ref)/.test(stripped) && !/setConversations|conversations:/.test(stripped)) {
        violations.push({
          file: relPath,
          line: j + 1,
          invariant: '②',
          detail: `adapter mutating method reads bare 'conversations' after a state-change statement (expected conversationsRef.current) (invariant ②, K4 sync-read extension)`,
        });
      }
    }
  }
  return violations;
}

async function main() {
  const allViolations = [];

  for (const rel of TARGET_FILES) {
    const abs = resolveTarget(rel);
    let code;
    try {
      code = await readFile(abs, 'utf-8');
    } catch {
      // File may not exist in fixture mode — skip.
      continue;
    }
    const relPath = scanRootOverride ? rel : toScanRelativePath(abs);

    // ④ storage calls — only for use-conversation.ts
    if (rel.endsWith('use-conversation.ts')) {
      allViolations.push(...scanStorageCalls(code, relPath));
      allViolations.push(...scanPostAwaitClosureReads(code, relPath));
      allViolations.push(...scanAdapterSyncClosureReads(code, relPath));
    }

    // ③ controller identity guard — only for create-engine.ts
    if (rel.endsWith('create-engine.ts')) {
      allViolations.push(...scanControllerIdentityGuard(code, relPath));
      allViolations.push(...scanCompletionIdentityGuard(code, relPath));
    }
  }

  if (allViolations.length > 0) {
    console.error(`\n[${LABEL}] Found ${allViolations.length} invariant violation(s):\n`);
    for (const v of allViolations) {
      console.error(`  ${v.file}:${v.line}  [Inv ${v.invariant}]  ${v.detail}`);
    }
    console.error();
    process.exit(1);
  }

  console.log(`[${LABEL}] No invariant violations found.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
