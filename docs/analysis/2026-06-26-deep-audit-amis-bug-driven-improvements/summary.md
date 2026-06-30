# Deep Audit Summary — `amis-bug-driven-improvements`

- Date: 2026-06-26
- Baseline: v1 / no compatibility burden
- Dimensions: 01, 02, 03, 04, 06, 08, 09, 13, 14, 16
- Method: deep-dive (1 round/dim, with tool baselines) + mandatory independent review

## Deep-dive statistics

- Dimensions: 10
- Deep-dive rounds: 1 per dimension (first-round findings were already precise thanks to tool baselines; no dimension needed >1 round to surface its primary findings)
- Deep-dive findings (pre-dedup): 28; deduped: 25

## Review statistics

- Reviewed against live code: 25/25
- Retained (as filed): 19
- Downgraded: 3 (02-F1 split → extraction-only P2; 06-F1 P2→P3; 14-F2 P2→P3)
- Rejected: 3 (08-F4, 09-F3, 09-F5)
- Final unique findings: 22 (1×P0, 2×P1, 6×P2, 13×P3)

## Final findings (cross-reference to deliverable)

Full detail lives in `docs/audits/2026-06-26-1859-multi-audit-amis-bug-driven-improvements.md` under IDs AUDIT-01..22.

| ID  | Sev | File                                                | One-line                                                              |
| --- | --- | --------------------------------------------------- | --------------------------------------------------------------------- |
| 01  | P0  | (7 files, see report)                               | check:oversized-code-files gate RED (7 files >700)                    |
| 02  | P1  | crud-renderer.tsx:449-476                           | runtime read of props.schema.item/card + recompile (compile-once)     |
| 03  | P1  | crud-renderer.tsx:363-389                           | as unknown as RendererComponentProps synthesis to sibling renderer    |
| 04  | P2  | form-store.ts:636-743                               | createPageStore/createSurfaceStore zero-coupled, extractable          |
| 05  | P2  | flux-react/src/unstable.ts                          | /unstable re-exports stable barrel symbols                            |
| 06  | P2  | form-advanced projected-scope/projected-owner-scope | prod uses /unstable for flux-runtime devDep-only symbol               |
| 07  | P2  | form-runtime-array.ts + form-runtime-owner.ts:144   | array mutation skips aggregate-root self-revalidation                 |
| 08  | P2  | quick-reference.md:14-40                            | Package Directory Map missing content/layout/mobile                   |
| 09  | P2  | quick-reference.md:481,483                          | useCurrentFormError/useFieldError return type wrong (array vs single) |
| 10  | P3  | flux-code-editor code-editor-renderer.tsx:6,54      | runtime value import only in devDependencies                          |
| 11  | P3  | input-choice-renderers.tsx                          | 4 independent renderers in one file (675 lines)                       |
| 12  | P3  | tree-control-controllers.ts:106-148                 | remote search no AbortController in-flight cancel                     |
| 13  | P3  | qrcode.tsx, value-input.tsx                         | bare cancelled boolean in async effect                                |
| 14  | P3  | form-runtime-owner.ts:378-400,608-625               | validateForm/Subtree lifecycle gate inconsistency                     |
| 15  | P3  | form-runtime-owner.ts:158-190                       | revalidateDependents clears validating early (flicker)                |
| 16  | P3  | request-runtime.ts:472,505                          | dedup map ApiResponse<any> + cast                                     |
| 17  | P3  | taskflow-designer-lib/index.ts:41                   | ctx.scope as any unnecessary                                          |
| 18  | P3  | 4 vitest.config.ts                                  | missing coverage thresholds (2 core packages worth fixing)            |
| 19  | P3  | 18 test files                                       | redundant @vitest-environment happy-dom                               |
| 20  | P3  | apps/playground vitest.config.ts                    | no coverage threshold                                                 |
| 21  | P3  | quick-reference.md:501                              | useRenderInstancePath return type wrong (string vs InstanceFrame[])   |
| 22  | P3  | quick-reference.md:30                               | bundle npm name recorded as @nop-chaos/flux-bundle                    |

## Rejected

- 08-F4 abort partial publish — code gates sync commit behind `!hasAsyncRules` + run-mismatch early-return; no partial publish.
- 09-F3 region nop-\*/data-slot dual — cites non-existent file + misreads documented dual-marker convention.
- 09-F5 button-group value — documented intentional seed-only behavior.

## Clean dimensions (zero new defects)

01 (boundaries), 04 (state ownership), 06 (async, modulo P2/P3 cleanup), 13 (types, modulo cast).

## Verdict

`<AI_STEP_RESULT>issues</AI_STEP_RESULT>`
