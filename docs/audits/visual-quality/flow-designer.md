# 视觉质量证据卡：Flow Designer（V5）

> 状态: adjudicated（plan 475 执行完毕，全部 findings 三态裁定落卡；closure audit 见 plan 475 Closure Audit Evidence）
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §4（已经三轮独立核实）、`docs/analysis/visual-quality/V5-flow-designer.md`（独立核实研究报告，2 Major + 8 Minor 修订后零 Blocker/Major）
> Owner plan: `docs/plans/475-visual-quality-v5-flow-designer-plan.md`
> Owner docs: `docs/architecture/flow-designer/design.md`、`docs/architecture/theme-compatibility.md`

## Findings 清单

- [V5-F1] 选择体系残缺：flow-designer 两包内无框选（`selectionOnDrag`/`onSelectionDrag` 零命中；`flux-renderers-graph` 的 `xyflow-canvas.tsx` 有既有先例可参照，不属 flow-designer 包）；`flow-designer-core/src/core/config.ts:36` `multiSelect:false` 默认关；xyflow 交互层只跟踪单节点/单边（`use-xyflow-interactions.ts:165-190` lastSelectionRef）
  - 证据: 普查 §4.1（经勘误：selectionOnDrag 限定 flow-designer 两包；multiSelect 出处 config.ts:36）
  - 裁决: **landed（plan 475 Phase 1）**——`selectionOnDrag` + `panOnDrag=[1,2]` + `multiSelectionKeyCode=['Meta','Control']` 双键接线；`multiSelect` 默认 true 转真消费；选择上报重构为 select 类 change 唯一通路（`useRfSelectionBridge` 镜像 + `trackPushedSelection` 整写），`lastSelectionRef`/`onSelectionChange` 通路退役；多节点剪贴板（簇保形 +48 偏移、单次 undo 事务）；e2e `flow-designer-selection.spec.ts` 3 用例（框选几何/修饰键多选不坍缩/多选批量 delete 单次 undo）。执行期附带修复 designer-summary selectNode/selectEdge Maximum update depth（滞后回声乒乓，回归测试 `designer-page.selection-regression.test.tsx`）
  - 状态: closed
- [V5-F2] 无对齐/分布/吸附辅助线（grep 零命中）；无边中点插入（`designer-xyflow-edge.tsx` 无 midpoint）；节点尺寸为静态假值 180×60（bugs/11 `measured` 假数据）
  - 证据: 普查 §4.2
  - 裁决: **对齐辅助线 landed（Phase 2 最小实现）**——`use-alignment-guides.ts` 纯函数 + ViewportPortal 1px 参考线 + 6px 阈值吸附（多选拖拽不吸附，最小实现边界显式）；**边中点插入否决**（见 A3）；**实测尺寸 landed（Phase 2）**——sync merge 保全 + 树分支预填 + 位置变化路径 `adoptSnapshotPosition`（回归测试先红暴露该路径仍冲掉实测，修复后转绿），bugs/11 语义收敛为「预填估计 + 实测保全」
  - 状态: closed
- [V5-F3] 浅色硬编码零 dark：节点色写死钉钉系 hex（`designer-node-appearance.ts:24-39` `#576a95/#ff943e/#3296fa`）；`designer-theme.css`（61 行）大量 `rgba(255,255,255,…)` 玻璃拟态，无任何 dark 变体
  - 证据: 普查 §4.3
  - 裁决: **landed（plan 475 Phase 3）**——`--fd-*` 令牌面激活（`.nop-designer` 作用域定义 + `[data-mode='dark']` 后代块）；`--fd-node-accent-*` 逐键独立定义（身份色不随 dark 翻转——identity hue 裁决，dark 块重声明面 = 表面族 + `--xy-*` 最小集）；玻璃表面 → `--surface-highlight/secondary`（alpha 漂移 ≤0.04，dingtalk-visual 不钉表面）；theme-compatibility.md 契约段改写（:103 禁令解除）；dark e2e（`flow-designer-dark.spec.ts` 2 用例 L3 计算样式断言）+ dingtalk-visual 6/6 全绿
  - 状态: closed
- [V5-F4] utility shim 机制性风险（bugs/12）：schema 写 `bg-blue-50` 等类因 shim 缺失静默不生效，靠手工逐类补
  - 证据: 普查 §4.4、`docs/bugs/12`
  - 裁决: **adjudicated as watch-only（A8，契约落 design.md §18）**——机制性根因属设计器-宿主契约（schema utility 类依赖宿主 Tailwind content/safelist 扫描面），当前恰被宿主 v4 自动扫描覆盖、无失效实例；dev warn 属行为变更超视觉边界。交付 = `design.md` §18 契约段（宿主扫描义务 + 任意值类不支持声明）
  - 状态: closed（watch-only，契约常驻 design.md）
- [V5-F5] 审计缺口：`createDesignerStoreAdapter`/`selectAllNodes`/`copySelection`/`pasteClipboard` 零直接测试（07-27 ma43 审计 FDC-GAP-01/04）；flow-ui spec 截图仅存档无比对
  - 证据: 普查 §4.5
  - 裁决: **landed（plan 475 Phase 1）**——`clipboard-selection.test.ts` 7 用例直接覆盖 selectAllNodes/copySelection/pasteClipboard（多节点粘贴、簇保形偏移、单次 undo 粒度、树模式 paste 拒绝）；ma43 文档 FDC-GAP-04「never invoked」勘误已落（文档尾部注记）；设计器选择 sync 风暴另加 `designer-page.selection-regression.test.tsx` + `canvas-bridge.test.tsx` 新契约断言
  - 状态: closed
- [V5-F6] dingflow 树模式视觉一致性待核对
  - 证据: 路线图 V5 行
  - 裁决: **landed（plan 475 Phase 3）**——树几何常量收敛 core 单源（`tree-projection.ts` 导出 7 常量 + `OVERLAY_MAIN_*` 显式化、`dingflow-constants.ts` re-import、同源单测 2 用例）；死常量 CARD_W/CARD_H/TITLE_H 删除；§17.7 交互边界核对注记落 design.md（非目标全部维持，树模式框选/多选/粘贴边界经 props 门控与直测钉死）
  - 状态: closed

## 补充候选（C1-C7）

- [V5-C1] xyflow 库默认主题未接管（`--xy-*` 零命中）—— **landed（dark 最小集）**：dark 块覆盖 Controls 背景/悬停/前景、选框背景/边框、连线选中、连接点 8 变量。closed
- [V5-C2] MiniMap 四色 rgba 无 dark —— **landed**：`--fd-minimap-bg/node/mask/edge-stroke` 定义 + dark 值。closed
- [V5-C3] `proOptions hideAttribution` 授权合规 —— **adjudicated：待人工确认**（授权合规非视觉修复，两处在案：designer-xyflow-canvas.tsx、graph xyflow-canvas.tsx；plan 475 Deferred But Adjudicated 承接，需人工确认订阅/许可状态后独立处置）。open（非 V5 scope）
- [V5-C4] 悬停工具条 180ms/160ms 定时器闪烁风险 —— **adjudicated as watch-only**（无缺陷证据，交互手感类）。closed（watch-only）
- [V5-C5] 死规则 `.fd-tree-node-shell`/宿主耦合 —— **landed（部分）**：`.fd-tree-node-shell` 经 Phase 3 令牌化保留类并获 dark 变体；宿主耦合契约经 A8/C7 落 design.md §18。closed
- [V5-C6] 魔法数字（slot 120×32、palette 插入 {180,120}、粘贴偏移 +48）—— **adjudicated as watch-only**（行为常量非视觉缺陷；粘贴偏移 +48 已有直测钉语义）。closed（watch-only）
- [V5-C7] 宿主 CSS 承担设计器外观 —— **landed（契约化）**：design.md §18 宿主扫描契约 + theme-compatibility.md scoped tokens 节；宿主两 css 同令牌化（demo dark 最小面生效）。closed

## 视觉证据

- dark 变体：`tests/e2e/flow-designer-dark.spec.ts`（L3 计算样式：dark 切换后画布/工具条解析值变化、`--fd-grid-color` dark 值、身份色不翻转、`--fd-*` 族定义存在性）
- 框选/多选选框几何：`tests/e2e/flow-designer-selection.spec.ts`（L2 拖拽矩形 × 节点包围盒求交、修饰键多选集断言、批量 delete 单次 undo）
- 对齐辅助线：`tests/e2e/flow-designer-alignment.spec.ts`（L1 对齐时参考线可见 1px/pointer-events none、松手清除、远离不出现）
- dingtalk demo：`tests/e2e/flow-designer-dingtalk-visual.spec.ts` 6/6（hex 合同经令牌背书保持）

## Closure

（V5 closure audit 后回写）
