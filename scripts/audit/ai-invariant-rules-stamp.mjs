// Invariant ⑧ family (branch-stamp reset) — extracted from
// find-ai-engine-invariant-violations.mjs in plan 759 (700-line gate) together
// with the wrapper-form classifier it depends on.

// ⑧' (plan 759): the wrapper form of the branch-stamp invariant. Returns
// 'accepted' when the runTurn body delegates to runWithExitResets whose resets
// clear pendingBranchId (directly, or via a named function defined in the file
// whose body clears it); 'missing-reset' when a wrapper exists without such a
// reset; 'none' when no wrapper is present.
function classifyStampWrapper(bodyText, code) {
  const wrapperIdx = bodyText.indexOf('runWithExitResets(');
  if (wrapperIdx < 0) return 'none';
  const resetsMatch = bodyText.slice(wrapperIdx).match(/\[([^\]]*)\]/);
  const resetsText = resetsMatch ? resetsMatch[1] : '';
  if (/pendingBranchId\s*=/.test(resetsText)) return 'accepted';
  for (const name of resetsText.split(',').map((part) => part.trim()).filter(Boolean)) {
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) continue;
    const fnRe = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*(?::\\s*[^{]+?)?\\{([\\s\\S]*?)\\n\\s*\\}`);
    const fnMatch = code.match(fnRe);
    if (fnMatch && /pendingBranchId\s*=/.test(fnMatch[1])) return 'accepted';
    const arrowRe = new RegExp(`(?:const|let)\\s+${name}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{?([^;\\n]*)`);
    const arrowMatch = code.match(arrowRe);
    if (arrowMatch && /pendingBranchId\s*=/.test(arrowMatch[1])) return 'accepted';
  }
  return 'missing-reset';
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
export function scanBranchStampReset(code, relPath) {
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
    // ⑧' (plan 759): wrapper form — runTurn delegating to runWithExitResets
    // with a pendingBranchId reset covers every exit path, so the per-exit
    // rules below do not apply. A wrapper without the reset, or a body with
    // neither runOnce nor a wrapper (refactor hiding the stamp path), is red
    // instead of the former silent skip (gate monotonicity).
    const bodyText = lines.slice(bodyStart, bodyEnd + 1).join('\n');
    const wrapper = classifyStampWrapper(bodyText, code);
    if (wrapper === 'accepted') continue;
    if (wrapper === 'missing-reset') {
      violations.push({
        file: relPath,
        line: i + 1,
        invariant: '⑧',
        detail: 'runTurn is wrapped by runWithExitResets but its resets do not clear pendingBranchId (invariant ⑧, plan 759 wrapper form)',
      });
      continue;
    }
    if (runOnceIdx < 0) {
      violations.push({
        file: relPath,
        line: i + 1,
        invariant: '⑧',
        detail: 'runTurn body contains neither runOnce nor a runWithExitResets wrapper — the stamp path is hidden from the rule (invariant ⑧, plan 759 monotonicity)',
      });
      continue;
    }

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
