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
 * ⑥ displacement methods without switchVersionRef bump (N1, Cycle 2):
 *    In use-conversation.ts, createConversation / deleteConversation / clearAll
 *    function bodies must contain a `switchVersionRef.current` bump.
 *
 * ④ clearAll fan-out source (P1-3/P1-4, 2026-08-10): clearAll must enumerate
 *    the list mirror (`conversationsRef.current.map(...)`) — not just
 *    `engineCache.keys()` — so evicted / never-opened sessions cannot survive
 *    the storage clear (ghost rehydration).
 *
 * Pure behavior invariants ①⑤ (isProcessing guard, abort cleanup) are covered
 * by runtime tests (engine-invariants.test.ts / conversation-invariants.test.ts)
 * and are NOT statically scanned (high false-positive rate, low ROI).
 *
 * Ratchet gate: registered red hits (⑥×3 live displacement methods, Cycle 2 /
 * I4 clears) are the only expected hits; new violations block CI.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { rootDir, toScanRelativePath, getLineNumber } from './shared.mjs';

const LABEL = 'find-ai-engine-invariant-violations';

const TARGET_FILES = [
  'packages/flux-renderers-ai/src/engine/create-engine.ts',
  'packages/flux-renderers-ai/src/engine/build-context.ts',
  'packages/flux-renderers-ai/src/adapters/use-conversation.ts',
  'packages/flux-renderers-ai/src/adapters/use-conversation-autosave.ts',
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

/**
 * Invariant ⑥ (Cycle 2 / N1) — displacement methods must bump switchVersionRef.
 *
 * Displacement methods (createConversation / deleteConversation / clearAll)
 * shift the active conversation away from an in-flight switch target — they
 * must bump `switchVersionRef.current` (self-increment or version write) so a
 * pending switch's post-await promotion/hydration is invalidated. A missing
 * bump lets the in-flight switch write stale engines over the displaced
 * active state (probe-1/1b/1c).
 *
 * Expected live hits (registered red, Cycle 2 / I4 clears): 3 —
 * createConversation / deleteConversation / clearAll. There are no exemptions:
 * all three are displacement surfaces and must bump.
 */
function scanDisplacementVersionBumps(code, relPath) {
  const violations = [];
  const lines = code.split('\n');
  const displacementMethods = /^\s*(?:async\s+)?function\s+(createConversation|deleteConversation|clearAll)\s*\(/;
  const bumpRe = /switchVersionRef\.current\s*(?:\+\+|--|[-+]?=)|\+\+\s*switchVersionRef\.current/;

  for (let i = 0; i < lines.length; i++) {
    const decl = lines[i].match(displacementMethods);
    if (!decl) continue;

    // Extract the function body via brace depth from the declaration line.
    let depth = 0;
    let bodyStart = -1;
    let bodyEnd = -1;
    for (let j = i; j < lines.length; j++) {
      const stripped = lines[j].replace(/\/\/.*$/, '');
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

    const body = lines.slice(bodyStart, bodyEnd + 1).join('\n');
    if (!bumpRe.test(body)) {
      violations.push({
        file: relPath,
        line: i + 1,
        invariant: '⑥',
        detail: `displacement method ${decl[1]} does not bump switchVersionRef.current (invariant ⑥, N1 active displacement integrity)`,
      });
    }
  }
  return violations;
}

/**
 * Invariant ⑧ (Cycle 2 / N3) — runTurn early exits must not leak the
 * pending branch stamp.
 *
 * `pendingBranchId` (createMessageEngine closure scope) is consumed once by
 * runOnce (`pendingBranchId = undefined`). A runTurn exit BEFORE the runOnce
 * call leaves the stamp unconsumed, leaking it into the next unrelated turn
 * (probe-3). Static feasibility confirmed: pendingBranchId, runTurn and
 * runOnce all live in the same closure scope (create-engine.ts), so a
 * same-function scan of runTurn is sound.
 *
 * Rule coverage (2026-08-10 multi P2-1 extension):
 * 1. `return;` early returns (original rule) — the early-return path prefix
 *    (body start → return) must contain a pendingBranchId clear.
 * 2. `break;` early exits (abort while-head break) — the break path prefix
 *    must contain a pendingBranchId clear (loop-head clear or break-preceded
 *    clear).
 * 3. Throw paths — a try region that awaits a plugin hook (onTurnStart /
 *    onBeforeRequest) BEFORE the first runOnce must clear pendingBranchId in
 *    its catch (a pre-runOnce plugin rejection would otherwise leak the
 *    stamp).
 *
 * Scan/waiver surface (recorded): the entry `isProcessing` guard early return
 * is unreachable in the stamp path — regenerate guards isProcessing BEFORE
 * stamping and invokes runTurn synchronously after the stamp is set → exempt
 * with reason. The connector-missing early return is reachable (regenerate
 * with no connector always reaches it) → scan target.
 *
 * Expected live hits (registered red, Cycle 2 / I4 clears): 1 —
 * the connector-missing early return (cleared by P1-1; the ⑧ rule family is
 * GREEN after the multi P2-1 break/throw clears landed).
 */
function scanBranchStampReset(code, relPath) {
  const violations = [];
  const lines = code.split('\n');
  const runTurnRe = /^\s*(?:async\s+)?function\s+runTurn\s*\(/;
  const clearRe = /pendingBranchId\s*=/;

  for (let i = 0; i < lines.length; i++) {
    if (!runTurnRe.test(lines[i])) continue;

    // Extract the runTurn body via brace depth.
    let depth = 0;
    let bodyStart = -1;
    let bodyEnd = -1;
    for (let j = i; j < lines.length; j++) {
      const stripped = lines[j].replace(/\/\/.*$/, '');
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

    // First runOnce consumption point inside the body.
    let runOnceIdx = -1;
    for (let j = bodyStart; j <= bodyEnd; j++) {
      if (/\brunOnce\s*\(/.test(lines[j])) {
        runOnceIdx = j;
        break;
      }
    }
    if (runOnceIdx < 0) continue;

    // Rule 1 — early `return;` paths before the runOnce consumption.
    for (let j = bodyStart; j < runOnceIdx; j++) {
      const stripped = lines[j].replace(/\/\/.*$/, '');
      if (!/\breturn\s*;/.test(stripped)) continue;

      // Nearest preceding `if (...) {` header owning the return path
      // (the return's own line is included so a same-line
      // `if (...) { return; }` guard is detected too).
      let headerIdx = -1;
      for (let k = j; k >= bodyStart; k--) {
        if (/if\s*\(/.test(lines[k]) && (/\{/.test(lines[k]) || /\breturn\s*;/.test(lines[k]))) {
          headerIdx = k;
          break;
        }
      }

      // Exemption: the entry isProcessing guard (stamp path unreachable —
      // regenerate guards isProcessing before stamping; runTurn is invoked
      // synchronously right after the stamp is set, so no interleaving can
      // reach this guard with a pending stamp).
      if (headerIdx >= 0 && /isProcessing/.test(lines[headerIdx])) continue;

      // The early-return path must be accompanied by a pendingBranchId clear
      // (anywhere in the path prefix from the body start to the return).
      const prefix = lines.slice(bodyStart, j + 1).join('\n');
      if (!clearRe.test(prefix)) {
        violations.push({
          file: relPath,
          line: j + 1,
          invariant: '⑧',
          detail: `runTurn early return before runOnce leaves pendingBranchId unconsumed (invariant ⑧, N3 branch stamp leak)`,
        });
      }
    }

    // Rule 2 (2026-08-10, multi P2-1) — `break;` early exits before the
    // runOnce consumption (abort while-head break). The break path prefix
    // must contain a pendingBranchId clear (loop-head clear or break-preceded
    // clear). The tool-loop-max break sits AFTER the first runOnce at runtime
    // (rounds only increment post-runOnce, which consumes the stamp), so a
    // prefix clear from an earlier path satisfies it conservatively.
    for (let j = bodyStart; j < runOnceIdx; j++) {
      const stripped = lines[j].replace(/\/\/.*$/, '');
      if (!/\bbreak\s*;/.test(stripped)) continue;
      const prefix = lines.slice(bodyStart, j + 1).join('\n');
      if (!clearRe.test(prefix)) {
        violations.push({
          file: relPath,
          line: j + 1,
          invariant: '⑧',
          detail: `runTurn break before runOnce leaves pendingBranchId unconsumed (invariant ⑧, N3 branch stamp leak, break path)`,
        });
      }
    }

    // Rule 3 (2026-08-10, multi P2-1) — throw paths: a try region that
    // awaits a plugin hook before the first runOnce must clear the stamp in
    // its catch (an onTurnStart / onBeforeRequest rejection would otherwise
    // leak it).
    for (let j = bodyStart; j < runOnceIdx; j++) {
      const stripped = lines[j].replace(/\/\/.*$/, '');
      if (!/\btry\s*\{/.test(stripped)) continue;

      // Find the matching `} catch` header at the try's closing depth.
      let tryDepth = 0;
      let catchIdx = -1;
      for (let k = j; k <= bodyEnd; k++) {
        const s = lines[k].replace(/\/\/.*$/, '');
        let depthAfterClose = tryDepth;
        for (const ch of s) {
          if (ch === '}') depthAfterClose -= 1;
        }
        if (k > j && /^\s*\}\s*catch\b/.test(s) && depthAfterClose <= 0) {
          catchIdx = k;
          break;
        }
        for (const ch of s) {
          if (ch === '{') tryDepth += 1;
          else if (ch === '}') tryDepth -= 1;
        }
      }
      if (catchIdx < 0) continue;

      // Only relevant when the try region holds a pre-runOnce plugin await.
      const tryRegion = lines.slice(j, catchIdx + 1).join('\n');
      if (!/await\s+plugin\.(onTurnStart|onBeforeRequest)/.test(tryRegion)) continue;

      // The catch body must contain a pendingBranchId clear.
      let catchDepth = 0;
      let catchOpen = false;
      let catchEnd = -1;
      for (let k = catchIdx; k <= bodyEnd; k++) {
        const s = lines[k].replace(/\/\/.*$/, '');
        for (const ch of s) {
          if (ch === '{') { catchDepth += 1; catchOpen = true; }
          else if (ch === '}' && catchOpen) catchDepth -= 1;
        }
        if (catchOpen && catchDepth <= 0) {
          catchEnd = k;
          break;
        }
      }
      if (catchEnd < 0) continue;
      const catchBody = lines.slice(catchIdx, catchEnd + 1).join('\n');
      if (!clearRe.test(catchBody)) {
        violations.push({
          file: relPath,
          line: catchIdx + 1,
          invariant: '⑧',
          detail: `runTurn pre-runOnce plugin-await try region catch does not clear pendingBranchId (invariant ⑧, N3 branch stamp leak, throw path)`,
        });
      }
    }
  }
  return violations;
}

/**
 * Invariant ② (K-K4/② extension, Cycle 2 / I4) — list-mutation methods must
 * synchronously maintain the conversationsRef mirror (write surface).
 *
 * create/rename already did (Cycle 1 K4). delete/clearAll must too: a missing
 * write lets a same-tick reader (rename save settlement check / delete fixup /
 * switch exists-check) act on stale data — the delete's fixup re-selected a
 * cleared ghost conversation (K-⑥-1), rename re-saved a deleted conversation
 * (K-K4/②-1) and re-landed metadata after clearAll (K-K4/②-2). Same scan
 * shape as scanDisplacementVersionBumps: the function body must contain a
 * `conversationsRef.current = ...` write.
 */
function scanMirrorWriteSurface(code, relPath) {
  const violations = [];
  const lines = code.split('\n');
  const listMutators = /^\s*(?:async\s+)?function\s+(createConversation|renameConversation|deleteConversation|clearAll)\s*\(/;
  const mirrorWriteRe = /conversationsRef\.current\s*=/;

  for (let i = 0; i < lines.length; i++) {
    const decl = lines[i].match(listMutators);
    if (!decl) continue;

    let depth = 0;
    let bodyStart = -1;
    let bodyEnd = -1;
    for (let j = i; j < lines.length; j++) {
      const stripped = lines[j].replace(/\/\/.*$/, '');
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

    const body = lines.slice(bodyStart, bodyEnd + 1).join('\n');
    if (!mirrorWriteRe.test(body)) {
      violations.push({
        file: relPath,
        line: i + 1,
        invariant: '②',
        detail: `list-mutation method ${decl[1]} does not synchronously write conversationsRef.current (invariant ②, K-K4/② mirror write surface)`,
      });
    }
  }
  return violations;
}

/**
 * Invariant ④ (P1-3/P1-4 extension, 2026-08-10 multi-audit) — clearAll
 * fan-out source. `clearAll` must enumerate the FULL storage conversation set
 * — the list mirror (`conversationsRef.current.map(...)`) — not just
 * `engineCache.keys()`. Evicted sessions with in-flight autoSaves (P1-3) and
 * bootstrap-loaded-but-never-opened sessions (P1-4) never hold a cache entry;
 * a cache-only enumeration lets their storage records survive the clear →
 * ghost rehydration on remount.
 */
function scanClearAllFanOutSource(code, relPath) {
  const violations = [];
  const lines = code.split('\n');
  const clearAllRe = /^\s*(?:async\s+)?function\s+clearAll\s*\(/;
  const mirrorEnumRe = /conversationsRef\.current\.map\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    if (!clearAllRe.test(lines[i])) continue;

    let depth = 0;
    let bodyStart = -1;
    let bodyEnd = -1;
    for (let j = i; j < lines.length; j++) {
      const stripped = lines[j].replace(/\/\/.*$/, '');
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

    const body = lines.slice(bodyStart, bodyEnd + 1).join('\n');
    if (!mirrorEnumRe.test(body)) {
      violations.push({
        file: relPath,
        line: i + 1,
        invariant: '④',
        detail: `clearAll does not enumerate the list mirror (conversationsRef.current.map) for its fan-out (invariant ④, P1-3/P1-4 fan-out source)`,
      });
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
      allViolations.push(...scanDisplacementVersionBumps(code, relPath));
      allViolations.push(...scanMirrorWriteSurface(code, relPath));
      allViolations.push(...scanClearAllFanOutSource(code, relPath));
    }
    // ④ storage calls — the extracted auto-save module (same invariant:
    // storage?.saveMessages must route through .catch → reportStorageError).
    if (rel.endsWith('use-conversation-autosave.ts')) {
      allViolations.push(...scanStorageCalls(code, relPath));
    }

    // ③ controller identity guard — only for create-engine.ts
    if (rel.endsWith('create-engine.ts')) {
      allViolations.push(...scanControllerIdentityGuard(code, relPath));
      allViolations.push(...scanCompletionIdentityGuard(code, relPath));
      allViolations.push(...scanBranchStampReset(code, relPath));
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
