# 视觉质量二期覆盖基建目录（docs/audits/visual-quality-r2/）

> Owner plan: `docs/plans/491-visual-quality-r2-coverage-infrastructure-plan.md`（R2-0）
> Roadmap: `docs/backlog/visual-quality-r2-roadmap.md` ｜ 方法口径: `docs/skills/visual-page-quality-inspection-prompt.md`

## 目录角色

| 文件                        | 角色                                                                                                                   | 再生成                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `inventory/pages.json`      | 页面全量清单（245 = 124 lab carrier + 121 R2-1 走查页），含批次归属与 hash                                             | `pnpm visual:inventory`                       |
| `inventory/controls.json`   | 控件全量清单（139 个 renderer 定义），含批次、matrix 档位与理由                                                        | `pnpm visual:inventory`                       |
| `ledger.md`                 | 覆盖台账：121 页 + 139 控件的逐项状态机（pending→carded→digested→verified），由再生成合并（保留状态、消失行标 orphan） | `pnpm visual:inventory`（合并语义，不手改行） |
| `evidence-card-template.md` | 走查卡模板：截图矩阵清单 + A–H 勾选 + 发现归族栏                                                                       | 手工复制使用                                  |

## 命令

```bash
pnpm visual:inventory                 # 再生成清单 + 合并台账（vitest 驱动，自证断言内置）
pnpm visual:reconcile [--json]        # 对账：uncovered/orphan 结构缺失 exit 1；状态进度为信息输出
pnpm visual:capture --routes <id,...> | --batches <B,...>   # 截图矩阵 → _tmp/visual-inspection-<date>/
```

- 截图只落 `_tmp/`（快照政策：永不入库）；runner 对落 home 回退的路由给 suspect 标记。
- 交互态经 `scripts/visual-quality/interactions.mjs` 显式注册表驱动；各走查批随本批 plan 扩面。
- R2-5 验收口径：`pnpm visual:reconcile` 输出 uncovered=0 且台账全 verified（roadmap 关闭前置）。

## 批次裁定记录（plan 491 Phase 4，2026-09-23 按枚举实数裁定）

**页面批次**（R2-1 走查面共 121 页）：

| 批次  | 页数 | 范围（live id 实数）                                                                                                                                                                                                                    |
| ----- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R2-1a | 40   | complex-pages 全域（含 airtable/antdpro/cal/linear/notion/sundial 各复刻页）                                                                                                                                                            |
| R2-1b | 10   | flow-designer、dingtalk-flow-demo、print-designer、report-designer、report-designer-host、spreadsheet、word-editor、taskflow-designer、scada-editor-demo、debugger-lab                                                                  |
| R2-1c | 13   | dashboard-demo、pivot-table-demo、map-demo、graph-demo、three-canvas-demo、scada-demo、scada-pressure-demo、scada-edge-cases、scada-perf-scale、performance-table、table-popover、table-column-width、data-verify                       |
| R2-1d | 58   | 表单/编辑器（code-editor、condition-builder×2 等）、AI 16 页、移动端 7 页、scheduling demo（gantt/kanban/calendar/barcode + perf-scale）、w/m 系 demo、diff-view×2、env-stream、flux-basic、3 条索引路由（home/lab/complex-pages 索引） |

roadmap 差异说明：roadmap R2-1b 所称 `dashboard-editor` 无 live 路由 id（dashboard 域归 R2-1c）；`report-designer×3` 的 live 实体为 report-designer + report-designer-host 两条；scheduling demo 页（gantt/kanban/calendar 族）裁定入 R2-1d「其余 demo 面」（R2-1c 清单未列）。lab 的 124 条路由是 R2-2 控件的 carrier，不单独占 R2-1 行。

**控件批次**（139 个 renderer 定义，来源 = 19 个 live definitions 数组/18 包）：

| 批次  | 数量 | sourcePackage 族                                                                                                           |
| ----- | ---- | -------------------------------------------------------------------------------------------------------------------------- |
| R2-2a | 59   | basic / form / form-advanced                                                                                               |
| R2-2b | 46   | data / content / layout / mobile                                                                                           |
| R2-2c | 34   | ai / scheduling / industrial(含 editor) / 3d / word-editor / spreadsheet / flow-designer / graph / map / pivot / dashboard |

**复杂控件裁定**（六属性阈值 ≥3 → full 矩阵）：full = calendar、condition-builder、crud、dashboard、dashboard-editor、gantt、graph、input-table、kanban、picker、table、wizard（12 个）；其余 127 个 simplified（卡内注明裁剪理由，matrixReason 字段给属性清单）。

**print 裁定**：`flux-print-renderers` 无 flux `RendererDefinition[]`（其 PRINT_ELEMENT_RENDERERS 形状不同）——print 控件域贡献为零，print 面由 R2-1b print-designer 页覆盖。

**fixtureRequired（16）**：designer-canvas/designer-page/designer-palette/designer-node-card/designer-edge-row/designer-field、scada-canvas、scada-editor-canvas、spreadsheet-page、word-editor-page、three-canvas、graph、map、pivot-table、dashboard、dashboard-editor——无 lab 路由的控件，由所属 R2-2 批补最小 schema fixture（roadmap R2-2 批内补齐项）。

## 枚举器维护

- 页面源：`apps/playground/src/route-model.ts`（8 route-entry + domain）、`complex-pages-model.ts`。
- 控件源：19 个 live definitions 数组（scheduling 经相对源路径深导入；print 除外，见裁定）。
- leafer-ui 及 @leafer-in/_、@leafer-ui/_ 经 `leafer-stub.ts` alias 桩替换（只读元数据，无渲染）。
- 批次规则与复杂度属性表是 plan 491 裁定数据（域/包级集合，非逐条 id 清单）；调整须走 structural change 评审（roadmap Rule 3/4）。
