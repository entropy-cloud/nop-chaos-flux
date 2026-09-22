# R2-1a 复刻页与 complex-pages 域走查汇总（summary）

> Date: 2026-09-23 ｜ Owner plan: `docs/plans/492-visual-quality-r2-1a-complex-pages-walkthrough-plan.md`
> 口径: `docs/skills/visual-page-quality-inspection-prompt.md` ｜ 截图: `_tmp/visual-inspection-2026-09-23/r2-1a/`（不入库）
> 产物: cards/×40 ｜ review-crud-form.md + review-replicas.md（独立复核）｜ rounds/round-01.md（深挖轮）

## 1. 评分卡（40 页，pass=无 P0–P2 / warn=仅 P3 / fail=有 P0–P2）

| 页面                    | A              | B           | C              | D             | E           | F        | G   | H           | 总评     |
| ----------------------- | -------------- | ----------- | -------------- | ------------- | ----------- | -------- | --- | ----------- | -------- |
| antdpro-list            | fail(A9)       | fail(B5)    | fail(C2,C4)    | pass          | pass        | pass     | —   | fail(H5,H4) | fail     |
| antdpro-form-basic      | warn           | fail(B5)    | fail(C3)       | pass          | pass        | pass     | —   | —           | fail     |
| antdpro-form-grouped    | warn           | fail(B5)    | pass           | pass          | pass        | pass     | —   | —           | fail     |
| antdpro-form-dialog     | warn           | fail(B5)    | pass           | pass          | fail(H5)    | pass     | —   | fail(H5)    | fail     |
| antdpro-form-step       | warn           | fail(B5)    | fail(C3)       | pass          | pass        | pass     | —   | —           | fail     |
| antdpro-detail-basic    | pass           | warn        | fail(C3)       | pass          | pass        | pass     | —   | —           | 有风险   |
| antdpro-detail-advanced | pass           | warn        | fail(C3)       | pass          | pass        | pass     | —   | —           | 有风险   |
| antdpro-dashboard       | —              | warn        | pass(C6✔)      | pass          | pass        | pass     | —   | —           | 有风险   |
| antdpro-result          | pass           | warn(B1)    | pass           | pass          | warn(E4)    | pass     | —   | —           | 有风险   |
| linear-issues           | fail(A3)       | warn        | fail(C1,C2,C3) | pass          | fail(E1,E3) | warn     | —   | fail(H5,H6) | fail     |
| linear-board            | fail(A8)       | warn        | fail(C1,C4)    | pass          | fail(E1)    | warn     | —   | —           | fail     |
| linear-inbox            | pass           | warn        | fail(C1)       | warn          | fail(E1)    | pass     | —   | —           | 有风险   |
| linear-detail           | pass           | warn        | fail(C1,C4)    | pass          | fail(E1)    | pass     | —   | —           | 有风险   |
| linear-projects         | pass           | warn        | fail(C1)       | warn          | fail(E1)    | pass     | —   | —           | 有风险   |
| linear-settings         | fail(A3)       | pass        | fail(C1)       | pass          | fail(E1)    | pass     | —   | —           | 有风险   |
| sundial-workbench       | warn           | warn(B1,B4) | warn(C5)       | pass          | pass        | pass     | —   | pass        | 有风险   |
| sundial-analytics       | pass           | fail(B1)    | warn           | pass          | pass        | pass     | —   | —           | 有风险   |
| sundial-detail          | warn           | fail(B5)    | warn           | pass          | pass        | pass     | —   | pass        | 有风险   |
| sundial-settings        | pass           | warn        | pass           | pass          | pass        | pass     | —   | pass        | **pass** |
| sundial-todo-dialog     | pass           | warn        | pass           | pass          | warn(E3)    | pass     | —   | warn(H5)    | 有风险   |
| cal-booking             | fail(A9)       | fail(B1,B5) | fail(C4)       | pass          | pass        | pass     | —   | —           | fail     |
| cal-confirm             | fail(A9)       | fail(B1)    | fail(C4)       | warn          | fail(E3)    | pass     | —   | warn        | fail     |
| cal-success             | warn           | warn(B5)    | pass           | pass          | pass        | pass     | —   | —           | 有风险   |
| notion-database         | fail(A2)       | fail(B1,B5) | fail(C4)       | pass          | pass        | pass     | —   | pass        | fail     |
| airtable-grid           | warn           | pass        | fail(C4)       | pass          | pass        | pass     | —   | fail(H3)    | fail     |
| stripe-payments         | fail(A3)       | pass        | fail(C4)       | pass          | fail(E4)    | pass     | —   | pass        | fail     |
| dashboard               | warn           | warn        | fail(C1)       | pass          | warn(E4)    | pass     | —   | —           | fail     |
| approval-tasks          | fail(A7)       | fail(B3)    | fail(C2)       | pass(D6✔)     | warn        | pass     | —   | fail(H5)    | fail     |
| dynamic-tabs            | warn(A1)       | pass        | pass           | pass          | warn(E4)    | pass     | —   | —           | 有风险   |
| crud-views-export       | pass(A9✔)      | warn(B3)    | warn(C3,C4)    | pass(D6✔)     | warn        | pass     | —   | —           | 有风险   |
| form-wizard             | fail(A1,A5)    | fail(B1,B2) | pass           | pass          | pass        | pass     | —   | pass        | fail     |
| complex-form            | fail(A1,A3,A9) | fail(B2)    | pass           | pass(D2 warn) | fail(E3)    | warn     | —   | —           | fail     |
| combo-editor            | fail(A9)       | warn(B2)    | pass           | pass          | fail(E3)    | warn     | —   | —           | fail     |
| standard-crud           | warn(A3)       | pass        | fail(C4)       | pass          | pass        | pass     | —   | fail(H5,H4) | fail     |
| tree-crud               | warn(A1)       | pass        | warn(C4)       | pass          | pass        | pass     | —   | —           | 有风险   |
| inline-edit-table       | warn(A6)       | pass        | warn(C4)       | pass          | fail(E4)    | warn     | —   | —           | 有风险   |
| advanced-query          | pass           | warn(B5)    | fail(C1,C4)    | pass          | pass        | pass     | —   | pass        | fail     |
| master-detail           | pass           | warn(B5)    | fail(C4)       | pass          | pass        | warn     | —   | fail(H5)    | fail     |
| detail-subtables        | fail(A5,F5)    | pass        | warn(C4)       | pass          | fail(E4)    | fail(F5) | —   | —           | 有风险   |
| business-document       | pass           | pass        | fail(C4)       | pass          | fail(E4,E3) | pass     | —   | —           | fail     |

**分布**：fail 21 ｜ 有风险 18 ｜ pass 1（sundial-settings）。

## 2. 发现台账（严格口径，按卡内 id 锚定）

- **总量 128**：P0 ×3 ｜ P1 ×21 ｜ P2 ×49 ｜ P3 ×47（含深挖轮新增 3 条 P3）
- 归族：systemic 75 ｜ local 36 ｜ watch-only 17（watch 已登记 `docs/audits/visual-quality-r2/watch-pool.md`）
- 计数口径：以卡内 `### [R2-1a-*]` 发现条目的严重程度/归族行锚定统计；linear C-01 的 5 条"页面实例"另计（根因同族，已由家族复核覆盖）。closure audit 实测卡面归族栏主条目 systemic 75 与本表一致；local/watch 差 ±2 来自同族实例合并口径（如 A1-02、E3-05 的 watch 终裁以 watch-pool.md 为准）。

## 3. 独立复核结果（Phase 2，两路 fresh agent）

- `review-crud-form.md`：**15/15 保留**（3 P0 全部坐实：combo 幻影校验保存必败、dashboard flex 溢出不可达、approval 确认弹层被压不可点）。
- `review-replicas.md`：**10 保留 / 1 降级 / 1 驳回**——airtable H3-01 降级 P1→P2（body 可滚、字段可达，「完全不可达」证伪）；notion A2-01 驳回（触发器有 role=button+tabindex=0、Enter 可开，键盘链路完整）。
- P1 覆盖：21 条中 16 条逐一 live 复核；linear C-01 的 5 条页面实例由同根因家族复核覆盖（2 页 live + 6/6 schema 静态坐实）。
- 复核方法学记录：oklch→sRGB 合成、逐层背景合成、dark 态跨页残留清理、零尺寸 dialog 节点过滤、main 作用域定位防侧栏劫持（均已写入 review 文件供后续批复用）。

## 4. 深挖轮（round-01）收敛判定

7 项存疑/[visual-only] 复测：**无新 P0–P2**（P0 根因坐实：combo 幻影错误 = `{path:"name",rule:"required"}`，combo-renderer 缺 `getChildFieldPathPrefix` 致 items 规则 hoist 到根级裸路径；修复一行）；新增 3 条 P3 local（F1-15 子表列不一致、F4-14 文案漂移、弹层把手 focus 环被圆角吞）。**连续一轮无 P2+ 新发现 → 收敛。**

## 5. 系统性模式 Top N（跨页同根因）

1. **弹层/表单 actions 左对齐族（P1×4，≥10 页）**——form actions 模板与 openDialog actions 渲染缺省缺 `justify-end` + 按钮最小宽；同页 AlertDialog（组件级）完全合规形成双标准。涉及 standard-crud、master-detail、antdpro-form-dialog、approval-tasks、complex-form、cal-confirm、business-document、notion 创建、stripe 导出/Apply 等。
2. **窄视口（~800px）flex 收缩/固定壳层塌陷族（P0×1 + P1×5 + P2×8，≈15 页）**——两三个根因：①flux 渲染器 flex 子项无 min-w-0/折行（dashboard 图表锁死→P0、crud-query、主从容器）；②复刻 schema 固定壳层按 ≥1024 设计无逃生口（cal/notion/airtable/stripe）；③linear 容器 className 误路由（6 页 P1，`flex-row` 进根容器致纵堆）。
3. **dark 主题平价族（P1×3 + P2×4，≈14 页，local）**——antdpro `--adp-*` 无 dark 块（9 页，label 1.05:1 隐形）；宿主 `:root` 覆盖 `--popover`（全站弹层亮底，弹层内控件近不可读）；showcase pills 1.1:1；复刻钉白+dark 令牌泄漏（cal/notion/sundial）。
4. **数值/金额列左对齐族（P2×3 + P3×3，6 页）**——table 数字列默认对齐缺右对齐档。
5. **表格 sticky 操作列透明底（P1+P2，2 页）**——td 无实体 background，1280 即压字。
6. **校验呈现三不一致（P0×1 + P1×2）**——向导只报首错 / 表单全量行内 / combo 零行内+幻影错误；toast 失败分支 `[object Object]`（≥3 页）。
7. **A3 可点目标 <24px 族（P3，≥8 页）**——switch 32×18、checkbox 16、stepper 24×16、chip 14×14、列手柄 4px。
8. **showcase 卡片隐藏滚动（P2，11 页）**——nop-card overflow-y:auto 滚动条宽 0，折叠内容无提示。

## 6. 首批族裁定（plan 492 Phase 3 Decision）

- **首批 systemic 族（R2-3b 立项依据，本批终裁）＝ 弹层/表单 actions 左对齐族**：单根因（actions 容器渲染层缺省）、≥10 页、P1×4 全部经独立复核坐实、与 plan 490 的 overlay anatomy 契约同域（修复面 = form-actions/openDialog actions 模板缺省 justify-end + 按钮最小宽；对比组 AlertDialog 已合规证明组件层无恙）。裁定序说明：窄视口族影响页数更多（≈15）但含三个互不相同的根因（渲染器 flex / schema 固定壳层 / container 误路由），按"族=同根因"口径拆分后单一根因最大族即本族；窄视口的渲染器侧根因（flex min-w-0/折行契约）登记为第二 systemic 族，按 roadmap Rule 3 由 R2-3 字母后缀批滚动承接（R2-3c 候选），replica schema 侧归 R2-4。
- **最大 local 族的 R2-1a 侧输入（R2-4 立项依据之一，终裁待 R2-2a 合并）＝ dark 主题平价族**：宿主层（`:root` --popover 覆盖 + showcase pills）与 antdpro 域（--adp-\* 无 dark 块）同属"宿主/复刻主题层缺 dark 形态"，≈14 页、P1×3。
- 与既有台账去重：--popover P1 与 plan 490 H/D 复检轮已登记项同根因，本批确认其影响面扩至"弹层内表单控件近不可读"，修复验收口径并入该条；linear C-01、B5-02、H5 族等其余发现经对照一期 r2/r3 裁决池与 audit-followups 无同根因重复。

## 7. Quick Wins（<30min）

1. antdpro 五页卡片 `max-w-* mx-auto` → 补 `w-full`（C3-02，schema 一行/页）。
2. showcase 特性 pills dark 配色（1.1:1 → 达标，一处 CSS）。
3. linear-board 页头描述文案（"拖拽不接线"→"已接线"）。
4. table sticky td 补实体底色（table-renderer 一处）。
5. toast 失败分支消息序列化（submitForm 失败分支一处）。

## 8. 最大影响修复 Top 3

1. **弹层 actions 右对齐契约（R2-3b 首批）**——一次修复收 ≥10 页 P1，且堵住后续所有 openDialog+actions 页面。
2. **窄视口 flex/折行契约（R2-3c 候选）**——消除 dashboard P0 与 5 页 P1 的共同根因。
3. **dark 平价（R2-4 首批输入）**——antdpro dark 块 + 宿主 --popover，收 ≈14 页不可读/亮底。

## 9. 健康面（复核确认的正向基线）

plan 490 契约在真实渲染面成立：弹层宽度全部落阶梯（560/480/360，无 ad-hoc）；三个分页条块距 12px（D6 抽查 antdpro-list/approval-tasks/crud-views-export 均 ✔）；AlertDialog footer 右对齐/72px 合规（作为 H5 族对照组）；airtable 行高四档精确一致；stripe/notion 状态 pill 语义色对；焦点环、骨架、复制 toast 正常；flux 图表 dark 自动提亮。
