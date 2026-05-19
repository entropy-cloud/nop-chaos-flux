# Open-Ended Adversarial Review 12

## Finding 1: Component Lab dialog and drawer writeback E2Es only prove the shell closes, not that writeback happened

**Where**

- `tests/e2e/component-lab/layout-content.spec.ts:161-183`
- `tests/e2e/component-lab/layout-content.spec.ts:190-209`
- `apps/playground/src/component-lab/renderers/dialog-lab-page.tsx:25-69,82-86`
- `apps/playground/src/component-lab/renderers/drawer-lab-page.tsx:3-53,91-95`

**What**

The Component Lab scenarios explicitly describe these as writeback flows:

- dialog: `Confirming writes the local form field back to the parent scope.`
- drawer: `Saving writes the local note field back to the parent scope.`

But the supported E2Es do not verify that the parent scope or visible summary text actually changed.

For the dialog case, the test fills `Full Name` and `Email`, confirms that the pre-submit text is still `Submitted name: (none)`, clicks `Confirm`, and then only checks that the dialog disappeared:

```ts
await expect(page.getByText('Submitted name: (none)')).toBeVisible();
await page.getByRole('button', { name: 'Confirm' }).click();
await expect(page.getByLabel('Full Name')).not.toBeVisible();
```

For the drawer case, it does the same pattern:

```ts
await expect(page.getByText('Submitted message: (none)')).toBeVisible();
await page.getByRole('button', { name: 'Save' }).first().click();
await expect(noteField).not.toBeVisible();
```

Neither test checks that `Submitted name: Jane Doe` or `Submitted message: My test note` ever appears after submit.

**Why it matters**

These are supported main-suite E2Es whose titles and scenario docs promise local-form writeback to parent scope. A regression where confirm/save still closes the shell but stops updating the parent value would keep both tests green.

That is a direct false-confidence problem: the current suite treats “close after submit” as equivalent to “writeback succeeded”, even though the page models and scenario docs treat those as separate behaviors.

**Confidence**

High. The scenario docs and the missing post-submit assertions are explicit in code.

**Non-duplication note**

This is distinct from the CRUD quick-edit findings. Those were about editor-shell state masquerading as persisted row updates. These are separate dialog/drawer flows where the documented parent-scope writeback is never asserted at all.

---

## Round summary

This round found two more supported writeback tests that stop at shell-closure assertions. The next productive slice remains behavior-titled dialog/drawer/detail flows whose scenario docs promise parent-scope updates but whose E2E assertions only verify local UI teardown.
