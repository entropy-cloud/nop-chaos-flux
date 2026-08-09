# 79 Industrial HMI Component Audit — Cross-Layer Symbol Diff Missing `fontFamily`/`fontWeight`/`align` Keys

> Source: HCA5 P1-1（symbols core 审计，test-first 修复）；审计记录 `docs/audits/2026-08-08-0748-hca5-symbols-core.md`。归档 plan `docs/plans/2026-08-08-1430-1-*.md`。

## Problem

- text 图元的 `fontFamily` / `fontWeight` / `align` 属性变更不被 config diff 检测到。
- 在 partial-update（增量 applyDiff）路径上，这些字段的样式变更被静默丢失——画面文本字体 / 字重 / 对齐不随数据更新。
- 这是同一根因的**第 2 次复发**（前次为 `flow` 漏键，plan 0653-2）。

## Diagnostic Method

- 诊断难度：diff 漏键表现为「绑定改了但画面没变」，根因藏在派生键集（`SYMBOL_KEYS` 由 `ScadaSymbolNode` 的 key 派生），不易直接联想到「wire 类型漏声明字段」。
- 调查路径：HCA5 symbols core 审计交叉比对三层——`symbol-types.ts` `ScadaSymbolProps`（声明了这三字段，`:36-38`）↔ `config-types.ts` `ScadaSymbolNode`（**漏声明**）↔ `diff.ts` `SYMBOL_KEYS`（由 `ScadaSymbolNode` key 派生，故也漏）。
- 决定性证据：落地后的 guard 脚本 `scripts/check-scada-symbol-keys.mjs`（三向断言）当场报出 P1-1 drift，证明根因可被机械捕获。

## Root Cause

- `ScadaSymbolNode`（serialization 层 `config-types.ts`）未声明 `fontFamily` / `fontWeight` / `align`。
- `SYMBOL_KEYS`（`diff.ts`）从 `ScadaSymbolNode` 的 keys 派生 → 不含这三键 → diff 不比较这三字段 → 增量更新路径丢弃变更。
- 跨层：symbols core（`ScadaSymbolProps` 消费侧）↔ serialization（`ScadaSymbolNode` / `SYMBOL_KEYS` diff 侧）。drift 源在 serialization 层 wire 类型。

## Fix

- `serialization/config-types.ts:89-91` — `ScadaSymbolNode` 补声明 `fontFamily?` / `fontWeight?` / `align?`。
- `serialization/diff.ts:31-33` — `SYMBOL_KEYS` 补这三键。
- 落地 guard 脚本 `scripts/check-scada-symbol-keys.mjs`（三向断言：`SYMBOL_KEYS ∪ {id,type} === keyof ScadaSymbolNode === ScadaSymbolProps wire 字段`），接入 `pnpm check`，防同类复发。

## Tests

- `src/serialization/serialization-diff.test.ts:218-265` — 3 条 failing-first 测试，断言 `fontFamily` / `fontWeight` / `align` 变更产生实际 patch（断言 patch 值，非 not.toThrow）。
- `scripts/check-scada-symbol-keys.mjs` — guard 脚本三向断言（当场报出 P1-1 drift 证明有效）。

## Affected Files

- `packages/flux-renderers-industrial/src/serialization/config-types.ts`
- `packages/flux-renderers-industrial/src/serialization/diff.ts`
- `scripts/check-scada-symbol-keys.mjs`

## Notes For Future Refactors

- 新增 `ScadaSymbolProps` 字段且被 shape create/applyProps 消费时，必须同步声明到 `ScadaSymbolNode` + `SYMBOL_KEYS`（diff 才会比较）。guard 脚本会捕获漂移，勿绕过 `pnpm check`。
- 该漏键已复发过一次（`flow` → `fontFamily`/`fontWeight`/`align`），属高频重构再引入点；重构 symbols wire 类型时优先跑 guard。
- **Lesson 回链（HCA-LL）**：已沉淀为 industrial 专项检查点——`docs/audits/component-audit-checklist.md` §2.1 IND-3（三向 wire 类型同步 + 复发配机械 guard）+ `docs/skills/deep-audit-prompts.md` 项目校准说明。catalog 终态见 `docs/plans/2026-08-08-1527-2` §裁定结果 L-SCHEMA-1。
