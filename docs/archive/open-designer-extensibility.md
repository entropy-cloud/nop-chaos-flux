# 开放设计器平台扩展规范

> Archived on 2026-04-04.
> This document captured an earlier direction that treated Flux as an open "designer-of-designers" platform in the browser runtime.
> It is preserved for historical comparison only, is no longer the active architecture baseline, and should be treated as a superseded and not-recommended design direction.

## Status

This is a superseded historical document.

- It is not the recommended architecture direction.
- It does not describe the current active baseline.
- It should not be used as the source of truth for new design work.
- Use `docs/architecture/flux-dsl-vm-extensibility.md` instead.

## Archived Reason

This document was superseded by `docs/architecture/flux-dsl-vm-extensibility.md` after the architecture direction was corrected:

- Flux is the final DSL execution runtime, not the primary extensibility platform
- structural extensibility belongs mainly to loader-time JSON assembly
- design tools are special complex component types, not platform-level special entities

The original historical content is intentionally not duplicated here. Refer to git history if the full superseded draft is needed.
