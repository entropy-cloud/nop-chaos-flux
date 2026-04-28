# Surface Shell Consistency Audit Rule

## Status

Active

## Scope

This rule applies to general-purpose dialog and drawer surfaces built on `@nop-chaos/ui` surface primitives.

Owner docs:

- `docs/components/dialog/design.md`
- `docs/components/drawer/design.md`
- `docs/architecture/surface-owner.md`

## Rule

`dialog` and `drawer` belong to the same surface family. Standard surface shells must keep the same internal slot structure and the same spacing responsibilities.

Required standard structure:

```tsx
<DialogContent>
  <DialogHeader />
  <DialogBody />
  <DialogFooter />
</DialogContent>

<DrawerContent>
  <DrawerHeader />
  <DrawerBody />
  <DrawerFooter />
</DrawerContent>
```

Header and footer are optional. Body is the standard content slot whenever the surface hosts normal page/form/detail content.

## Responsibility Split

- `DialogContent` / `DrawerContent`: shell positioning, portal, overlay, focus, animation, size, and outer container behavior.
- `DialogHeader` / `DrawerHeader`: title-area layout.
- `DialogBody` / `DrawerBody`: default body spacing, inner scroll ownership, and ordinary content layout.
- `DialogFooter` / `DrawerFooter`: action-area layout.

The body spacing must not live on `Content`. Otherwise dialog and drawer drift apart as soon as one surface starts giving header/footer their own padding.

## Allowed Differences

Dialog and drawer may differ only where the shell type requires it, for example:

- modal vs edge-attached presentation
- direction-specific sizing and alignment
- overlay behavior
- shell-specific animation and containment details

These are shell differences, not body-structure differences.

## Allowed Exceptions

Some specialized surfaces may skip `Body`, but only as explicit exceptions.

Allowed exception categories:

- command palettes or search overlays whose child widget owns the full internal layout
- floating workbench panels whose content is intentionally edge-to-edge and does not behave like a normal form/detail body
- full-custom media/canvas surfaces with a dedicated internal shell component

Exception requirements:

- the code must clearly read as a specialized surface, not a normal dialog/drawer body omitted by accident
- use a dedicated component name or dedicated `data-slot`, not an anonymous replacement div that looks like a standard body
- any spacing/layout ownership must stay local to that specialized component

Current explicit examples:

- `packages/ui/src/components/ui/command.tsx` `CommandDialog`
- `packages/flow-designer-renderers/src/designer-page.tsx` `data-slot="designer-json-panel"`

## Audit Checks

Flag as findings when you see any of the following in a general-purpose surface:

- `DialogContent` or `DrawerContent` holding normal body content directly with no `Body` slot
- body padding/gap placed on `Content` instead of `Body`
- dialog and drawer using different standard slot taxonomies for the same kind of surface
- repeated one-off `px-*` / `py-*` wrappers standing in for a missing standard body slot

## Review Method

1. Search for `<DialogContent` and `<DrawerContent`.
2. Classify each usage as standard surface shell or explicit exception.
3. For standard shells, verify `Header? -> Body -> Footer?`.
4. Verify body spacing responsibility lives on `Body`, not `Content`.
5. Verify dialog and drawer stay aligned unless a shell-specific difference is required.
