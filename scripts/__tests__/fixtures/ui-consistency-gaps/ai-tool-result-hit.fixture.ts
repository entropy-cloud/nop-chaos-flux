// Mirrors packages/flux-renderers-ai/src/engine/tool-execution.ts:68 — tool
// result text routed back to the engine, never into user JSX (plan 483 A3).
export function toToolResultText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
