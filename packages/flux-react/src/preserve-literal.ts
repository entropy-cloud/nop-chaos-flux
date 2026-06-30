/**
 * Compiler-preserved literal helpers.
 *
 * The schema compiler (via renderer `deepFields.normalize` booleanKeys/stringKeys
 * handling) wraps authored boolean/string literals that must survive compilation
 * as literal values (rather than being evaluated as expressions) into the
 * envelope `{ __nopPreserveLiteral: true, value: <T> }`. Renderers must unwrap
 * the envelope before reading the underlying value.
 *
 * The compiler-layer consumer that PRODUCES/reads this envelope for value-node
 * compilation lives in `@nop-chaos/flux-formula` (`compile-node.ts`, returns a
 * `StaticValueNode` — different semantics, intentionally not reusing these).
 * The helpers below are the renderer-side unwrap surface shared by every
 * renderer that reads a preserved-literal flag (wizard/collapse/tabs `disabled`,
 * variant-field `match.when`).
 */

const PRESERVE_LITERAL_MARKER = '__nopPreserveLiteral';

/**
 * Unwrap a `{ __nopPreserveLiteral: true, value }` envelope.
 *
 * Returns the inner `value` when `input` is such an envelope, otherwise `undefined`.
 * Callers that need a typed result (e.g. a boolean `disabled` flag, an expression
 * string) must narrow the returned value themselves — see {@link unwrapBooleanLiteral}
 * for the boolean convenience.
 */
export function unwrapPreservedLiteral(input: unknown): unknown {
  if (!input || typeof input !== 'object') return undefined;
  const candidate = input as Record<string, unknown>;
  if (candidate[PRESERVE_LITERAL_MARKER] === true && 'value' in candidate) {
    return candidate.value;
  }
  return undefined;
}

/**
 * Resolve a boolean flag (e.g. step/item `disabled`) that may be authored as a
 * bare literal (`true` / `'true'` / `1`) OR arrive as a compiler-preserved
 * `{ __nopPreserveLiteral: true, value: boolean }` envelope.
 *
 * Returns `true` only when the flag resolves to a truthy-disabled boolean;
 * every other shape (including the `value:false` envelope, bare `false`, and
 * unrelated objects) returns `false`.
 */
export function unwrapBooleanLiteral(input: unknown): boolean {
  if (input === true || input === 'true' || input === 1) return true;
  return unwrapPreservedLiteral(input) === true;
}
