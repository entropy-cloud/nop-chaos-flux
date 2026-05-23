# Open-Ended Adversarial Review — 2026-05-18 — Round 02

**Execution date**: 2026-05-18
**Result directory**: `docs/analysis/2026-05-18-open-ended-adversarial-review-02/`
**Exploration areas**: flow-designer, event/reaction compilation, renderers styling & contract adherence, action shape validation
**Discovery source**: Parallel adversarial exploration + code verification

---

## Finding 1: Flow designer `commitTransactionState` by ID commits wrong transaction when index is 0 (data integrity)

- **Where**: `packages/flow-designer-core/src/core/transactions.ts:52-72`
- **What**: When `commitTransactionState` is called with a specific `transactionId` that matches the **first** transaction in the stack (index 0), it commits the **last** transaction instead:
  ```typescript
  if (index === 0) {
    const txn = stack[stack.length - 1]; // BUG: should be stack[0]
    return { stack: [], committedId: txn.id, shouldPushHistory: true };
  }
  ```
  For any other index, the correct transaction is committed. But for index 0, the wrong `committedId` is returned, and ALL transactions (not just the matched one) are silently committed.
- **Why it matters**: Transaction management is broken for the specific case where the root transaction in a nested stack is explicitly committed by ID. The committed ID returned to the caller is wrong, and the transactions between index 0 and the end that should have been rolled back are instead committed. This is a data integrity bug in the designer's transaction system.
- **Confidence**: Certain (confirmed by code)
- **Non-duplication note**: Earlier flow designer audits (2026-03-27, 2026-03-29) covered style parity and JSON rendering, not transaction management internals.

---

## Finding 2: Flow designer `inputTreeDocument` prop change silently overwrites unsaved user edits (data loss)

- **Where**: `packages/flow-designer-renderers/src/designer-tree-mode.tsx:41-49`
- **What**: When `inputTreeDocument` prop changes (e.g., host re-renders with new data), a `useEffect` unconditionally calls `core.replaceDocument(computeTreeModeDocument(inputTreeDocument, config), inputTreeDocument)`. This overwrites any unsaved user edits in the designer without warning, snapshot, or diff. The previous `treeDocument` state (containing user modifications) is discarded silently.
- **Why it matters**: Data loss — any user changes made in the designer (node reordering, property edits, etc.) are silently clobbered when the host component re-renders with updated props. This is the most impactful data-loss vector in the flow designer. The effect should at minimum compare the new document against the current one and warn if unsaved changes would be lost.
- **Confidence**: Certain (confirmed by code)
- **Non-duplication note**: Not reported in earlier reviews.

---

## Finding 3: ELK layout owner invalidated on React strict mode double-mount — silent layout failure

- **Where**: `packages/flow-designer-renderers/src/use-designer-auto-layout.ts:17, 130-136`
- **What**: `useRef` initializer `createElkLayoutOwner()` runs only once per component mount. Under React strict mode (development), the component double-mounts: the first mount creates an `elkOwner`, the cleanup (line 130-136) invalidates it, and the second mount reuses the same ref (with an invalidated owner). All subsequent layout operations fail silently because the owner is already disposed.
- **Why it matters**: In development mode (React strict mode), all auto-layout in the flow designer silently fails. The ELK layout owner is created once, then invalidated by the first mount's cleanup, and never recreated for the second mount. No error is thrown, so developers may not notice that layouts are not being computed. If a production component remounts (e.g., conditional rendering toggles the designer), the same silent failure occurs.
- **Confidence**: Certain (confirmed by code pattern)
- **Non-duplication note**: Not reported in earlier flow designer audits.

---

## Finding 4: `onSettled` shape validation missing — silent compile-time gap (compiler)

- **Where**: `packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts:225-243` (parallel/then/onError blocks exist), missing: any block for `onSettled`
- **What**: The `validateActionShape` function recursively validates action branches `then`, `onError`, and `parallel` but **completely omits `onSettled`**. Compare:
  - Lines 205-223: validates `parallel`
  - Lines 225-233: validates `then` (recursive)
  - Lines 235-243: validates `onError` (recursive)
  - **No block for `onSettled` exists anywhere in the function**
    Meanwhile, the compiler's action compiler (action-compiler.ts:97-103) and runtime dispatcher (action-execution.ts:536-581) both handle `onSettled` correctly — it's only the shape validator that's blind to it.
- **Why it matters**: If a schema author provides `onSettled` with an invalid action shape (non-object, empty action, misspelled name), the shape validator silently accepts it at compile time. The error surfaces only at runtime as "Unsupported action: undefined" or unexpected dispatch behavior. This is a compile-time validation gap for a fully supported code path.
- **Confidence**: Certain (confirmed by line-by-line reading of the function)
- **Non-duplication note**: Previous compiler audits covered expression compilation and schema structural validation but did not check this action shape validator gap.

---

## Finding 5: Container and Flex renderers emit hardcoded layout utility classes — styling contract violation

- **Where**: `packages/flux-renderers-basic/src/container.tsx:43-53`, `packages/flux-renderers-basic/src/flex.tsx:37-48`
- **What**: Per AGENTS.md: "Layout renderers (container, flex, page, panel) emit marker classes ONLY. No hardcoded `gap-4`, `flex`, `p-4`, or `grid`; styling comes from schema." Both Container and Flex emit hardcoded Tailwind classes:
  - Container: `'flex'`, `resolveDirection()` → `'flex-col'|'flex-row'`, `'flex-wrap'`, `'items-center justify-center'`, etc.
  - Flex: same pattern plus `'justify-*'` classes
  - Both apply gap via `gap.className` (token like `gap-4`) AND `gap.style` (inline style) — redundant
- **Why it matters**: This couples layout renderers to Tailwind-specific class names, making it harder to swap styling frameworks and violating the explicit separation of concerns. Unlike widget renderers where internal styling is part of the visual design, layout renderers are supposed to defer all visual styling. PageRenderer is clean — it only emits `nop-page` — which shows the pattern CAN be followed.
- **Confidence**: Certain (confirmed by code)
- **Note**: The classes ARE schema-driven (derived from `direction`, `wrap`, `align`, `justify`, `gap` props), not arbitrarily hardcoded. The styling contract may need clarification on whether schema-derived layout utilities count as "hardcoded." Either way, the contract and the implementation are currently misaligned.

---

## Finding 6: Multiple `<Button>` instances missing `type="button"` — accidental form submission risk

- **Where**: 10+ locations across flux-renderers-form-advanced, including:
  - `condition-builder.tsx:160`
  - `detail-surface.tsx:72,75,89`
  - `detail-view.tsx:490`
  - `detail-field.tsx:319`
  - `key-value.tsx:186,416`
  - `array-editor.tsx:126,363`
  - `array-field.tsx:169,554`
- **What**: None of these `<Button>` usages specify `type="button"`. When rendered inside a `<form>` (which some of these are, e.g., in a form body or detail view), they default to `type="submit"`. The `button.tsx` renderer (flux-renderers-basic) correctly sets `type="button"` — this is the project convention that the form-advanced components are not following.
- **Why it matters**: Triggering any of these buttons inside a form will accidentally submit the form. The array-editor "Add item" button is particularly risky — it would submit the form while trying to add an array entry. This is a cross-boundary issue: the convention is set by `button.tsx` but not followed by higher-level components that wrap `<Button>`.
- **Confidence**: Certain (confirmed by code)

---

## Finding 7: Form init action failure logged but not shown to user

- **Where**: `packages/flux-renderers-form/src/renderers/form.tsx:326-339`
- **What**: When form initialization (`initAction`) fails, the catch block calls `reportFormInitActionError(runtime, props.path, error)`, which logs the error via `reportRuntimeHostIssue` but does **not** display it to the user in the UI. The form renders with no data and no visible error indicator.
- **Why it matters**: Users see a blank/incomplete form with no feedback about why. This is a UX gap — init failures are invisible unless the developer checks the console. The form could at minimum show an inline error banner or fall back to a disabled state with an error message.
- **Confidence**: Certain (confirmed by code — error is logged but no UI state change)

---

## Finding 8: Action `when` field not shape-validated at compile time

- **Where**: `packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts:152-244` (`validateActionShape`)
- **What**: `validateActionShape` validates `action` field (non-empty string), `args` (object), `parallel` (array), `then` (recursive), and `onError` (recursive) — but not the `when` field. The action-compiler.ts:77-78 then compiles it with `as unknown as CompiledRuntimeValue<boolean>` (a double cast). A `when` value that is a number, array, or object silently passes all validation and compilation without warning. The runtime evaluates it as truthy/falsy, so a misconfigured `when` could silently cause an action to always fire or never fire.
- **Why it matters**: This is a companion to Finding 4 (missing `onSettled` validation). Both findings show the same pattern: the shape validator for actions has gaps that let invalid schema through to runtime. Fixing both would close the gap for all action sub-fields.
- **Confidence**: Certain (confirmed by code)

---

## Round Assessment

This round found 8 findings across 4 areas:

| Area                     | Count | Key patterns                                                                                                                               |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Flow designer            | 3     | Transaction commit bug (wrong entry committed at index 0); unsaved edit overwrite on prop change; ELK layout owner invalidation on remount |
| Event/action compilation | 2     | Missing `onSettled` shape validation; missing `when` field validation                                                                      |
| Renderers                | 3     | Styling contract violations in Container/Flex layout renderers; missing `type="button"` on wrapped buttons; invisible form init failures   |

The most critical are:

1. **Flow designer data integrity** (Findings 1-2): A wrong-transaction-commit bug and an unsaved-edit-overwrite bug. Both can silently corrupt or lose user work.
2. **React strict mode silent failure** (Finding 3): The ELK layout owner pattern is incompatible with React strict mode. This means all flow designer auto-layout silently fails in development, and can fail in production after remount.
3. **Styling contract vs implementation misalignment** (Finding 5): Layout renderers explicitly violate the "marker classes only" contract. This needs either a contract update or an implementation fix.
