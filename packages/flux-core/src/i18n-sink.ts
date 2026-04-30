/**
 * Intentional mutable singleton — the ONLY module-level state in flux-core.
 *
 * flux-core must remain free of framework and i18n-library dependencies so
 * that every other package can depend on it.  The validation message layer
 * (flux-runtime/validation/message.ts) needs an i18n formatter, but the only
 * concrete implementation lives in flux-i18n.  Rather than introduce a
 * circular dependency (flux-core → flux-i18n) or thread a formatter through
 * the entire validation call chain, we use a lightweight setter/getter pair
 * that flux-i18n wires up during `initFluxI18n()`.
 *
 * This is the documented, reviewed exception to the "pure types / constants /
 * side-effect-free utilities" rule described in docs/architecture/flux-core.md.
 *
 * Ownership:
 *   - flux-i18n  OWNS the write side  (setMessageFormatter)
 *   - flux-runtime/validation OWNS the read side (getMessageFormatter)
 *   - No other module should call setMessageFormatter outside of init/reset.
 */
export type MessageFormatter = (key: string, params?: Record<string, unknown>) => string;

let formatter: MessageFormatter = (key) => key;

export function setMessageFormatter(fn: MessageFormatter): void {
  formatter = fn;
}

export function getMessageFormatter(): MessageFormatter {
  return formatter;
}
