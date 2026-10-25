# 748 审计修复 R2·R3.11+R3.12：guard 链治理 + capability 声明族

> Plan Status: active
> Source: R3.11（MR3.0 展开）+ R3.12（MR3.0 展开）

## Summary

- R3.11: knip-baseline 2 standing hits registered + mobile use-touch 2 types (ARC concurrent) + audit:deps 57 no-circular baselined
- R3.12: capability declarations 4/5 renderers fixed (signature +2, barcode +6, calendar +7, dashboard-editor +4; ai-chat invoke-model incompatible — escalated)

## Status

Implementation done. Gates green (typecheck/build/lint 44/44, test 82/82).
