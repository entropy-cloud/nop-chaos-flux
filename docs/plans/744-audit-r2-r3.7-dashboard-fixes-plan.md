# 744 审计修复 R2·R3.7：dashboard 交互修复（P1-MA5.5-001/002）

> Plan Status: completed
> Source: R3.7（MR3.0 展开）；audit MA5.5 §001/002

## Summary

- P1-MA5.5-001 FIXED: editor-canvas.tsx panel container overflow-hidden→overflow-visible — resize handles (translate past edges) no longer clipped, 6/8 dead zones eliminated
- P1-MA5.5-002 FIXED: dashboard-domain-adapter.ts serialize wraps {panels: doc.panels} — runtime dashboard renderer expects {panels} shape, Save round-trip no longer clears panels

## Verification

- flux-renderers-dashboard 12/96 green
- typecheck/build/lint/test all green
