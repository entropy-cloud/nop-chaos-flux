/**
 * Consumed from compiled region handles instead of raw props.schema (compile-once).
 */
// (n as TemplateNode).schema is a comment-only mention and must not hit either.
export function build(input: { schema: unknown }) {
  return input;
}
