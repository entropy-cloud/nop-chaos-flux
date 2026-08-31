export function errorMessageConsole(err: unknown) {
  console.warn('[kanban-export] Failed to load html2canvas:', err instanceof Error ? err.message : String(err));
}
