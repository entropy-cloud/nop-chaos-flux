# V5 研究报告：Flow Designer 交互补齐与主题化

> 核查日期: 2026-09-20
> 基线: master @ d0fdfa088（V3 已收口）；V4（plan 474）工作区在途执行中（industrial 包改动，与本域零交集）
> 输入: 普查报告 §4、路线图 V5、`docs/architecture/flow-designer/design.md`、证据卡 flow-designer.md、bugs/11、bugs/12、ma43 审计 FDC-GAP
> 状态: 已独立核实（revised → 2 Major + 8 Minor 修订后零 Blocker/Major，见文末核实记录）

## 0. Findings 逐项核实（证据卡 V5-F1～F6，含对普查的勘误）

### V5-F1 选择体系残缺（成立，且比普查记录更深一层）

- 框选零实现：`selectionOnDrag|onSelectionDrag|SelectionDrag` 在两包全部源码 **0 命中**（含测试）。
- `multiSelect: false`（`flow-designer-core/src/core/config.ts:36`，类型 `types.ts:236`）——**死开关**：两包无任何消费方，renderers 侧无人读取。
- 单选跟踪：`designer-xyflow-canvas/use-xyflow-interactions.ts:165-193` `lastSelectionRef` 只取 `selection.nodes[0].id`/`edges[0].id`，多选时其余选中项被静默丢弃。
- **普查勘误（重要）**：flux-renderers-graph 的 `xyflow-canvas.tsx:110-112` 是 `selectionOnDrag={false}`/`multiSelectionKeyCode={null}` 的**关闭态**写法（只读查看器）——不是「开启框选的先例」，V5 只能反向参照其 props 接线方式，不能照抄取值。
- 底座其实多选就绪：selection 状态形状本就是数组（`core/selection.ts:3-7` `selectedNodeIds: string[]`），`selection-controller.ts:46-48/:52-57` 有 `toggleNodeSelection`/`selectAllNodes`/`setSelection` 多选语义（`core.ts:607-608` 已暴露公共 API）。
- **剪贴板是单节点**：`core.ts:357` 只取 `selectedNodeIds[0] ?? null`；`core-shell-commands.ts:22-45` copy/paste 均单节点（粘贴偏移 `+48,+48`）。

### V5-F2 辅助线 / 边中点 / 节点假尺寸（成立，假值已演化且危害升级）

- 对齐/分布辅助线：两包 grep `snap|guideline|alignment` 仅命中 `snapToGrid` 网格吸附（`config.ts:53` 默认 true + `designer-xyflow-canvas.tsx:296-297` `snapGrid=[gridSize,gridSize]`）——**网格吸附在，对齐辅助线零实现**。
- 边中点插入：`designer-xyflow-edge.tsx`（188 行）无 midpoint/插入交互；边悬停工具条仅「选择铅笔+删除」（:141-185）；grep `midpoint` 实现两包 0 命中（仅 1 处测试标题字符串）。
- 节点假尺寸（bugs/11 演化）：预填假 `measured` 已从 180×60 变为 **220×80**（`xyflow-utils.ts:70` + `resolveNodeSize` :20-48 回退链，终值读 `nodeTypeSizeMap`，`designer-canvas.tsx:240-249` 从 `nodeType.appearance.minWidth/minHeight` 构建）。
- **危害升级一**：`use-xyflow-sync.ts:6-12` 每次快照同步**整体替换**节点对象——xyflow 实测的 `measured` 被静态假值**反复冲掉**，假尺寸不是一次性初始化问题而是持续性假值。
- **危害升级二**：树模式分支（`xyflow-utils.ts:62-71`）**根本不设 `measured`**——bugs/11 的 error#015 风险在树模式原样存在。
- 消费方：xyflow 拖拽初始化、ELK 布局（`elk-layout.ts:49-50` `minWidth ?? 220`）、树布局（`tree-validation.ts:161-162` `DEFAULT_NODE_WIDTH 220`）、钉钉 overlay 定位（`dingflow-constants.ts:1-2` `CARD_W 220/CARD_H 72`）。

### V5-F3 硬编码色零 dark（成立，且发现「死令牌面」）

- 节点 accent hex（`designer-node-appearance.ts:23-40`）：钉钉系 `#576a95/#ff943e/#3296fa/#15bc83` + Tailwind 系 8 色；消费方 6 处（node/inspector/palette/canvas/dingflow overlay/`dingflow-theme.ts` 的 `--fd-primary,#3b82f6` 族 fallback）。
- `designer-theme.css`（62 行）玻璃拟态 `rgba(255,255,255,…)` 7 处（:14/:20/:28/:44/:49/:54/:60），**全文无 dark 选择器**；`designer-theme.test.ts:10-12` 把这些值锁死在单测里（其 :7-8 锁的正是「fallback reads 而非 root 本地令牌」的现行文档化契约，A5 须同步修订）。
- **死令牌面**：两包 25 处 `var(--fd-*, <fallback>)`（其中 1 处为测试断言、实际消费 24 处；5 处 fallback 已是语义值如 `hsl(var(--primary))`，其余为硬编码 hex）——`--fd-*` **全仓无任何定义点**，永远走 fallback，是一层形同虚设的令牌接口（令牌化的天然挂载点：定义 `--fd-*` 接 theme-tokens 即可整体激活）。
- `ding-flow-edge.tsx:100` 分支标签 `bg-white border-[#15bc83] text-[#15bc83]` 同行同族硬编码（dark 下直接破）；MiniMap 四色 rgba 无 dark（`designer-xyflow-canvas.tsx:368-379`）。
- 宿主侧同一视觉链：`apps/playground/src/flow-designer-nodes.css`（219 行全套浅色 hex）+ `styles-theme-utilities.css:78-100`（`nop-glass-card`/`nop-designer-node[data-selected]` 选中环）——设计器外观一半在包内、一半在宿主。
- 令牌映射面（theme-tokens 现成）：`--primary/--success/--warning/--danger/--muted-foreground/--border/--surface-*/--chart-1..5` 可承接大部分；钉钉四色无直接对应，经 `--fd-*` 族定义解耦。
- **e2e hex 合同耦合**：`flow-designer-dingtalk-visual.spec.ts:81-98` 把 hex 钉进断言（computed style 比对值）——若 light 模式令牌解析值与原 hex 同值则不红，但 dark/令牌化改动必须核对此 spec 并同步改写期望，防合同漂移。

### V5-F4 utility shim 机制性风险（bugs/12 换形态仍在）

- 原 shim 文件 `flow-designer-renderers/src/styles.css` 已删除（commit `8c43c9a58` BEM→Tailwind 迁移），「扫描 schema className→注入 CSS」机制已不存在。
- 现状：schema utility 类完全依赖宿主全局 Tailwind content 扫描/safelist（`tailwind-safelist.txt` 仅 76 行，无 flow 专属类）；flow schema 中唯一任意值类为 `min-w-[192px]`（位于宿主 src、被 v4 自动扫描覆盖，**当前无失效实例**）；风险是宿主条件性的——换宿主/宿主不扫描即整面失效，且设计器外观一半在宿主，换宿主即丢视觉。
- bugs/12 的「静默不生效」根因未消除，只是从「包内 shim 缺类」换形为「宿主扫描面缺类」（当前恰被宿主扫描覆盖，属条件性安全）。

### V5-F5 审计缺口（部分收窄，核心缺口仍在）

- `createDesignerStoreAdapter` 已有 6 个直测（`designer-store-adapter.test.ts:38-120`）但**无 selection 相关**；`selectAllNodes/copySelection/pasteClipboard` 三个公共方法仍零直测（`core.test.ts` 13 it 无一调用）。
- 间接覆盖为审计后新增：`designer-command-adapter.test.ts:55`（copy→paste 单节点）、`tree-session.test.ts:198`（树 paste 拒绝）、shortcuts/manifest 断言——ma43 的「Referenced in manifest test but never invoked」表述已过时。
- FDC-GAP-01/04 定义在 `docs/analysis/2026-07-27-ma43-designer-office-e2e-test-audit/01-flow-designer-contracts.md:53/:56`。

### V5-F6 dingflow 树模式视觉一致性（核对完成，问题三项）

- 树模式实测 `measured` 缺失（见 F2 危害升级二）；空分支虚拟 slot 120×32 硬编码（`designer-xyflow-node.tsx:25-26`）。
- **core↔renderers 常量双份手工同步**：`tree-projection.ts:37-42`（core 布局数学）与 `dingflow-constants.ts:4-9`（renderers DOM/overlay）各自维护 `BTN_CENTER_DIST 36` 等同值常量——改一处即布局/DOM 错位（overlay 不落在 split 线上），漂移风险真实。
- 交互边界在案（design.md §17.7 :675-683 非目标：自由连线/重连/反向投影/折叠展开等）——核对确认当前实现未越界，树模式视觉与 §17 布局下限一致。

## 0+. 残余候选（扫描新增）

| #   | 候选                                                                                                       | 证据                                                                                               | 初步裁定                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| C1  | xyflow 库默认主题未接管：`--xy-*` CSS 变量两包+宿主 0 命中，Controls/选框/默认选中色 dark 下保持库默认浅色 | designer-xyflow-canvas.tsx:12 引入 dist/style.css                                                  | 并入 A5（dark 变体必需）                                                                |
| C2  | MiniMap 四色 rgba 无 dark                                                                                  | designer-xyflow-canvas.tsx:368-379                                                                 | 并入 A5                                                                                 |
| C3  | `proOptions={{ hideAttribution: true }}`：xyflow 归属隐藏属 Pro 授权条款项                                 | designer-xyflow-canvas.tsx:314、graph xyflow-canvas.tsx:120                                        | **adjudicated：登记待人工确认**（授权合规非视觉修复，V5 不动；需独立确认订阅/许可状态） |
| C4  | 悬停工具条 180ms/160ms 定时器闪烁风险                                                                      | designer-xyflow-node.tsx:136、canvas :322/:334                                                     | watch-only（无缺陷证据，交互手感类）                                                    |
| C5  | 死规则 `.fd-tree-node-shell`（无消费方）；`nop-designer-node` 包内类名无样式定义、选中态实际靠宿主 CSS     | designer-theme.css:58-61、designer-xyflow-node.tsx:277/298、宿主 styles-theme-utilities.css:92-100 | 并入 A5（令牌化时一并收敛/登记宿主耦合契约）                                            |
| C6  | 魔法数字（slot 120×32、palette 插入 {180,120}、粘贴偏移 +48）                                              | 各处                                                                                               | watch-only（行为常量非视觉缺陷）                                                        |
| C7  | 宿主 CSS 承担设计器外观（换宿主即丢视觉）                                                                  | V5-F4                                                                                              | 并入 A5/A8 裁决                                                                         |

## 1. 裁决

| #   | 项                         | 裁决                      | 要点                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | -------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | 框选 + 多选 + 多节点剪贴板 | **Fix**                   | renderers：`selectionOnDrag`（配 `panOnDrag`/选择键协调）+ `multiSelectionKeyCode` 接线；`handleSelectionChange` 全量上报（丢 `[0]` 取数）；core：`copySelection/pasteClipboard` 升级多节点（`core.ts:357`、`core-shell-commands.ts:22-45`，粘贴按序偏移避重叠）；`multiSelect` 死开关转真消费或删除声明。graph 包「先例」系关闭态（F1 勘误），props 接线方式参照、取值反向                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| A2  | 对齐/吸附辅助线            | **Fix（最小实现）**       | 拖拽期对齐辅助线：候选线=兄弟节点 left/center/right × top/middle/bottom，阈值吸附（约 6px），ViewportPortal 渲染 1px 参考线；`snapToGrid` 网格吸附保持不变（两者并存，网格为基、对齐线优先）。分布辅助线不做（超最小面）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| A3  | 边中点插入                 | **显式否决（登记候选）**  | 理由：①交互面扩张与树模式 §17.7 非目标（禁自由连线/重连）冲突；②graph 模式插入=删边+双向连线+节点落位三命令的复合事务，core 命令面需新增复合原语，超出视觉修复域；③既有边悬停工具条可承载后续迭代。去向=flow-designer roadmap 候选（industrial-hmi R5 同款处理）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| A4  | 节点实测尺寸               | **Fix**                   | **local xyflow 节点层**（非 core store——core 文档状态不承载 DOM 实测值）：`use-xyflow-sync` 的 `mergeSnapshotNode` 增保 `measured`（单点改动，实测值不再被快照整体替换冲掉）；拖拽初始化保留 `resolveNodeSize` 预填作初始估计；树分支补 `measured` 预填（消 error#015 残留风险）；bugs/11 回归测试锁行为                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| A5  | 令牌化 + dark 变体         | **Fix**                   | ①**激活死令牌面**：`designer-theme.css` **作用域化**定义 `--fd-*` 族（`.nop-designer` 祖先块接 theme-tokens 语义值 + `[data-mode='dark']` 后代块重声明，V1 契约允许包内后代选择器；作用域化防全局泄漏，宿主覆盖优先级不受破坏）——24 处 `var(--fd-*, fallback)` 消费点整体生效且获 dark；**同步修订 `theme-compatibility.md:91/:101-102` 的现行「fallback 读、包不发布默认值」契约段与 `designer-theme.test.ts:7-8` 契约测试**；②玻璃拟态 `rgba(255,255,255,…)` → `--surface-*`；③`bg-white`/`border-[#15bc83] text-[#15bc83]`（ding-flow-edge:100 同行）/MiniMap 四色/CONNECTOR_COLOR fallback → 令牌；④C1 xyflow `--xy-*` dark 覆盖最小集（Controls/选框/选中色）；⑤节点 accent 钉钉四色定义 `--fd-node-accent-*`（light/dark 双值，消费点改令牌）；⑥**dingtalk-visual spec 核对同步**（light 同值则不红，dark/令牌改动须同步期望）；⑦宿主侧 `flow-designer-nodes.css`/`styles-theme-utilities.css` 同令牌化（demo dark 可验证的最小面；宿主扫描/safelist 契约写入 design.md） |
| A6  | core↔renderers 常量双份    | **Fix（小）**             | 树模式几何常量收敛单源：core 定义导出，renderers `dingflow-constants.ts` 改 re-import（依赖方向 renderers→core 合法），消漂移                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A7  | FDC-GAP 直测               | **Fix**                   | `selectAllNodes/copySelection/pasteClipboard` 直测（含 A1 多节点语义：全选→复制→粘贴 N 节点偏移落位断言）+ adapter selection 透传；ma43 文档过时表述（「never invoked」）勘误                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A8  | bugs/12 shim 换形态风险    | **显式裁决：adjudicated** | 理由：机制性根因（schema 任意 utility 类依赖宿主扫描面）属设计器-宿主契约问题，非包内可修复；dev 期 console.warn 属行为变更超视觉边界。交付=design.md 契约段（设计器外观类的宿主 content/safelist 义务 + 任意值类不支持声明），证据卡登记 watch-only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## 2. 边界

- **不做**：分布辅助线、边中点插入（A3 否决）、树模式折叠展开/自由连线（§17.7 非目标维持）、proOptions hideAttribution（C3 待人工确认）、悬停定时器调参（C4）、flux-renderers-graph 包改动（只读参照）。
- **依赖契合**：dark 全部走 V1 契约（`[data-mode='dark']` 单一触发器）；theme-tokens 消费层不新增令牌定义（`--fd-*` 族定义落 designer-theme.css 域内，属包内私有令牌接语义值，不动 theme-tokens 包）。
- **保护区核对**：不新增 renderer definition 字段、不动 `packages/ui` 公共导出、不动 flux-core；core 新增仅「树常量导出」与剪贴板多节点语义（公共 API 行为变更，plan 内声明 + renderer-interfaces 对齐义务）。
- e2e 零回归红线：flow 族既有 spec（12 文件约 40 test）除 dingtalk-visual hex 断言按 A5-⑥ 同步改写外全绿；新增断言：框选几何（L2）、多选选框、辅助线渲染（L1/L4）、暗色计算样式（L3，V0 helper）。
- 性能：A4 的 dimensions 回写走既有 onNodesChange 通道，无轮询；A2 辅助线计算仅在拖拽帧内。

## 3. 验证方式

1. 单测：多节点剪贴板/全选（先红后绿）、树常量单源、measured 回写与 sync 合并语义、（A5）theme.css 令牌定义与 dark 块存在性。
2. e2e：框选/多选几何、辅助线渲染、dark 计算样式、dingtalk-visual 令牌化后合同改写。
3. `pnpm check`：零新 hit。**注意（核实 M-2 勘误）**：`find-ui-consistency-gaps.mjs` 扫描范围仅 `packages/flux-renderers-*/`（:290 RENDERER_PACKAGE_SCOPE），flow 两包**不在扫描集**（非豁免、是不扫描）——「新值走令牌」约束无自动门禁承接，由单测承接（扩展 `designer-theme.test.ts` 断言无裸 hex/rgba 新增）；扩展扫描范围属独立事项提案，不入本域。

## 4. 独立核实记录

- Reviewer / Agent: 独立核实审查员（fresh sub-agent session，2026-09-20）
- Verdict: `revised`（0 Blocker / 2 Major / 8 Minor），修订后达成零 Blocker/Major
- 已处理：M-1——F4 例证失实修正（`bg-[#22c55e]` 不存在；flow schema 唯一任意值类 `min-w-[192px]` 且被宿主扫描覆盖，当前无失效实例；机制性主张与 A8 裁定不变）。M-2——§3 门禁论述勘误（flow 两包不在 `RENDERER_PACKAGE_SCOPE` 扫描集，「新值走令牌」改由单测承接）。Minor 1-8 全部吸收：--fd-\* 计数 25/24 且 5 处 fallback 已语义值、core.test 13 it、三处行号校正（selection-controller :46-48、tree-projection :37-42、edge 188 行）、A5 补 theme-compatibility.md 契约修订义务 + 作用域化定义（`.nop-designer` 祖先块非裸 :root）、dingtalk-visual 改条件表述、第六消费方改 dingflow-theme.ts、midpoint 实现零（1 测试标题命中）、A4 明确 measured 保全在 local xyflow 节点层。
- 核实确认成立的核心面：F1 全链（含 graph 关闭态勘误、core 多选就绪、剪贴板单节点）、F2 假尺寸持续冲掉机制（sync 整体替换）+ 树模式零 measured、F3 死令牌面（独立 grep 证实）+ 7 处玻璃拟态 + hex 合同、F5 直测缺口 + 间接覆盖三处、F6 常量双份、A1/A2/A4 技术路线（ViewportPortal 本包已有在库用法 canvas:106-128）、A3/A8/C3 裁定诚实性、遗漏检查零新增（补充观察：ding-flow-edge:100 同行 border/text 任意值类并入 A5 消化）。
