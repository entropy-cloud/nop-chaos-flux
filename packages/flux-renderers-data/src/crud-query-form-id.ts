export function createCrudQueryFormId(crudId: unknown, crudPath: string): string {
  if (typeof crudId === 'string' && crudId.length > 0) {
    return `${crudId}-query-form`;
  }

  const normalizedPath = crudPath.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${normalizedPath || 'crud'}-query-form`;
}
