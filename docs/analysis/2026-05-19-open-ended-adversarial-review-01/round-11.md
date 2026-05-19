# Open-Ended Adversarial Review 11

## Finding 1: Component Lab back-button E2E bypasses the real click path with DOM `click()` because the button can be occluded

**Where**

- `tests/e2e/component-lab/navigation.spec.ts:56-68`

**What**

The supported navigation test is named:

```ts
test('back button navigates to home page', async ({ page }) => {
```

but the test body does not use a real Playwright click on the visible control. It explicitly documents that the real button can be overlapped and then fires a DOM click via `page.evaluate(...)`:

```ts
// The debugger launcher button can overlap the back button.
// Use JavaScript click to bypass occlusion.
await page.evaluate(() => {
  const btn = document.querySelector('[data-testid="component-lab-back"]') as HTMLElement;
  if (btn) btn.click();
});
```

So the spec proves only that the underlying click handler navigates when invoked programmatically. It does not prove that a user can actually click the back button in the supported UI.

**Why it matters**

This is another misleading green in the supported E2E suite. The title reads like a browser-level interaction guarantee for the back button, but the implementation skips the exact failure mode users would experience: the control being visually or interactively occluded.

If layout, z-index, hit testing, or debugger overlap regressions make the back button unclickable while leaving its handler intact, this spec will still pass.

That makes the current test especially risky because the test itself already documents the real UI problem and then masks it instead of treating it as a failing contract.

**Confidence**

High. The shortcut and its stated reason are explicit in the spec.

**Non-duplication note**

This is not the earlier generic Component Lab smoke-coverage theme. It is a narrower issue about a current supported navigation test bypassing the real user interaction path precisely where the UI is known to be flaky or obstructed.

---

## Round summary

This round found one more supported interaction test that succeeds by bypassing the user path it claims to cover. The next good cut is to continue checking supported navigation and dialog tests for `page.evaluate(...click())` or similar DOM shortcuts that hide actual hit-target regressions.
