# Open-Ended Adversarial Review — 2026-05-26 — Round 03

**Execution date**: 2026-05-26  
**Result directory**: `docs/analysis/2026-05-26-open-ended-adversarial-review-01/`  
**Exploration areas**: form renderers, boolean prop normalization, readOnly affordances  
**Discovery source**: renderer contract audit after comparing field utility semantics with concrete UI primitives

---

## Finding 1: Basic form controls block read-only writes only after interaction, so several controls still present an editable UI and silently discard user changes

- **Where**:
- `docs/architecture/field-binding-and-renderer-contract.md:257-273`
- `packages/flux-renderers-form/src/field-utils/field-reading.tsx:16-34`
- `packages/flux-renderers-form/src/field-utils/field-presentation.tsx:98-126`
- `packages/flux-renderers-form/src/field-utils/field-handlers.tsx:84-128`
- `packages/flux-renderers-form/src/renderers/input.tsx:28-57`
- `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx:89-134,155-184,187-213,216-243,246-299,302-365`
- `packages/flux-renderers-form/src/renderers/input-number-renderer.tsx:91-149`
- **What**: field metadata correctly declares `readOnly` as a boolean prop and `useFieldPresentation()` computes `interactive: !disabled && !readOnly`. `useFieldHandlers()` then returns early from `onChange` when `readOnly` is true. But most concrete basic controls do not translate that read-only state into the native/UI primitive affordance. `input-text` and `textarea` pass only `disabled`, not `readOnly` or `aria-readonly`. `select`, `checkbox`, `switch`, `radio-group`, and `checkbox-group` stay enabled when `presentation.readOnly` is true and keep their change handlers attached. `input-number` is the positive contrast: it passes `readOnly` to the input and disables the stepper with `!presentation.interactive`.
- **Why it matters**: the documented meaning of `readOnly` is “visible but not editable.” Current controls instead allow focus, opening, toggling, checking, and typing gestures, then discard the resulting write in `useFieldHandlers()`. Users see a live control that does not commit. Assistive tech also does not receive a consistent `readonly` or disabled equivalent for controls that cannot actually change. This is a contract/UX defect rather than a data-corruption defect because the model is protected, but the interactive surface lies about editability.
- **Confidence**: Certain
- **Non-duplication note**: prior deep-audit entries mention readOnly in Spreadsheet and Code Editor contexts and tests cover that `useFormFieldController` blocks read-only writes. I did not find a retained report that the basic form renderer UI primitives themselves fail to expose the read-only affordance.

## Finding 2: `fieldset` documents boolean `collapsible` / `collapsed`, but its renderer definition leaves them as generic props and the renderer applies JavaScript truthiness

- **Where**:
- `docs/components/fieldset/design.md:24-49,54-60`
- `docs/architecture/renderer-runtime.md:251-275`
- `packages/flux-renderers-form/src/renderers/fieldset.tsx:8-25,99-107`
- `packages/flux-compiler/src/schema-compiler/fields.ts:29-49`
- `packages/flux-compiler/src/schema-compiler/node-compiler.ts:448-453`
- **What**: the fieldset owner doc and TypeScript schema define `collapsible?: boolean` and `collapsed?: boolean`, and the renderer runtime contract says boolean-like props resolve only to `boolean | undefined` and renderers must not use JavaScript truthiness. Live `fieldsetRendererDefinition.fields` declares only `body` as a region. Therefore `collapsible`, `collapsed`, `title`, `gap`, `bodyClassName`, and `titleClassName` all fall through to generic prop compilation; in particular `collapsible` and `collapsed` do not get `valueType: 'boolean'` normalization. The renderer then does `Boolean(slotProps.collapsible)` and `Boolean(slotProps.collapsed) && collapsible`.
- **Why it matters**: invalid literal strings like `"false"`, `"!canCollapse"`, or expression results that produce non-boolean truthy values become `true` at runtime, enabling disclosure UI or initially hiding body content contrary to the fail-closed boolean contract. This also weakens static/schema tooling because fieldset's own documented public fields are not declared in renderer metadata; the compiler cannot apply the same validation and normalization it applies to ordinary field `readOnly` / `required`.
- **Confidence**: Certain
- **Non-duplication note**: earlier fieldset findings were about the disclosure primitive / `legend` interaction and field-slot classification. This is a distinct live boolean-normalization defect with concrete truthiness behavior.

## Round Assessment

This round found two form-renderer issues with the same root shape: shared field utilities and owner docs have already converged on the right semantics, but concrete renderers still have local truthiness/affordance code that bypasses the normalized contract.

Immediate improvement direction: make basic controls consume `presentation.readOnly` / `presentation.interactive` at the UI primitive boundary, and expand `fieldsetRendererDefinition.fields` to declare its public props with `valueType: 'boolean'` for `collapsible` and `collapsed`. The renderer should then test `slotProps.collapsible === true` rather than `Boolean(...)`.

## Blind-Spot Self-Assessment

This round did not inspect every advanced form control for the same read-only affordance issue. Tree/tag/key-value/array controls may have their own control-specific read-only semantics and should be sampled in a later pass rather than inferred from the basic input family.
