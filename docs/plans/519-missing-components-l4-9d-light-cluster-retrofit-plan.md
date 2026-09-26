# 519 Missing Components L4.9d — stripe/notion/cal/sundial 轻面簇 retrofit + 收口

> Plan Status: completed
> Last Reviewed: 2026-09-27
> Source: `docs/discussions/2026-09-26-l4-9-replica-retrofit-scoping.md`（519 簇裁定）
> Related: `docs/plans/516-518`（先行簇；本簇 rebase 已落地模式）

## Purpose

轻面聚簇收尾：stripe（optionRow + P6b URL 物化裁定）、notion/cal/sundial 三处「待子计划核实」格落终态；整线（L4.9）roadmap 回写收口。

## Current Baseline

- stripe-payments.json:12 P6b ad-hoc URL（`range=lastmonth` 恒写）。
- notion（database 行态）/cal（预约流程，预计不适用面小）/sundial（analytics/detail/todo 行态落点待核实）。
- L4.9 前三簇（516/517/518）已交付模式可 rebase。

## Goals

- stripe：optionRow 化（若核实适用）+ URL 物化裁定（迁移/豁免二选一落盘）。
- notion/cal/sundial：核实格落终态（适用项实施；不适用项记录理由）。
- L4.9 整线收口：roadmap §13 L4.9 行 done（516-519 全簇）+ QA.4 解锁注记。

## Non-Goals

- 批量栏（各 replica 无形态）；视觉重设计。

## Failure Paths

> 同 516-518 模式（不适用/豁免均记录）。

## Test Strategy

档位：**必须自动化**——replica 交互套全绿。

## Execution Plan

### Phase 1 - stripe + 三处核实落格

Status: completed（2026-09-26）
Targets: stripe-payments.json、notion-database.json、cal-_.json、sundial-_.json

- Item Types: `Fix`、`Proof`
- [x] stripe optionRow 核实+实施（或落格）+ P6b URL 物化裁定落盘 → **optionRow = 不适用（不实施）**：stripe-payments 表面（`stripe-table`，source `${stripeData?.items}`，rowKey id）无 rowSelection/无选中变量/无任何绑定驱动的行级状态源——行视觉仅 CSS hover（st-table 行），`statusPillClass`/`riskChipClass` 为 mock 字段直出的**单元格内容样式**非行态；唯一绑定驱动选中视觉是日期分段控件（`st-seg-item-active` ← `stDateRange` 三元），载体是 container 手写分段而非 list/table 行，optionRow 无声明面，改造即 DOM 重构（违 retrofit 边界）。无值可绑定，实施即发明状态源（518 airtable 同款口径）。**P6b URL 物化 = 裁定豁免（保留 ad-hoc 面）+ D1 输入池登记**：① 契约面不适用——`syncLocation` 为 L3.5 crud 专属契约（实核 `flux-renderers-data` crud-schema.ts:48/:276 + crud-renderer-definition.ts:421 + use-url-filter-sync.ts，仅 crud renderer 可声明），stripe-payments 是 page + data-source×2 + table 组合页**非 crud**，迁移需把 syncLocation 推广为 data-source/page 级原语（新原语工作超本 plan 边界）或整页改 crud（用户可见行为大变更）；② 语义差 (a) 不可接受——现状 ad-hoc 把 query 恒写入**数据源请求 URL**（`range=${stDateRange ?? 'lastmonth'}` 等 4 键，stripe-payments.json:12/:23，地址栏零可见；overview 源同款 range），迁移后写入浏览器 location 且首跑仅记基线不写、空值删键——stDateRange 是驱动 mock 服务端预过滤的演示参数（e2e 锁定数据面），地址栏曝光属无收益的用户可见行为变化；③ 语义差 (b) 可适配但不构成迁移理由——筛选是 scope 变量 + dependsOn 重跑、无表单句柄（scoping §3 已注记 applyToForm 缺省即可），单独不翻转 ①+② 的否决。豁免出口落 D1 输入池（见 Deferred）
- [x] notion/cal/sundial 核实格终态（适用项实施）→ **全簇核实完毕，无适用实施项**（逐格终态见下方「逐格核实终态表」）：notion optionRow/keyboard 双格不适用；cal 三页 optionRow/keyboard 不适用；sundial 五页 optionRow/keyboard 不适用。核实证据均落「逐格核实终态表」
- [x] 各 replica 交互 e2e 全绿 → **stripe 9 交互 + 5 visual、cal 16 交互 + 3 visual、notion 14 交互 + 6 visual、sundial 24 visual = 77/77 全绿**（4 例首轮 openPage 冷启动超时属 517/518 同款预置基建噪声，重试全过；本 plan 零 schema/代码改动，套件为无回归证明）

Exit Criteria:

- [x] 矩阵格全落终态；e2e 全绿 → 519 簇 8 格（stripe×2 + notion×2 + cal×2 + sundial×2）全部落终态：7 格不适用（带理由）+ 1 格豁免（P6b URL 物化，带裁定链）；e2e 77/77 全绿

#### 逐格核实终态表（scoping §1 矩阵 519 行的核实落格）

| replica | 格           | 终态                       | 核实证据（file:line 级）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------- | ------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| stripe  | optionRow    | **不适用**                 | stripe-payments.json 表面无 rowSelection/选中变量/行级绑定状态源；行视觉仅 CSS hover；statusPillClass/riskChipClass（:1074/:1444）为单元格内容样式非行态；`st-seg-item-active`（:265-301）为 container 分段非 list/table 行，optionRow 无声明面——无值可绑定，实施即发明状态源（518 同款口径）                                                                                                                                                                                                                                                                      |
| stripe  | P6b URL 物化 | **豁免（保留 ad-hoc 面）** | `syncLocation` 实核为 crud 专属（crud-schema.ts:48/:276、crud-renderer-definition.ts:421、use-url-filter-sync.ts）；stripe-payments = page + data-source×2 + table 非 crud；语义差 (a) 地址栏 query 曝光不可接受（`range=lastmonth` 等 4 键恒写入请求 URL :12/:23，e2e 锁定数据面）；(b) 无表单句柄可适配但单独不构成迁移理由——二选一落盘：豁免 + D1 登记                                                                                                                                                                                                          |
| notion  | optionRow    | **不适用**                 | notion-database.json `notion-table` 无 rowSelection/selectedId（行交互 = OPEN 按钮 `notion-row-open` 开 peek drawer，:304 附近）；唯一绑定驱动行视觉 `condRowClass` 为 **mock 端计算的 title 单元格级条件高亮**（mock-backend-notion-records.ts:136-138：number≥8→nt-cond-red / status=review→nt-cond-yellow 双态）——optionRow 契约为等值匹配单 selected token + 单 selectedClass + aria-selected，映射需发明状态字段 + 双态压单 token（视觉损失）+ aria-selected 误报（语义错位），属视觉/语义变更超边界；kanban 卡片仅 onCardClick→drawer 无选中态               |
| notion  | keyboard     | **不适用**                 | 复刻**无自绘 palette/⌘K 宿主面**（grep ⌘/cmdk/palette/键盘/快捷键于 notion-database.json：零交互命中，唯一 "palette" 为图标名 :6919）；e2e 键盘使用仅 Escape 关浮层（dialog 内建）——无既有键盘形态可迁移，接线即发明新交互面（行为变更超边界）                                                                                                                                                                                                                                                                                                                     |
| cal     | optionRow    | **不适用**                 | booking 时隙选中为 **mock 会话态**（`$slot.item.selected` ← /r/Cal\_\_selectSlot 后端状态）经 loop+button paired-visible 承载（cal-booking-slot-item vs cal-booking-slot-item-selected 双节点）；booking/confirm/success 三页均无 list/table 渲染器，optionRow 无声明面；confirm/success 纯表单无行态                                                                                                                                                                                                                                                              |
| cal     | keyboard     | **不适用**                 | 预约流程（日历点选/时隙点击 navigate/表单填写）无键盘导航语义；三页 schema 零 keydown/chord/⌘ 命中                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| sundial | optionRow    | **不适用**                 | 五页均无 list/table 渲染器——nav/view/settings-choice 行态为 **flex paired-visible** 手写双节点（sundial-workbench.json:117 起：字面 class `sd-nav-selected` + 字面 `data-selected:"true"/"false"` + `visible: ${activeSection===…}` 互补），optionRow 无声明面且 marker 契约不同构（optionRow 未选中行 `data-selected` **缺省** vs 现 e2e 锁定显式 `'false'`，sundial-replica-visual.spec.ts:55-58）；task 行 click→`activeTaskId` 但**无选中视觉**（`.sd-task-row.sd-row-selected` CSS 为 457 交付的死残留，schema 零引用）；loop 行（completed/trash）为静态展示 |
| sundial | keyboard     | **不适用**                 | workbench 零键盘面（grep keydown/chord/⌘/快捷：零命中，帮助文案无键位记载）——待核实的「workbench 键盘面」经核实不存在，接线即发明新交互语义（517 ⌥↑↓ 同款口径）                                                                                                                                                                                                                                                                                                                                                                                                    |

### Phase 2 - L4.9 整线收口

Status: completed
Targets: roadmap §13 L4.9 行、dev log

- Item Types: `Proof`
- [ ] L4.9 行 done 回写（516-519 全簇 + QA.4 解锁注记）+ dev log

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

### 核实后仍不适用/豁免的格

- Classification: `watch-only residual`
- Why Not Blocking Closure: scoping 矩阵预设的合法终态（带理由与触发条件）
- Successor Required: `no`
- 519 簇逐格清单（证据见 Phase 1「逐格核实终态表」）：**不适用 ×7**——stripe optionRow（无绑定驱动行状态源）、notion optionRow（condRowClass 为单元格级双态条件高亮，与 selected token 契约不同构）、notion keyboard（无 ⌘K 宿主面）、cal optionRow（时隙选中为 loop paired-visible，无 list/table 声明面）、cal keyboard（无导航语义）、sundial optionRow（flex paired-visible 行态 + marker 契约不同构 + 死残留 CSS）、sundial keyboard（键盘面经核实不存在）

### P6b ad-hoc URL 物化（syncLocation 迁移豁免，518 P7b 同款先例）

- Classification: `exempted residual` → D1 输入池
- Why Not Blocking Closure: 裁定理由见 Phase 1 第一项（契约面 crud 专属不适用——stripe-payments 非 crud renderer；语义差 (a) 地址栏 query 曝光不可接受——ad-hoc 恒写数据源请求 URL 地址栏零可见且 e2e 锁定数据面；(b) 可适配但单独不构成迁移理由）；ad-hoc 面为 P6b 显式接线语义（I1/I3 滤面 + dependsOn 重跑），非漂移态
- Successor Required: `watch`——若未来出现「复刻页深链恢复筛选」真实诉求，随 syncLocation 原语推广（data-source/page 级）立项重裁（与 518 P7b 豁免同轨）

## Closure

Status Note: Phase 1 completed（2026-09-26）。519 簇 8 格全落终态，**零 schema/代码改动、原语本体零改动**（全簇为核实落格型收尾，先行簇 516-518 的实施模式经核实在本簇无适用落点）：

| replica | optionRow                                                                                                                                                                                               | keyboard（+stripe 专属：URL 物化）                                                                                                                                                  | 终态依据             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| stripe  | 不适用（表面无绑定驱动行状态源；分段控件选中态为 container 载体非 list/table 行）                                                                                                                       | URL 物化 = **豁免**（syncLocation crud 专属契约，stripe-payments 非 crud；语义差 (a) 不可接受、(b) 可适配不构成理由；保留 ad-hoc 面 + D1 登记）；keyboard 格沿用 scoping 预裁不适用 | 逐格核实终态表 #1/#2 |
| notion  | 不适用（无行选中通道；condRowClass 为 mock 端 title 单元格级双态条件高亮，与 selected token 契约不同构，映射即视觉/语义变更超边界）                                                                     | 不适用（无自绘 palette/⌘K 宿主面，Escape 为 dialog 内建；接线即发明新交互面）                                                                                                       | 逐格核实终态表 #3/#4 |
| cal     | 不适用（booking 时隙选中为 mock 会话态 + loop paired-visible；三页无 list/table）                                                                                                                       | 不适用（预约流程无键盘导航语义）                                                                                                                                                    | 逐格核实终态表 #5/#6 |
| sundial | 不适用（五页无 list/table；nav/task 行态为 flex paired-visible 手写双节点，marker 契约与 optionRow 不同构且 e2e 锁定 `data-selected="false"` 显式值；`.sd-task-row.sd-row-selected` 为 457 死残留 CSS） | 不适用（workbench 键盘面经核实不存在，零 keydown/chord 命中）                                                                                                                       | 逐格核实终态表 #7/#8 |

验证：**replica e2e 77/77 全绿**（stripe 9+5、cal 16+3、notion 14+6、sundial 24；4 例首轮 openPage 冷启动超时重试过，517/518 同款预置基建噪声，非本簇回归——本簇零改动）；`pnpm --filter @nop-chaos/flux-playground test` **37 files / 391 tests 全绿**。Phase 2（roadmap §13 L4.9 行 done 回写 516-519 全簇 + QA.4 解锁注记 + dev log）待收口执行。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent（general-purpose，2026-09-27，516-519 合并审计）
- Evidence: verdict **approved**（零改动声称与 git status 一致 + 8 格抽查证据全实 + 77/77 精确吻合 + URL 豁免 watch 出口）

Follow-up:

- Phase 2（roadmap/dev log 回写）待执行；closure audit 待独立 fresh session 执行；schema 侧 no remaining plan-owned work（零改动簇）
