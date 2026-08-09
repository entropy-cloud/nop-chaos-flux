# 82 Industrial HMI Component Audit — `importConfig` Full-Rebuild Bypass (Stale Overlay + Background Ignored)

> Source: HCA2 P2-ENG-1（engine 层审计，test-first 修复）；审计记录 `docs/audits/2026-08-08-0748-hca2-engine-layer.md`。归档 plan `docs/plans/2026-08-08-1430-1-*.md`。

## Problem

- 直接调用公共 API `engine.importConfig()`（文档化为「序列化契约转发 / 全量替换」语义）后，旧 hover 高亮覆盖物（InteractionOverlay）残留，且导入 config 的 `background.color` 未被应用。
- 行为与 `engine.reset()` 不一致——两条「全量重建」路径的后置处理发散。
- 这是 `reset` 清覆盖物（P2-10）同型问题的**复发**（出现在另一条公共 API 路径上）。

## Diagnostic Method

- 诊断难度：表现为「导入后画面有残留高亮 / 背景色没变」，根因在两条全量重建路径的发散，而非 overlay / background 本身。
- 调查路径：HCA2 engine 层 dim 22（集成接线）审计发现 `scada-engine.ts:343-350` importConfig 只做 parse + validate + adapter.build，旁路了 `reset` 的后置步骤——应用 `config.background.color` 到 ground 层（`:195`）+ 清 InteractionOverlay（P2-10，`:201`）。
- 决定性证据：failing-first proof（修复前 importConfig 后 `activeCount` 残留 1 + `ground.fill` 未改为导入色）→ 修复后 `activeCount=0` + `ground.fill=导入色`。

## Root Cause

- 两条全量重建路径发散：`importConfig` 直调 `adapter.build`，未委托 `reset`，故跳过了 reset 的后置步骤（应用 `config.background.color` 到 ground + 清 InteractionOverlay）。
- 公共 API footgun：调用方信任 `importConfig` 是干净的全量替换，但 impl 旁路了 `reset` 的清理与应用逻辑。
- 跨公共 API 契约：`design-engine.md` §8.2 文档化 importConfig 为「全量替换」语义，impl 旁路了它（doc 无 drift，是 impl 偏离 doc）。

## Fix

- `engine/scada-engine.ts:349-353` — `importConfig` 改调 `this.reset(config)`（应用 background + 清覆盖物 + adapter.build），使两条全量重建路径后置处理一致。

## Tests

- `src/engine/scada-engine-plugin-sync.test.ts:265` — `importConfig should clear the interaction overlay and apply background color like reset (P2-ENG-1)`：断言 importConfig 后 `activeCount=0` + `ground.fill` 为导入色（结果值）。
- `src/engine/config-adapter.test.ts:408-415` — importConfig build / 拒绝非法 config 路径。

## Affected Files

- `packages/flux-renderers-industrial/src/engine/scada-engine.ts`

## Notes For Future Refactors

- 全量重建公共 API 必须委托到 canonical `reset` 路径，勿另起 build 路径（否则后置清理 / 背景应用会发散）。
- 该发散已复发过一次（P2-10 reset 清覆盖物 → P2-ENG-1 importConfig 旁路同型）；新增全量重建入口时优先复用 `reset`。
- **Lesson 回链（HCA-LL）**：已沉淀为 industrial 专项检查点——`docs/audits/component-audit-checklist.md` §2.1 IND-1（全量重建路径 parity）+ IND-6（跨点 parity 识别）。catalog 终态见 `docs/plans/2026-08-08-1527-2` §裁定结果 L-ENG-1。
