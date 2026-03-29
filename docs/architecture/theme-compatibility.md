# Theme Compatibility Design

## Purpose

This document defines how `flow-designer2` stays visually self-contained while remaining compatible with host-controlled themes.

The goal is not to introduce a React `ThemeProvider` requirement. The goal is to make renderer and Flow Designer visuals respond to host CSS through stable classes and CSS variables.

## Current Code Anchors

- `apps/playground/src/App.tsx`
- `apps/playground/src/styles.css`
- `apps/playground/src/FlowDesignerExample.tsx`
- `packages/flux-react/src/index.tsx`
- `packages/nop-debugger/src/panel.tsx`
- `packages/flow-designer-renderers/src/index.tsx`
- `packages/flow-designer-renderers/src/canvas-bridge.tsx`
- `packages/flow-designer-renderers/src/styles.css`
- `packages/tailwind-preset/src/styles/base.css`

## Main Rule

`theme compatibility is a CSS contract, not a runtime provider contract`

That means:

- renderers emit stable DOM class names
- shared visuals read CSS variables
- the project defines default values for those variables
- hosts may override those variables from any ancestor scope
- runtime, page store, form store, and designer core do not need a theme state model

## Design Goals

- keep standalone usage working without a host shell
- keep current visuals unchanged after the migration
- let host applications theme the mounted subtree without editing runtime code
- avoid coupling renderer packages to one specific host framework or token package
- let different hosts scope themes per subtree, not only per document root

## Non Goals

- no required `ThemeProvider`
- no theme values stored in `RendererEnv`
- no theme state in `ActionScope`, `ScopeRef`, page runtime, or form runtime
- no requirement that all consuming applications use Tailwind

## Theme Root Contract

### `.nop-theme-root`

`.nop-theme-root` is the canonical shared theme scope for the project.

Responsibilities:

- define default project-wide visual tokens
- scope host overrides to a mounted subtree
- provide one predictable root for dialogs, debugger UI, AMIS renderers, and Flow Designer renderers

Any host may place `.nop-theme-root` on:

- an application shell root
- a page root
- a local embedded widget container

The renderer tree must work in all three cases.

### `.fd-theme-root`

`.fd-theme-root` is an optional Flow Designer specialization layer.

Responsibilities:

- derive Flow Designer specific tokens from shared `--nop-*` tokens
- allow Flow Designer-only overrides without redefining the whole AMIS visual system

Flow Designer surfaces should usually mount both classes:

- `.nop-theme-root` for shared token availability
- `.fd-theme-root` for local Flow Designer aliases

## Token Layers

### Shared project tokens

Shared project visuals use `--nop-*` tokens.

Examples:

- `--nop-app-bg`
- `--nop-app-text`
- `--nop-surface`
- `--nop-border`
- `--nop-accent`
- `--nop-invalid-border`
- `--nop-dialog-backdrop`

These tokens cover:

- playground shell surfaces
- generic `na-*` renderer controls
- dialogs
- debugger panel and launcher

### Flow Designer tokens

Flow Designer visuals use `--fd-*` tokens.

Examples:

- `--fd-page-bg`
- `--fd-panel-bg`
- `--fd-canvas-bg`
- `--fd-node-bg`
- `--fd-node-border-active`
- `--fd-edge-stroke`
- `--fd-port-input`
- `--fd-danger`

These should usually default to shared `--nop-*` values instead of defining unrelated colors.

Example pattern:

```css
.fd-theme-root {
  --fd-panel-bg: var(--nop-surface);
  --fd-border: var(--nop-border);
  --fd-text: var(--nop-app-text);
  --fd-primary: var(--nop-primary);
}
```

## Host Integration Model

Hosts may integrate at CSS level only.

Typical host strategies:

### Strategy 1: override on document root

```css
:root[data-theme='classic'][data-mode='dark'] {
  --nop-app-text: hsl(var(--foreground));
  --nop-surface: hsl(var(--card));
  --nop-border: hsl(var(--border));
}
```

### Strategy 2: override on local mount container

```css
.host-flow-shell {
  --nop-app-text: hsl(var(--foreground));
  --fd-canvas-bg: hsl(var(--muted));
}
```

### Strategy 3: map host tokens to project tokens

```css
.host-flow-shell {
  --nop-surface: hsl(var(--card));
  --nop-app-text: hsl(var(--foreground));
  --nop-primary: hsl(var(--primary));
}
```

No JavaScript bridge is required for theme propagation in these cases.

## Renderer Ownership Rules

### Runtime and state layers do not own theme

Do not put theme state into:

- `RendererEnv`
- `ScopeRef`
- `ActionScope`
- `PageRuntime`
- `FormRuntime`
- `DesignerCore`

These layers may expose data that indirectly affects visuals, but not host theme identity.

### Renderer layers own class structure

Renderer packages are responsible for:

- stable DOM structure
- stable class namespaces
- reading CSS variables instead of hardcoded colors where visuals are package-owned

### Playground owns only demo-shell styling

The playground may still define page-shell visuals, but package-owned visuals should not depend on playground-only CSS files.

That means:

- `apps/playground/src/styles.css` may style home page, cards, and documentation-like shells
- reusable renderer visuals must live with the package or in a shared style entry

## Migration Rules

### 1. Migrate hardcoded visuals to variables without changing output

When converting a color or shadow:

- first create a token whose default value matches the existing literal
- then replace the literal with the token reference
- do not change the actual visual unless the task explicitly asks for a redesign

### 2. Prefer class-based CSS over inline style for reusable surfaces

Inline styles are allowed for:

- geometry derived from runtime data, such as x/y positioning
- pixel values coming from current graph state

Inline styles should not be used for:

- stable colors
- borders
- shadows
- typography tokens
- button chrome

### 3. Keep host override points stable

Once a token or class becomes a documented host hook, avoid renaming it casually.

### 4. Dialog and debugger surfaces must stay inside the same token model

Dialogs and debugger UI are not special cases.

They should use the same `--nop-*` token family so host theming stays coherent across:

- main renderer tree
- shared dialogs
- floating debugger UI

## First Migration Slice

The first migration slice uses `.nop-theme-root` as the root and keeps visuals unchanged.

Scope:

- add `.nop-theme-root` at the playground app root (already done)
- Dialog host and debugger already inherit `.nop-theme-root` from app root
- add `.fd-theme-root` to Flow Designer package roots
- introduce token defaults that reproduce current colors exactly
- move Flow Designer package-owned reusable visuals into package CSS
- leave geometry-oriented inline positioning in place where runtime data is required

## Expected Result

After this migration:

- standalone `flow-designer2` still looks the same
- hosts can override subtree visuals through CSS only
- Flow Designer package surfaces are no longer blocked by hardcoded reusable colors
- debugger and dialogs follow the same theme root model as the rest of the renderer tree

## Related Docs

- `docs/architecture/styling-system.md` - Semantic props vs Tailwind, style presets

## Follow-up Work

- continue reducing package-level inline visual styles in `apps/playground/src/FlowDesignerExample.tsx`
- extend package-owned CSS for more generic `na-*` renderers if they need stronger host-level consistency
- add a host integration example showing token mapping from an external shell into `.nop-theme-root`

