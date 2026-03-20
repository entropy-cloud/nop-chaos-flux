# 02 Playground Env Identity Runtime Reset Fix

## Problem

- in the playground, unrelated data updates like search results or local directory changes could reset in-progress form state
- the visible symptom was that a user could type into the form, trigger another playground interaction, and lose form-local values or validation state
- the reset did not come from the form schema itself; it came from a higher-level renderer configuration object changing identity

## Root Cause

- `apps/playground/src/App.tsx` built `env` with `useMemo(...)` but still depended on frequently changing state like `directoryUsers` and `searchQuery`
- `packages/amis-react/src/index.tsx` treats `props.env` as part of renderer runtime identity, so a new `env` object rebuilds the runtime and page runtime
- once page identity changed, form runtime identity changed too, which reset form-local state even though the user had not switched forms

## Fix

- stabilized the playground `env` object so it no longer changes identity when search results or directory contents change
- moved changing runtime inputs behind refs in `apps/playground/src/App.tsx`, so `fetcher`, `notify`, and monitor callbacks can still read fresh state without forcing runtime recreation
- kept `createSchemaRenderer(...)` behavior unchanged; the fix stays in the playground layer because the bug came from passing unstable runtime configuration

## Tests

- `packages/amis-react/src/index.test.tsx` - verifies that changing `env` identity recreates form runtime and clears an in-progress field value
- `apps/playground/src/App.test.tsx` - verifies the playground keeps the same `env` identity across search and user creation updates

## Affected Files

- `apps/playground/src/App.tsx`
- `apps/playground/src/App.test.tsx`
- `apps/playground/vitest.config.ts`
- `packages/amis-react/src/index.test.tsx`

## Notes For Future Refactors

- treat `env` as runtime configuration, not as a container for frequently changing business state
- if a host app needs fresh state inside `env` callbacks, prefer refs or another stable indirection instead of rebuilding `env`
- when a form appears to reset during unrelated interactions, inspect runtime identity inputs before changing form logic
