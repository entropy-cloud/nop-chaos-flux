# Open-Ended Adversarial Review 14

## Finding 1: Component Lab `variant-field` E2E never verifies the submitted output shape that the page exposes for this scenario

**Where**

- `tests/e2e/component-lab/complex-form.spec.ts:283-325`
- `apps/playground/src/component-lab/renderers/variant-field-lab-page.tsx:9-18,49-51,70-72,78-89,99-101`

**What**

The `variant-field` lab is wired to publish an explicit post-submit result string:

```ts
text: '${submittedVariantText ?? "Switch type, edit, and submit to verify output shape."}';
```

and `onSubmitSuccess` computes that result differently for string vs list values:

```ts
'${ISARRAY(filterValue) ? "LIST => " + JOIN(filterValue ?? [], ", ") : "TEXT => " + (filterValue ?? "")}';
```

So the page has a first-class supported contract for verifying output shape after submit.

But the supported E2E never asserts that output. It switches to the list tab and only checks local UI state plus `scope-debug-json`, then switches back to the text tab, submits once, and still only rechecks `scope-debug-json`:

```ts
await stage.getByRole('button', { name: 'Submit Filter Value' }).click();
await expect(stage.locator('[data-slot="scope-debug-json"]')).toContainText(
  '"filterValue": "priority = high"',
);
```

It never asserts the visible result text such as `TEXT => priority = high`, and never submits the list variant at all, even though the list branch text explicitly says `Add/remove rows to verify list output.`

**Why it matters**

This is another supported main-suite test that stops at intermediate runtime state while the scenario already exposes a stronger, user-visible contract. A regression where submit stops producing the right output-shape result string, or where the list variant submits the wrong representation, would still keep this spec green.

That makes the current test misleading: it looks like a full variant-switch and submit contract, but it really only checks tab switching plus in-flight bound state.

**Confidence**

High. The page's result-output contract and the missing assertions are both explicit in code.

**Non-duplication note**

This is distinct from the array-field submit-result gap. There the scenario promised a saved-count message after submit. Here the page explicitly publishes type-shaped submit output for both string and list variants, but the supported E2E never verifies that output.

---

## Round summary

This round found another supported write-path test that validates intermediate state but not the page's explicit post-submit result contract. The next strong slice is to keep looking for scenarios that already expose a result message or viewer update channel, while the tests stop at scope-debug or local editor state.
