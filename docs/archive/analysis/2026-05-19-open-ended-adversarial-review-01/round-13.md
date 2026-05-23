# Open-Ended Adversarial Review 13

## Finding 1: Component Lab `array-field` E2E stops at scope-debug growth and never verifies the scenario's promised submit result

**Where**

- `tests/e2e/component-lab/complex-form.spec.ts:257-275`
- `apps/playground/src/component-lab/renderers/array-field-lab-page.tsx:41-68,83-87`

**What**

The supported test is named:

```ts
test('write: add a contact row and verify the array scope grows by one item', async ({ page }) => {
```

and the scenario it exercises is documented as:

```ts
'Starts empty. Add contacts with name and email, then submit. The success message shows how many contacts were saved.';
```

But the E2E never fills contact data, never submits, and never checks the promised success message. It only clicks the add button and inspects scope-debug output:

```ts
await addButton.click();
await expect(stage.locator('[data-slot="scope-debug-json"]')).toContainText('"contacts": [ {} ]');
await expect(stage.getByRole('button', { name: 'Submit' })).toBeVisible();
```

So the test covers one intermediate authoring step, not the user-facing submit/result contract that the scenario itself advertises.

**Why it matters**

This is another supported main-suite test whose title and scenario positioning imply a stronger write path than the assertions protect. A regression where `array-field` can still add empty rows locally but submit no longer saves contacts or no longer updates the result message would keep this spec green.

That makes the current test misleading in the same way as the other recent findings: it certifies an internal intermediate state while the scenario and test naming suggest an end-to-end writeback outcome.

**Confidence**

High. The test body never fills item fields, never clicks `Submit`, and never asserts `Contacts saved! Count: ...`.

**Non-duplication note**

Earlier audits already noted that some Component Lab tests promise bound-value or write behavior too broadly. This is narrower and new: a specific current supported `array-field` scenario whose documented submit-result contract is not exercised at all.

---

## Round summary

This round found another supported write-path test that stops at an intermediate debug-state assertion rather than the scenario's promised submit outcome. The next good slice is to keep checking Component Lab scenarios whose descriptions promise post-submit result text, saved counts, or viewer updates while the tests never execute submit.
