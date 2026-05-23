# Open-Ended Adversarial Review 20

## Finding 1: Word Editor template-tag insertion collapses self-closing tags into open tags

**Where**

- `packages/word-editor-renderers/src/hooks/use-word-editor-actions.ts:96-103`
- `packages/word-editor-renderers/src/panels/template-snippets.tsx:21-24,47-52`
- `packages/word-editor-renderers/src/toolbar/template-controls.tsx:22-24`
- `packages/word-editor-core/src/template-tags.ts:100-105`
- `packages/word-editor-core/src/canvas-editor-bridge.ts:126-142`
- `packages/word-editor-core/src/template-expr.ts:62-67`

**What**

The renderer-side insertion API currently erases tag kind and keeps only the tag name:

```ts
const handleInsertTag = useCallback(
  (tagName: string) => {
    bridge.insertTemplateExpression({
      kind: 'tag-open',
      expr: '',
      tagName,
    });
  },
  [bridge],
);
```

Both insertion surfaces call that narrowed API:

- toolbar quick buttons: `If Block`, `For Loop`, `Output`
- `TemplateSnippets`, which explicitly includes both `tag-open` and `tag-selfclose` entries

But in core tag definitions, `c:out` is not an opening tag at all. It is defined only as:

```ts
{
  name: 'c:out',
  kind: 'tag-selfclose',
  defaultAttrs: { value: '' },
}
```

and the bridge renders different display/url shapes based on `expr.kind`:

- `tag-open` -> `<tagName>`
- `tag-selfclose` -> `<tagName />`

So when the UI asks to insert `c:out`, the renderer still forces:

```ts
{ kind: 'tag-open', tagName: 'c:out' }
```

which produces an opening-tag form for something the core model explicitly defines as self-closing.

**Why it matters**

This is a live cross-layer contract drift between the renderer insertion API and the core template-expression model. The UI advertises `Output Value` as a supported snippet, but the insertion path cannot preserve the tag kind needed to represent it correctly.

That means the current surface is structurally incapable of inserting some valid built-in template tags faithfully. It is not just missing nicer defaults; it changes the tag's syntax class.

Because the same `handleInsertTag(tagName)` shape is shared by both toolbar shortcuts and the snippets panel, the drift affects every renderer-side tag insertion entry point that relies on tag names alone.

**Confidence**

High. The live renderer passes only `tagName` and hardcodes `kind: 'tag-open'`, while the core model explicitly defines `c:out` as `tag-selfclose` only.

**Non-duplication note**

This is different from the earlier Word Editor test-quality findings. Those were about supported E2Es overstating insertion/save coverage. This is a runtime/model defect: the renderer insertion API itself cannot faithfully express all built-in template tag kinds.

---

## Round summary

This round found a new live renderer/core contract drift in Word Editor rather than another weak E2E. The next productive slice is to keep checking places where renderer-level helper APIs collapse richer core discriminants (`kind`, payload shape, result type) into weaker name-only calls.
