export type TemplateNode = { schema: unknown };
export type BaseSchema = { schema: unknown };

export function extract(region: { templateNode: unknown[] | unknown }) {
  const nodes = Array.isArray(region.templateNode) ? region.templateNode : [region.templateNode];
  const schemas = nodes.map((n) => (n as TemplateNode).schema);
  if (schemas.length === 0) return undefined;
  return (schemas[0] as BaseSchema).schema;
}
