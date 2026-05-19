# Open-Ended Adversarial Review 25

## Finding 1: Report Designer manifest publishes structured host-method payload contracts, but the live provider still forwards arbitrary objects as commands

**Where**

- `packages/report-designer-renderers/src/report-designer-manifest.ts:198-285`
- `packages/report-designer-renderers/src/host-action-provider.ts:22-63`
- `packages/report-designer-core/src/commands.ts:22-79`

**What**

The public Report Designer host manifest now advertises structured argument contracts for several methods:

- `dropFieldToTarget` requires `{ field, target }`
- `updateMeta` requires `{ target, patch }`
- `replaceMeta` requires `{ target, nextMeta }`
- `preview` accepts `{ mode?, args? }`
- `importTemplate` requires `{ payload }`
- `exportTemplate` accepts `{ format? }`

But the live host action provider does not validate any of those method-specific payloads. It uses one generic path for the whole namespace:

```ts
const args = isCommandRecord(payload) ? payload : {};
...
dispatch({
  type: `report-designer:${method}`,
  ...args,
} as ReportDesignerCommand)
```

So any plain object is accepted and spread into the outgoing command, regardless of whether it satisfies the published manifest shape for that method.

The core command types are still method-specific unions such as:

```ts
interface DropFieldToTargetCommand {
  type: 'report-designer:dropFieldToTarget';
  field: FieldDragPayload;
  target: Extract<ReportSelectionTarget, { kind: 'cell' | 'range' }>;
}

interface UpdateReportMetaCommand {
  type: 'report-designer:updateMeta';
  target: ReportSelectionTarget;
  patch: MetadataBag;
}
```

but the provider bypasses that structure by casting the assembled object to `ReportDesignerCommand` after the spread.

**Why it matters**

This is a live public host-contract drift.

The manifest is supposed to be the static capability contract used for action validation and tooling discovery, but the runtime provider still behaves like an untyped passthrough. That means external callers and schema authors are shown a more precise contract than the runtime actually enforces.

As a result:

- malformed `report-designer:*` payloads can still cross the renderer boundary if they are plain objects
- manifest-based validation and live execution no longer describe the same acceptance surface
- tooling can report a method as shape-constrained even though the runtime entry point still effectively accepts arbitrary object bags

This is the same contract-truthfulness class as the earlier `spreadsheet` and Word Editor findings, but it is a separate live instance in the Report Designer host family.

**Confidence**

High. The manifest shapes, the provider's generic `{...args}` forwarding path, and the typed core command union are all explicit in live code.

**Non-duplication note**

This is not a restatement of the earlier Report Designer inspector-shell drift or the Spreadsheet host-method drift.

- the earlier Report Designer findings were about shell/runtime behavior mismatches
- `round-05` was about Spreadsheet methods missing `args` contracts entirely
- this finding is different: Report Designer now does publish structured `args` contracts, but its runtime provider still does not enforce those advertised method-specific shapes

---

## Round summary

This round found another live manifest/provider truthfulness gap: Report Designer has already upgraded its public host manifest to structured method payload shapes, but the renderer-side provider still forwards arbitrary object payloads as `report-designer:*` commands. The next useful slice remains the same: keep checking other domain-editor host families for cases where the static manifest became precise before the runtime provider stopped behaving like a generic passthrough.
