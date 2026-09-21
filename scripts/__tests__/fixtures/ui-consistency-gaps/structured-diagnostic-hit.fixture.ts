// Mirrors the structured diagnostic shapes adjudicated as permanent
// structured channels in plan 483 Phase 3: engine onError tuples and
// diagnostic payload builders — no user-visible UI exit.
export function toDiagnosticParts(error: unknown): string[] {
  const parts: string[] = [error.message];
  return parts;
}

export function normalizeEngineError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
