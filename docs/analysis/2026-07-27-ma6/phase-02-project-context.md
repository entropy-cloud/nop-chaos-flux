# MA6 Phase 2 — project-context.md Audit

Audit date: 2026-07-27
Source doc: `docs/context/project-context.md` (68 lines)
Method: Cross-referenced every technical claim against `package.json`, `tsconfig*.json`, `.nvmrc`, `turbo.json`, `playwright.config.ts`, `pnpm-workspace.yaml`, and all 30 package manifests under `packages/`.

---

## Findings

### Finding 1: Node.js version requirement not documented

- **Severity:** P2
- **Location:** `docs/context/project-context.md:25` (Technical Baseline section)
- **Category:** missing-info
- **Doc claim:** No Node.js version mentioned anywhere in the document.
- **Reality:** `.nvmrc` at repository root specifies `25`. No `engines.node` field exists in root `package.json`. The doc should surface this requirement so agents know which runtime to expect.
- **Fix direction:** Add `"Node.js 25 (see .nvmrc)"` to the Current Technical Baseline list (line 25).

---

### Finding 2: TypeScript version duality not captured

- **Severity:** P3
- **Location:** `docs/context/project-context.md:25`
- **Category:** missing-info
- **Doc claim:** `TypeScript 6.0`
- **Reality:** The root `package.json` lists both `@typescript/typescript6@^6.0.0` (primary compiler, provides `tsc` binary) and `@typescript/native-preview@7.0.0-dev.20260421.2` (native Go-port preview, provides `tsgo` binary). Scripts include both `"tsc": "tsgo"` (default invokes TS 7.0 native preview) and `"tsc6": "tsc6"` (explicit TS 6.0). Per-package `typecheck` scripts use `tsc -p tsconfig.json` which resolves to the TS 6.0 compiler. The claim "TypeScript 6.0" is accurate for the primary compiler but omits the dual-toolchain reality.
- **Fix direction:** Rephrase to `TypeScript 6.0 (primary, with TS 7.0 native preview available via tsgo)`.

---

### Finding 3: Layer chain oversimplifies action-core position

- **Severity:** P3
- **Location:** `docs/context/project-context.md:29`
- **Category:** inaccurate-description
- **Doc claim:** `flux-core → flux-formula → flux-compiler → flux-action-core → flux-runtime → flux-react → flux-renderers-*`
- **Reality:** The linear chain implies `flux-compiler → flux-action-core` is a strict dependency edge. In fact, `flux-action-core` depends only on `flux-core` (its `package.json` lists no other flux workspace dependency). `flux-compiler` depends on `flux-core` and `flux-formula`, while `flux-action-core` is a sibling at the same layer level. The actual graph is:
  ```
  flux-core → {flux-formula → flux-compiler, flux-action-core} → flux-runtime
  ```
  and `flux-runtime` depends on all four (`flux-action-core`, `flux-compiler`, `flux-formula`, `flux-core`). The doc's linear chain is a reasonable simplification but technically imprecise.
- **Fix direction:** Replace `→` chain with a DAG notation or add a footnote clarifying parallel layers.

---

### Finding 4: Layer chain omits flux-i18n

- **Severity:** P3
- **Location:** `docs/context/project-context.md:29`
- **Category:** missing-info
- **Doc claim:** Layer chain ends with `flux-renderers-*`, no mention of `flux-i18n`.
- **Reality:** `flux-i18n` (internationalization) is a real workspace package (`packages/flux-i18n/`) that depends on `flux-core` and is a dependency of `flux-react`. It forms a cross-cutting layer not represented in the chain diagram. While arguably not part of the "rendering pipeline," it is a key dependency consumed by `flux-react` that agents need to know about.
- **Fix direction:** Add `flux-i18n` as a sibling or cross-cutting layer alongside `flux-core` in the chain description.

---

## Confirmed Accurate Claims

| Claim (doc line)                                             | Verification | Evidence                                                                                                                                                |
| ------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React 19 + React Compiler (L25)                              | ✅           | All packages pin `react@^19.0.0`; `babel-plugin-react-compiler@1.0.0` and `eslint-plugin-react-compiler@19.1.0-rc.2` in root devDependencies            |
| TypeScript 6.0 (L25)                                         | ✅           | `@typescript/typescript6@^6.0.0`, `ignoreDeprecations: "6.0"` in `tsconfig.base.json`, per-package scripts use `tsc` (resolves to TS 6)                 |
| Vite 8 (L25)                                                 | ✅           | `vite@^8.0.3` in root + playground devDependencies                                                                                                      |
| Zustand + vanilla stores via `use-sync-external-store` (L25) | ✅           | `zustand@^5.0.12` in 7 packages; `flux-react` directly depends on `use-sync-external-store@^1.6.0`                                                      |
| pnpm workspace + turbo (L26)                                 | ✅           | `packageManager: pnpm@10.0.0`, `turbo@^2.9.6`, `pnpm-workspace.yaml`, `turbo.json`                                                                      |
| Packages under `packages/` as `@nop-chaos/<name>` (L26)      | ✅           | 30 packages, all follow naming convention                                                                                                               |
| Tailwind v4, shadcn/ui, CSS variables (L27)                  | ✅           | `tailwindcss@^4.2.2`, `@tailwindcss/vite@^4.2.2`, `@nop-chaos/ui` uses `class-variance-authority`/`clsx`/`tailwind-merge`, no React ThemeProvider found |
| Vitest + Playwright e2e (L28)                                | ✅           | `vitest@^4.1.2`, `@playwright/test@1.59.1`; Playwright config `testDir: './tests/e2e'`; `tests/e2e/` directory exists                                   |
| All verification commands (L33–43)                           | ✅           | `pnpm install`, `dev`, `typecheck`, `build`, `test`, `test:e2e`, `lint`, `check` all resolved in root scripts                                           |
| Optional layers (L47–53)                                     | ✅           | All checked directories exist under `docs/`; `docs/retrospectives/` correctly absent                                                                    |
| AI Block Conditions (L57–61)                                 | ✅           | Logic consistent with `docs/context/ai-autonomy-policy.md`                                                                                              |
| Project identity (L11–15)                                    | ✅           | Name, product type, documentation freshness status all consistent with repo evidence                                                                    |

---

## Summary

- **4 findings** (1 P2, 3 P3)
- **0 P0/P1** — no critical version mismatches or incorrect-version errors
- **9 claims confirmed accurate** across all technical baseline categories
- The doc is generally fresh and accurate; the main gap is the undocumented Node.js 25 requirement (P2) and some nuance gaps around TypeScript duality and layer topology (P3).
