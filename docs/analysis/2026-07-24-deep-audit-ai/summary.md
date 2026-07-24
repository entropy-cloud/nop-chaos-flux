# Deep Audit `ai` — Dimension Analysis (2026-07-24)

> Source for `docs/audits/2026-07-24-2151-multi-audit-ai.md`. 23 dimensions, 2-phase (deep-dive + independent review). All prior 2026-07-23 open-audit code/behavior findings verified FIXED.

## Final Retained Findings

| ID   | Priority | File                                                        | Summary                                                                                |
| ---- | -------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| P1-1 | P1       | `renderers/ai-bubble/user-edit.tsx:54-68`                   | user-edit resubmit silently loses edited text during streaming (pencil never disabled) |
| P1-2 | P1       | `adapters/use-conversation.ts:254,313`                      | create/rename storage errors bypass `onStorageError` callback                          |
| P1-3 | P1       | `adapters/use-conversation.ts:258-285`                      | switchConversation stale-closure race corrupts engine cache                            |
| P1-4 | P1       | all 14 renderer roots (e.g. `ai-chat.tsx:288-329`)          | `data-cid` missing on DOM root — inspector/schema bridge broken                        |
| P1-5 | P1       | `engine/create-engine.ts:182-189` (+ `ai-chat.tsx:248-250`) | connector-missing path omits `lastError` → onError ships placeholder                   |

P2 findings (32) — see the P2 section of `docs/audits/2026-07-24-2151-multi-audit-ai.md` for the full tagged list.

## Independent Review Verdicts (P1 candidates)

| Candidate                        | Verdict     | Reason                                                                         |
| -------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| user-edit resubmit data loss     | 保留 P1     | live: pencil button no disabled; both engine methods silently no-op            |
| storage onStorageError bypass    | 保留 P1     | both line numbers + reportStorageError usage confirmed                         |
| switchConversation race          | 保留 P1     | await gap + closure-captured id, no cancellation guard, no test                |
| data-cid missing                 | 保留 P1     | no `wrap:` + fragment passthrough + absent data-cid; contract text unambiguous |
| connector-missing onError        | 保留 P1     | branch lacks lastError while siblings have it; AI-19 intent comment present    |
| useMessage non-connector options | **降级 P2** | accepted/documented limitation; engine has no such setters                     |
| terminology fetcher vs stream    | **降级 P2** | pure doc-wording error, zero runtime impact                                    |
| ai-sender Textarea aria-label    | **降级 P2** | placeholder fallback + container context; a11y polish                          |
| parseCitations array[0]          | **降级 P2** | same behavior class as tested out-of-range `[9]` case                          |

## Dimensions Clean

01 deps · 02 module-responsibility · 05/07 lifecycle (non-churn) · 10 styling · 11 ui-usage · 13 type-safety · 15 security (non-markdown) · 17/18 naming/cross-package · 23 test-effectiveness (no fake-green, no defect-pinning).

## Dimension Coverage

- Batch 1: 03 (API surface) · 04 (state ownership) · 06 (async safety) · 09 (renderer contract) · 19 (error propagation) · 22 (integration wiring)
- Batch 2: 01 (deps) · 02 (file boundaries) · 05 (reactive) · 07 (lifecycle) · 13 (type safety) · 14 (test coverage)
- Batch 3: 10 (styling) · 11 (ui) · 15 (security/perf) · 16 (doc-code) · 17 (naming) · 18 (cross-package) · 20 (a11y) · 21 (display) · 23 (test effectiveness)

Dimensions 08 (validation) and 12 (field/slot) were scoped out: the AI package has no form-validation ownership and its renderers are not field-slot field components (no FieldFrame wrapping) — their checks folded into 09/04.
