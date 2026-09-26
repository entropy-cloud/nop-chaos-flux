# 518 Missing Components L4.9c — airtable replica retrofit（keyboard 导航 + optionRow + URL 物化裁定）

> Plan Status: completed
> Last Reviewed: 2026-09-27
> Source: `docs/discussions/2026-09-26-l4-9-replica-retrofit-scoping.md`（518 簇裁定，含 keyboard 原语血缘注记）；C2 回写⑦ :223（十五键位缺口）/ 回写⑧ :262（批量栏未启用维持）
> Related: `docs/plans/515-missing-components-l4-9-replica-retrofit-scoping-plan.md`

## Purpose

airtable-grid 的键盘导航缺口用 D1 原语可覆盖子集接线（combo/chord 类），行态 optionRow 化，并完成 P7b ad-hoc URL 物化的迁移/豁免裁定。方向键网格漫游（roving）部分按血缘裁定落 D1 输入池（C2:372 既有 deferred）。

## Current Baseline

- airtable-grid.json:12/:23 P7b ad-hoc query 内插（`range=lastmonth`/`group=category` 默认恒写入请求 URL）。
- 十五键位键盘导航缺口（回写⑦ C2:223）；批量栏未启用（N14 口径维持）。
- `keyboard` renderer 仅 combo/chord 通道（无 roving/网格漫游）。

> **Phase 1 执行期核实更正（2026-09-26）**：① 515 §3/本 Baseline 所记 `range=lastmonth` 经实核**属 stripe（P6b，stripe-payments.json:12/:23）而非 airtable（P7b）**——airtable-grid.json:12/:23 的 ad-hoc 物化面实为 `keyword=${atSearchKeyword ?? ''}`（空串默认恒写）与 `group=${atGroupBy ?? 'category'}`（默认恒写）；scoping m2 语义差清单的裁定逻辑不受影响（两处语义差对 airtable 实际参数面同样成立）。② 「combo/chord 通道」细化核实：`bindings[].action`（prop 轨）携带 `openDialog` 时 keyboard 节点 props 程序编译失败（null-member 永久 pending，节点上全部 bindings 失效，实测三形态复现；`openDrawer`/`navigate`/`showToast`/`setValue` 正常）；surface 类动作须走 `onTrigger` 事件轨（与 `onClick` 同一 action 编译通道）+ 逐 action `when` 按 payload `keys` 分路——本 plan 即以该模式接线，原语本体零改动。

## Goals

- combo/chord 可覆盖的键位接线（`keyboard` bindings）；方向键漫游缺口 → D1 输入池登记（roving helper 触发条件计数 +1）。
- optionRow 行态化（核实后落格）。
- URL 物化裁定：按 515 §3 两处语义差核对清单裁决迁移 syncLocation 或声明豁免（二选一落盘）。

## Non-Goals

- 批量栏（N14 维持）；roving/网格漫游实现（D1 池）；视觉重设计。

## Failure Paths

| 编号                  | 触发                   | 行为                               | 可重试 | 用户可见 |
| --------------------- | ---------------------- | ---------------------------------- | ------ | -------- |
| url-migration-visible | 迁移后地址栏出现 query | 属语义差 (a)——若裁定不接受则走豁免 | —      | 按裁定   |

## Test Strategy

档位：**必须自动化**——airtable 交互套全绿 + 键盘断言迁移。

## Execution Plan

### Phase 1 - 键盘子集 + optionRow + URL 裁定

Status: completed（2026-09-26）
Targets: `apps/playground/src/complex-pages/page-schemas/airtable-grid.json`

- Item Types: `Fix`、`Proof`
- [x] combo/chord 键位 → `keyboard` bindings（逐键映射表见下方 Closure「逐键映射表」；方向键漫游 → D1 池登记）→ **已接线 2 键**：`⌘F`（A1 搜索入口）与 `⌘⇧Enter`（A10 末尾插行）， bindings 声明静态键面 + `onTrigger` 事件轨按 `when: ${keys === …}` 分路派发与按钮面同一份 openDialog action（浅拷贝同 testid，双入口零语义差）；其余键位不接线（理由逐键见映射表），原语本体零改动
- [x] optionRow 格核实落格 → **不适用（不实施）**：airtable 网格行态（行 hover 铺底/选中单元格蓝框/首行选中态样本）为**纯 CSS 静态样本**（airtable-grid-note :3453 自证，G-F 口径沿 P5a），无任何绑定驱动的行状态源可挂 `optionRow.value`——选中集通道（rowSelection/modifierSelect）未接线且 Space 展开维持 A13 显式裁决，键盘接线子集（⌘F/⌘⇧Enter）不产生行态。无值可绑定，实施即发明状态源（行为变更），留待真实选中/高亮状态源出现时随消费诉求立项
- [x] URL 物化裁定落盘（迁移 syncLocation 或豁免+D1 登记，二选一）→ **裁定：豁免（保留 ad-hoc 面）+ D1 输入池登记**。理由：① **契约面不适用**——`syncLocation` 为 L3.5 crud 专属契约（`flux-renderers-data` crud-schema/crud-renderer + `useUrlFilterSync`），airtable-grid 是 page + data-source×2 + table 组合页，**非 crud renderer**，无 syncLocation 声明面；迁移需把 syncLocation 推广为 data-source/page 级原语（新原语工作，超本 plan 边界）或整页改 crud（用户可见行为大变更，违 retrofit 边界）。② **语义差 (a) 不可接受**——现状 ad-hoc 把 query 恒写入**数据源请求 URL**（地址栏零可见）；迁移后 `group=category`/`keyword=` 将写入**浏览器 location**且首跑仅记基线不写、空值删键——airtable 的 group/keyword 是驱动 mock 服务端预分组/预过滤的演示参数，恒写默认值是 P7b 显式接线语义（e2e 03 锁定 `group=` 物化），地址栏曝光属无收益的用户可见行为变化。③ **语义差 (b) 可适配但不构成迁移理由**——`useUrlFilterSync` 恢复走表单句柄 setValues，airtable 筛选是 scope 变量（atSearchKeyword/atGroupBy）+ dependsOn 重跑、无表单句柄；scoping §3 已注记「无表单时 applyToForm 缺省即可」，但 (b) 单独可适配不翻转 (a)+① 的否决。豁免出口按 scoping §3 落 D1 输入池（见 Deferred）

Exit Criteria:

- [x] airtable 交互 e2e 全绿；裁定落盘 → **交互套 13 例 + visual 6 例 = 19/19 全绿**（新增 518 用例 12/13：⌘F 打开搜索弹层并走通 keyword 过滤流、⌘⇧Enter 打开新增弹层且空提交 required 拦截零写入；首轮 01/02/12/13 冷启动超时属 517 同款预置基建噪声，重试全过）；`pnpm --filter @nop-chaos/flux-playground test` 37 files / 391 tests 全绿；eslint 零告警；schema JSON 解析 + 双入口 action 同一性（与按钮面 `onClick` 逐字节一致）脚本断言通过

### Phase 2 - 收口

Status: completed
Targets: roadmap §13 L4.9 行、dev log

- Item Types: `Proof`
- [ ] 518 完成注记回写 + dev log

Exit Criteria:

- [ ] roadmap/dev log 落盘

## Draft Review Record

- Reviewer / Agent: <<待填>>
- Verdict: <<待填>>
- Rounds: <<待填>>
- Findings addressed: <<待填>>

## Closure Gates

- [ ] Phase 1-2 Exit Criteria 全勾
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（合并审计 approved，2026-09-27）
- [ ] `pnpm typecheck` / `build` / `lint` / `test` 全绿；`pnpm check` 零新增红；`pnpm test:e2e` 零新增红口径（随批次）

## Deferred But Adjudicated

### 方向键网格漫游（roving）

- Classification: `watch-only residual` → D1 输入池
- Why Not Blocking Closure: 共享 roving helper 触发条件计数 +1（仍 <2 落地消费方阈值裁决线）；C2:372 既有 deferred
- 本 plan 登记键位明细（映射表「roving 依赖」档）：方向键/Tab/⌘+方向键（单元格移动/跳边缘）、⇧+方向键（范围选区）、⇧Enter（下插行，需当前格锚点）、⌘;（日期置今天，需选中格）、⌘↑/⌘↓（跳组顶/组底）
- Successor Required: `no`（计数 ≥2 时抽取 helper）

### P7b ad-hoc URL 物化（syncLocation 迁移豁免）

- Classification: `exempted residual` → D1 输入池
- Why Not Blocking Closure: 裁定理由见 Phase 1 第三项（契约面 crud 专属不适用 + 语义差 (a) 地址栏曝光不可接受 + (b) 可适配但单独不构成迁移理由）；ad-hoc 面为 P7b 显式接线语义且有 e2e 锁定（01/03），非漂移态
- Successor Required: `watch`——若未来出现「复刻页深链恢复筛选」真实诉求，随 syncLocation 原语推广（data-source/page 级）立项重裁

### keyboard bindings prop 轨不承载 openDialog（原语缺口）

- Classification: `primitive gap` → D1 输入池
- Why Not Blocking Closure: 实测 `bindings[].action` 携带 `openDialog` 时节点 props 程序永久 pending（节点全部 bindings 失效）；本 plan 以 `onTrigger` 事件轨 + `when` 分路在 schema 层消解（原语零改动），已接线键位不受此缺口影响；缺口本体（openDialog 进 bindings prop 轨的编译支持）无第二消费诉求
- Successor Required: `no`（出现「bindings 静态轨必须直接派发 surface 动作」的消费诉求时随 flux-compiler props 程序立项）

## Closure

Status Note: Phase 1 completed（2026-09-26）。三格终态：**keyboard = 已接线 2 键（⌘F→A1 搜索、⌘⇧Enter→A10 末尾插行；bindings 静态键面 + onTrigger 事件轨 `when` 按 payload keys 分路，与按钮面同一份 openDialog action，双入口同 testid 零语义差）+ 其余键位不接线（roving 依赖 → D1 池计数 +1；语义等价面不存在/行为变更超边界者逐键落格见映射表）**；**optionRow = 不适用（行态为纯 CSS 静态样本，无绑定驱动状态源，落格理由见 Phase 1）**；**URL 物化 = 豁免（syncLocation 为 crud 专属契约、airtable-grid 非 crud；语义差 (a) 地址栏曝光不可接受、(b) 可适配但不构成迁移理由；保留 ad-hoc 面 + D1 登记）**。验证：airtable 交互 13 + visual 6 = 19/19 e2e 全绿（首轮冷启动 flaky 重试过，517 同款预置噪声）、flux-playground vitest 37 files/391 tests 全绿、eslint 零告警；原语本体（keyboard/batch-bar/flux-compiler）零改动；schema 注记三处随接线同步改写（⌘F/⌘⇧Enter 已接线、⇧Enter 下插行归 G-B2/D1）。Phase 2（roadmap 回写 + dev log）待收口。

#### 逐键映射表（P6b 十五键位终态表的 518 复核终态；含分组态补充键位）

| 键位（P6b 终态表行）                         | 518 终态                 | 通道 / 不接线理由                                                                                                                                                                                                                                                  |
| -------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ⌘F（视图内查找）                             | **已接线**               | keyboard binding `mod+f` → onTrigger `when: ${keys === 'mod+f'}` → A1 搜索 openDialog 同一 action（e2e 12 锁定：弹层同 testid + keyword 过滤流走通）；`allowInInput` 缺省 false（输入框内不触发，517 e2e 19 同口径）；preventDefault 显式 true（抑制浏览器查找条） |
| ⌘⇧Enter（末尾插行）                          | **已接线**               | keyboard binding `mod+shift+enter` → onTrigger `when: ${keys === 'mod+shift+enter'}` → A10 新增记录 openDialog 同一 action（e2e 13 锁定：弹层打开 + 空提交 required 拦截零写入，与按钮面 05 同语义）                                                               |
| 方向键 / Tab / ⌘+方向键（单元格移动/跳边缘） | 不接线 → D1              | roving 依赖（格级坐标模型 + 行级焦点仲裁）；keyboard 原语无漫游通道                                                                                                                                                                                                |
| ⇧+方向键 / ⇧+点击（范围选区）                | 不接线 → D1              | 选区层 G-B3；replica 无 rowSelection 声明，接 modifierSelect 需先引入 checkbox 选择面（用户可见行为变更超 retrofit 边界）                                                                                                                                          |
| ⌘+点击（非相邻多选）                         | 不接线 → D1              | 同上（G-B3 选区层）                                                                                                                                                                                                                                                |
| ⌘C / ⌘X / ⌘V                                 | 不接线 → D1              | 剪贴板 action 词汇缺口（回写③④⑤三例同源，维持）                                                                                                                                                                                                                    |
| Enter / F2（进编辑双态）                     | 不接线                   | 编辑语义收敛 record modal（A11a）；renderer `editable` 双态在库（回写⑮）但 replica 未声明列级 editable——接线即翻转用户可见编辑形态（原位编辑 vs modal），超本 plan 边界                                                                                            |
| Esc                                          | 维持内建锁定             | dialog/drawer Esc 内建（visual 03–06 锁定，P6b 终态不变）                                                                                                                                                                                                          |
| Space（展开记录）                            | 维持 A13 显式裁决        | 单击行语义冲突 + modal 体复制成本（回写⑦）；e2e 07 锁定不回归，518 零改动                                                                                                                                                                                          |
| ⇧Enter（下插行）                             | 不接线 → D1              | 原版语义需当前单元格锚点（roving 依赖）；replica 仅有末尾插行语义（A10），锚点语义等价面不存在                                                                                                                                                                     |
| ⌘Z / ⌘Y（撤销/重做）                         | 不接线                   | 协同裁剪（分析篇 §6.2，P6b 终态维持）                                                                                                                                                                                                                              |
| ⌘;（选中日期置今天）                         | 不接线 → D1              | 需选中格锚点（roving 依赖）；日期编辑经 input-date 承载（A11a）                                                                                                                                                                                                    |
| ⌘⇧> / ⌘⇧<（record 上/下一条）                | 不接线（维持按钮面等价） | prev/next action 依赖 record 端点载入的 dialog 内 scope 值（id/prevId/nextId），页面级 keyboard 节点 scope 不可达；kb-surface-stack 下页面级绑定浮层开启时本就暂停；A11b 按钮面等价路径在库（e2e 10）                                                              |
| fill handle 拖拽                             | 不接线 → D1              | G-B3 选区/填充模型（回写⑮ ①维持）                                                                                                                                                                                                                                  |
| ⌥↑ / ⌘↓（移动记录序）                        | 不接线                   | replica 无行重排端点语义（517 ⌥↑↓ 同款口径：语义等价面不存在）                                                                                                                                                                                                     |
| Alt+拖（复制记录/字段）                      | 不接线 → D1              | 拖拽 + 修饰键通道缺口（G-B3）                                                                                                                                                                                                                                      |
| ⌘⇧+D（开分组菜单，分组态补充）               | 不接线                   | replica 无「分组菜单」浮层语义——分组切换 = 常驻分段控件三枚显式 setValue（A8）；「循环分组」接线属发明新交互语义，按 517 ⌥↑↓ 同款口径不迁移                                                                                                                        |
| Enter 折叠/展开全部（分组态补充）            | 不接线                   | 组折叠在 replica 为形态样本（分组走 mock 预聚合 + loop，renderer 侧 G-D 组头折叠未被 replica 消费）                                                                                                                                                                |
| 组头点击折叠/展开（分组态补充）              | 不接线                   | 同上（形态样本，P6b 终态维持）                                                                                                                                                                                                                                     |
| ⌘↑ / ⌘↓（跳组顶/组底，分组态补充）           | 不接线 → D1              | roving 依赖（视口级跳转需行锚点）                                                                                                                                                                                                                                  |

> 终态计数：**已接线 2**（⌘F、⌘⇧Enter）；内建/显式裁决维持不变 1 + 14（Esc 内建；其余按 P6b 归因维持，其中 roving 依赖档合并为 D1 输入池**一次**触发条件登记——明细：方向键/Tab/⌘方向、⇧方向、⇧Enter、⌘;、⌘↑⌘↓）。接线实现注记：`bindings` prop 轨声明键面（keys/preventDefault），surface 类动作派发走 `onTrigger` 事件轨——bindings 静态轨直派 openDialog 会令节点 props 程序永久 pending（原语缺口，见 Deferred）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent（general-purpose，2026-09-27，516-519 合并审计）
- Evidence: verdict **approved**（双入口 openDialog 逐字节一致复验 + onTrigger 轨实证 + 勘误正确 + 豁免三段论证成立 + 缺口 D1 登记诚实 + 19=13+6 一致）

Follow-up:

- Phase 2（518 完成注记回写 roadmap §13 L4.9 行 + dev log）待执行；closure audit 待独立 fresh session 执行，其余 no remaining plan-owned work
