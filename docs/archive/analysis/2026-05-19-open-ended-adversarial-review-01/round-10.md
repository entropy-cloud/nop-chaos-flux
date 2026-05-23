# Open-Ended Adversarial Review 10

## Finding 1: Flow Designer edge-creation E2E claims to test handle drag interaction, but it uses a test-only event bypass

**Where**

- `tests/e2e/flow-designer-edge-creation.spec.ts:10-31`
- `packages/flow-designer-renderers/src/designer-page-body.tsx:313-328`

**What**

The supported E2E is named:

```ts
test('creates a new edge through handle drag interaction', async ({ page }) => {
```

but it never performs any pointer drag between connection handles. Instead it injects a custom window event:

```ts
await page.evaluate(() => {
  window.dispatchEvent(
    new CustomEvent('nop-designer:test-connect', {
      detail: {
        source: 'task-1',
        target: 'end-1',
      },
    }),
  );
});
```

and the runtime listens for that event and directly dispatches `addEdge`:

```ts
const handleTestConnect = (event: Event) => {
  const detail = (event as CustomEvent<DesignerTestConnectDetail>).detail;
  ...
  dispatch({
    type: 'addEdge',
    source: detail.source,
    target: detail.target,
    ...
  });
};
```

So the test does not cover handle hit testing, pointer gesture wiring, drag lifecycle, connect preview, or any browser-level interaction path. It covers a test hook that directly synthesizes the post-validated connect command.

**Why it matters**

This is another misleading green in the supported suite. The test name tells readers and CI that edge creation through the real canvas interaction is protected, but a regression in handle DOM wiring, pointer capture, drag thresholds, or react-flow connection plumbing would still leave this spec green as long as the test hook and `addEdge` dispatch remain intact.

That is especially risky for Flow Designer because handle-to-handle creation is exactly the user-facing integration path most likely to break under visual or event-layer refactors.

**Confidence**

High. The spec body and runtime test hook are explicit in live code.

**Non-duplication note**

This is not the earlier generic E2E-quality or Flow Designer toolbar-contract family. It is a narrower issue: a current supported edge-creation test explicitly claims real drag interaction coverage while exercising only a test-event shortcut.

---

## Round summary

This round found one more supported E2E whose title overstates the behavior it protects. The next productive slice is to keep targeting interaction-heavy tests where the body may be calling shortcuts or test hooks instead of the real browser path named by the title.
