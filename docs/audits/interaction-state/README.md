# 交互状态质量轨道审计基建（Interaction-State Audit Infrastructure）

> Created: 2026-10-07（plan 543，IS-0）。本目录是 `docs/backlog/interaction-state-quality-roadmap.md` 轨道的台账与枚举产物落点；审查方法见 `docs/skills/interaction-state-audit-prompt.md`（六类缺陷 A–F + 不变量 V1–V6 + 五步审查法）。

## 目录结构

| 路径                   | 作用                                                                                                              | 维护方式                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `inventory/pages.json` | 页面清单程序化枚举产物（257 页 = domain 80 + complex 40 + lab 134 + index 3），含 family/batch/interactionProfile | **生成物**，禁止手改                                  |
| `ledger.md`            | 覆盖台账：pages section（每页一行）+ findings section（逐条 `IS-<page>-<seq>`）                                   | pages 行状态由批次计划翻转；findings section 人工维护 |
| `<批次>/`（IS-1 起）   | 各批序列审查证据目录（prompt §7 格式的 finding 卡 + 读数留档）                                                    | 各批次计划自建                                        |

## 命令

```bash
pnpm interaction:inventory            # 再生成 inventory/pages.json + 合并 ledger.md page 行
pnpm interaction:reconcile            # 结构对账 + uncovered 计数报告
pnpm interaction:reconcile -- --strict  # uncovered>0 或结构违例即 exit 1（IS-9 门禁形态）
```

生成器实现：`scripts/interaction-state/generate-interaction-inventory.test.ts`（vitest 形态，导入 live `route-model.ts` / `complex-pages-model.ts`，零手抄 id）；台账解析库 `scripts/interaction-state/interaction-ledger-lib.mjs`；对账脚本 `scripts/interaction-state/reconcile-coverage.mjs`。

## 状态机

- **pages**：`pending`（批次未跑）→ `audited`（该页序列审查完成、findings 已登记）。`orphan` = 清单再生成时发现条目已从路由模型消失（终态，不计 uncovered）。
- **findings**：`pending`（已登记）→ `found`（复现序列 + 前后读数证据立案 / 红 e2e 写出）→ `fixed`（修复落地转绿）→ `verified`（复检通过）。P2/P3 登记不修时 disposition 列填裁决去向三态之一，禁止静默留空。

## 批次归属（IS-1–IS-9）

枚举器的 batch 规则即轨道批次分配（裁定记录见 plan 543 Current Baseline）：IS-1 flow-designer 族 / IS-2 gantt 族 / IS-3 calendar 族（含 cal-booking/cal-confirm/cal-success）/ IS-4 设计器编辑器域 / IS-5 数据可视化表格域 / IS-6 其余 domain+index / IS-7a/7b 复合页对半 / IS-8a/8b/8c lab 按 sourcePackage。`interactionProfile` 字段提示每页该跑 prompt §6 的哪些序列族（canvas/scroll/drag/selection/dialog/feedback/shell-host；`dynamic` = 审查时按 §4-1 现场枚举）。

## e2e 探针模板

`tests/e2e/helpers/interaction-state-probes.ts`（读数采集 / 前后 diff / V4 几何锚定 / V6 实体样式读数）+ `tests/e2e/interaction-state-probe-template.spec.ts`（"采集 → 驱动 → 采集 → diff → 断言违反的不变量"模式示范）。后续批次照模板写序列 spec：**断言读数，截图仅佐证**。

## uncovered=0

`uncovered` = 仍处 `pending` 的页面数。IS-9（复检与守护固化）的关闭前置是 `pnpm interaction:reconcile -- --strict` exit 0（uncovered=0 且零结构违例）。
