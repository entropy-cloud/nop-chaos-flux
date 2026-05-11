# Designer Workbench Shell

## Purpose

This doc defines the shared workbench-shell baseline for Flux designer-style hosts such as Flow Designer, Report Designer, Spreadsheet-based designers, and Word Editor.

It owns only the shared shell contract:

- left / center / right workbench structure
- optional side-panel visibility rules
- collapsed-rail interaction rules
- the ownership split between family config, page override regions, and domain-specific document codecs

It does not own any one family's document model, action namespace, or domain-specific import/export semantics.

## Shared Baseline

Designer-style hosts use one common workbench pattern:

- header or toolbar area above the main workbench
- optional left side panel next to the central editing surface
- central canvas or editor surface as the primary authoring area
- optional right side panel next to the central editing surface
- optional dialogs and transient surfaces mounted from the same host/action boundary

The central surface is the primary interaction target. Side panels are supporting authoring surfaces and must not permanently consume space unless the resolved host configuration actually provides them.

## Canonical Panel Source

The canonical source of left and right workbench panels is family-level config, not renderer-private hardcoded UI.

- family config decides whether a left panel exists
- family config decides whether a right panel exists
- family config decides what each side renders, either by direct schema fragments, by target-aware schema generation, or by provider-backed generation
- page-level region props remain explicit override surfaces, but they do not define the canonical existence of a side panel by themselves

This keeps designer families reusable: a host becomes a special-purpose designer only after binding a general editor core to a concrete config and document codec.

## Optional Side Panels

Left and right panels are independently optional.

- if the resolved left-panel definition is absent, the left side is hidden completely
- if the resolved right-panel definition is absent, the right side is hidden completely
- hidden means no expanded panel and no collapsed rail placeholder
- only a panel that exists in the resolved config may enter the `collapsed` state

This distinction is important:

- `unavailable` means the family/config did not define that side at all
- `collapsed` means the side exists and can be expanded back by the user

## Collapsed Rail Contract

When a side panel exists but is collapsed, the shell uses a thin rail instead of the full panel.

Required interaction rules:

- left and right rails follow the same visual and interaction model
- the expand affordance sits on the edge closest to the central work surface
- the expanded panel should also expose a visible collapse affordance on the edge closest to the central work surface, so users do not need to discover collapse only after a side has already entered the rail state
- the whole collapsed rail is clickable and keyboard-focusable for expand
- the icon button is still visible as the explicit affordance, but expand must not depend on hitting only that small icon
- collapsed rails must preserve the same host/action boundary as the expanded panel they stand for

Responsive priority rules:

- the central surface remains visually primary on narrow viewports
- when both sides exist, the shell may suppress the right side below the tablet breakpoint and suppress the left side too below the phone breakpoint instead of preserving collapsed rails at every width
- this responsive suppression is a viewport behavior, not a change to config-driven side existence; at desktop widths, available sides still follow the normal expanded-or-collapsed contract

## Family Mapping

### Flow Designer

- left panel is the palette surface resolved from `DesignerConfig`
- right panel is the inspector surface resolved from node/edge inspector config and host inspector policy
- `toolbar` / `inspector` / `dialogs` page regions remain override surfaces mounted with designer host scope and action scope
- palette visibility is config-driven; the shell must not reserve left space when no palette is resolved
- inspector visibility is config-driven; a page `inspector` override does not create a right side when the resolved designer config has no node/edge inspector surface

### Report Designer

- left panel is the field-source surface resolved from `ReportDesignerConfig.fieldSources`, related providers, and `features.fieldPanel`
- right panel is the inspector surface resolved from `ReportDesignerConfig.inspector` and `features.inspector`
- `fieldPanel` / `inspector` page regions remain override surfaces for advanced host customization
- if no field-panel or inspector surface is resolved, that side is hidden rather than replaced by mandatory fallback chrome

### Word Editor

- Word Editor follows the same general-designer baseline rather than owning a permanently special-case built-in shell
- left and right panels are family-config-generated authoring surfaces bound to the word-editor document model and host scope
- `WordEditorConfig.leftPanel` and `WordEditorConfig.rightPanel` are the canonical side-existence switches for the current baseline
- today's dataset/field panel and outline panel are the default generators selected by that `WordEditorConfig`, not renderer-private permanent UI
- `toolbar` / `leftPanel` / `rightPanel` page regions remain explicit override surfaces

## Output Ownership

The shared workbench shell does not own the final business JSON format.

- the shell owns layout, region visibility, and shared interaction semantics
- each family owns its canonical authoring document shape
- adapters/codecs own import, export, round-trip, and lowering into a domain-specific JSON result

This keeps the editors general-purpose: they author a canonical family document through a shared shell, then adapters map that document into a specific downstream format.

## Relationship To Page Regions

Families may keep different page-schema field names such as `fieldPanel`, `inspector`, `leftPanel`, or `rightPanel`.

That naming difference does not imply different shell semantics.

- page regions are override/mount surfaces
- family config is the canonical panel-definition surface
- shell visibility and collapse behavior follow the shared rules in this doc

## Implementation Direction

Any workbench-shell implementation should converge on the following steps:

1. Resolve left and right panel availability from family config.
2. Apply page-region overrides on top of that resolved availability.
3. Hide unavailable sides entirely.
4. Render collapsed rails only for available sides.
5. Keep the central surface visually primary on desktop and mobile.
