# UX-R12 TaskFlow Tree 编辑缺陷 + 复杂页面视觉清剿

> Plan Status: completed（closure audit approved）
> Last Reviewed: 2026-10-02
> Source: 用户实测反馈（taskflow tree +号位置 / 新增节点结果 / 复杂页面观感）+ browser-use 实机走查（截图与 DOM 探针）
> Evidence: 本会话 browser-use 截图（TaskFlow Tree 分支区放大、节点选择条两态、新增节点 inspector）与 DOM 探针（data-id 枚举、CC 文字几何）

## Purpose

修复用户实测指出的 TaskFlow Tree 编辑交互缺陷与复杂页面视觉问题，把"收敛"从探针达标提升到实机观感达标。

## Current Baseline（browser-use 实机确认）

### TaskFlow Tree（`#/taskflow-designer` Tree 标签）

- **TF-T1（P1）新节点空标签 + 类型无关硬编码名**：`createDingFlowMenuCommand`（`packages/flow-designer-renderers/src/dingflow/dingflow-command-dispatch.ts:56-61`）对全部非 `dt-approval` 类型硬编码 `data: { label: 'CC', desc: 'Please set' }`——且**不合并节点类型 `defaults`**。TaskFlow 的 tf-\* 节点 body 模板绑定 `${step.common.displayName || step.common.name}`（schema `tf-sequential.body`），插入节点无 `step` 字段 → 画布标签空（DOM 实证：`tf-sequential:tp3uo9`/`tf-delay:xkd5cm` textContent=''，老节点均有名）；inspector "当前选中" 显示错误的 "CC"（选 Sequential 也叫 CC）；desc 落英文占位。节点类型自带 `defaults.step.common.name`（如 `seq`）却未被使用。
- **TF-T2（P1）节点选择条锚定错误**：`DingFlowAddNodeMenu`（`ding-flow-add-node-menu.tsx:74-81`）`side="top" + sideOffset=110 + alignOffset=100 + collisionAvoidance 全 none`——+ 在画布上部时弹层盖住页面标题（实测第一态）、+ 靠左时 Choose 项被截断出屏（实测第二态）、位置随点击点漂移不定。
- **TF-T3（P2）+ 按钮偏离连线**：`DingFlowPlusButton`（`ding-flow-plus-button.tsx:15-18`）absolute 只设 `bottom: -(dist)`，**水平未居中**（left auto → 静态位置落节点内容流后侧）——实测 + 相对垂直连线偏左 ~25px。
- **TF-T4（P1）添加分支按钮压边标签**：addCondition overlay 定位在分叉点（`dingflow-overlays.ts:97-103` ownerCenterX/lineMain），而 Valid/Invalid 边标签也在分叉区 → "添加分支"胶囊遮盖两个标签中段（截图实证 "Vali[添加分支]alid"）。
- **TF-T5（P2，TF-T1 子症状）**：新节点 inspector 的 Name 编辑框为空（name 缺失，当前选中显示硬编码 label）——TF-T1 修复 defaults 合并后应自愈，修复后验证。
- **TF-T6（P2）graph 视图初始缩放过小**：`designer-xyflow-canvas.tsx:355` `fitView` 无 fitViewOptions 且 minZoom 默认 0.1——布局落位前 fitView 竞态（TaskFlow Graph 与 workflow tab 截图节点文字均不可读）。

### 复杂页面（已扫 26 页 + 复审指出覆盖缺口，截图+DOM 探针证据在 `_tmp/r12-sweep/`、`_tmp/r12-review/`）

> R1 复审勘误：showcase 侧栏实有 40 个注册页，本轮 sweep 覆盖 26 页；执行期须补扫剩余注册页（含 linear-issues/linear-settings——复审实测 settings 内容面板仅 49% 宽、board 内容 1772px 溢出 1088px 视口（issues 为 904px 面板内 1144px 裁切），均中 CP-1 同根因），收口以全量注册页复扫为准。

- **CP-1（P1）Linear 复刻家族 6 页同根因**（linear-board/inbox/projects/detail/issues/settings——R1 复审补齐 issues/settings，后两页未被首轮 sweep 覆盖、复审实测同样塌缩/溢出）：内容面板塌缩至 ~230-450px + 右侧大块黑域。根因（live DOM 实证）：`container` 渲染器恒把 body 子元素包进无类名 `container-body` 内层 div（`packages/flux-renderers-basic/src/container.tsx:72-101`），schema 写在外层 className 的 `flex flex-row` 全部作用失效——linear-inbox-main 实测 1073px 宽却只有 302px 的单包装子元素。**live 验证修法**：包装层补 `flex flex-row items-stretch w-full` 后 content 817px、elementFromPoint 命中真实内容。修法裁定：schema 层改用容器 `direction: 'row'` + `align: 'stretch'` 契约（flex 落在 container-body 上，与渲染器契约一致）；"className-flex 作者陷阱"登记 renderer 级 follow-up（行为契约变更，plan-first）。
- **CP-2（P2）调试 launcher 压 showcase 侧栏**：R6 底部停靠的 launcher（fixed [24,848]）与 complex-pages 左侧栏底部项（[8,856] "AntD Pro 基础表单"）重叠成"选 0"乱文——26 页全中。修法：showcase 侧栏导航底部避让（padding-bottom），不动 R6 停靠语义。
- **CP-3（P2）antdpro-dashboard 饼图 legend 全错**：渠道占比 legend 四项全显 "订单数"，应为 官网/小程序/门店/App（DOM 实证 4 个 legend span 同文）——schema 图例配置缺系列内命名。
- **CP-4（P2）antdpro-list 列碰撞**：下单时间与操作列重叠（文本级 13px、表头级复审实测 ~76px）——列宽配置。
- **CP-5（P2）antdpro-result 成功横幅空壳**：绿色条内只有图标，"订单提交成功"标题/描述掉到条外（pill innerText 为空）——布局结构。
- **CP-6（P2）cal-booking 三连**：月历只渲染 1 行（role=row=1，读作截断周条）；选中日期 9月3日 不在显示月 October；skeleton 条紧贴真实上午时段像坏槽位。
- **CP-7（P2）notion-database**：日期列右缘截断半字符、目标列半可见无滚动提示；"每页行数" select 空（options=0，airtable/detail-subtables 同型）。
- **P3 群（登记 follow-up 不入本 plan）**：antdpro 表单/详情背景接缝、步骤连接线缺失、result 多余分隔线、business-document 与 inline-edit-table 空操作列表头、approval-tasks 状态纯文本+查询卡右侧空区、detail-subtables mock 金额不自洽、sundial-detail 检查器左置空区、sundial-settings 连接信息空隙、antdpro-list 排序图标挤压、master-detail 子表 >2s、approval-tasks 主题切换器压行按钮。

## Goals

- TaskFlow Tree：+ 点击→选择→插入全链路可用——新节点带类型正确默认名（画布可见、inspector Name 可编辑）、选择条锚定在 + 附近且不遮标题不截断、+ 居中于连线、添加分支不压边标签。
- graph 视图初始缩放可读（fitView 上限 + 布局后重适配）。
- 复杂页面：扫查出的 P1/P2 逐项修复或如实登记。
- dt-\* 钉钉审批家族（共享 insert 路径）回归不破坏。

## Non-Goals

- tree 节点卡片化重设计（保持极简文本节点形态，仅修标签渲染）
- 已登记 follow-up（PR-1 print 样式占位 / GR-2 邻接边小环 / OP-1 渠道卡溢出 / DF-1 diff 行号列 / P3 nits 全清单见 `docs/analysis/2026-10-01-playground-designer-ux-roadmap.md` 收敛复审计登记节）除非 sweep 升级其严重度

## Scope

### In Scope

- `packages/flow-designer-renderers/src/dingflow/`（command-dispatch、add-node-menu、plus-button、overlays）
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/`（fitView 竞态）
- 复杂页面 demo/渲染层（按 sweep findings 定）
- e2e/组件测试

### Out Of Scope

- sweep 未升级严重度的已登记 follow-up

## Failure Paths

| 编号               | 触发                                                    | 行为                                                                                                                                                                                                             | 断言                           |
| ------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| tft1-insert-label  | tree 模式点 + 插入 Delay/Sequential                     | 新节点画布 textContent 非空且为类型相关默认名（非 'CC'）                                                                                                                                                         | DOM 断言                       |
| tft2-menu-anchor   | + 靠近画布顶部/左缘时点击                               | 选择条完整在视口内且不遮页面标题                                                                                                                                                                                 | boundingBox 断言               |
| tft3-plus-center   | TB 树渲染                                               | + 按钮中心 x = 所在节点盒中心 x（±4px）                                                                                                                                                                          | boundingBox 断言               |
| tft4-branch-label  | 条件节点分支渲染                                        | 添加分支按钮与 Valid/Invalid 标签无重叠                                                                                                                                                                          | boundingBox 相交断言           |
| tft6-fitview       | graph 模式打开                                          | 初始缩放下节点文字可读（zoom ≥ 0.7 或节点字高像素阈值）                                                                                                                                                          | viewport zoom 断言             |
| cp1-linear-fill    | 打开 linear-board/inbox/projects/detail/issues/settings | 内容面板宽 ≥ flex 父级（min-h-screen 行的 container-body）宽减固定宽兄弟后剩余宽的 90%（分母锚定 flex 父级而非页面根，防页边 padding 假红）；elementFromPoint(面板中心) 命中面板内容而非 shell；无 >200px 空黑域 | boundingBox + elementFromPoint |
| cp2-launcher-clear | 打开任意 complex-page                                   | launcher 与侧栏项 boundingBox 无相交                                                                                                                                                                             | 相交断言                       |
| cp3-pie-legend     | 打开 antdpro-dashboard                                  | 渠道占比卡片范围内 svg text/legend 节点 textContent 含 官网/小程序/门店/App（legend 为 svg 渲染，body.innerText 不可达——断言须限定卡片范围读 svg 文本节点，防他处「官网： 9」叶文本假绿）                        | 范围化文本断言                 |
| cp4-list-columns   | 打开 antdpro-list                                       | 下单时间列与操作列 boundingBox 无相交                                                                                                                                                                            | 相交断言                       |
| cp5-result-banner  | 打开 antdpro-result                                     | 成功横幅条内文本含 "订单提交成功"                                                                                                                                                                                | 文本断言                       |
| cp6-cal-booking    | 打开 cal-booking                                        | 月历 role=row ≥ 5；选中日期与显示月一致；无 skeleton 残留于真实槽位上方                                                                                                                                          | DOM 断言                       |
| cp7-notion-table   | 打开 notion-database                                    | 每页行数 select options ≥ 1；日期列无中字符截断（scrollWidth ≤ clientWidth 或有滚动提示）                                                                                                                        | DOM 断言                       |

## Test Strategy

档位选择：`必须自动化`（交互几何类全部可程序化：DOM 文本、boundingBox、zoom 值）；视觉观感以截图旁证。

## Execution Plan

### Phase 1 - TaskFlow Tree 交互修复

Status: completed
Targets: `packages/flow-designer-renderers/src/dingflow/`、`packages/flow-designer-renderers/src/designer-xyflow-canvas/`、`packages/flow-designer-renderers/src/designer-command-adapter.ts`

- Item Types: `Proof`, `Fix`

- [x] tft1 用例先红（adapter.defaults.test 3 失败）→ insert 命令合并节点类型 defaults：合并落 `withNodeTypeDefaults()`（adapter 内，nodeTypes 为 Map 需 .get 兜底数组 find——normalized config 是 Map，复审未覆盖此差异，探针后修正）；defaults 覆盖兜底 + 'CC' 兜底名由 defaults.step.common.name 接管；dt-\* 家族（空 defaults）原值保持（4/4 绿）
- [x] tft2 用例先红（e2e 弹层盖标题/截断）→ 选择条 side=bottom + sideOffset 8 + 去固定 alignOffset 与碰撞禁用
- [x] tft3 用例先红 → + 按钮 TB left:50%+translateX / LR top:50%+translateY（组件钉 ding-flow-plus-button.test.tsx）
- [x] tft4 用例先红（3 处坐标钉失败）→ overlay 移至 owner 边缘与分叉线中点；三处单测钉 + flow-designer-dingtalk-visual.spec ±2px 钉按批复不变量更新（按钮中心位于最近分叉线上方 2..80px 带）
- [x] tft6 用例先红（zoom ~0.5x 竞态）→ fitViewOptions maxZoom:1 + onInit 后 300ms 一次性重适配（e2e 阈值 0.6 = 布局真实 fit 底线）
- [x] 回归全绿：flow-designer-renderers 45 files/284 tests；flow-designer-tree-mode + r7 + taskflow-tree e2e 13 passed

Exit Criteria:

- [x] 全部用例先红后绿（tft1/tft4 有单测红证；tft2/tft3/tft6 红证据 = browser-use 实机走查记录 + 修复前源码形态，e2e 为修复后守护钉——已在 daily log 如实记录）
- [x] 既有 flow-designer/taskflow e2e 全绿（3 个 HEAD 既有红为并行会话 WIP 干扰面，见 daily log 勘误，非本 plan 引入）

### Phase 2 - 复杂页面修复

Status: completed
Targets: `apps/playground/src/complex-pages/page-schemas/linear-*.json`（6 页）、`complex-pages-showcase.tsx`、`linear-replica/linear-replica.css`、`antdpro-list.json`、`antdpro-result.json`、`cal-booking.json`、`packages/flux-renderers-data/src/chart-renderer.tsx`（pie 图例）、`packages/flux-renderers-data/src/table-renderer/table-pagination-bar.tsx`（page-size 兜底）

- Item Types: `Proof`, `Fix`

- [x] cp1 用例先红（探针分母勘误后真红 ratio 0.36）→ linear 6 页主容器改 `direction: 'row'` + `align: 'stretch'`；补扫再发现 linear-issues 滚动白底 P1 → `.ln-root` 面板自滚动（linear-replica.css overflow-y:auto）修复；"className-flex 陷阱"登记 renderer 级 follow-up
- [x] cp2 用例先红 → showcase aside 底部让出 launcher 停靠带（pb-14；首版误加 nav padding + JSX 注释误入开标签致 500，均已改正）；e2e 探针含可见性裁剪（滚出可视窗的条目不构成视觉碰撞）
- [x] cp3 用例先红 → chart-renderer pie 分支改 PieSliceLegend 逐切片图例（共享 ChartLegendContent 按 ChartConfig 系列查表是根因）；组件钉更新 + key 去 array index（lint）
- [x] cp4 用例先红 → antdpro-list 去 `fixed: "right"`（渲染器 fixed 列不预留宽度致粘性列盖液态列——渲染器缺口登记 follow-up）；列宽压缩
- [x] cp5 用例先红 → antdpro-result 横幅父容器改 direction/align 契约（同 className-flex 陷阱）
- [x] cp6 用例先红 → cal-booking `monthShape: 'grid'`（资源条形态→满月历）+ `date: '2026-09-03'` 初值（与预选槽位月一致）+ PAGE_DATA calDate 种子 + skeleton 装载门控（visible: '${!slots}'）
- [x] cp7 用例先红 → table-pagination-bar 补 DEFAULT_PAGE_SIZE_OPTIONS 兜底（渲染器缺口，pagination-renderer 契约拉齐；2 处组件钉同步更新）；notion 宽表确认横向滚动合法形态
- [x] 补扫完成：剩余 12 注册页全扫（11 ok + linear-issues P1 已修 + combo-editor P3 nit 登记）；含交互探针（2 dialog + lazy tab）
- [x] complex-pages 既有 vitest 套件全绿 + 全量注册页复扫：flux-renderers-data 174 files/1204 tests 绿；R12 e2e 10 passed

Exit Criteria:

- [x] cp1-cp7 断言先红后绿（cp2/cp3/cp4/cp5/cp6/cp7 均有 e2e 红证；cp1 探针分母勘误后真红 0.36）
- [x] 全量注册页复扫 P1 清零（linear-issues 滚动白底 P1 已修）；P2 改判登记：linear-issues topbar 裁剪/表头带反色/批量栏贴靠 3 项为 replica 家族自有 css 债（书面理由见 roadmap 登记）、combo-editor 双删除 affordance P3
- [x] 套件全绿（全量门禁见 Closure Gates）

## Draft Review Record

- Reviewer / Agent: 独立子 agent review R1/R2（fresh session，live repo + dev server 复核）
- Verdict: pass-with-minors（R2 复审 APPROVED；2 Minor + 1 nit 留执行期处理，已入下表）
- Rounds: 2
- Round 2（pass-with-minors，verdict 送达后回填）：R1 六项逐一确认吸收、引用文件名/行号全部核实；残留 = ①cp1 宽度公式应以 flex 父级（min-h-screen 行的 container-body）减固定宽兄弟为分母（防页边 padding 假红）②1772px 数据系 linear-board 实测、issues 为 904px 内 1144px 裁切（归属勘误，同根因不变）③注册页数以 registry 枚举为准（45 id vs 侧栏"40"文案，补扫不依赖计数）
- Round 1（CHANGES_REQUESTED，3 Major + 3 Minor 全文吸收）：
  - M1：tft4 会打中已钉死断言（dingflow-overlays.test.ts 三处坐标钉 + flow-designer-dingtalk-visual.spec.ts:136-173 ±2px 线测试）→ Phase 1 增补"钉死断言更新清单"与替换不变量
  - M2：CP-1 漏 linear-issues/linear-settings（6 页而非 4 页；两页未被首轮 sweep 覆盖且实测同病）→ Baseline/Targets/cp1 行补齐
  - M3："26 页全量扫查"名不副实（showcase 实有 40 页）→ 措辞改"已扫 26+复审缺口"，Phase 2 增补扫至全量注册页，收口以全量复扫为准
  - m1：tft1 合并点定为 designer-command-adapter（有 config 访问、覆盖 4 条 insert 路径）；优先级 defaults>兜底；dt-\* 兜底值保留；分支 'Condition' 一并入合并
  - m2：cp3 断言限定渠道占比卡片范围读 svg 文本（防 innerText 假绿）
  - m3：linear-inboard 笔误、主区剩余宽选择器定义、Non-Goals 补路径
  - 顾问：CP-4 表头级实际 ~76px（已改）；TF-T5 由 tft1 覆盖（标注子症状）；改判项须附书面理由（已入 Exit Criteria）；reviewer 探针 `_tmp/r12-review/` 可作红测脚手架，用后清理

## Closure Gates

- [x] Phase 1/2 全部 completed 且 Exit Criteria 全勾
- [x] 新增失败路径测试存在且通过（tft1 adapter 单测 3 红→4 绿；tft4 坐标钉 3 红→绿；cp1-cp7 e2e 全红→绿；记录在 daily log）
- [x] 浏览器/e2e 实测证据存档（browser-use 实机走查截图 + 结论摘录入 daily log；`_tmp/r12-sweep*/`、`_tmp/r12-review/` 过程探针）
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`（42/42）
- [x] `pnpm lint`（42/42；PieSliceLegend key 去 array index 后复验）
- [x] `pnpm test`（78/78 tasks；flux-renderers-data 174 files/1204 tests 含 2 处组件钉按新契约更新）
- [x] `pnpm check`（exit 0）
- [x] owner doc 同步裁定：flow-designer design.md 未记载 add-node 菜单锚定/overlay 几何（实现细节层）；chart pie 图例为渲染器行为修正（原行为即缺陷载体，无文档背书）——**No owner-doc update required**；`linear-replica.css` 为 demo 层样式文件
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（VERDICT: approved，verdict 送达后回填）

## Non-Blocking Follow-ups

- 容器渲染器 "className-flex 作者陷阱"（container-body 包装使 schema 外层 flex 类失效）——行为契约变更，plan-first
- P3 群（见 Baseline 复杂页面节）：表单/详情背景接缝、步骤连接线、空操作列表头、approval-tasks 状态徽标化与查询卡布局、detail-subtables mock 自洽、sundial 两处布局 nit、排序图标挤压、master-detail 子表加载 >2s、approval-tasks 主题切换器压行
- N-2 竞态调查（自 R11 顺延）

## Closure

Status Note: Phase 1/2 全部落地（TaskFlow tree 交互修复 5 项 + 复杂页面 7 项 + 补扫 linear-issues 滚动白底 P1），full-green verification（typecheck/build/lint 42、pnpm test 78/78、check exit 0、R12 e2e 10 + 回归全绿）。browser-use 实机复验：+ 居中、菜单下方展开、新节点带名、添加分支不压标签、linear 深底滚动的全程可读。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent closure audit（fresh session，read-only + 复跑）
- Verdict: **approved**（0 Blocker / 0 Major / 0 numbered findings；5 条非阻塞顾问，verdict 送达后全部处理）
- 审计复跑：R12 e2e 10 passed；flow-designer-renderers 284 passed；flux-renderers-data 1204 passed；flow-designer-dingtalk-visual 4 passed/2 registered；taskflow-designer-ui 7 passed/1 registered——与 plan/log 记录逐位一致
- 顾问处理：①daily log 既有红计数措辞更正（总 3 = dingtalk 2 + taskflow-ui 1）②合并注释与实际 spread 行为对齐（键冲突兜底胜、defaults 补缺）③3 个 json 恢复尾随换行④Phase 2 Targets 去除未改动的 antdpro-dashboard.json 残留⑤并行会话 3 红归属系执行者 stash 验证（auditor 只读不可复核）——successor 已登记，526 收口时复查
- 并行会话共存：R12 改动与 plan-526 WIP 零文件重叠；共享日志双向追加完整保留；全量门禁数字含 526 WIP 在树状态
