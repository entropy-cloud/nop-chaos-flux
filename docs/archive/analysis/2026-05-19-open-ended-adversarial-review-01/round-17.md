# Open-Ended Adversarial Review 17

## Finding 1: Component Lab `flex` tag-cloud E2E claims to verify the rendered cloud, but only asserts empty debug state

**Where**

- `tests/e2e/component-lab/layout-content.spec.ts:130-138`
- `apps/playground/src/component-lab/renderers/flex-lab-page.tsx:68-85,107-111`

**What**

The `flex` lab has a scenario explicitly named:

```ts
title: 'Wrapped row for tag clouds';
```

and the schema renders a concrete visible badge cloud:

```ts
{ type: 'badge', label: 'React' }
{ type: 'badge', label: 'TypeScript' }
{ type: 'badge', label: 'Zustand' }
{ type: 'badge', label: 'Tailwind' }
{ type: 'badge', label: 'Vite' }
{ type: 'badge', label: 'Vitest' }
{ type: 'badge', label: 'Recharts', variant: 'secondary' }
{ type: 'badge', label: 'Lucide', variant: 'secondary' }
```

But the supported E2E named:

```ts
test('read: wrapped flex row renders the full tag cloud', ...)
```

does not assert any of those visible badges. It only checks:

```ts
await expect(stage.locator('[data-slot="scope-debug-json"]')).toContainText('{}');
```

So the test title claims coverage of the rendered tag cloud, while the actual assertion surface says nothing about whether the cloud rendered, how many badges appeared, or whether wrap-mode children disappeared entirely.

**Why it matters**

This is the same false-confidence pattern as the earlier Component Lab result-channel findings, but in a pure layout/read case. The scenario already provides a stable visible contract: eight badge labels in a wrapped row. If a regression drops some children, fails to render badge labels, or breaks wrapped-row composition while leaving the debug scope empty, this test still passes.

That means the current supported suite claims to protect a concrete visual/layout outcome but really only protects that no local scope data was written.

**Confidence**

High. The live schema defines the visible badge cloud, and the test body never asserts any of it.

**Non-duplication note**

This is distinct from the earlier submit/writeback/scope-debug findings. Those were about user-visible result text being skipped in favor of internal state assertions. Here the gap is even more basic: a read-only layout scenario whose title promises rendered child coverage, but whose sole assertion is unrelated empty debug state.

---

## Round summary

This round found another supported E2E whose title substantially overclaims what is actually being verified. The next likely diminishing-returns slice is to scan remaining read-only Component Lab layout/style specs for cases where titles promise visible child rendering but assertions only touch incidental state.
