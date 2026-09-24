# R2-3b 批内同探针复检报告（recheck）

> Date: 2026-09-24 ｜ Owner plan: `docs/plans/499-visual-quality-r2-3b-actions-alignment-remediation-plan.md`
> 探针: `_tmp/r2-3b-recheck/recheck-probe.mjs`（最终版：hash 从 inventory 解析；双探针 = 全 DOM form-actions 计算样式 + dialog-footer 通道）｜ 原始数据: `_tmp/r2-3b-recheck/recheck-results.json`（gitignore，本表为持久落点）
> 基线: R2-1a/R2-2a/R2-2b 卡内 actions 左对齐锚（修复前 `justify-content: normal`、按钮无最小宽）

## 1. 逐载体复检表（15 载体，1280×800）

| 载体                | form-actions 命中 | footer 通道命中 | 结果                                     | 备注                                                                                                                                   |
| ------------------- | ----------------- | --------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| lab-tabs            | 2                 | 0               | **pass**                                 | dir=row + justify=flex-end + minW=72px 全过                                                                                            |
| lab-loop            | 3                 | 0               | **pass**                                 | 同上（H5-32 主修复载体，3 实例全过）                                                                                                   |
| standard-crud       | 2                 | 0               | **pass**                                 | 同上；筛选行语义主按钮非最右 → R2-4 输入（见 §3）                                                                                      |
| antdpro-form-dialog | 1                 | 0               | **pass**                                 | 同上                                                                                                                                   |
| approval-tasks      | 1                 | 0               | **pass**                                 | 卡面 footerSlots=0 的 schema 侧形态本载体实测有 1 个 form-actions 容器且合规                                                           |
| complex-form        | 1                 | 0               | **pass**                                 | 同上                                                                                                                                   |
| cal-confirm         | 1                 | 0               | **pass**                                 | 同上；语义主按钮（确认预约）非最右 → R2-4 输入（见 §3）                                                                                |
| business-document   | 1                 | 0               | **pass**                                 | 同上                                                                                                                                   |
| lab-dialog          | 0                 | 1               | **pass**                                 | surface footer 通道 justify=flex-end（plan490 通道本就合规，复检未回归）                                                               |
| lab-wizard          | 0                 | 1               | **pass**                                 | footer 通道 flex-end                                                                                                                   |
| lab-dropdown-button | 0                 | 0               | pass（探针交互受限跳过）                 | 注册表步骤在探针前按 Escape 关闭菜单，机制上注定 0 命中——本载体**未被实测**，非「无发现」；菜单内 actions 对齐归后续探针增强或卡内取证 |
| master-detail       | 0                 | 0               | pass（schema 侧遗留登记）                | 无 form-actions/footer DOM；按钮由 schema body/容器渲染（Non-Goal 遗留，归 R2-4/replica 维护批）                                       |
| notion-database     | 0                 | 0               | pass（schema 侧遗留登记 + replica 豁免） | 同上                                                                                                                                   |
| stripe-payments     | 0                 | 0               | pass（schema 侧遗留登记）                | 同上                                                                                                                                   |
| linear-issues       | 0                 | 0               | pass（schema 侧遗留登记）                | 同上（linear E3-05 二选一裁定仍 open，归 R2-4）                                                                                        |

**汇总：15/15 通过；实测命中 10 载体（form-actions 容器 12 个 + footer 通道 2 个）全部 `row + justify-end + 72px` 达标；探针交互受限跳过 1；schema 侧遗留登记 4。零新增 fail；对照组（AlertDialog/plan490 阶梯）无回归（ui dialog.tsx/alert-dialog.tsx 零改动）。**

## 2. 台账翻转

- `loop` → **verified**（唯一正式发现 = H5-32 族实例；本批复检 3 实例全过；首个 verified 控件单元）。
- tabs/dialog 及 R2-1a 各页保持 `digested`（多族发现并存，本族复检通过记录于本表；R2-5 全量轮最终确认）。

## 3. R2-4 字母批输入（复检新增）

- standard-crud 筛选行「搜索/重置」次序：语义主按钮非最右（schema 侧 actions 顺序）。
- cal-confirm「返回上一步/确认预约」次序：同上。
- airtable replica menu 行按钮进入 min-width 作用域观察（`display: contents` 中和容器后规则仍命中；现 width:100% 无实际影响，登记知悉）。

## 4. 方法学备注

- 探针 evaluate 全部传真函数；复杂页 hash 从 `inventory/pages.json` 解析（初版误用裸 id 落 home 回退，已修正重跑，作废数据未采信）。
- lab-dropdown-button 的可复现增强（Escape 前探测菜单 actions）归 R2-5 探针固化评估。
