# 视觉质量证据卡：一致性债务（V12a / V12b / V12c 共用）

> 状态: seeded
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §7.2–7.4 + §8（已经三轮独立核实）
> Owner plan: —（三个 work item 闭环单位独立，证据同源共用此卡；卡内 findings 标注归属）
> Owner docs: `scripts/audit/find-ui-consistency-gaps.mjs`、`docs/backlog/audit-followups-*.md`、`docs/analysis/ui-review/r2-audit.md`、`r3-p2-adjudication.md`

## Findings 清单

- [V12a-F1] 豁免为整包前缀匹配（scheduling/industrial/3d/form-advanced 等整包）：这些域新增字面色自动豁免，门禁局部退化——须收紧为文件级
  - 证据: 普查 §7.2、EXEMPTIONS 表
  - 裁决: fixed: plan 483 Phase 4（前缀展开为 54 条文件级条目 + path-shape guard fail-fast；map/content 留 isPrefix 标记归 V12b）
  - 状态: fixed
- [V12a-F2] 豁免基数膨胀：D2 收口基线 399/116/30 → live 413/121/32（两周 +14/+5/+2）；V0 已固化基线快照 `exemption-baseline-v0.json`（对照协议见 `README.md`）
  - 证据: 普查 §7.2 + V0 复核
  - 裁决: fixed: plan 483 Phase 1/5（对照协议 v1 + 结构性重基线条款；v1 快照 225/68/69 入库，红线对 v1 生效）
  - 状态: fixed
- [V12a-F3] 错误反馈双轨：raw `error.message` 直出豁免 20+ 处（map/crud/form/wizard/pivot）——统一
  - 证据: 普查 §7.3
  - 裁决: fixed: plan 483 Phase 3（结构化 16 出规则登记为永久结构化通道；UI 直出 31 统一为 t(类别键,{message}) + env.notify，13 条 raw-error 豁免删除）
  - 状态: fixed
- [V12a-F4] audit-followups 未清：08-11 批约 30 条（timeline inert-but-focusable、button `_blank` 无 rel、dashboard canvasWidth 等）+ 08-28 批 16 P2 + 3 observation 全部 `[ ]`（observation 逐条裁定去向）
  - 证据: 普查 §7.4、`docs/backlog/audit-followups-2026-08-11-1929.md`、`audit-followups-2026-08-28-1659.md`
  - 裁决: fixed: plan 483 Phase 6/7（08-11 视觉项修复/核验/去重登记；08-28 批 a/b/c 修复 + 20-06 fix-lite + 全部 adjudicated/watch 落卡；非视觉项留 backlog 池归 V12b 机制）
  - 状态: fixed
- [V12b-F5] 一致性 P2 候选池 169 条零立项（台账 `r2-audit.md`）——按组件族分批类别清扫消化
  - 证据: 普查 §7.2
  - 裁决: pending
  - 状态: open
- [V12c-F6] 一致性 P3 候选池 87 条零立项（台账 `r3-p2-adjudication.md`）——逐条裁定修复/adjudicated
  - 证据: 普查 §7.2
  - 裁决: pending
  - 状态: open

[V12b-D1] P2 候选池首批消化（族9+族5+V12a 转入 30 条）

- 证据: `docs/analysis/visual-quality/V12b-consistency-p2-digestion.md`（159 开放台账）+ plan 485
- 裁决: 30/30 landed（G2-R3-视角4-01 prompt 保留带 inline 反馈裁决；G7 两 schema 条目就地修复）；门禁 225→223 instances、68→66 files，newHits=0、新增豁免 0
- 状态: closed（V12b 面）；V12d/V12e/V12f 滚动批次与 V12c P3 池残余 open

## 视觉证据

闭环指标即门禁数字：V12a 起对照协议 v1（`README.md`）——v1 快照（225 instances / 68 对 / 69 entries，2026-09-21）之后 `totals.entries` 不增、`totals.instances` 单调不增且变动附批次归因、`newHits` 持续 0。批次先红后绿证据随各 plan 记录。

## Closure

（V12a/V12b/V12c 各自 closure audit 后回写对应 findings 状态；三 work item 全部关闭时本卡转 closed）
