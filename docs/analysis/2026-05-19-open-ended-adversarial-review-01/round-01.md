# Open-Ended Adversarial Review — 2026-05-19 — Round 01

**Execution date**: 2026-05-19
**Result directory**: `docs/analysis/2026-05-19-open-ended-adversarial-review-01/`
**Exploration areas**: `flux-react`, `flux-runtime`, `flux-compiler`, `tests/e2e`, `flux-bundle`, `ui`
**Discovery source**: open-ended live code reading, cross-check against prior adversarial reviews and adjudications

---

## Finding 1: Page-root validation owner can keep a stale old compiled model after schema replacement

- **Where**:
  - `packages/flux-react/src/schema-renderer.tsx:81-93`
  - `packages/flux-react/src/schema-renderer.tsx:167-171`
  - `packages/flux-runtime/src/runtime-owned-factories.ts:182-193`
  - `packages/flux-runtime/src/form-runtime-owner-lifecycle.ts:31-123`
- **What**: `SchemaRenderer` creates one page runtime and one page-root validation owner per renderer instance, then refreshes that owner only when the newly compiled root is a single node with a `validationPlan`. If the schema previously had a root validation plan and is later replaced with an array root or a root without `validationPlan`, the effect returns early and never clears or detaches the old compiled model.
- **Why it matters**: the page-root owner can keep validating old paths and keep publishing old readiness/validity semantics for a schema tree that is no longer mounted. This is not the already-known "no plan stays bootstrapping" problem; it is a stale-model reuse bug that appears only after a real schema transition.
- **Confidence**: Certain
- **Non-duplication note**: recent validation reports focused on owners staying in `bootstrapping` when no plan exists. This is a different residual: an already-active owner keeps the previous model when the new schema no longer attaches one.

---

## Finding 2: `scopeKey` is treated as the real `scope.id`, so repeated child scopes can collide and dispose each other

- **Where**:
  - `packages/flux-runtime/src/runtime-factory.ts:343-366`
  - `packages/flux-react/src/node-renderer.tsx:188-216`
  - `packages/flux-runtime/src/async-data/source-registry.ts:110-117`
  - `packages/flux-runtime/src/async-data/source-registry.ts:317-333`
  - `packages/flux-runtime/src/async-data/reaction-runtime.ts:468-475`
  - `packages/flux-runtime/src/async-data/reaction-runtime.ts:556-572`
- **What**: `createChildScope()` uses `options.scopeKey` directly as `scope.id`. `NodeRenderer` creates import-binding scopes with `scopeKey: `${props.node.id}:imports``, which is identical for every live instance of the same compiled node. Runtime source/reaction registries bucket ownership by `scope.id`, and `disposeScope(scopeId)` tears down by that same id.
- **Why it matters**: repeated or concurrent instances of the same compiled node can share one synthetic scope id. Later instances overwrite earlier owned disposers, one instance can dispose another instance's source/reaction bucket, and debug ownership becomes cross-wired. This is a real owner-identity bug, not just a cosmetic naming issue.
- **Confidence**: Certain
- **Non-duplication note**: this is broader than earlier surface-specific scope-id findings. The core problem is that `scopeKey` is being promoted to globally meaningful owner identity inside runtime registries.

---

## Finding 3: Schema validation runs `beforeCompile` plugins twice while normal compile runs them once

- **Where**:
  - `packages/flux-compiler/src/schema-compiler/validation-compiler.ts:34-68`
  - `packages/flux-compiler/src/schema-compiler.ts:44-66`
- **What**: `createValidateSchemaInput()` first calls `applyBeforeCompilePlugins(schema)`, then passes that result into `compileSchemaToTemplateNodes()`, which immediately calls `applyBeforeCompilePlugins()` again. Normal compilation only runs the hook once.
- **Why it matters**: validation and compilation no longer mean the same thing at the plugin boundary. Any non-idempotent plugin can inject duplicated transforms, duplicated synthetic imports/fields, or diagnostics that do not match actual compilation output. Plugin authors are not warned that validation may invoke their transform twice.
- **Confidence**: Certain
- **Non-duplication note**: this is distinct from the previously reported shared `cidState` mutation. The defect here is validate-vs-compile semantic drift at the plugin lifecycle boundary.

---

## Finding 4: The shared E2E error gate globally suppresses real WebSocket failures

- **Where**:
  - `tests/e2e/fixtures.ts:53-73`
  - `tests/e2e/fixtures.ts:104-115`
- **What**: `KNOWN_NOISE_PATTERNS` filters out any console/page error containing `WebSocket connection` before both zero-error assertions and allowance checks run.
- **Why it matters**: the repo's supported Playwright baseline treats page-entry console/page errors as a hard contract, but one whole class of real transport/runtime regressions is silently whitelisted for every fixture-managed page. A broken client socket, HMR/runtime connection regression, or host transport failure can now go green across the suite just by matching that substring.
- **Confidence**: Certain
- **Non-duplication note**: this is not the already-fixed untracked-page no-op defect. Even correctly fixture-managed pages can still hide genuine failures here.

---

## Finding 5: `check-flux-bundle-pack` verifies the source stylesheet, not the packed tarball stylesheet

- **Where**:
  - `scripts/check-flux-bundle-pack.mjs:42-53`
  - `scripts/check-flux-bundle-pack.mjs:106-109`
  - `scripts/prepare-flux-bundle-dist.mjs:12-29`
  - `packages/flux-bundle/src/index.test.tsx:23-25`
  - `packages/flux-bundle/src/index.test.tsx:79-89`
- **What**: the pack check confirms that `package/dist/style.css` exists in the tarball, but the actual content assertion reads `packages/flux-bundle/src/style.css` from the workspace. The unit test has the same blind spot: it compares source-side files, not the packed artifact.
- **Why it matters**: CI can claim the published bundle is valid while the shipped `dist/style.css` is stale, corrupted, or produced differently from source. This is especially important because the bundle CSS path already had recent drift incidents; the release guard is still checking the wrong file.
- **Confidence**: Certain
- **Non-duplication note**: different from the older bundle-style drift bug. That was about source semantics drifting; this is about the release verifier never reading the real tarball CSS payload.

---

## Finding 6: Drawer "container" support is fake containment because the rendered surface stays `position: fixed`

- **Where**:
  - `packages/flux-react/src/dialog-host.tsx:209-231`
  - `packages/ui/src/components/ui/drawer.tsx:65-77`
  - `packages/ui/src/components/ui/drawer.tsx:84-97`
  - `packages/ui/src/components/ui/drawer.tsx:109-135`
- **What**: `DialogHost` resolves a `containerElement` and passes it into `Drawer`, and `DrawerPortal` does mount into that container. But the overlay, viewport, and popup are all still rendered with `fixed` positioning.
- **Why it matters**: a supposedly contained drawer still escapes to the viewport instead of being spatially contained by the host element. That breaks embedding assumptions, local stacking, and host-isolated surfaces. The API advertises container targeting, but the main geometry still behaves like a page-global overlay.
- **Confidence**: High
- **Non-duplication note**: this is not the old container-registry stale-ref bug. Even with the correct container element, drawer placement still ignores containment at render time.

---

## Round Assessment

This round's dominant pattern is **boundary contracts that look owned but are not actually enforced end to end**:

- validation owners can retain old compiled state after the visible schema moved on
- child-scope identity hints leak into global runtime ownership keys
- compile-time plugin contracts diverge between `validate()` and real `compile()`
- test and packaging guardrails check a nearby proxy instead of the actual thing being shipped or exercised
- drawer containment exposes a targeting API without matching geometry semantics

The most important immediate directions are:

1. **Owner lifecycle symmetry**: when a new schema stops providing a model, page-root validation needs a real detach/reset path, not only an attach path.
2. **Identity hygiene**: `scopeKey` should not double as globally authoritative owner id when registries and disposal trees depend on uniqueness.
3. **Trustworthy guardrails**: E2E and packaging checks need to validate the real runtime artifact/path, not filtered or source-side stand-ins.

## Blind-Spot Self-Assessment

This round stayed mostly in runtime/compiler/test glue. I did not deeply inspect report-designer, flow-designer, or spreadsheet internals beyond de-duplication checks, and I did not execute browser repros for the drawer containment issue. The next best cut is cross-surface lifecycle reuse and host-action/provider edges, especially where surface/runtime contracts look unified in docs but still fork in concrete adapters.
