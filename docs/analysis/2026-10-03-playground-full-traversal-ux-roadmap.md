# Playground 全页面遍历 UX Roadmap（R13：全页面 × 全操作按钮确认与主子通信标准化）

> 创建日期：2026-10-02（R12 收口后用户提出）
> 状态：**roadmap 已定稿，待逐页执行**（执行期按 §五 波次推进，本文档 §六 矩阵逐页回填）
> 用户验收原话：每一个页面展现都要达到 UI/UX 要求，布局合理、美观、操作符合预期；弹窗中操作后需要更新到子页面的要更新到子页面；使用标准方案实现主子页面通信；不跨页面使用 id，页面内也尽量不使用 id。
> 方法论基线：browser-use 实机逐页逐按钮遍历（R12 的 40 页确认与此同法；禁纯探针下结论——R12 复审教训）。

## 一、范围清单（115 页，全量无抽样）

| 波次 | 分组                                       | 页数 | 清单来源                                                                                                                                                                                                                                                                                                                                                                                                                | 现状基线                                                                                                                  |
| ---- | ------------------------------------------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| W-A  | Complex Pages（外部应用刻划 + 数据可视化） | 40   | `apps/playground/src/complex-pages/complex-pages-model.ts`（45 id 项中 40 页 + 类目节点）                                                                                                                                                                                                                                                                                                                               | **R12 已全量确认过展现层**（`2026-10-03-complex-pages-browser-confirmation-roadmap.md`）；本轮增量 = **操作按钮逐一触发** |
| W-B  | 设计器 / 编辑器大家族                      | 10   | page-designer、flow-designer、taskflow-designer、report-designer、report-designer-host、print-designer、dashboard-demo、word-editor、code-editor、scada-editor-demo                                                                                                                                                                                                                                                     | R1-R12 修复基线 + 原始审计 19 路由确认；本轮增量 = 全按钮遍历                                                             |
| W-C  | 渲染器演示页                               | 22   | flux-basic、table-column-width、table-popover、tree-display-ux、condition-builder(+formula)、form-input-enhancements、input-suggest、layout-family-enhancements、text-icon-visual-fields、component-handles、event-prevention、boolean-control-value-contract、data-verify、env-stream、diff-view、graph-demo、map-demo、pivot-table-demo、leafer-examples、three-canvas-demo、mobile-components、mobile-infrastructure | 多数从未逐按钮确认                                                                                                        |
| W-D  | AI 家族                                    | 14   | ai-chat、ai-tools、ai-widgets、ai-hitl、ai-citations、ai-conversations、ai-persistence、ai-coverage、ai-component-handle、ai-rich-text、ai-linkage、ai-p4、ai-virtual-scroll、ai-attachments                                                                                                                                                                                                                            | 从未逐按钮确认                                                                                                            |
| W-E  | 性能 / 基建 / 实验页                       | 19   | performance-table、gantt-perf-scale、kanban-perf-scale、calendar-perf-scale、diff-perf-scale、scada-perf-scale、scada-pressure-demo、scada-demo、scada-edge-cases、gantt-states、m1-m5 移动五页、barcode-input、debugger-lab、w1a-w4c 内容家族九页                                                                                                                                                                      | 从未逐按钮确认（w 系列为内容组件样例页）                                                                                  |

> 合计 40 + 75 = **115 页**（home 入口页不计；report-designer-host 为宿主形态页与 report-designer 并列确认）。

## 二、逐页验收标准（每页六查，全部通过才记「确认」）

1. **布局合理**：无塌陷 / 黑域 / 溢出裁切 / 元素重叠；栅格与间距成体系；窄宽（1024）不破版。
2. **美观**：色彩对比达标（正文 ≥ 4.5:1）、字体层级清晰、间距一致、深浅主题下均成立。
3. **操作符合预期**：页面上**每一个按钮/可点元素逐一触发**——点击后有且仅有其语义所指的反馈（成功提示 / 列表刷新 / 弹窗打开 / 状态翻转 / 导航），无空点、无报错、无误跳。
4. **弹窗 → 子页面更新**：弹窗内提交/修改后，宿主列表/子表/统计卡随之更新（数据可见变化），关闭弹窗无残留遮罩。
5. **主子页面通信走标准方案**（见 §三）：dialog/drawer 用 `refreshNearest` + 生命周期钩子；主从联动用 scope 选择所有权（`selectionStatePath` + `dependsOn`）；不得自造“回调传入再手动刷”的旁路。
6. **id 规范**（见 §四）：页面间导航不以 id 耦合；页面内不以 DOM id / 自造 id 做组件协作依据。

不满足项按严重度记 P1（功能性破坏/数据不一致）/ P2（观感或交互瑕疵）/ P3（打磨项）；P1 当波修复，P2 当波修复或书面改判，P3 登记 roadmap 尾册。

## 三、主子页面通信标准（既有设计，本轮为「对齐审计」而非新造）

仓库已有成文标准（2026-07-27 设计 + 落地，R12 多页在用）：

| 场景                        | 标准方案                                                                                                                       | 禁止                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 弹窗表单提交 → 刷新宿主列表 | `openDialog` → form `submitForm` → `onSubmitSuccess: [{ action: 'refreshNearest' }]`；`closeSurface` 放 `submitForm.then` 链   | 手动传宿主 id/name 定位刷新；`onSubmitSuccess` 里混 `closeSurface` |
| 抽屉同理                    | `openDrawer` + 同上钩子                                                                                                        | 同上                                                               |
| 主从联动（左列表右详情）    | scope 选择所有权：`selectionStatePath` + 详情数据源 `dependsOn` 选择根                                                         | 跨组件直接读写对方 scope、以 DOM id 定位                           |
| 跨页导航携带上下文          | 页面参数经 route/scope 传递；**数据接口 URL 携带资源 id 属合法 REST 语义**（`/r/Xxx__issue?id=` 是后端寻址，不是页面 id 耦合） | `#/page?id=123` 式把行 id 拼进页面 hash                            |

参考文档：`docs/analysis/2026-07-27-flux-dialog-submit-refresh-design.md`（十大 Gap 与 A/B/C 方案）、`docs/architecture/surface-lifecycle-callbacks.md`、`flux-guide/design-patterns/page-dialog-drawer.md`。

执行期动作：对每个含「弹窗 + 宿主数据」组合的页面，核对是否为上述标准形态；非标准形态（自造刷新旁路 / 遗留 `refreshTable` 直调 / 缺 `refreshNearest`）记 P2 并当波改为标准方案。

## 四、id 使用规范与现状

- **页面间**：不得以行 id 拼页面 hash 传参（master-detail 类页面经 scope 选择态传递）。实机扫描现状：**complex-pages 40 页 hash 导航零 id 传参**，合规。
- **页面内**：组件协作不得依赖 DOM id；渲染层 `getElementById` 现状 **0 处**（仅 main.tsx 挂载点，合法）。schema 内 `data-testid` 是测试锚点不是协作通道，维持。
- **接口 URL**：`/r/资源?id=` 为 REST 资源寻址，**不属禁用范围**（airtable/linear 等 6 处合规使用）。
- 执行期动作：逐页确认时顺带核对「新增交互未引入 id 耦合」；发现渲染器强制要求 id 才能协作的（如历史遗留 `refreshTable(id)`），登记到渲染器级 follow-up。

## 五、波次执行计划（顺序执行，波内逐页）

| 波次 | 内容                                                                                     | 页数       | 预估     | 退出标准                     |
| ---- | ---------------------------------------------------------------------------------------- | ---------- | -------- | ---------------------------- |
| W-A1 | complex-pages 40 页：操作按钮逐一触发（展现层复用 R12 确认，不重复截图确认；只补操作面） | 40         | 3-4 会话 | 40 页确认卡全部回填；P1 清零 |
| W-A2 | complex-pages 主子通信对齐审计（弹窗+宿主组合页逐一核对 §三 标准形态）                   | 组合页 ~12 | 1 会话   | 非标准形态清零或登记         |
| W-B  | 设计器/编辑器 10 页全按钮遍历（每页含工具栏/右键/弹窗/模式切换全操作）                   | 10         | 2-3 会话 | 确认卡回填；P1 清零          |
| W-C  | 渲染器演示页 22 页                                                                       | 22         | 2 会话   | 确认卡回填；P1 清零          |
| W-D  | AI 家族 14 页                                                                            | 14         | 1-2 会话 | 确认卡回填；P1 清零          |
| W-E  | 性能/基建/实验 19 页                                                                     | 19         | 1 会话   | 确认卡回填；P1 清零          |
| W-F  | 收尾：全量 P2/P3 尾册复核 + 本文档状态收口 + 提交                                        | —          | 0.5 会话 | 本文 §六 矩阵 100% 回填      |

每页产出「确认卡」（回填 §六 矩阵）：页面 | 遍历日期 | 按钮总数/触发数 | 六查结论 | P1/P2/P3 清单 | 修复去向（当波修复 / 登记编号）。

## 六、逐页确认矩阵（执行期回填）

> 记法：`✅` 确认；`⚠️n` 确认但 n 项在册；`❌` 有 P1 未清。执行一次回填一行。

### W-A Complex Pages（40）

| 页面                    | 状态   | 卡片 |
| ----------------------- | ------ | ---- |
| crud-views-export       | 待执行 |      |
| dynamic-tabs            | 待执行 |      |
| standard-crud           | 待执行 |      |
| tree-crud               | 待执行 |      |
| inline-edit-table       | 待执行 |      |
| advanced-query          | 待执行 |      |
| master-detail           | 待执行 |      |
| detail-subtables        | 待执行 |      |
| business-document       | 待执行 |      |
| combo-editor            | 待执行 |      |
| form-wizard             | 待执行 |      |
| complex-form            | 待执行 |      |
| approval-tasks          | 待执行 |      |
| dashboard               | 待执行 |      |
| sundial-workbench       | 待执行 |      |
| sundial-analytics       | 待执行 |      |
| sundial-detail          | 待执行 |      |
| sundial-settings        | 待执行 |      |
| sundial-todo-dialog     | 待执行 |      |
| antdpro-list            | 待执行 |      |
| antdpro-form-basic      | 待执行 |      |
| antdpro-form-grouped    | 待执行 |      |
| antdpro-form-dialog     | 待执行 |      |
| antdpro-form-step       | 待执行 |      |
| antdpro-detail-basic    | 待执行 |      |
| antdpro-detail-advanced | 待执行 |      |
| antdpro-dashboard       | 待执行 |      |
| antdpro-result          | 待执行 |      |
| cal-booking             | 待执行 |      |
| cal-confirm             | 待执行 |      |
| cal-success             | 待执行 |      |
| linear-issues           | 待执行 |      |
| linear-board            | 待执行 |      |
| linear-inbox            | 待执行 |      |
| linear-detail           | 待执行 |      |
| linear-projects         | 待执行 |      |
| linear-settings         | 待执行 |      |
| notion-database         | 待执行 |      |
| airtable-grid           | 待执行 |      |
| stripe-payments         | 待执行 |      |

### W-B 设计器/编辑器（10）

| 页面                 | 状态   | 卡片 |
| -------------------- | ------ | ---- |
| page-designer        | 待执行 |      |
| flow-designer        | 待执行 |      |
| taskflow-designer    | 待执行 |      |
| report-designer      | 待执行 |      |
| report-designer-host | 待执行 |      |
| print-designer       | 待执行 |      |
| dashboard-demo       | 待执行 |      |
| word-editor          | 待执行 |      |
| code-editor          | 待执行 |      |
| scada-editor-demo    | 待执行 |      |

### W-C 渲染器演示（22）

| 页面                           | 状态   | 卡片 |
| ------------------------------ | ------ | ---- |
| flux-basic                     | 待执行 |      |
| table-column-width             | 待执行 |      |
| table-popover                  | 待执行 |      |
| tree-display-ux                | 待执行 |      |
| condition-builder              | 待执行 |      |
| condition-builder-formula      | 待执行 |      |
| form-input-enhancements        | 待执行 |      |
| input-suggest                  | 待执行 |      |
| layout-family-enhancements     | 待执行 |      |
| text-icon-visual-fields        | 待执行 |      |
| component-handles              | 待执行 |      |
| event-prevention               | 待执行 |      |
| boolean-control-value-contract | 待执行 |      |
| data-verify                    | 待执行 |      |
| diff-view                      | 待执行 |      |
| graph-demo                     | 待执行 |      |
| map-demo                       | 待执行 |      |
| pivot-table-demo               | 待执行 |      |
| leafer-examples                | 待执行 |      |
| three-canvas-demo              | 待执行 |      |
| mobile-components              | 待执行 |      |
| mobile-infrastructure          | 待执行 |      |

### W-D AI 家族（14）

| 页面                | 状态   | 卡片 |
| ------------------- | ------ | ---- |
| ai-chat             | 待执行 |      |
| ai-tools            | 待执行 |      |
| ai-widgets          | 待执行 |      |
| ai-hitl             | 待执行 |      |
| ai-citations        | 待执行 |      |
| ai-conversations    | 待执行 |      |
| ai-persistence      | 待执行 |      |
| ai-coverage         | 待执行 |      |
| ai-component-handle | 待执行 |      |
| ai-rich-text        | 待执行 |      |
| ai-linkage          | 待执行 |      |
| ai-p4               | 待执行 |      |
| ai-virtual-scroll   | 待执行 |      |
| ai-attachments      | 待执行 |      |

### W-E 性能/基建/实验（19）

| 页面                                                                                          | 状态   | 卡片 |
| --------------------------------------------------------------------------------------------- | ------ | ---- |
| performance-table                                                                             | 待执行 |      |
| gantt-perf-scale                                                                              | 待执行 |      |
| kanban-perf-scale                                                                             | 待执行 |      |
| calendar-perf-scale                                                                           | 待执行 |      |
| diff-perf-scale                                                                               | 待执行 |      |
| scada-perf-scale                                                                              | 待执行 |      |
| scada-pressure-demo                                                                           | 待执行 |      |
| scada-demo                                                                                    | 待执行 |      |
| scada-edge-cases                                                                              | 待执行 |      |
| gantt-states                                                                                  | 待执行 |      |
| m1-responsive                                                                                 | 待执行 |      |
| m2-touch                                                                                      | 待执行 |      |
| m3-layout                                                                                     | 待执行 |      |
| m4-data                                                                                       | 待执行 |      |
| m5-showcase                                                                                   | 待执行 |      |
| barcode-input                                                                                 | 待执行 |      |
| debugger-lab                                                                                  | 待执行 |      |
| w1a-content / w1b-content / w2a / w2b / w3a-w3b / w3c / w3d / w4a / w4b / w4c（合并一行跟踪） | 待执行 |      |

## 七、已知在册基线（执行时对照，不重复开卡）

- R12 确认文档在册项：linear-board（tab 对齐已修/筛选片已修 → W-A1 只验操作面）、dashboard（渠道占比卡已修）、combo-editor 双删除钮（共享 composite 组件，维持登记）、sundial-detail 留白（已居中）、antdpro form-basic/detail-basic 背景接缝（改判非缺陷）、master-detail 子表加载 >2s（性能观测）。
- 渲染器级 plan-first：container className-flex 陷阱；表格 fixed 列宽度预留（不透明底已在 R12e 落地）；SPA hash 导航竞态（自动化测试关注）。

## 八、完成定义（DoD）

1. §六 矩阵 115 行全部回填，`✅/⚠️` 覆盖 100%，`❌` 清零。
2. 所有 P1/P2 修复有对应测试或实机探针记录（daily log 归档）。
3. 主子通信审计：所有「弹窗+宿主」组合页均为 §三 标准形态（或改判书面理由）。
4. id 规范：全站无新增 id 耦合；接口 URL 资源寻址合规。
5. 全量门禁（typecheck/build/lint/test/check）收口时全绿；daily log 记录完整确认过程。
