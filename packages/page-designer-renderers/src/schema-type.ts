// WA-pager-004 (plan 573): designer nodes arrive as opaque schema records and
// eleven call sites hand-rolled the same double-jump `type` read. One typed
// reader replaces the scattered casts (the reads themselves are dynamic-boundary
// exempt; the finding is the copy dimension).
export function getSchemaType(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' ? type : undefined;
}
