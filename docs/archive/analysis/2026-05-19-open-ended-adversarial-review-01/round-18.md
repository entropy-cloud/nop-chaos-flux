# Open-Ended Adversarial Review 18

## Finding 1: Flow Designer E2E claims to verify toolbar and quick-action behavior, but it never touches either surface

**Where**

- `tests/e2e/flow-designer-ui.spec.ts:192-212`
- `packages/flow-designer-renderers/src/designer-toolbar.tsx:102-165`
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:274-309`
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-edge.tsx:135-164`

**What**

The supported E2E is named:

```ts
test('verifies flow-designer button behaviors for toolbar and quick actions', async ({ page }) => {
```

but the body never interacts with the top toolbar or the hover quick-action surfaces.

Instead it does only two things:

```ts
await addTaskButton.click();
await expect(nodeCount).toHaveCount(7);

await createdNode.click();
const inspectorDeleteNodeButton = page.getByRole('button', { name: '删除节点' }).first();
await inspectorDeleteNodeButton.click();
await expect(nodeCount).toHaveCount(6);
```

So the test exercises:

- a palette add button
- an inspector delete button

but it never clicks any actual top-toolbar command such as `JSON`, `Undo`, `Redo`, or `Save`, and it never opens or uses node/edge quick-action controls such as the hover toolbar under `[data-slot="designer-node-toolbar"]` or `[data-slot="designer-edge-actions"]`.

That makes the title materially overstated relative to the assertion surface.

**Why it matters**

This is a supported-suite false-confidence issue, not just a generic coverage gap. The test name tells readers and CI that toolbar behavior and quick-action behavior are protected. In reality, regressions isolated to either of those two UI surfaces would still leave this spec green as long as palette insertion and inspector deletion keep working.

That distinction matters because Flow Designer exposes multiple command-entry surfaces with different wiring paths: palette buttons, top-toolbar buttons, inspector actions, and hover quick actions. This test currently certifies only two of them while claiming much broader interaction coverage.

**Confidence**

High. The live spec body is explicit and contains no toolbar-button clicks and no quick-action interactions.

**Non-duplication note**

This is distinct from:

- `round-10`, which was about the edge-creation test using a test hook instead of real drag interaction
- `round-07`, which was about the Report Designer toolbar test proving only button presence

Here the narrower issue is that a current Flow Designer test title explicitly claims behavior coverage for `toolbar and quick actions`, while the body exercises neither surface.

---

## Round summary

This round found another supported E2E whose title significantly overclaims the interaction surfaces it protects. The next productive slice is to keep scanning non-Component-Lab supported specs for tests whose names mention specific UI surfaces or workflows, but whose bodies only exercise adjacent controls.
