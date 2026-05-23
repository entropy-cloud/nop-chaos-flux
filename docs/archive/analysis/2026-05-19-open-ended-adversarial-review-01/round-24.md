# Open-Ended Adversarial Review 24

## Finding 1: Word Editor manifest publishes full `insertChart` / `insertCode` payload contracts, but the live provider only enforces `id + name`

**Where**

- `packages/word-editor-renderers/src/word-editor-manifest.ts:10-34,143-149`
- `packages/word-editor-renderers/src/word-editor-action-provider.ts:92-108`
- `packages/word-editor-core/src/chart-model.ts:35-58`
- `packages/word-editor-core/src/code-model.ts:29-48`

**What**

The public Word Editor host manifest declares rich payload contracts for `insertChart` and `insertCode`.

For `insertChart`, the manifest requires:

```ts
{
  id: string,
  chartName: string,
  chartType: string,
  showChartName: boolean,
  datasetId: string,
  categoryField: string,
  valueField: string[],
  seriesField?: string[],
}
```

For `insertCode`, it requires:

```ts
{
  id: string,
  codeName: string,
  codeType: string,
  datasetId: string,
  valueField: string,
}
```

But the live action provider only checks:

```ts
if (!chart?.id || !chart.chartName) {
  return fail('insertChart requires a complete chart payload.');
}
...
if (!code?.id || !code.codeName) {
  return fail('insertCode requires a complete code payload.');
}
```

and then immediately inserts/persists the payload.

So the manifest says these are shape-checked domain objects, while the live provider behavior accepts much weaker payloads than the public contract advertises.

This is not just theoretical over-typing. The core models themselves still require the omitted fields for validity:

- `validateDocChart(...)` requires `datasetId`, `categoryField`, and non-empty `valueField`
- `validateDocCode(...)` requires `datasetId` and `valueField`

So the manifest/provider pair currently disagree about what counts as a valid `insertChart` / `insertCode` command.

**Why it matters**

This is a live host-contract truthfulness bug. Schema authors and host callers see a public manifest that implies complete payload validation, but the runtime provider actually accepts underspecified objects and forwards them into insertion/persistence paths.

That means the declared contract is stricter than the executed contract. Invalid payloads can slip through provider enforcement even though the same package publicly claims those fields are part of the required host capability shape.

This also amplifies the `round-22` recovery-loss problem: the public contract says these commands require complete chart/code objects, but the provider still accepts incomplete ones that the core model later treats as invalid.

**Confidence**

High. The manifest field shapes and the provider's much weaker guards are explicit in live code.

**Non-duplication note**

This is distinct from `round-22`.

- `round-22` focused on renderer dialogs and save paths accepting core-invalid metadata that later disappears during recovery
- this finding is narrower and more structural: the published host manifest already declares full payload contracts, but the live action provider does not actually enforce them

So this is a public manifest/provider drift, not just a dialog-validation gap.

---

## Round summary

This round found a stricter public-contract drift underneath the earlier chart/code dialog issue: the Word Editor host manifest and action provider no longer agree on what a valid chart/code insertion payload is. The next productive slice is to keep comparing published manifest `args` shapes against the exact runtime/provider guards, especially in domain-editor packages that expose host methods for complex objects.
