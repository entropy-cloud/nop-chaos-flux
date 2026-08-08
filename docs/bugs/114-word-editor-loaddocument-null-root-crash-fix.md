# 114 Word Editor LoadDocument Valid JSON Non-Object Root Crash Fix

## Problem

- In the word-editor host, corrupted or externally-written `localStorage` content such as the literal JSON value `"null"` crashed the whole page on mount: `loadDocument` (`packages/word-editor-core/src/document-io.ts`) only wrapped `JSON.parse` in `try/catch` — a valid JSON document that parses to `null` then hit `parsed.data`, throwing `TypeError: Cannot read properties of null` _outside_ any guard, propagating through `loadRecoveredState` → `useWordEditorState` render memo.
- `"null"`, `"42"`, and `"[]"` are all valid JSON, so the failure mode was a crash on corrupted-but-parseable storage, not a parse error.
- The page rendered a white screen (no error boundary) instead of the empty-document fallback.

## Diagnostic Method

- Audited the `loadDocument` failure paths (we-7 import surface): the `try` block ended right after `JSON.parse(raw)` and the cast `as Record<string, unknown>` hid the runtime non-object possibility from the type system.
- Existing tests covered `{bad json` (parse throw) and missing storage, but no case stored a valid-JSON non-object root — the crash path was untested.

## Root Cause

- The try/catch boundary was scoped to parsing only; the subsequent `parsed.data` access assumed the root was always a plain object. `JSON.parse` never validates root shape.

## Fix

- `document-io.ts loadDocument`: after parsing, guard the root with `!parsed || typeof parsed !== 'object' || Array.isArray(parsed)` → report `json-parse-failed` via the recovery error handler and return `null` (fail-closed, consistent with the other corrupt-data paths). The untyped `parsed` is narrowed before `record.data` access.

## Tests

- `document-io-persist.test.ts` — three new cases (red before the fix, green after): `"null"` root, `"42"` scalar root, `"[]"` array root each return `null` and report `json-parse-failed` without throwing.

## Affected Files

- `packages/word-editor-core/src/document-io.ts`
- `packages/word-editor-core/src/__tests__/document-io-persist.test.ts`

## Notes For Future Refactors

- Any `JSON.parse` followed by property access needs a root-shape guard — `as Record<string, unknown>` casts do not protect at runtime.
- The e2e confirmation (seed `"null"` → open → no crash) lives in `word-editor-recovery.spec.ts`.
