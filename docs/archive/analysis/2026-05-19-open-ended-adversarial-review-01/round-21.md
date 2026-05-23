# Open-Ended Adversarial Review 21

## Finding 1: Word Editor XPL insert dialog advertises `c:out`, but the confirm path cannot insert it at all

**Where**

- `packages/word-editor-renderers/src/dialogs/expr-insert-dialog.tsx:37-63,65-76`
- `packages/word-editor-core/src/template-tags.ts:100-124`
- `packages/word-editor-renderers/src/__tests__/expr-insert-dialog.test.tsx:109-138`

**What**

The XPL insert dialog explicitly exposes `c:out` as an available tag choice:

```ts
const availableTags = [
  'c:if',
  'c:for',
  'c:forEach',
  'c:choose',
  'c:when',
  'c:otherwise',
  'c:set',
  'c:out',
];
```

But both the live preview/config path and the confirm path only look up `tag-open` variants:

```ts
const tagDef = findTagDefinition(selectedTag, 'tag-open');
if (!tagDef) return;
...
const currentTagDef = findTagDefinition(selectedTag, 'tag-open');
```

In core tag definitions, `c:out` is not a `tag-open` tag. It exists only as:

```ts
{
  name: 'c:out',
  kind: 'tag-selfclose',
  defaultAttrs: { value: '' },
}
```

and `findTagDefinition(...)` does not even accept `tag-selfclose` as a lookup kind.

So if a user switches the dialog to XPL mode, selects `c:out`, and clicks confirm, the dialog does this:

```ts
const tagDef = findTagDefinition('c:out', 'tag-open');
if (!tagDef) return;
```

which means the insert path exits early and no insertion occurs.

This is not a hypothetical edge case. The dialog's own dropdown advertises `c:out` as a supported choice.

**Why it matters**

This is a live authoring-surface contract break. The UI offers a concrete built-in template tag that the confirm path cannot produce.

That matters more than a missing enhancement because the failure is silent: the user can choose a visible option from the supported list, click confirm, and get no inserted output. There is no validation error, no disabled state, and no narrowing of the options list to match what the implementation actually supports.

It also shows a second independent place where the renderer-side API assumes all XPL choices are `tag-open`, even though the core model has a richer tag-kind space.

**Confidence**

High. The live dialog includes `c:out` in `availableTags`, but the confirm path hardcodes `findTagDefinition(..., 'tag-open')`, while core defines `c:out` only as `tag-selfclose`.

**Non-duplication note**

This is distinct from:

- `round-19`, which was about supported E2E coverage never proving template-expression insertion
- `round-20`, which was about renderer helper APIs collapsing self-closing tags into `tag-open` when using toolbar/snippets insertion

Here the narrower live defect is specific to the dialog path: the XPL dropdown advertises `c:out`, but confirm cannot insert it at all because the dialog only resolves `tag-open` definitions.

---

## Round summary

This round found a second live Word Editor template-tag drift, this time in the dialog authoring path rather than the toolbar/snippets helper. The next productive slice is to keep checking whether other renderer-owned dialogs expose option sets that are broader than the live command/definition kinds they can actually execute.
