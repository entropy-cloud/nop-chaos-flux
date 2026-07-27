# MA2.3 — Basic Renderers 分发 + Action 链路审计

> Plan: `docs/plans/2026-07-27-0800-3-ma2-runtime-correctness-audit.md`
> Status: completed
> Date: 2026-07-27
> Scope: `packages/flux-renderers-basic/`, `packages/flux-renderers-form/`, `packages/flux-renderers-form-advanced/`, `packages/flux-renderers-data/`

## 1. Hardcoded Type Dispatch Audit

**Pattern scanned:** `switch.*type`, `case.*type`, `type ===`, `type ==` in renderer source (excluding tests).

### Source files (non-test)

| File                                                                                    | Pattern                                                  | Assessment                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flux-renderers-basic/src/dynamic-renderer.tsx:22`                                      | `typeof (value as { type?: unknown }).type === 'string'` | **False positive** — this is a TypeScript type guard checking if a value has a string `type` property, not dispatching by type. The actual renderer dispatch goes through `registry.get(type)`. |
| `flux-renderers-form-advanced/src/composite-field/array-field-object-items.test.tsx:29` | `if (schema.type === 'form')`                            | **Test file** — not production dispatch.                                                                                                                                                        |

**All other hits are in test files** using `definitions.find(d => d.type === 'button')` pattern, which is legitimate test code for looking up renderer definitions.

**Finding:** No hardcoded type dispatch in production renderer code. All renderer dispatch goes through the registry-based lookup (`registry.get(type)` / `registry.has(type)`). The dynamic-renderer's `typeof type === 'string'` is a type guard, not dispatch logic.

## 2. Action Routing Audit

**Pattern scanned:** `onEvent`, `emit`, `dispatchEvent` in renderer source (excluding tests).

### Event flow verification

| File                                                             | Mechanism                                        | Assessment                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| `flux-renderers-basic/src/button.tsx:210`                        | `await props.events.onClick?.(event)`            | **Correct** — routes via props.events to action dispatcher                   |
| `flux-renderers-basic/src/button.tsx:232,245`                    | `onClick={(event) => void handleClick(event)}`   | **Correct** — HTML onClick delegates to handleClick which calls props.events |
| `flux-renderers-basic/src/tabs.tsx:313,418`                      | `void props.events.onChange?.(payload, ...)`     | **Correct** — routes via props.events                                        |
| `flux-renderers-basic/src/text.tsx:54,78`                        | `const onClick = ...; onClick={onClick}`         | **Correct** — delegates through props.events internally                      |
| `flux-renderers-basic/src/page.tsx:240`                          | `onClick={() => setOpen(true)}`                  | **Correct** — this is local UI state, not an action dispatch                 |
| `flux-renderers-basic/src/scope-debug.tsx:116`                   | `onClick={() => setExpanded((value) => !value)}` | **Correct** — local UI toggle, not action dispatch                           |
| `flux-renderers-basic/src/basic-renderer-definitions.ts:245,271` | Defines `onClick` event in `events` config       | **Correct** — schema declares the event channel                              |
| `flux-renderers-form/src/renderers/form-definition.ts:33-105`    | Uses `context.emit()` in schema validation       | **Correct** — validation diagnostics, not action dispatch                    |

### Event binding contract

Event bindings (`onClick`, `onChange`, `onEvent`, `xui:action`) in basic renderers consistently route through one of three correct paths:

1. **`props.events.onEventName?.(...)`** — The standard runtime event routing path (button, tabs, etc.)
2. **`useActionDispatcher()`** — Available for renderers that need direct action dispatch
3. **`context.emit()`** — Used in schema validation only (form-definition)

**No instances** of direct store dispatch, raw DOM event listeners bypassing the action system, or ad-hoc action contexts were found.

## 3. Action Event Binding Sample Check

### Sample: `button.tsx` - onClick flow

1. Schema declares `onClick` in `events` config (`basic-renderer-definitions.ts:245`)
2. Renderer accesses via `props.events.onClick` (`button.tsx:210`)
3. The `events` object is provided by the runtime, which wires it to the action dispatcher
4. `await props.events.onClick?.(event)` returns a promise that resolves after the action completes

**Contract verified:** The button's onClick action correctly routes through `props.events` → runtime action dispatcher. No direct dispatch bypass.

### Sample: `tabs.tsx` - onChange flow

1. Schema declares `onChange` in `events` config (`basic-renderer-definitions.ts:531`)
2. Tab selection change triggers `props.events.onChange?.(payload, ...)` (`tabs.tsx:313`)
3. Payload includes `{ value: newTabKey }` — standard shape per action-scope protocol

**Contract verified:** Tab's onChange correctly routes through the runtime action dispatcher with standard payload shape.

### Sample: `dynamic-renderer.tsx` - loadAction flow

1. Schema declares `loadAction` as a data-loading action (not an event)
2. DynamicRenderer uses `props.loadAction` which the compiler resolves from schema
3. Action execution uses the standard runtime action dispatch pipeline

**Contract verified:** Dynamic renderer's loadAction uses the standard action dispatch pipeline through resolved props.

## 4. Findings Summary

| ID            | Severity | Package                                    | Description                                                                                          | Action                |
| ------------- | -------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------- |
| MA2-BASIC-F01 | P2       | basic-renderers                            | No hardcoded type dispatch in production code. Registry-based dispatch confirmed.                    | Document in arm-index |
| MA2-BASIC-F02 | P2       | basic-renderers                            | Action routing correctly uses `props.events` → action dispatcher. No direct dispatch bypasses found. | Document in arm-index |
| MA2-BASIC-F03 | P2       | basic-renderers, form, form-advanced, data | Event binding contract conforms to action-scope protocol. Standard payload shapes used.              | Document in arm-index |

## 5. Conclusions

All basic renderer packages pass the dispatch and action link audit. No P0/P1 findings. The renderer contract of using `props.events` for event routing and registry-based type dispatch is consistently followed across all four basic renderer packages.
