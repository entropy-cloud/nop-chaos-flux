# Open-Ended Adversarial Review 15

## Finding 1: Component Lab `tag-list` E2Es ignore the page's visible result text and only assert scope-debug state

**Where**

- `tests/e2e/component-lab/complex-form.spec.ts:90-125`
- `apps/playground/src/component-lab/renderers/tag-list-lab-page.tsx:7-18,27-40`

**What**

The `tag-list` lab pages already expose user-visible result text:

```ts
{ type: 'text', text: 'Current tags: ${(tags ?? []).join(", ") || "(none)"}' }
{ type: 'text', text: '${(labels ?? []).length} label(s) added' }
```

But the supported E2Es do not assert those visible outputs.

The first test is named:

```ts
test('write: pre-populated tags render and toggling a tag updates the live text', ...)
```

yet after toggling `typescript` it only checks that `scope-debug-json` no longer contains `"typescript"`.

The second test is named:

```ts
test('write: empty tag-list scenario adds a label and updates the count', ...)
```

yet after clicking `bug` it only checks that `scope-debug-json` now contains `"bug"`; it never verifies the visible `1 label(s) added` text.

So both tests claim to protect visible behavioral output, while the assertions stop at debug-state inspection.

**Why it matters**

This is another supported main-suite false-confidence pattern. The page already gives the suite a stable, user-facing assertion surface for the exact behaviors the titles promise. If the visible text/count stops updating while the underlying scope state still changes, both specs remain green.

That means the tests currently protect internal state changes better than the actual rendered feedback users see.

**Confidence**

High. The visible result text and the missing assertions are explicit in live code.

**Non-duplication note**

This is narrower than the earlier generic Component Lab smoke findings. It is also distinct from the array-field and variant-field result-channel gaps: here the page already exposes the exact live text/count the test titles mention, but the supported E2Es still choose scope-debug assertions instead.

---

## Round summary

This round found two more supported tests that bypass a user-visible result channel in favor of debug-state assertions. The next strong slice is to keep looking for Component Lab scenarios where the renderer already emits stable visible outcome text, but the E2E only checks `scope-debug-json`.
