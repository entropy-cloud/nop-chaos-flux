# 维度 16: 文档-代码一致性（component-audit mission 多维审计）

> Mission: component-audit | 初审轮次: R1（sub-agent `ses_02c80f6afffexBdD3gc73mjMPe`）

## 第 1 轮（初审）

### [维度16-1] flux-runtime-module-boundaries.md 的 unstable-only 示例清单与实际根导出不符

- **文件**: `docs/architecture/flux-runtime-module-boundaries.md:467-471` vs `packages/flux-react/src/index.tsx:6-18,27` + `unstable.ts:1-17`
- **严重程度**: P1（owner 文档边界契约失真；与 05-25 有意稳定化决策矛盾）
- **证据片段**:
  ```
  // boundaries.md:467-471 "Current unstable-only examples: - RenderNodes - raw context exports
  //  such as FormContext / ScopeContext / RuntimeContext - ..."
  // index.tsx:27 export { RenderNodes, resolveRendererSlotContent, ... } from './render-nodes.js';
  // unstable.ts 实际不含 RenderNodes 与三个 context（头注释"disjoint from the stable surface"已违反）
  ```
- **现状**: 2026-05-26（0fadc9a3）把 RenderNodes/contexts 稳定化进 root barrel 后文档未同步。
- **风险**: 渲染器作者按文档判断"只能从 unstable 导入"被误导；包边界重构基于错误基线决策。
- **建议**: 更新 unstable-only 示例为当前真实集合（与 01-02 同根因，去重后一处处理）。
- **误报排除**: 非历史文档——无 Outdated Note；unstable.ts 的 disjoint 注释与文档互为印证，是未同步漂移。

### [维度16-2] docs/components/index.md 注册清单含 phantom `service`，且漏掉已注册的 statistics/graph/diff-view/button-group-select

- **文件**: `docs/components/index.md:319`、`:306-310`（intro 声称"逐条来自注册数组"）；反证 `packages/flux-renderers-data/src/w2a-data-composition-definitions.ts:108`、`packages/flux-renderers-graph/src/graph-definitions.ts:6`、content-renderer-definitions.ts（diff-view）、`packages/flux-renderers-form/src/renderers/input.tsx:650`；删除证据 `git show f0f86d35`（2026-07-10 Remove service renderer）+ `docs/components/amis-baseline-matrix.md:121`
- **严重程度**: P1（phantom 引用引导用户写 `type:'service'` schema 运行时失败；遗漏条目使新组件文档路由不可达）
- **证据片段**:
  ```
  index.md:319: "- `table`、`tree`、`list`、`data-source`、`service`、`pagination`、`chart`、`crud`"
  amis-baseline-matrix.md:121: "**`service` removed** — Flux 不提供 type:'service' 组件"
  ```
- **现状**: `service` 全仓零注册（2026-07-10 已删除）却仍在权威组件导航清单；statistics/graph/diff-view/button-group-select 已注册未入清单；:363 "已文档化但 runtime 尚未注册的 retained renderer：当前无此项" 与 :319 自相矛盾。
- **风险**: 用户按清单写 `type:'service'` schema 注册失败；graph/diff-view 等新组件在文档路由不可达。
- **建议**: 按注册数组重写 4 个族清单；service 移入 removed 说明；登记入 CR（当前 CR Phase 4 dim-17 清单未含此条）。
- **误报排除**: service 删除于 07-10，index.md 最后修改 08-03（C1.2 提交）晚于删除；v1 基线不接受过渡态豁免；审计卡 dim 17 只查组件 design.md 未覆盖 index.md 汇总清单。

### [维度16-3] quick-reference.md Package Directory Map 遗漏 flux-renderers-graph（及既有 flux-renderers-ai）

- **文件**: `docs/references/quick-reference.md:14-44` vs `packages/flux-renderers-graph/package.json`（G1 落地 2026-08-04）
- **严重程度**: P2
- **证据片段**: 表内 renderers 层列 basic/form/form-advanced/data/mobile/content/layout/scheduling + ui/code-editor/i18n/nop-debugger，无 flux-renderers-graph 也无 flux-renderers-ai。
- **现状**: quick-reference 自我定位为"单文件压缩参考，替代读 10+ 源文件"，新包缺失。
- **风险**: 新 renderer 开发按查表无法发现 graph/ai 包与 layer 归属。
- **建议**: 补两行；与 16-2 同属"注册面已变、汇总文档未同步"家族。
- **误报排除**: G1 plan 的 owner-doc obligations 未列 quick-reference，但"新包未入快速参考"是已完成 plan 的文档义务缺口。

### [维度16-4] timeline design.md 决策表残留"待实现"标记 + C5.2 审计卡 data-ownership 声明被 v2 推翻

- **文件**: `docs/components/timeline/design.md:27-28`（vs :3-4 头部已标 v2 已实现）、`:11`；`docs/audits/per-component/timeline.md:44`；`packages/flux-renderers-layout/src/timeline-renderer.tsx:201,243`；`tests/e2e/component-lab/c5-2-host-surfaces.spec.ts:201`；`docs/architecture/renderer-markers-and-selectors.md:186`
- **严重程度**: P2
- **证据片段**:
  ```
  design.md:27 "| 受控当前事件（value/defaultValue/valueOwnership/valueStatePath）| 采纳（v2 立约，待实现）|"
  design.md:28 "| 点击 seek（onChange 事件）| 采纳（v2 立约，待实现）|"
  // timeline-renderer.tsx:201,243 已实现（恒发 data-ownership）
  // C5.2 卡 :44 "无 data-ownership 副作用 | 结果: pass"（被 v2 推翻）
  ```
- **现状**: design.md 头部声明 v2 已实现，决策表仍标"待实现"（同一文件自相矛盾）；C5.2 卡 closed 时"无 data-ownership 副作用"pass 结论被 G2 v2 恒发 data-ownership 推翻；e2e 断言 not.toHaveAttribute('data-ownership') 与恒发契约冲突（已在 CR 记录 pre-existing）。
- **风险**: owner doc 读者按"待实现"判断 v2 不可用；审计卡作为持久台账产生错误基线。
- **建议**: 改写 design.md:27-28 为"已实现"并引用 G2 plan；C5.2 卡补 v2 事后注记；CR 修复 e2e 断言后回写卡。
- **误报排除**: 非历史文档——design.md 头部已声明 v2 实现，表格残留是同一文件文本一致性失败。

### [维度16-5] flow-designer tree-mode.md 声称 projectAndLayoutTree"不是 root export"，实际在包根导出

- **文件**: `docs/architecture/flow-designer/tree-mode.md:222`（及 :33 "core-private"、plan 453 Purpose）vs `packages/flow-designer-core/src/index.ts:9-10`
- **严重程度**: P2
- **证据片段**:
  ```
  // index.ts:9-10
  export { projectAndLayoutTree, validateTreeDocument, canonicalizeTreeDocument,
           isJsonSafeTreePayload, resolveTreeNodeFootprint } from './tree-projection.js';
  // tree-mode.md:222 "projectAndLayoutTree 不是 root export；renderer 只能经 createTreeDesignerCore
  //  tree commands、replaceTreeFromHost 与 relayoutTree 间接触发"
  ```
- **现状**: 文档（07e4a7fc 刚重写的当前基线 owner doc）对公共 API 边界描述与包实际导出面矛盾；渲染器侧确实未直接使用（"间接触发"一半成立）。
- **风险**: 包边界审计按"core-private"假设漏检根导入；宣称无法解释 index.ts 显式导出。
- **建议**: 二选一：改文档为"root export 但渲染器必须经 core 会话间接使用"，或把该组导出移入 core/unstable。
- **误报排除**: 非 draft——tree-mode.md 是 08-06 刚重写的当前基线 owner doc；"刚写完就与代码矛盾"的活漂移。

### [维度16-6] roadmap 组件计数 113 已过时（graph 注册后应为 114），graph 无逐组件审计卡

- **文件**: `docs/backlog/component-audit-roadmap.md:63`（"组件合计 113...C0 已核对 2026-08-02"）vs `packages/flux-renderers-graph/src/graph-definitions.ts:6`；`docs/audits/per-component/`（无 graph.md）
- **严重程度**: P2
- **证据片段**: 实测注册枚举 basic 16 + content 19 + data 8 + layout 7 + form 21 + form-advanced 19 + mobile 5 + ai 14 + scheduling 4 + graph 1 = 114。
- **现状**: roadmap 头"最后更新 2026-08-06"晚于 graph 注册（08-04）但计数未更新；graph 审计由 G1 plan 自闭环（42 单测 + 8 e2e + closure audit）可接受，但 roadmap 未声明。
- **风险**: CV/CG 按 113 对账漏 graph 的注册面/文档面核查（CG pc-index 声称"113 卡逐卡索引"与 114 注册组件不匹配）。
- **建议**: 计数与组件清单补 graph 一行（注明 G1 新包独立 plan 闭环）。
- **误报排除**: roadmap 声明自己是动态状态区且 08-06 刚机械同步，计数停留在 C0 时点。

### [维度16-7] plan 453 Last Reviewed 日期落后于实际收口日期

- **文件**: `docs/plans/453-dingflow-single-tree-layout-unification-plan.md:3-4`（Last Reviewed: 2026-08-05）vs :200（completed 2026-08-06）、提交 07e4a7fc（08-06）
- **严重程度**: P2（事实性日期字段错误）
- **现状**: 文件 08-06 被更新为 completed + closure evidence，Last Reviewed 仍为 08-05。
- **建议**: 改为 2026-08-06。
- **误报排除**: 纯日期字段 nit。

## 维度 16 其余核查结论（R1）

- 模块边界文档约 90 个文件路径全部存在；renderer-runtime.md 33 个 hooks 与 flux-react 导出完全对应；classAliases/验证类型与实现一致。
- 17 份 mission plan 全部 completed 且 checklist 零未勾选，Closure Audit 均有 fresh-session 记录；CR/CV/CG active/planned 匹配。
- 113/113 审计卡 closed（README 为模板）；C6.3 行 planned→done 机械翻转已在 08-06 日志记录。

## 维度复核结论

已路由（2026-08-06，0529-1 Phase 3 登记区 + `docs/backlog/component-audit-roadmap.md`「扫描发现路由登记」）：16-1 → 0529-2（与 01-02 同根因）；16-2 → 0529-2（index.md phantom service + 遗漏补齐）；16-3..16-7（P2 候选）维持待复核（roadmap Follow-up Backlog）。
