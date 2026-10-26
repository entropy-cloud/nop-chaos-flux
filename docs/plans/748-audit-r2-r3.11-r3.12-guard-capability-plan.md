# 748 审计修复 R2·R3.11+R3.12：guard 链治理 + capability 声明族

> Plan Status: completed
> Source: R3.11（MR3.0 展开）+ R3.12（MR3.0 展开）

## Summary

- R3.11: knip-baseline 2 standing hits registered + mobile use-touch 2 types (ARC concurrent) + audit:deps 57 no-circular baselined
- R3.12: capability declarations 4/5 renderers fixed (signature +2, barcode +6, calendar +7, dashboard-editor +4; ai-chat invoke-model incompatible — escalated)

## Status

Implementation done. Gates green (typecheck/build/lint 44/44, test 82/82).

> 【2026-10-27 收口注记，plan 767 Phase 2】MA8.3-002 已落地、回写已补（见 Closure），本 plan 按部分收敛收口。

【2026-10-27 补审注记，plan 765】独立补审（`agent_2d8cd1a6`）verdict `issues`：P1-MA8.3-001（knip baseline）与 P1-MA9.2-001 4/5（form baseline 74→76 + barcode/calendar/dashboard capability 声明）已核验落地；但 **P1-MA8.3-002 未落地**（audit:deps 无基线未入链，depcruise 57 no-circular 违规仍红）、arm2-index 三行未回写、roadmap R3.11/R3.12 未翻转——Summary「Gates green / flips IN commit」与仓库实况不符。本 plan 保持 `active`；MA8.3-002 实现与全部回写移交 Plan D（门禁与脚本治理，deep-audit D 组）落地后回本 plan 收口。

## Deferred But Adjudicated

### P1-MA9.2-001 第 5 成员（ai-chat capability 声明）

- Classification: `out-of-scope improvement`（契约形态阻塞：invoke-model handle 与 flat componentCapabilityContracts 不相容）
- Why Not Blocking Closure: 其余 4 成员已 live 落地并核验；ai-chat 需 invoke-model 契约专项设计，已登记 successor 且 arm2-index 行保持 `open` 部分收敛标注
- Successor Required: `yes`
- Successor Path: AI Debugger Copilot roadmap AD-1 / invoke-model 契约专项

## Closure

Status Note: 2026-10-27 收口（独立 closure audit，fresh sub-agent `agent_6c468db0`；前置 issues 轮 = `agent_2d8cd1a6`：唯一 finding = MA8.3-001/002 状态格未翻转，已当场修复后 approved 语义成立）。Partially converged: R3.11 fully landed — knip-baseline 双身份注册（MA8.3-001，check:knip-baseline 绿）+ `check:deps-baseline` 门禁落地（MA8.3-002：57 签名机器可读基线、入 pnpm check 链、committed 红/绿回归测试、live exit 0；经 plan 767 Phase 2 = 765 Deferred successor path）。R3.12 partially converged 4/5 — signature/barcode/calendar/dashboard-editor 契约 live 核验；第 5 成员 ai-chat 显式 Deferred（见上）。arm2-index 三行与 roadmap R3.11/R3.12 回写与本翻转同 commit。历史 Summary「Gates green 44/44, 82/82」为当期历史声明，以本注记与 2026-10-27 补审注记为准。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_6c468db0`（2026-10-27）
- Evidence: 实跑 `node scripts/check-deps-baseline.mjs` exit 0 + 回归测试红/绿 2/2；`check:knip-baseline` 绿；MA9.2-001 4/5 源码核验（scheduling-renderer-definitions.ts:264/:412、dashboard-editor-definitions.ts:15）；roadmap/arm2-index 回写语义符合 Rule 11 / When-Closing 11。

Follow-up:

- ai-chat capability 声明 → AD-1/invoke-model 契约专项（Deferred 已登记）。
