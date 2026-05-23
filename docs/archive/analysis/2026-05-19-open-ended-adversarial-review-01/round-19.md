# Open-Ended Adversarial Review 19

## Finding 1: Word Editor's supported `Template Expression Insertion` suite never tests insertion

**Where**

- `tests/e2e/word-editor-template-expr.spec.ts:31-109`
- `packages/word-editor-renderers/src/toolbar/template-controls.tsx:16-33`
- `packages/word-editor-renderers/src/dialogs/expr-insert-dialog.tsx:37-63,165-171`

**What**

The supported Playwright suite is explicitly named:

```ts
test.describe('Template Expression Insertion', () => {
```

and the live feature clearly has a real insertion path:

```ts
<ExprInsertDialog
  ...
  onInsert={(expr) => {
    onInsertExpr(expr);
    setShowExprDialog(false);
  }}
/>
```

with dialog confirm calling:

```ts
onInsert(`\${${expression.trim()}}`);
...
onClose();
```

for EL expressions, and analogous insertion for XPL tags.

But the supported E2E suite never executes that path end to end. It only checks:

- the toolbar button is visible
- clicking it opens the dialog
- EL tab is default
- XPL tab can be selected
- the tag dropdown lists options
- Cancel closes the dialog

There is no test that fills an expression, clicks the dialog confirm button, and verifies any inserted text reaches the editor surface.

So despite the suite name, the supported E2Es currently cover dialog chrome and option wiring, not template-expression insertion.

**Why it matters**

This is a supported-suite false-confidence issue. A regression that leaves the dialog opening correctly but breaks `onInsert`, confirm-button wiring, editor insertion, selection targeting, or post-insert content updates would still leave the entire `Template Expression Insertion` suite green.

That is particularly misleading because insertion is the primary behavior named by the suite and by the feature surface itself. The current coverage protects setup UI around insertion, not insertion.

**Confidence**

High. The live E2E suite contains no confirm-path assertion, while the runtime insertion callback is explicit in the renderer code.

**Non-duplication note**

This is distinct from:

- `round-02` finding 5, which was about the generic Word Editor typing test not proving editor state changed
- `round-05` finding 2, which was about explicit save being masked by autosave

Here the narrower issue is that a dedicated supported suite named for template-expression insertion never verifies that any expression is actually inserted.

---

## Round summary

This round found another supported Word Editor test surface whose name overstates what the suite really protects. The next productive slice is to keep scanning supported suites whose `describe` or test titles name a specific end-user action, then verify whether they actually assert the terminal effect of that action rather than only dialog or toolbar chrome.
