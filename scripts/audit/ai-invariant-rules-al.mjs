// AL-07 (plan 759 / roadmap PH-6): the two plugin hooks whose contract is
// "isolated — a throwing plugin never changes the turn's outcome" (onError,
// onTurnEnd) must be invoked through the framework primitive `invokeIsolated`
// instead of a hand-rolled try/catch. The other hooks (onTurnStart,
// onBeforeRequest, onAfterRequest, onCompletionChunk) intentionally propagate
// and are out of scope here.

const ISOLATED_HOOK_RE = /\bplugin\.(onError|onTurnEnd)\?\.\(/;
const WINDOW_BEFORE = 2;

export function scanIsolatedPluginHooks(code, relPath) {
  const violations = [];
  const lines = code.split('\n').map((line) => line.replace(/\/\/.*$/, ''));
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(ISOLATED_HOOK_RE);
    if (!match) continue;
    const window = lines.slice(Math.max(0, i - WINDOW_BEFORE), i + 1).join('\n');
    if (/\binvokeIsolated\s*\(/.test(window)) continue;
    violations.push({
      file: relPath,
      line: i + 1,
      invariant: 'AL-07',
      detail: `plugin.${match[1]} invoked outside invokeIsolated (isolated hooks must go through the primitive) (invariant AL-07)`,
    });
  }
  return violations;
}
