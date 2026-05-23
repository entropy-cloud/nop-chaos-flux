# Open-Ended Adversarial Review 09

## Finding 1: Component Lab `input-text` E2E claims to verify clearing behavior, but never performs a clear

**Where**

- `tests/e2e/component-lab/simple-form.spec.ts:105-116`
- `apps/playground/src/component-lab/renderers/input-text-lab-page.tsx:24-47,61-65`

**What**

The supported E2E test is named:

```ts
test('write: typing in text field and clearing updates value', async ({ page }) => {
```

but the body only fills the field once and asserts the filled value:

```ts
const searchInput = stage.getByLabel('Search');
await searchInput.fill('hello');
await expect(searchInput).toHaveValue('hello');
```

There is no clear step, no assertion that the value becomes empty again, and no check against the scenario's bound form state.

So the current test title promises a two-step behavior contract, while the implementation only covers basic typing.

**Why it matters**

This is a supported main-suite E2E, not an exploratory smoke. Readers and CI see a test that appears to protect both input entry and input clearing behavior for the `input-text` renderer. In reality, a regression where clearing no longer updates the bound value, leaves stale form state behind, or fails to propagate an empty string would still keep this spec green.

That makes the test misleading in exactly the way these recent E2E findings have been: the title advertises a stronger behavioral guarantee than the assertions actually provide.

**Confidence**

High. The entire test body is short and contains no clear interaction.

**Non-duplication note**

Older audits already noted that many Component Lab E2Es have drifted toward smoke coverage. This is narrower and new: a specific current supported test explicitly claims clearing behavior while never executing it.

---

## Round summary

This round found another concrete title/assertion mismatch in the supported Component Lab suite. The remaining productive path is to keep targeting tests whose names promise a multi-step mutation contract while their bodies only exercise the first half.
