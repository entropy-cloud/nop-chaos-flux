# 146 dompurify Dependency Drift + Invariant Registry Anchor Line-Number Drift (multi P2-15 / P2-16)

## Problem

- **multi P2-15**: `@nop-chaos/flux-renderers-ai` declared `dompurify` as a non-optional `peerDependency` + a `devDependency` with ZERO in-package imports — the package delegates sanitization to `@nop-chaos/flux-renderers-content` (`sanitizeHtml`, markdown.tsx), so hosts were forced to install a dependency the package never uses.
- **multi P2-16**: `docs/audits/ai-invariants/invariant-catalog.md` + `gates.md` recorded live `文件:行` anchors that drifted +108~+185 after Cycle 2 / I4 and the 2026-08-10 double-audit fixes (e.g. `createConversation :263` → live `:385`, `clearAll :390` → live `:589`) — audit/maintenance readers navigating by the catalog would land on wrong lines; the §2.6 "2026-08-09 live 核对全部一致" statement falsely implied the anchors were current.
- Evidence: multi-audit `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md` P2-15 / P2-16.

## Diagnostic Method

- P2-15: grep `dompurify` across the package — only comments; `import` zero. Lockfile importer block verified clean after removal.
- P2-16: every anchor in catalog §2/§4/§9/§10 + gates.md 注册红 table re-verified against live `create-engine.ts` / `use-conversation.ts` / `engine/types.ts` (rg + targeted reads), with a before/after table recorded in plan `2026-08-10-1606-3` Phase 5.

## Root Cause

- The dompurify entry predates the sanitization delegation decision (Adjudication 01-05: ai→content coupling) and was never pruned.
- The registry anchors were frozen at I0/§2 (2026-08-09) while the code kept evolving; nothing in the maintenance loop refreshed them, and §2.6's "全部一致" claim made the drift invisible.

## Fix

- Removed both `dompurify` declarations from `package.json`; `pnpm install --lockfile-only` regenerated the lockfile importer (other packages that genuinely own dompurify keep their entries).
- Calibrated every drifted anchor in invariant-catalog.md (§2.1-2.6, §4.1-4.3, §5, §7.4, §9.1-9.5, §10/§11 headers) and gates.md (注册红 table + ⑧ scanner note); replaced the §2.6 stale date claim with the 2026-08-10 calibration stamp + an explicit "anchors drift as code evolves — re-verify live" note; catalog/gates Status headers updated.

## Tests

- `pnpm check:workspace-manifest-deps` exit 0 (zero declared-but-unreferenced / undeclared-import hits after the removal).
- `check:ai-engine-invariants` exit 0 (unchanged semantics, zero new hits); `check:active-doc-code-anchors` 329 docs pass.

## Affected Files

- `packages/flux-renderers-ai/package.json` / `pnpm-lock.yaml`
- `docs/audits/ai-invariants/invariant-catalog.md` / `docs/audits/ai-invariants/gates.md`

## Notes For Future Refactors

- The AI package's sanitization boundary is `@nop-chaos/flux-renderers-content` (`sanitizeHtml`); never add a direct dompurify dependency without a consumer.
- Invariant-registry anchors are point-in-time snapshots: after any engine/adapter code change that shifts method bodies, re-verify the catalog's `文件:行` anchors in the same change (or record the drift with a timestamp note) — the registry is a navigation aid, not a substitute for live grep.
- Dependency hygiene: workspace-manifest-deps flags declared-but-unreferenced deps; keep peer/dev declarations in sync with actual imports at PR time.
