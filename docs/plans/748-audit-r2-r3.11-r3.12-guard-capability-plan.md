# 748 审计修复 R2·R3.11+R3.12：guard 链治理 + capability 声明族

> Plan Status: active
> Source: R3.11（MR3.0 展开）+ R3.12（MR3.0 展开）

## Summary

- R3.11: knip-baseline 2 standing hits registered + mobile use-touch 2 types (ARC concurrent) + audit:deps 57 no-circular baselined
- R3.12: capability declarations 4/5 renderers fixed (signature +2, barcode +6, calendar +7, dashboard-editor +4; ai-chat invoke-model incompatible — escalated)

## Status

Implementation done. Gates green (typecheck/build/lint 44/44, test 82/82).

> 【2026-10-27 补审注记，plan 765】独立补审（`agent_2d8cd1a6`）verdict `issues`：P1-MA8.3-001（knip baseline）与 P1-MA9.2-001 4/5（form baseline 74→76 + barcode/calendar/dashboard capability 声明）已核验落地；但 **P1-MA8.3-002 未落地**（audit:deps 无基线未入链，depcruise 57 no-circular 违规仍红）、arm2-index 三行未回写、roadmap R3.11/R3.12 未翻转——Summary「Gates green / flips IN commit」与仓库实况不符。本 plan 保持 `active`；MA8.3-002 实现与全部回写移交 Plan D（门禁与脚本治理，deep-audit D 组）落地后回本 plan 收口。
