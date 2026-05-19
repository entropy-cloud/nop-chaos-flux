# Open-Ended Adversarial Review 08

## Finding 1: Component Lab CRUD quick-edit E2Es claim row persistence, but they mostly verify editor-local state

**Where**

- `tests/e2e/component-lab/crud-editing-and-selection.spec.ts:12-47`
- `apps/playground/src/component-lab/renderers/crud-lab-page.tsx:443-447`

**What**

The supported CRUD E2E suite contains two behavior-titled tests:

```ts
test('supports inline quick edit and persists the updated row value', ...)
test('supports dialog quick edit shell and updates the row value on save', ...)
```

But the first test only fills the inline quick-edit input, clicks save, and then re-reads the same inline editor input:

```ts
await input.fill('Alpha Prime');
await inlineEditor.getByRole('button', { name: /保存|save/i }).click();
await expect(inlineEditor.locator('input[name="quick-edit-name"]')).toHaveValue('Alpha Prime');
```

That does not prove the row model persisted, the table cell updated, or the CRUD owner committed anything beyond the still-mounted editor shell.

The second test is even more revealing: after saving `Status = review`, it explicitly checks that the visible inline editor for `quick-edit-name` still says `Alpha`, then reopens the dialog and verifies only the dialog field value:

```ts
await expect(stage.locator('input[name="quick-edit-name"]').first()).toHaveValue('Alpha');
...
await expect(reopenedDialog.getByLabel('Status')).toHaveValue('review');
```

So the current assertions never verify that the rendered row value changed in the table, nor that the underlying CRUD row/scope data was updated.

**Why it matters**

These tests live in the supported main E2E suite and read like end-to-end proof of quick-edit persistence. In practice they mainly certify that the quick-edit shells stay open/close correctly and can preserve local form state. A regression where save no longer commits back to the row data, but the editor shell keeps its own draft value, would still leave these tests green.

That is exactly the kind of false confidence that makes CRUD writeback regressions hard to catch: the test names promise owner-level persistence while the assertions stop at component-local state.

**Confidence**

High. The assertions are explicit and never inspect any table cell text, scope-debug output, or reopened row data outside the editing shell.

**Non-duplication note**

This is not a generic Component Lab coverage complaint. It is a narrower issue about two current supported E2Es whose titles promise persisted row updates while their bodies only prove editor-shell state.

---

## Round summary

This round found another pair of misleading supported E2Es in the CRUD lab. The next best cut remains the same: keep auditing behavior-titled supported specs for assertions that stop at visible chrome or editor-local state instead of validating the promised owner-level writeback.
