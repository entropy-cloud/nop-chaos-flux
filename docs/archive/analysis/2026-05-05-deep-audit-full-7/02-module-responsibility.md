# 维度 02：模块职责与文件边界

## 第1轮初审

### [维度02] `runtime-factory.ts` 已从 assembly 层重新吸入 import/cache 实现

- **文件**: `packages/flux-runtime/src/runtime-factory.ts:50-74,168-180,235-303`
- **严重程度**: P2
- **现状**: runtime assembly 文件同时承载 module cache、prepared imports preload/cache/static meta 逻辑。
- **风险**: assembly 继续再膨胀，后续 import/runtime 生命周期边界更难收口。
- **建议**: 抽离 `createModuleCache()` 和 prepared-import preload/cache 逻辑到 focused module。

### [维度02] `schema-compiler-prop-coverage.test.ts` 超过 700 行且聚合 13 组无关 renderer coverage

- **文件**: `packages/flux-compiler/src/schema-compiler-prop-coverage.test.ts:7-27,271-330,513-702`
- **严重程度**: P1
- **现状**: 单文件 702 行，已踩中仓库 >700 行硬规则。
- **风险**: 继续加 suite 会扩大冲突面，且不同 renderer coverage 的维护边界混在一起。
- **建议**: 按 renderer family/coverage 主题拆分，并抽出测试 helper。

## 深挖第2轮追加

- 未发现新的问题。深挖结束。

## 深挖统计

- 第1轮发现数：2
- 第2轮新增：0

## 维度复核结论

- 初审 2 项，独立复核后保留 1 项、驳回 1 项。
- 保留项集中在测试文件职责聚合过度；`runtime-factory.ts` 目前仍可视为 runtime assembly layer 的现状实现，不构成明确 owner 漂移。

## 子项复核结论

- `[维度02] runtime-factory.ts 已从 assembly 层重新吸入 import/cache 实现`: 驳回。当前 live docs 明确把 `createModuleCache()` / `prepareSchema()` 归到 `runtime-factory.ts`，属于装配层实现，最多算 500+ orchestrator 观察项。
- `[维度02] schema-compiler-prop-coverage.test.ts 超过 700 行且聚合 13 组无关 renderer coverage`: 保留。该文件同时命中仓库 `>700` 硬阈值和多组独立 renderer coverage 混装两项条件，是真实测试模块边界问题。
