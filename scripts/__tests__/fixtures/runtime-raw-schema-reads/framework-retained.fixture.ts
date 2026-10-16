export function readRetained(props: { schema: Record<string, unknown> }) {
  // The node carries its authored tree by design.
  return props.schema.title; // raw-schema: retained(#1)
}
