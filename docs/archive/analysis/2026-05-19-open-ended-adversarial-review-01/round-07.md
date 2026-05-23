# Open-Ended Adversarial Review 07

## Finding 1: `report-designer-demo` has a supported E2E that claims toolbar actions are available, but it only proves buttons exist

**Where**

- `tests/e2e/report-designer-demo.spec.ts:98-105`
- `packages/report-designer-renderers/src/report-designer-toolbar.tsx:28-69,117-155`
- `packages/report-designer-renderers/src/report-designer-toolbar-defaults.ts:3-41`

**What**

The supported Playwright spec is named:

```ts
test('toolbar actions are available to the spreadsheet editor', async ({ page }) => {
```

but the assertions only count visible toolbar buttons and check first/last visibility:

```ts
const toolbarButtons = page.locator('.rd-toolbar button');
const count = await toolbarButtons.count();
expect(count).toBeGreaterThan(10);
await expect(toolbarButtons.first()).toBeVisible();
await expect(toolbarButtons.last()).toBeVisible();
```

It never clicks `Undo`, `Redo`, `Preview`, `Stop`, or `Save`, and never verifies that any toolbar item reaches `props.helpers.dispatch(...)`, produces a runtime state change, or reports a failure correctly.

That matters because the live toolbar implementation is action-driven: every button/switch goes through `handleButtonClick(item)` and then through `props.helpers.dispatch(command)`. The current E2E does not exercise that path at all.

**Why it matters**

This is more than a generic coverage gap. The test title and its placement in the main supported E2E suite tell readers and CI that toolbar actions are available, while the body only proves chrome is rendered. A regression that leaves the toolbar visually intact but breaks dispatch wiring, command mapping, or action failure handling would still keep this spec green.

That creates false confidence precisely on a surface where the repo has already carried real toolbar-contract regressions.

**Confidence**

High. The spec body is explicit and contains no interaction with any toolbar action.

**Non-duplication note**

Older reports already noted that Report Designer lacks stronger end-to-end closure on key paths. This is narrower and different: a current supported E2E explicitly claims action availability while asserting only button presence.

---

## Round summary

This round found one more misleading supported test: the Report Designer toolbar E2E currently certifies visible chrome, not working actions. The next best cut is to keep scanning supported E2E names/assertions for similar “behavioral” claims that only check presence.
