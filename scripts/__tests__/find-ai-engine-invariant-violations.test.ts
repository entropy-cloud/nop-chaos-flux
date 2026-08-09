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
  try { adapter.mutate('full', (draft) => { /* ok */ }); }
  catch { adapter.mutate('requestState', (draft) => {
    if (draft.abortController !== abortController) return;
    draft.abortController = null;
  }); }
  finally { adapter.mutate('full', (draft) => {
    if (draft.abortController === abortController) draft.abortController = null;
  }); }
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
  await removed.abort();
  if (activeIdRef.current === id) { setActiveId(null); }
  void storage?.deleteConversation(id).catch((e) => reportStorageError({ phase: 'deleteConversation', error: e }));
}
function clearAll() {
  switchVersionRef.current = switchVersionRef.current + 1; // ⑥ displacement bump
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
});
