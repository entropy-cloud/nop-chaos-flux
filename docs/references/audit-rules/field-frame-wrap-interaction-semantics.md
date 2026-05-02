# FieldFrame Wrap Interaction Semantics

## Purpose

This rule captures recurring interaction bugs caused by `wrap: true` / `FieldFrame` label semantics, especially when renderer-internal controls use labelable HTML elements.

Use it when reviewing field renderers that opt into `wrap: true`, or when migrating renderer-local controls to shared UI components.

## Scope

Apply this rule when code changes touch any of the following:

- renderer definitions using `wrap: true`
- components rendered inside `FieldFrame`
- renderer-local toolbar, trigger, or inline action controls inside wrapped fields
- migrations from custom controls to `@nop-chaos/ui` components inside wrapped renderers

## Required Pattern

### 1) Wrapped field renderers must respect label forwarding semantics

- `wrap: true` means the field can be wrapped by a `<label>`-like shell.
- Internal interactive controls must not accidentally become the forwarded click target for the whole field.
- Do not assume a visually local button only receives direct clicks.

Review checks:

- Search for wrapped renderers containing `<button>`, `<input>`, `<select>`, `<textarea>`, or other labelable controls.
- Confirm whether those controls live inside the label-wrapped subtree or in a portal/outside shell.
- Test clicks on non-control content inside the wrapped field, not only clicks on the trigger itself.

### 2) UI-component migrations must preserve wrapper semantics, not just visuals

- Replacing a local non-labelable trigger with a shared `<Button>` or other labelable control can reintroduce forwarding bugs.
- Shared visual components are not automatically safe inside `wrap: true` renderers.
- If a renderer needs an internal trigger inside a wrapped field, prefer a non-labelable semantic control pattern unless the control is explicitly exempted.

Review checks:

- Audit wrapper-sensitive renderers after `@nop-chaos/ui` migrations.
- Verify the chosen internal trigger element is compatible with label forwarding behavior.
- Re-run the interaction scenario that motivated the wrapped control in the first place.

## Allowed Exceptions

- Labelable controls are allowed when they render outside the wrapped label subtree, such as in portals.
- A wrapped renderer may opt out through the supported frame/wrap configuration path if the owner contract explicitly allows it.

## Review Checklist

- Wrapped renderer internals do not accidentally expose label-forwarded trigger targets.
- UI-component migrations preserve wrapper semantics as well as visual styling.
- Non-control clicks inside the field do not activate internal controls.
- Focused tests or browser verification cover the wrapped interaction path.

## Evidence From This Repository

- `docs/bugs/19-code-editor-label-click-forwarding-triggers-fullscreen-fix.md`
- `docs/analysis/2026-05-02-deep-audit-full/12-field-slot.md`

## Primary Architecture Anchors

- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-frame.md`
