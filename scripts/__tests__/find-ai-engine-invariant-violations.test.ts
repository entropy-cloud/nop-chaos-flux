import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const scannerPath = path.join(__dirname, '..', 'audit', 'find-ai-engine-invariant-violations.mjs');

function runScanner(env = {}): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync('node', [scannerPath], {
      encoding: 'utf-8',
      env: { ...process.env, ...env },
      cwd: path.join(__dirname, '..', '..'),
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      exitCode: err.status ?? 1,
    };
  }
}

function makeFixture(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'ai-inv-test-'));
  for (const [rel, content] of Object.entries(files)) {
    const fullPath = path.join(root, rel);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }
  return root;
}

describe('find-ai-engine-invariant-violations — scanner regression', () => {
  it('clean fixture: zero violations (exit 0)', () => {
    const root = makeFixture({
      'packages/flux-renderers-ai/src/engine/create-engine.ts': `
function runTurn() {
  pendingBranchId = undefined; // ⑧ prefix clear (the mutate-callback returns below are not turn exits, but the line rule is conservative)
  try { adapter.mutate('full', (draft) => { /* ok */ }); }
  catch { adapter.mutate('requestState', (draft) => {
    if (draft.abortController !== abortController) return;
    draft.abortController = null;
  }); }
  finally { adapter.mutate('full', (draft) => {
    if (draft.abortController === abortController) draft.abortController = null;
  }); }
  const outcome = await runOnce(connector, abortController); // ⑧ consumption point (plan 759 monotone rule needs runOnce or a wrapper)
  adapter.mutate('requestState', (draft) => {
    if (draft.requestState === 'aborted') return;
    if (draft.abortController !== abortController) return;
    draft.requestState = 'completed';
    draft.isProcessing = false;
  });
}
`,
      'packages/flux-renderers-ai/src/adapters/use-conversation.ts': `
function createConversation(params) {
  const info = { id: 'new', ...params };
  ++switchVersionRef.current; // ⑥ displacement bump
  setConversations((prev) => [info, ...prev]);
  conversationsRef.current = [info, ...conversationsRef.current];
  setActiveId(info.id);
  activeIdRef.current = info.id;
  return info;
}
async function deleteConversation(id) {
  switchVersionRef.current += 1; // ⑥ displacement bump
  conversationsRef.current = conversationsRef.current.filter((c) => c.id !== id); // ② mirror write surface
  await removed.abort();
  if (activeIdRef.current === id) { setActiveId(null); }
  void storage?.deleteConversation(id).catch((e) => reportStorageError({ phase: 'deleteConversation', error: e }));
}
function clearAll() {
  switchVersionRef.current = switchVersionRef.current + 1; // ⑥ displacement bump
  conversationsRef.current = []; // ② mirror write surface
  const ids = [...new Set([...engineCache.keys(), ...pendingSavesRef.current.keys(), ...conversationsRef.current.map((c) => c.id)])]; // ④ fan-out source (P1-3/P1-4)
  engineCache.clear();
  setConversations([]);
  setActiveId(null);
  activeIdRef.current = null;
}
function switchConversation(id) {
  const exists = conversations.some((c) => c.id === id); // first statement, pre-state-change → exempt
  setActiveId(id);
  if (!exists) return;
}
function renameConversation(id, title) {
  const updated = conversationsRef.current.find((c) => c.id === id); // ref mirror, K4-clean
  setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  conversationsRef.current = conversationsRef.current.map((c) => (c.id === id ? { ...c, title } : c));
  if (!updated) return;
}
`,
    });

    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No invariant violations');
  });

  it('violating fixture ④: storage call without .catch → exit 1', () => {
    const root = makeFixture({
      'packages/flux-renderers-ai/src/adapters/use-conversation.ts': `
function bad() {
  void storage?.saveConversation(conv);
}
`,
    });

    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('④');
    expect(result.stderr).toContain('saveConversation');
  });

  it('violating fixture ③: catch writes abortController without identity guard → exit 1', () => {
    const root = makeFixture({
      'packages/flux-renderers-ai/src/engine/create-engine.ts': `
function bad() {
  try { doStuff(); }
  catch { adapter.mutate('requestState', (draft) => {
    draft.abortController = null;
  }); }
}
`,
    });

    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('③');
  });

  it('violating fixture ③ (K1): completion mutate writes requestState=completed without identity guard → exit 1', () => {
    const root = makeFixture({
      'packages/flux-renderers-ai/src/engine/create-engine.ts': `
function bad() {
  adapter.mutate('requestState', (draft) => {
    if (draft.requestState === 'aborted') return;
    draft.requestState = 'completed';
    draft.isProcessing = false;
  });
}
`,
    });

    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('③');
    expect(result.stderr).toContain('completed');
  });

  it('violating fixture ②: post-await bare activeId → exit 1', () => {
    const root = makeFixture({
      'packages/flux-renderers-ai/src/adapters/use-conversation.ts': `
async function bad() {
  await something();
  if (activeId === id) { setActiveId(null); }
}
`,
    });

    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('②');
  });

  it('violating fixture ⑥: displacement method without switchVersionRef bump → exit 1', () => {
    const root = makeFixture({
      'packages/flux-renderers-ai/src/adapters/use-conversation.ts': `
function clearAll() {
  engineCache.clear();
  setConversations([]);
  setActiveId(null);
  activeIdRef.current = null;
}
`,
    });

    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('⑥');
    expect(result.stderr).toContain('clearAll');
  });

  it('violating fixture ⑧: runTurn early return before runOnce without pendingBranchId clear → exit 1', () => {
    const root = makeFixture({
      'packages/flux-renderers-ai/src/engine/create-engine.ts': `
async function runTurn(incoming) {
  if (adapter.getState().isProcessing) { return; } // entry guard → exempt
  const connector = adapterStateConnector();
  if (!connector) {
    adapter.mutate('requestState', (draft) => { draft.requestState = 'error'; });
    return; // early return without pendingBranchId clear → violation
  }
  const outcome = await runOnce(connector, abortController);
}
`,
    });

    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('⑧');
  });

  it('clean fixture ⑧: early return clears pendingBranchId before returning → exit 0', () => {
    const root = makeFixture({
      'packages/flux-renderers-ai/src/engine/create-engine.ts': `
async function runTurn(incoming) {
  if (adapter.getState().isProcessing) { return; } // entry guard → exempt
  pendingBranchId = undefined; // ⑧ clear before any early return
  const connector = adapterStateConnector();
  if (!connector) {
    adapter.mutate('requestState', (draft) => { draft.requestState = 'error'; });
    return;
  }
  const outcome = await runOnce(connector, abortController);
}
`,
    });

    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No invariant violations');
  });

  it('violating fixture ⑧ (break path, multi P2-1): while-head break without pendingBranchId clear → exit 1', () => {
    const root = makeFixture({
      'packages/flux-renderers-ai/src/engine/create-engine.ts': `
async function runTurn(incoming) {
  const connector = adapterStateConnector();
  let needsFollowUp = true;
  while (needsFollowUp) {
    if (abortController.signal.aborted) break; // break without clear → violation
    const outcome = await runOnce(connector, abortController);
  }
}
`,
    });

    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('⑧');
    expect(result.stderr).toContain('break');
  });

  it('clean fixture ⑧ (break path, multi P2-1): break preceded by pendingBranchId clear → exit 0', () => {
    const root = makeFixture({
      'packages/flux-renderers-ai/src/engine/create-engine.ts': `
async function runTurn(incoming) {
  const connector = adapterStateConnector();
  let needsFollowUp = true;
  while (needsFollowUp) {
    if (abortController.signal.aborted) {
      pendingBranchId = undefined; // ⑧ break 前置 clear
      break;
    }
    const outcome = await runOnce(connector, abortController);
  }
}
`,
    });

    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No invariant violations');
  });

  it('violating fixture ⑧ (throw path, multi P2-1): pre-runOnce plugin-await try catch without clear → exit 1', () => {
    const root = makeFixture({
      'packages/flux-renderers-ai/src/engine/create-engine.ts': `
async function runTurn(incoming) {
  const connector = adapterStateConnector();
  try {
    await plugin.onTurnStart(turnCtx);
    const outcome = await runOnce(connector, abortController);
  } catch (error) {
    adapter.mutate('requestState', (draft) => { draft.requestState = 'error'; }); // catch without clear → violation
  }
}
`,
    });

    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('⑧');
    expect(result.stderr).toContain('throw path');
  });

  it('clean fixture ⑧ (throw path, multi P2-1): pre-runOnce plugin-await try catch clears pendingBranchId → exit 0', () => {
    const root = makeFixture({
      'packages/flux-renderers-ai/src/engine/create-engine.ts': `
async function runTurn(incoming) {
  const connector = adapterStateConnector();
  try {
    await plugin.onTurnStart(turnCtx);
    const outcome = await runOnce(connector, abortController);
  } catch (error) {
    pendingBranchId = undefined; // ⑧ throw path clear
    adapter.mutate('requestState', (draft) => { draft.requestState = 'error'; });
  }
}
`,
    });

    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No invariant violations');
  });

  it('violating fixture ② (K4): rename reads bare conversations after setConversations → exit 1', () => {
    const root = makeFixture({
      'packages/flux-renderers-ai/src/adapters/use-conversation.ts': `
function renameConversation(id, title) {
  setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  const updated = conversations.find((c) => c.id === id); // post-state-change bare read → must be conversationsRef.current
  if (updated) { void storage?.saveConversation(updated).catch(() => {}); }
}
`,
    });

    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('②');
    expect(result.stderr).toContain('conversations');
  });

  it('violating fixture ② (K-K4/②): clearAll without conversationsRef write → exit 1', () => {
    const root = makeFixture({
      'packages/flux-renderers-ai/src/adapters/use-conversation.ts': `
function clearAll() {
  switchVersionRef.current += 1; // ⑥ displacement bump present
  engineCache.clear();
  setConversations([]);
  setActiveId(null);
  activeIdRef.current = null;
}
`,
    });

    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('②');
    expect(result.stderr).toContain('clearAll');
    expect(result.stderr).toContain('mirror write surface');
  });

  it('clean fixture ② (K-K4/②): all list mutators write conversationsRef → exit 0', () => {
    const root = makeFixture({
      'packages/flux-renderers-ai/src/adapters/use-conversation.ts': `
function createConversation(params) {
  ++switchVersionRef.current; // ⑥ displacement bump
  conversationsRef.current = [info, ...conversationsRef.current];
}
function renameConversation(id, title) {
  conversationsRef.current = conversationsRef.current.map((c) => (c.id === id ? { ...c, title } : c));
}
async function deleteConversation(id) {
  ++switchVersionRef.current; // ⑥ displacement bump
  conversationsRef.current = conversationsRef.current.filter((c) => c.id !== id);
}
function clearAll() {
  ++switchVersionRef.current; // ⑥ displacement bump
  conversationsRef.current = []; // ② mirror write surface
  const ids = [...new Set([...engineCache.keys(), ...pendingSavesRef.current.keys(), ...conversationsRef.current.map((c) => c.id)])]; // ④ fan-out source
}
`,
    });

    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No invariant violations');
  });

  it('violating fixture ④ (P1-3/P1-4): clearAll enumerates only engineCache keys → exit 1', () => {
    const root = makeFixture({
      'packages/flux-renderers-ai/src/adapters/use-conversation.ts': `
function clearAll() {
  ++switchVersionRef.current; // ⑥ displacement bump
  conversationsRef.current = []; // ② mirror write surface
  const ids = [...engineCache.keys()]; // cache-only enumeration → fan-out gap
  engineCache.clear();
}
`,
    });

    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('④');
    expect(result.stderr).toContain('clearAll');
    expect(result.stderr).toContain('fan-out source');
  });

  it('clean fixture ④ (P1-3/P1-4): clearAll enumerates the list mirror → exit 0', () => {
    const root = makeFixture({
      'packages/flux-renderers-ai/src/adapters/use-conversation.ts': `
function clearAll() {
  ++switchVersionRef.current; // ⑥ displacement bump
  conversationsRef.current = []; // ② mirror write surface
  const ids = [...new Set([...engineCache.keys(), ...pendingSavesRef.current.keys(), ...conversationsRef.current.map((c) => c.id)])];
  engineCache.clear();
}
`,
    });

    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No invariant violations');
  });

  // plan 759 (roadmap PH-6): wrapper-form stamp reset, optional-call storage blind spot, AL-07 isolation.

  it("violating fixture ⑧ (plan 759 wrapper form): runTurn wrapped by runWithExitResets whose resets do not clear pendingBranchId → exit 1", () => {
    const root = makeFixture({
      "packages/flux-renderers-ai/src/engine/create-engine.ts": `
function runTurn(incoming) {
  return runWithExitResets(() => runTurnBody(incoming), [clearSomethingElse]);
}
async function runTurnBody(incoming) {
  if (adapter.getState().isProcessing) { return; }
  const connector = adapterStateConnector();
  if (!connector) {
    return; // no stamp clear and the wrapper does not reset the stamp either
  }
  const outcome = await runOnce(connector, abortController);
}
`,
    });
    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("⑧");
  });

  it("clean fixture ⑧ (plan 759 wrapper form): runTurn wrapped by runWithExitResets with a pendingBranchId reset → exit 0", () => {
    const root = makeFixture({
      "packages/flux-renderers-ai/src/engine/create-engine.ts": `
function clearPendingBranchStamp() {
  pendingBranchId = undefined;
}
function runTurn(incoming) {
  return runWithExitResets(() => runTurnBody(incoming), [clearPendingBranchStamp]);
}
async function runTurnBody(incoming) {
  if (adapter.getState().isProcessing) { return; }
  const connector = adapterStateConnector();
  if (!connector) {
    return; // covered by the wrapper reset
  }
  const outcome = await runOnce(connector, abortController);
}
`,
    });
    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No invariant violations");
  });

  it("violating fixture ⑧ (plan 759 monotonicity): runTurn body has neither runOnce nor runWithExitResets → exit 1", () => {
    const root = makeFixture({
      "packages/flux-renderers-ai/src/engine/create-engine.ts": `
function runTurn(incoming) {
  return runTurnRenamedElsewhere(incoming); // refactor that hides the stamp path from the rule
}
`,
    });
    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("⑧");
  });

  it("violating fixture ④ (plan 759 optional-call form): storage?.method?.(…) without .catch → exit 1", () => {
    const root = makeFixture({
      "packages/flux-renderers-ai/src/adapters/use-conversation.ts": `
function deleteConversation(id) {
  void storage?.deleteConversation?.(id);
}
`,
    });
    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("④");
    expect(result.stderr).toContain("deleteConversation");
  });

  it("violating fixture AL-07 (plan 759): plugin.onError invoked outside invokeIsolated → exit 1", () => {
    const root = makeFixture({
      "packages/flux-renderers-ai/src/engine/create-engine.ts": `
function callPluginError(abortController, error) {
  for (const plugin of plugins) {
    try {
      plugin.onError?.(buildContext(abortController), error);
    } catch {}
  }
}
`,
    });
    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("AL-07");
    expect(result.stderr).toContain("onError");
  });

  it("clean fixture AL-07 (plan 759): plugin.onError / onTurnEnd invoked inside invokeIsolated → exit 0", () => {
    const root = makeFixture({
      "packages/flux-renderers-ai/src/engine/create-engine.ts": `
function callPluginError(abortController, error) {
  for (const plugin of plugins) {
    void invokeIsolated(() => plugin.onError?.(buildContext(abortController), error), [], { onError: () => undefined });
  }
}
async function finishTurn(abortController) {
  for (const plugin of plugins) {
    await invokeIsolated(() => plugin.onTurnEnd?.(buildContext(abortController)), [], {
      onError: (error) => { recordTurnEndError(abortController, error); },
    });
  }
}
`,
    });
    const result = runScanner({ FLUX_AUDIT_SCAN_ROOT: root });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No invariant violations");
  });
});
