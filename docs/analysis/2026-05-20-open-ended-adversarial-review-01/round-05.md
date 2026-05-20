# Open-Ended Adversarial Review — 2026-05-20 — Round 05

**Execution date**: 2026-05-20
**Result directory**: `docs/analysis/2026-05-20-open-ended-adversarial-review-01/`
**Exploration areas**: built-in action payload contracts, compiler validation, request runtime boundary
**Discovery source**: malformed-schema trust review after excluding previously recorded action branch traversal gaps

---

## Finding: `ajax` action payloads are typed as `ApiSchema`, but schema validation only checks generic action shape

- **Where**:
  - `packages/flux-core/src/types/actions.ts:57-60`
  - `docs/references/action-payload-matrix.md:52-57,96-103,166-179`
  - `packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts:152-203`
  - `packages/flux-compiler/src/schema-compiler/shape-validation-node-fields.ts:274-303`
  - `packages/flux-runtime/src/action-adapter.ts:129-142`
  - `packages/flux-runtime/src/runtime-action-helpers.ts:86-120`
  - `packages/flux-runtime/src/async-data/request-runtime.ts:277-350`
  - `packages/flux-compiler/src/schema-compiler-xui-actions.test.ts:97-110,168-181`
  - `packages/flux-runtime/src/__tests__/hidden-field-policy.test.ts:421-425`
- **What**: the public action type and payload matrix say `ajax` uses canonical `args: ApiSchema`, with `api.url` required by the compiler's existing `validateApiSchemaShape()` helper. But `validateActionShape()` only requires `{ action: non-empty string }` and, if present, object-shaped `args`; it does not branch on built-in action names. The only nearby `ApiSchema` validation is the `data-source` special case, so ordinary event actions, named `xui:actions`, and validation actions can compile as `{ action: 'ajax' }` or `{ action: 'ajax', args: {} }` without an authoring diagnostic.
- **Why it matters**: runtime immediately casts `invocation.args` to `ApiSchema` and sends it into `executeRuntimeAjaxAction()`, which calls `executeApiSchema()` and request preparation paths that read `api.url`, `api.params`, `api.data`, adaptor fields, and control metadata. A malformed schema therefore passes the compiler boundary and fails only when the user triggers the action. Worse, existing tests currently normalize this permissive surface: `schema-compiler-xui-actions.test.ts` compiles named ajax actions without `args`, and `hidden-field-policy.test.ts` embeds `{ action: 'ajax' }` in an async validation rule.
- **Confidence**: High. The type/docs contract, validator behavior, and runtime cast are all explicit. Repository search did not find an existing report for the specific built-in `ajax` payload validation gap; prior action reports covered branch traversal (`when` / `onSettled`), named-action payload forwarding, host capability args, or dynamic-renderer `loadAction` shape, not built-in request payload validation.
- **Suggested guardrail**: add built-in action payload validation beside `validateActionShape()`. At minimum, when `action === 'ajax'`, require object-shaped `args` and run `validateApiSchemaShape(args, path + '/args', ...)`. Similar narrow DTO checks should eventually cover `setValue`, `setValues`, `showToast`, `navigate`, `openDialog`, and `openDrawer`, but `ajax` is the highest-risk first target because it crosses into request execution.

## Round Assessment

This round extends Round 03's compile/validate/runtime semantic-drift theme into the built-in action family. The common pattern is that TypeScript and docs describe precise executable payloads, but the schema compiler still treats most action bodies as generic object bags.

## Blind-Spot Self-Assessment

This round did not enumerate every built-in action DTO. It focused on `ajax` because it has an existing `ApiSchema` validator, an explicit required `url` contract, and a runtime request boundary. A follow-up inventory should check whether `setValue.args.value`, `setValues.args.values`, and `refreshSource.targetId` have the same compiler/runtime split.
