# WA-13a 设计器渲染层审计批一（flow-designer-renderers + page-designer-renderers）临时方案与坏味道审计报告

> 批次: WA-13a（roadmap `docs/backlog/workaround-code-smell-audit-roadmap.md` Phase Status 对应行）
> 审计方法: `docs/skills/workaround-code-smell-audit-prompt.md`（九类信号 A–I + W1–W6 + §5 取证协议）
> 执行 plan: plan 573（`docs/plans/573-workaround-audit-wa13a-designer-renderers-1-plan.md`，draft review R1 revised 共识稿）
> 审计日期: 2026-10-12
> 对象清单来源: `docs/audits/workaround-code-smell/inventory/modules.json`（批次 = WA-13a 行，不手抄）
> 取证模式: **review-only**（本报告由独立取证 agent 产出；批内修复归 Phase 2 执行会话，台账登记归主会话——本报告不改任何源码/测试/台账）

## 快照基准注记

plan 573 基线记载五门禁基线 = WA-10 收口 commit；本报告取证实跑时 HEAD = `b3fb1dbfe`（WA-10 收口 commit 本体），**基线与实跑同锚**。两包**零在途**：`git status -s` 对两包全目录 = 0 文件，live = HEAD。

**三口径行数逐文件分解**（84 文件逐一 `wc -l` 对照 inventory `path:loc` 后缀）：

| 口径           | 全集行数 | 说明                                                                            |
| -------------- | -------- | ------------------------------------------------------------------------------- |
| inventory 口径 | 14,225   | WA-0 枚举器值（flow-designer-renderers 10,315 + page-designer-renderers 3,910） |
| live wc        | 14,225   | = inventory **逐文件零差**（84/84 逐字吻合，零在途漂移文件）                    |
| HEAD wc        | 14,225   | = live（零在途）                                                                |

**基线候选 37 处全部复现**（grep 实跑与 inventory baseline 逐字吻合）：literalEn **0** + literalZh **0**（**双零批**——非测试面与测试面全零，对照 wa-10 六包双零先例，本两包连测试文件命中都没有）+ typeBypass **17**（flow 0 + page 17，逐处落字见误报排除清单 #2）+ setTimeout **8**（flow 7 / page 1）+ domRaid **12**（flow 4 / page 8）。keyRemount/pixelNudge/testEnvBranch/silentCatch 四探针全零实跑复核。

inventory 84 文件清单核对中发现第 85 个非 `.test.*` 源文件 `packages/flow-designer-renderers/src/__tests__/canvas-bridge-test-support.tsx`——inventory 生成器排除 `__tests__/` 目录（cq-6 `2c94d9d7f` test-support 搬迁先例的落点），**非漏枚举**；该文件已按走读标准补读（xyflow/flux-react vi.mock 测试替身，测试支撑面，无生产信号）。

oversized 门禁口径：两包 ≥500 行非测试源 **7 件**全部纳入结构走读全读（inventory 口径行数：flow designer-page-body 611 / designer-xyflow-canvas 566 / designer-inspector 557 / designer-action-provider 552 / designer-canvas 551 / designer-manifest 502 + page page-designer-page 607）。注：plan 573 基线记载 7 件行数统一 +1（612/567/558/553/552/503/608），系 plan 拟制时统计口径偏差，以 inventory/`wc -l` 为准——7 件集合本身两口径一致。

## 覆盖声明（Coverage Declaration）

> 本节是台账 modules 行 `pending → audited` 翻转与 `pnpm workaround:reconcile` 结构校验的依据。

| 模块 id                 | 文件数 | 非测试行数                                                | 取证完成 | 备注                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------- | ------ | --------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| flow-designer-renderers | 59     | 10,315（inventory）/ 10,315（live wc）/ 10,315（HEAD wc） | ✅       | 59/59 **全文覆盖读取**（零抽样档）：≥500 行 6 件全读（designer-page-body 611/designer-xyflow-canvas 566/designer-inspector 557/designer-action-provider 552/designer-canvas 551/designer-manifest 502 逐行精读）+ command-adapter 四件（adapter/graph/helpers/types）+ designer-context + tree-session 453 + designer-tree-mode + designer-host-projection + use-designer-auto-layout/shortcuts + xyflow-canvas 子目录 13 件（node/edge/render-ports/use-xyflow-sync/use-xyflow-interactions/use-alignment-guides/use-minimap-navigation/xyflow-utils/context-menu/port-connection-a11y-context/types/index）+ dingflow 10 件 + page/palette/toolbar/field/node-card/edge-row/icon/appearance/summary-helpers/definitions/schemas/index/unstable + test-support 3 件；typeBypass 0 复现确认；setTimeout 7 + domRaid 4 逐个定性；git 考古 14 commit（1593727cd/dccce0022/40258e950/b9b74eb11/dc9ebf9c4/02fc0bb71/e127635c5/04e504f30/a0e50285a/dd72a80b3/a001e1f6e/32da9927c/b8ef4a555/5a0dcc401） |
| page-designer-renderers | 25     | 3,910（inventory）/ 3,910（live wc）/ 3,910（HEAD wc）    | ✅       | 25/25 **全文覆盖读取**：page-designer-page 607（≥500 行件）逐行精读 + canvas-bridge 270/canvas-overlay 330/inspector-panel 364/actions-editor 314 逐行精读 + actions-model/canvas-layout/data-binding-panel/template-gallery/json-source-view/structure-tree/inspector-field-model/inspector-adapters/expression-validation/designer-clipboard/designer-registry/edit-assembly/empty-container-projection/use-designer-session/palette-panel/page-designer-context-menu/constants/types/tokens/index 全读；typeBypass 17 处逐处落字定性；setTimeout 1 + domRaid 8 逐个定性；门禁 6 项实跑；git 考古 4 commit（a48bb04c8/dbd3c327b/dd72a80b3/2c94d9d7f）                                                                                                                                                                                                                                                                                                                                           |

全集 **84/84**（另加 1 件 `__tests__/` test-support 补读，见快照基准注记）。重复块探针双版（存 `_tmp/wa13a-dup-probe.mjs` 逐字版：12 行窗 + 熵 ≥3.2 + 全可执行行过滤，84 非测试文件 **132 窗 → 0 命中**；`_tmp/wa13a-dup-probe-normid.mjs` 标识符归一版：熵 ≥2.6 + 均匀表剔除，81 文件 460 窗 → **1 命中且为同文件自重叠假阳性**[designer-canvas.tsx:93-95 同一快照等值链的滑窗自交]）——**两版探针零真实跨区域命中**，本批重复组全部由走读捕获并人工同构复核坐实（7 组，见重复代码热区表；探针漏检原因：组内块均 <12 行或含非可执行行，沿 wa-10「assert 孪生探针 12 行窗外」先例以走读为准）。

### 门禁交叉实跑读数（prompt §5 第 5 步留痕）

| 门禁                                   | 读数                                                                                                             | 处置                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `check:audit-async-failure-paths`      | **15 行原始命中 / 去重 14 处**（template-gallery:72 桶重复双报；page 9 + flow 5，与 plan 基线逐 file:line 吻合） | 14 处逐个定性、未批量放行亦未批量立案：**11 处豁免**（结构化失败路径或显式契约，明细见下节）+ **2 处立案**（template-gallery promise 链缺 rejection → WA-pager-002；inspector json 字段静默回弹 → WA-pager-003）+ 1 处 watch 微注记（data-binding-panel:41 空候选降级）。                                                                                                                  |
| `check:audit-performance-suspects`     | **3 行命中**（page actions-editor:55、actions-model:92、inspector-panel:181，与基线吻合）                        | **0 立案**：actions-editor:55 为「外部改值 vs 自身写回」判别的 stringify 变更检测（:59 注释自证机制；deepEqual 单源已在 `@nop-chaos/page-designer-core` 导出——watch 微注记：行集 uid 稳定性依赖键序，千级动作行时改 deepEqual）；actions-model:92 为 encodeArgValue 数据变换本体；inspector-panel:181 为 json 字段显示序列化（非变更检测）。三处均非「stringify 做重对象变更检测」红形态。 |
| `check:audit-runtime-raw-schema-reads` | **0**                                                                                                            | 实跑确认（两包 schema 面均走 props 通道 / definition fields 注册 / host projection 契约面）                                                                                                                                                                                                                                                                                                |
| `check:audit-hardcoded-type-dispatch`  | **0**                                                                                                            | 实跑确认（flow command 路由走 TREE_OWNED/GRAPH_ONLY 集合守卫 + 三层 switch 命令联合类型判别，非 type 字面量分派红形态；page inspector 控件走 buildInspectorSchema 生成器字段投影）                                                                                                                                                                                                         |
| `check:audit-reactive-render-reads`    | **0**                                                                                                            | 实跑确认（flow store 消费全部经 useDesignerSnapshotSelector/useSyncExternalStore 订阅——designer-context.ts 是 AGENTS.md Zustand vanilla 订阅纪律的正型实现；零渲染期 getState 直读）                                                                                                                                                                                                       |
| `check:audit-renderer-browser-io`      | **0**                                                                                                            | 实跑确认（两包零 fetch/localStorage/sessionStorage 命中；page-designer-page env 缺省 createDefaultEnv 走宿主通道）                                                                                                                                                                                                                                                                         |

### async 门禁 14 行逐条定性（去重后；prompt §5 第 3 步留痕）

| 位点                                       | 外层机制                                               | 判定                                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| flow tree-session.ts:271                   | 成功出队后 `void this.dispatchNext(generation)` 泵续呼 | 豁免——dispatchNext 内部全链 try/catch → classifyActionResult → reportHostIssue 结构化路由（:227-236/:277-294），fire-and-forget 的失败观测在泵内闭环   |
| flow tree-session.ts:296                   | 失败跳过后泵续呼（同上）                               | 豁免（同上）                                                                                                                                           |
| flow tree-session.ts:407                   | ack-accepted 出队后泵续呼（同上）                      | 豁免（同上）                                                                                                                                           |
| flow designer-tree-mode.tsx:104            | session 建立后首呼 `void session.dispatchNext()`       | 豁免（同上泵）                                                                                                                                         |
| flow designer-page-body.tsx:193            | `JSON.parse(core.exportDocument())` catch              | 豁免——jsonResult 判别联合（:186-198）+ JSON 面板 role=alert 错误上屏 + reportHostIssue effect（:233-248）双通道结构化                                  |
| page template-gallery.tsx:72（双报桶重复） | `void Promise.resolve(props.store.list()).then(...)`   | **立案 → WA-pager-002**（无 `.catch`，宿主 store 边界 reject = unhandled rejection + 静默空面板）                                                      |
| page template-gallery.tsx:85               | `JSON.parse(currentExportedJson)` catch                | 豁免——catch → `toast.error(templateSaveFailed)` 结构化（:85-88）                                                                                       |
| page json-source-view.tsx:36               | `JSON.parse(text)` catch                               | 豁免——catch → setMessage error 上屏（:36-44）                                                                                                          |
| page inspector-panel.tsx:188               | json 字段 `JSON.parse` catch                           | **立案 → WA-pager-003**（空 catch + 注释「保留 working」+ setJsonDraft(null) 静默回弹，无观测）                                                        |
| page expression-validation.ts:26           | compileTemplate catch                                  | 豁免——错误转正为返回消息本体（toExpressionErrorMessage），校验产物即错误面                                                                             |
| page data-binding-panel.tsx:41             | resolveRendererAuthoringContract catch → 空候选        | 豁免 + watch 微注记——契约上游有 schema-prop-coverage 门禁守卫；降级 = datalist 空候选非数据损坏；守卫触发时无日志，建议注记或接 reportRuntimeHostIssue |
| page canvas-bridge.tsx:230                 | dataTransfer JSON.parse catch → 空载荷                 | 豁免——载荷为同页 palette 自产；空载荷下游 onDrop 静默拒绝（同源数据、跨窗口拖拽才可达），语义为「无效拖拽不动作」                                      |
| page actions-model.ts:101                  | decodeArgValue JSON.parse catch → 原样字符串           | 豁免——:95-96 注释自证契约（「JSON 可解析则归一化，否则原样字符串」），字符串保真是设计内行为                                                           |

## 取证执行记录（prompt §5 八步逐条）

1. **字面扫描**：`TODO|FIXME|HACK|WORKAROUND|XXX` 非测试 = **0 命中**；`临时|先这样|暂时|绕过|workaround|hotfix` 非测试 = **0 命中**；两探针**含测试文件亦全零**——与 inventory literalEn 0 + literalZh 0 双零基线逐字吻合（wa-10 之后连续第二个双零批组，且本批测试面也零命中）。
2. **模式候选 37 处逐个定性**（grep 复现与 inventory 计数逐字吻合）：typeBypass 17 = **17 处全豁免 + 1 条收敛立案**（全部为 page 包 schema 动态边界的 `as unknown as Record<string, unknown>` 承接——BaseSchema/SchemaInput 无类型 schema 树的操作面，D 类误报排除判例适用；其中 11 处为同一「读 type 字面」形态分散 7 文件，提取包内 `getSchemaType` helper 可一次消除 → WA-pager-004，**不重复立案 17 处本体**）；setTimeout 8 = **7 处豁免 + 1 处立案**（300ms fitView 时序贿赂 → WA-flowr-008；其余为防抖 coalesce[designer-inspector:116，plan 2026-09-29-4 R2-P14 登记锚]、setTimeout(0) 焦点投递 ×3[命令式焦点判例]、hover intent ×2[160/180ms 悬停延迟，UI 惯例]、drag ghost 清理[palette-panel:54，setDragImage 平台 API 语义]）；domRaid 12 = **12 处全豁免**（xyflow 内部 DOM 补钉与导航 ×2[use-minimap-navigation，第三方未暴露 API 的宿主集成边界 + watch 微注记]、roving-focus 命令式焦点 ×4[wa-7 #9 判例族]、page 锚点/空容器投影 ×6[canvas-bridge/canvas-overlay/empty-container-projection——S1 §5 设计内「只读 DOM 投影 + 命令通道」架构，头注释自证]）。
3. **门禁交叉**：上表 6 项实跑；async 14 行逐条定性（11 豁免 + 2 立案 + 1 watch）；perf 3 全豁免 + 1 watch 微注记。
4. **重复块识别**：双探针 + 人工同构复核坐实 **7 组**（跨包孪生 1 → WA-pager-001；同包微复制 2 → WA-flowr-003/004；同文件行为块复制 3 → WA-flowr-005/006/007；跨文件字面契约 1 → WA-flowr-009），其余探针命中为自重叠假阳性（见覆盖声明）。
5. **范围结构走读**：**84/84 全文覆盖**（14,225 行，无抽样档）+ 1 件 `__tests__/` 补读。≥500 行 7 件全读（6 件逐行精读 + designer-manifest 声明契约件全文核对，并在核对中发现 persistViewport 清单缺口）。分档落字：核心实现（command-adapter 家族/action-provider/tree-session/xyflow 画布族/inspector 族/page 面板族/canvas 桥与几何层）逐行精读约 40 件；definitions/schemas/manifest/index/constants/types/tokens/test-support/纯声明件全文过读 + 信号扫描。
6. **已收敛模式三档复核**：①cq-2（`5a0dcc401`）收敛点 live 全部在案——`createHostMethodValidator`（designer-action-provider.ts:15，cq-2 commit message 明载「word/flow absorb validator」）、`cloneDeep`（page designer-clipboard.ts:20 + page-designer-page.tsx:62 消费 flux-core 单源）、genId（tree-session.ts:451 显式注释「Deliberately not flux-core genId」——cq-2「6 variants annotated」纪律的登记变体）✅；debounce hooks 未被 designer-inspector 消费——其 draft coalesce 带 blur/unmount/selection-switch 三重 flush 语义，裸防抖 hook 不覆盖（非「有单源而绕开」形态，豁免；微注记：可补一行「为何不用 useDebouncedCallback」说明对齐 cq-2 注释纪律）②cq-6（`2c94d9d7f`）收敛点——debug residue 零复发（`window.__`/`globalThis.__` grep = 0）、route table 形态（designer-manifest manifestVersions Map + resolveDesignerManifest 单源）✅、test-support `__tests__/` 搬迁落点即第 85 文件 ✅；③`@xyflow/react` 静态依赖**定性为设计内**——`renderer-definitions.ts` 六个 renderer 全部经 `createLazyRendererComponent(() => import('./designer-page.js'))` 装载（c21e2dea9 同型收敛机制的组件级形态），xyflow 静态 import 被整体隔离在懒加载 chunk 内，消费方不引 designer-page 时零加载；`unstable.ts` 直出 xyflow 组件属显式 unstable 出口（exports map 独立子路径）。c21e2dea9 懒加载收口清单不含 xyflow 的原因即此：**设计器工具链的重库隔离走 renderer 级懒加载，无需库级 loader**——判定：设计内，零立案；④`dataPath` 双词汇 / strip errors / ajax 双份——两包 grep 全零，**记不适用**；⑤WA-content-009 模块顶层副作用纪律正面复核——模块级可变态 4 处（uidSeed/sessionSeedCounter+SHARED_SID_RANDOM/activePaletteDragType/createFormulaCompiler+SchemaRenderer 单例）全部有注释、有界（取模）、有用途（种子防撞/拖拽通道/无状态编译器），无 t()/store 订阅/DOM 探测形态，✅零复发。
7. **git 考古**：14 commit 溯源（详见逐条发现）。锚点核验——`b8ef4a555`（P4.5 杂项清理：test-connect/test-reconnect/test-start-reconnect 三测试通道就地显式豁免声明 standard §2.6——designer-page-body.tsx:480/designer-canvas.tsx:171 live 注释逐字在案）、`5a0dcc401`（cq-2）、`2c94d9d7f`（cq-6）、`d322c2195`（IS-1/plan 544 视口保持+树投影装饰，onViewportPersist→persistViewport 命令链 live 在案 xyflow-canvas.tsx:408-411）、`dc9ebf9c4`（IS-4/plan 547——**tree deleteSelection 修复落点考古见 WA-flowr-001**）、`32da9927c`（plan 557 D1 调试 toast 清除——emitTreeLayoutDebugSnapshot 已删，全仓零残留 grep 复核 ✅）、`a001e1f6e`（树手柄居中——render-ports.tsx:255-258 注释逐字在案）、`1593727cd`/`dccce0022`/`40258e950`（adapter 三层路由的分层出生链）、`e127635c5`（persistViewport action-provider 侧出生）、`04e504f30`/`502df9dd8`/`816362fdf`（inspector coalesce 出生与两次扩面）、`02fc0bb71`（ux-r12 TF-T1 'CC' 特判 + TF-T6 fitView race）、`a0e50285a`/`dd72a80b3`（plan 526/527 双上下文菜单同波出生）、`dbd3c327b`（plan 524 L6 template-gallery/actions-editor 出生）、`a48bb04c8`（page 包出生）。**症状性 message 专项**：抽检两包最近 commit 30 条（上列 + da669de8d/d2fe96203/d2e755e97/6f7064ae4/bac83c3a2/db49efebf/b9b74eb11/54d79b2b5/732bdaee9/cd26a88df/d6e4b5a68/b0aca8eea/5956e63a2/a486570b0），29 条带 plan 引用/根因链/full-green 标记，1 条为显式标记的 WIP 中间态（b3afb10bd「in-flight...under active debugging」，后继 6f7064ae4 收口）——**症状性 message 0**。
8. **误报排除复核**：22 项全记录（§误报排除清单）；与 wa-7/wa-8/wa-9/wa-10 判例互通（命令式焦点 wa-7 #9、host 集成边界 wa-8 leafer 判例、test-support 归 CX-15/`__tests__` 搬迁、双份稳定重复不立案、防抖 coalesce = wa-10 #8 同族）。

## 逐条发现（Findings）

> 每条按 12 字段模板（id/位置/信号类别/症状/根因/考古/严重度+判据/修复方向/去向/验证方式/现状/跨批关联）；全量登记归主会话写入 `docs/audits/workaround-code-smell/ledger.md`（ID `WA-flowr-001`/`WA-pager-001` 起各自顺延，三位零填充），本节与台账一一对应，零静默。
> ID 编排说明：立案 **14 条 = P2 ×3 + P3 ×11；零 P0/P1**（WA-flowr-007 按「≥3 份同根因」P1 起评后降档，降档理由显式记录于该条）。

### WA-flowr-001 [H 邻/E] designer-command-adapter 主 switch 双死分支：duplicateNode 全影子 + tree deleteSelection 死路径（plan-547 修复落点考古）

- **位置**: `packages/flow-designer-renderers/src/designer-command-adapter.ts:295-305`（`case 'duplicateNode'`）+ `:268-287`（`case 'deleteSelection'` 的树模式分支，含 `:278` 裸英文 `'Nothing to delete'`）
- **信号类别**: H（复制粘贴沉积的死侧）+ I 邻（化石特征）；伴随 W1/W5 取证价值
- **症状**: 主 switch 两个 case 在现行路由下不可达——`execute()` 的分发顺序是 `executeTreeCommand`（TREE_OWNED 守卫）→ `executeGraphOnlyCommand`（graph adapter）→ 主 switch：①`duplicateNode` ∈ GRAPH_ONLY_COMMANDS 且 executeGraphOnlyCommand:97-108 有同名 case（全路径 return），主 switch :295-305 任何模式都到不了；②`deleteSelection` ∈ TREE_OWNED_COMMANDS 且 executeTreeCommand:157-190 有树模式 case（全路径 return），主 switch :268-287 的树分支两种模式都到不了（graph 模式走 :266 deleteGraphSelection，树模式在 executeTreeCommand 已 return）
- **根因**: command 路由三层叠加（tree-own 守卫 → graph adapter → 主 switch）无单一所有权——向 TREE_OWNED_COMMANDS/GRAPH_ONLY_COMMANDS 加命令会静默影子主 switch 同名 case，无门禁可察
- **考古**: 主 switch duplicateNode 出生 `1593727cd`（2026-03-23 xyflow canvas bridge 首波）；executeGraphOnlyCommand 提取于 `dccce0022`（2026-04-26），duplicateNode 自此全影子（~6 个月死龄）。`40258e950`（2026-08-06 tree writeback 批）把 `deleteSelection` 加入 TREE_OWNED_COMMANDS 并建 executeTreeCommand 事务化 per-node case——主 switch 树分支自此死亡。**关键：`dc9ebf9c4`（2026-10-08，plan 547/IS-4）的「tree deleteSelection 从无条件 unavailable 改为按 selectedNodeIds/activeNode 路由 deleteTreeNode」修复 diff（`git show dc9ebf9c4` 核验）恰好改在这个死分支上**——修复出生即不可达；commit message 自述的修复行为实为 no-op（活体 executeTreeCommand case 自 40258e950 起已具备 per-node 路由，plan-547 观察到的「键盘 Delete 无效果」真根因是同 commit 登记 P1 的 taskflow-2 键盘路由缺口）
- **严重度**: P2（判据：低成本可修的单点缺陷——死代码 + 已漂移影子 + 一条台账修复记录锚在死路径上；无现行行为缺陷故非 P1，降档理由：活体路径行为正确且有测试）
- **漂移证据**: 死分支与活体已语义分叉——死分支无事务包装（活体 :175-189 beginTransaction/commit/rollback 全有）、无边选择拒绝（活体 :161-167 edgeDeletionUnavailableInTreeMode）、错误消息裸英文 'Nothing to delete'（活体走 t()）
- **修复方向**: 删除主 switch `case 'duplicateNode'`（:295-305）与 `case 'deleteSelection'` 树分支（:268-287，保留 `if (!isTreeMode) return deleteGraphSelection(core)` 后直接 fallthrough 不可达即删整段）——机械删除零行为变更；plan-547 台账行的 tree-deleteSelection 修复归因需注记（修复实锚于 40258e950 的 executeTreeCommand case，dc9ebf9c4 diff 为死路径编辑）——注记归主会话台账处置
- **去向**: fixed（批内修）
- **验证方式**: 两包 filter typecheck/build/lint/test 全绿；`grep -c "case 'duplicateNode'" designer-command-adapter.ts` = 0；树模式键盘 Delete e2e（designer-interaction-state spec）保持绿——证明活体路径承载全部行为
- **现状**: live（本报告 HEAD 快照）
- **跨批关联**: 交互审计线 IS-4/plan 547（ledger IS-\* 行）——本条不重复交互透镜立案，仅以九信号透镜登记死代码并供 plan-547 记录注记；designer-command-adapter 为本包文件不涉 WA-12

### WA-flowr-002 [I 邻] action-provider `case 'persistViewport'` 不可达：manifest/listMethods 双缺declared，validator 出生即拒

- **位置**: `packages/flow-designer-renderers/src/designer-action-provider.ts:453-463`（switch case）↔ `:101-144`（listMethods 无 'persistViewport'）↔ `packages/flow-designer-renderers/src/designer-manifest.ts`（designerCapabilities.methods 无 persistViewport，`git log -S persistViewport -- designer-manifest.ts` = 空）
- **信号类别**: I 邻（死代码）+ 契约面失配
- **症状**: `invoke()` 接受 'persistViewport' 但任何宿主 action 调用 `designer.persistViewport` 都到不了该 case——`createHostMethodValidator`（:15，绑 FLOW_DESIGNER_HOST_METHOD_CONTRACTS）对未声明方法直接返回 `{ok:false, error:'designer:persistViewport is not a published host method.'}`（`flux-core/src/schema-diagnostics/value-shape-runtime.ts:142-149` 核验），:163-166 校验闸门先行拒绝
- **根因**: persistViewport 能力落在命令通道（commandAdapter dispatch，IS-1 视口保持的面）时，host action 通道的接漏了半截——case 写了、发布清单（manifest + listMethods）没写
- **考古**: case 随 `e127635c5`（2026-09-30 round-3 interaction 批）落 action-provider（+11 行），同批/任何后续 commit 均未触 manifest——出生即失配
- **严重度**: P3（判据：记录性——case 不可达无行为危害，validator 的「未发布即拒」恰是契约正确行为；缺陷是死代码与「看似已发布」的误导）
- **修复方向**: 删除 :453-463 case（行为保持——本来不可达）；若产品上需要发布 `designer.persistViewport` host action，则反向补齐（manifest method 契约 + listMethods + designer-manifest-contract 测试）——该发布决策留人工，本批按「删除死 case」执行并注记
- **去向**: fixed（删 case + 注记发布决策）
- **验证方式**: filter 四门禁全绿；`grep -n persistViewport designer-action-provider.ts designer-manifest.ts` 复核（删除后 action-provider 仅 command-adapter-graph 侧 persistViewport 命令 case 存在——那是命令通道本体，不在本案范围）
- **现状**: live
- **跨批关联**: IS-1/plan 544 视口保持（d322c2195）——命令通道 persistViewport 链 live 正常，本案仅 host action 通道

### WA-flowr-003 [H] `readDesignerResolvedProp` 同包四份手写

- **位置**: `packages/flow-designer-renderers/src/designer-page.tsx:19`、`designer-page-inner.tsx:19`、`designer-tree-mode.tsx:12`、`designer-page-body.tsx:69`（四份逐字同构 ~6 行：`props.props[key] as T | undefined`）
- **信号类别**: H（微复制沉积——同一基础设施多处手写，WA-code-editor-002 点路径家族同型）
- **根因**: resolved-props 读取无包内 home；四个 renderer 入口各自内联
- **考古**: 随各 renderer 出生波次落笔（38be8e054 readOnly 分离批起逐步扩散）
- **严重度**: P3（判据：4 份 ×6 行同根因微复制；W3——读取语义若变（如加 compile 后值缓存）需四处同步）
- **修复方向**: 提取到 `designer-page-helpers.ts` 导出单份，四处改 import（包内依赖方向零变更，不动公共出口）
- **去向**: fixed（批内修）
- **验证方式**: filter 四门禁全绿；`grep -rn "function readDesignerResolvedProp" src/` = 1
- **现状**: live
- **跨批关联**: 无（wa-10 WA-code-editor-002 同族判例引用）

### WA-flowr-004 [H] `viewportsEqual` 双份同名漂移孪生：精确等 vs ε-等

- **位置**: `packages/flow-designer-renderers/src/designer-command-adapter-helpers.ts:68-73`（`===` 精确比较）↔ `packages/flow-designer-renderers/src/designer-xyflow-canvas/xyflow-utils.ts:134-143`（`VIEWPORT_EPSILON 0.001` 容差比较）——同名同用途（viewport 相等性守卫），语义已分叉且**双向无注释声明差异**
- **信号类别**: H（双份大块内的小件重复，已漂移=维护成本兑现形态的预备）
- **根因**: viewport 归一化守卫原语无单点 home；command-adapter 侧（setViewport unchanged 判定，adapter-graph:184）与 xyflow 侧（onMove 回写守卫，use-xyflow-interactions:114）各自手写
- **考古**: helpers 版随 command adapter 首波（1593727cd 系）；xyflow-utils 版随画布提取波
- **严重度**: P3（判据：2 份、~6 行、同根因、两侧均稳定；漂移本身可能是设计内——两侧输入均已 normalizeControlledViewport 归一，ε 容差属防御冗余——但「可能是」恰恰说明需要一处注释或一次收敛来消歧）
- **修复方向**: 最小修 = 两侧互见注释声明语义差（精确 vs ε 及原因）；彻底修 = 收敛到 xyflow-utils 单份（adapter-helpers 改 import——同包依赖方向零变更）
- **去向**: fixed（批内修，按彻底修执行；回归 = command-adapter 套件 setViewport unchanged 断言 + xyflow 套件视口守卫断言直通）
- **验证方式**: filter 四门禁全绿
- **现状**: live
- **跨批关联**: 无

### WA-flowr-005 [H] designer-inspector flushDraft ↔ unmount-flush effect：分发三联 ~27 行×2 同文件复制

- **位置**: `packages/flow-designer-renderers/src/designer-inspector.tsx:49-75`（flushDraft）↔ `:76-103`（unmount cleanup effect 内联重写同一 node/branch/edge 三联分发）
- **信号类别**: H（同文件行为块复制）
- **根因**: unmount 期不想调 `setDraft(null)`（陈旧 setState）而内联复写；React 18+ 该顾虑已不成立（卸载后 setState 为无害 no-op），flushDraft 的 `draftRef.current` 读取在 unmount cleanup 中同样有效
- **考古**: 随 coalesce 机制出生 `04e504f30`（plan 2026-09-29-4 R2-P14），`502df9dd8`/`816362fdf` 两次扩面时两份同步改（同步修税已实际发生）
- **严重度**: P3（判据：2 份 ×27 行、同根因、活跃文件、同步修改史在案；W3）
- **修复方向**: unmount effect 改 `return () => { flushDraft(); }`（flushDraft 已在依赖数组）；新增分发 kind 时单点改
- **去向**: fixed（批内修；回归 = designer-inspector-coalescing.test.tsx 直通[含 unmount flush 用例]）
- **验证方式**: filter 四门禁全绿
- **现状**: live
- **跨批关联**: plan 2026-09-29-4 R2-P14（登记锚）；print-inspector:151（wa-10 #8 豁免判例）镜像的正是本组件的机制

### WA-flowr-006 [H] use-designer-auto-layout 树重排块 ~25 行×2 同文件复制

- **位置**: `packages/flow-designer-renderers/src/use-designer-auto-layout.ts:44-68`（handleAutoLayout 树模式分支）↔ `:114-142`（初始树 relayout effect）——同一「requestId 守卫 + core.relayoutTree + setLayoutError/Failure/Busy」包装两份手写
- **信号类别**: H（同文件行为块复制）
- **根因**: 「执行一次树重排并同步 busy/error 态」无本地帮手；按钮触发与挂载初始两条入口各自内联
- **考古**: 随 auto-layout hook 出生波次；error 归一化写法两份逐字同
- **严重度**: P3（判据：2 份 ×25 行、同根因、同文件；W3——错误处理或守卫语义变更需双处同步）
- **修复方向**: 提取 `runTreeRelayout(requestId: number): void` 本地函数，两处调用
- **去向**: fixed（批内修）
- **验证方式**: filter 四门禁全绿（auto-layout-guards 套件直通）
- **现状**: live
- **跨批关联**: WA-flowr-008 同文件（300ms fitView 等待的正是本 hook 的完成信号——两案修复方向联动）

### WA-flowr-007 [H] designer-toolbar invokeAction 失败处理三联复制（2 全同 + 1 变体）

- **位置**: `packages/flow-designer-renderers/src/designer-toolbar.tsx:323-330`（back 按钮，无 then 链）+ `:355-368`（button）+ `:385-398`（switch）——`void invokeAction(action).then(result => { if (!result.ok) handleActionFailure(...) }).catch(handleActionFailure)` 骨架三份，button 与 switch 两份逐字全同（含 runThenChain），back 为无 then 链变体
- **信号类别**: H（同文件复制粘贴式增长）
- **根因**: 「toolbar 动作调用管道」（invoke→failure 面板→then 链）无本地帮手，三种 item 形态各写一遍
- **考古**: then 链机制随 `dc9ebf9c4`（plan 547 taskflow-1）落入 button/switch 两处——修复当时即双写（同波姊妹件不共享骨架的 wa-10 同款形态）
- **严重度**: **P1 起评 → P3 降档**（判据与降档理由显式记录：「≥3 份同根因复制」形式成立[3 份]，但①同一文件内 30 行总量、②button/switch 全同而 back 为设计内差异[back 无 then 链语义]、③零行为缺陷零漂移、④提取为纯机械重构——不满足 P1 的「无出口转正/已漂移/≥3 份大块」实质，降档 P3）
- **修复方向**: 提取 `runToolbarAction(action: string, item?: { then?: unknown }): void` 本地帮手，三处改调用
- **去向**: fixed（批内修）
- **验证方式**: filter 四门禁全绿（designer-controls/designer-toolbar 相关套件直通）
- **现状**: live
- **跨批关联**: plan 547 taskflow-1（then 链机制登记锚）

### WA-flowr-008 [C] xyflow onInit 300ms setTimeout 重适配：等待 ELK 落位的调谐延迟而非就绪信号

- **位置**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx:378-380`（`window.setTimeout(() => { void instance.fitView({padding:0.15, maxZoom:1}) }, 300)`）
- **信号类别**: C（时序贿赂）
- **症状/根因**: ux-r12 TF-T6（`02fc0bb71`）修复「初始 fitView 按布局前散布边界算 zoom 导致节点文字不可读」——修复方式是 init 后 300ms 一次性重适配。等待的真实对象是「自动布局（ELK）落位完成」，但 `use-designer-auto-layout` 未暴露完成信号（仅 layoutBusy/layoutError 布尔），只能调出一个 300ms。环境变化（更大文档/更慢机器上 ELK >300ms）下原始缺陷按原路径复现——根因（fitView 未与布局完成排序）仍在
- **考古**: `02fc0bb71` TF-T6；注释自证意图（「异步自动布局（ELK）在 init 后才落位…只此一次，不与用户后续平移/缩放抢视口」）——意图清晰、有自限，唯缺就绪通道
- **严重度**: P3（判据：C 类坐实但后果一次性/视觉性/自限——fitView 只跑一次，用户交互后自愈；无数据风险）
- **修复方向**: `use-designer-auto-layout` 暴露 `layoutSettled: Promise<void>`（handleAutoLayout 与初始 relayout 的 finally resolve），canvas onInit 改订阅该 promise 替代 300ms（保底超时可留）；与 WA-flowr-006 的提取同车最省
- **去向**: watch-only（本行即登记，不允许静默；Phase 2 如顺手可与 006 同车修，非强制）
- **验证方式**: 若修：大图（如 200 节点 demo）初载 fitView zoom ≥ 可读下限；现态：ux-r12 e2e TF-T6 断言保持
- **现状**: live
- **跨批关联**: ux-r12 TF-T6（登记锚）；plan 544/IS-1 视口保持面相邻（fitView 与 viewport persist 都在 init/moveEnd 通道，修复时注意互不抢占）

### WA-flowr-009 [A 邻] 'CC' 兜底标签跨文件字面契约：菜单层硬编码 + 适配层字符串特判

- **位置**: `packages/flow-designer-renderers/src/dingflow/dingflow-command-dispatch.ts:21`、`:52`、`:60`（`data: { label: type === 'dt-approval' ? 'Approver' : 'CC', desc: 'Please set' }` 三处硬编码）↔ `packages/flow-designer-renderers/src/designer-command-adapter.ts:107`（`fallback.label === 'CC'` 特判：defaults 派生名存在时接管 'CC'）
- **信号类别**: A 邻（症状特判的字面量可解释——W6 弱满足——但解释它的常量定义在另一个文件的字符串字面里，跨文件隐式契约）
- **症状/根因**: 插入类命令的兜底 label 在菜单 dispatch 层硬编码；ux-r12 TF-T1（`02fc0bb71`）发现 'CC' 与类型无关导致画布空标签，修复选择在消费端（withNodeTypeDefaults）对 'CC' 字符串特判接管，而未单源化兜底常量——任何人改 dispatch 侧 'CC'（哪怕改成 t() 化的本地化串），适配层特判即静默失效（新节点标签回归类型无关）
- **考古**: 兜底出生 `40258e950`（tree writeback 批）；特判出生 `02fc0bb71`（TF-T1，commit message 明载根因链「insert commands merge node-type defaults so new nodes render type-derived labels instead of hardcoded 'CC'」）
- **严重度**: P3（判据：局部症状特判 + 隐式契约；W3/W6——字面量领域语义可解释但无单一事实来源）
- **修复方向**: 提取共享常量（如 `FALLBACK_NODE_LABEL = 'CC'` 于 dingflow-constants.ts，两侧引用）消除字符串耦合；更彻底的修法（菜单层不再硬编码 label、直接交 defaults 派生）涉及命令语义变更，留注记不强制。随案注记：'CC'/'Approver'/'Please set'/'Condition' 为上屏未 t() 串（dingflow 兔巴样复刻语义，见 WA-flowr-010 同族）
- **去向**: fixed（批内修——常量提取行为保持）
- **验证方式**: filter 四门禁全绿（dingflow-command-dispatch.test/designer-command-adapter 套件直通）；`grep -rn "'CC'" src/ | grep -v test` 复核单源
- **现状**: live
- **跨批关联**: ux-r12 TF-T1（登记锚）

### WA-flowr-010 [I 邻] 错误消息面双语分裂：helpers 裸英文常量（含 "playground example" 措辞残留）经 notify 上屏未 t()

- **位置**: `packages/flow-designer-renderers/src/designer-command-adapter-helpers.ts:8-10`（`EDGE_SELF_LOOP_ERROR = 'Self-loop edges are not supported in the playground example.'`、`EDGE_MISSING_NODE_ERROR`、`EDGE_DUPLICATE_ERROR`）+ `:107/:113`（`Unknown node type: ${nodeType}` / `Unable to add node: ${nodeType}` 模板串）
- **信号类别**: I 邻（演进残留——消息措辞自证 playground 时代产物）+ W3（同文件族 i18n 化已由 `b9b74eb11` 完成 10+ 处，此 5 处为漏网）
- **症状**: 这些字符串经 `notifyCommandFailure`（designer-context.ts:107-118 显式支持 string error）直达 `env.notify('warning', ...)` 用户面——**测试钉住了英文上屏**（designer-provider-and-manifest.test.tsx:403/:410 断言 `notify).toHaveBeenCalledWith('warning', 'Edges must connect existing nodes.')`），而同层 addEdge 的其余失败路径已 t()（`flux.flowDesigner.command.unableToAddEdge`），同一边缘校验的双出口一中文一英文
- **考古**: 常量随 `dccce0022` 模块拆分落位（内容更早）；`b9b74eb11`（2026-08-09 DR i18n 家族收口）扫掉了 adapter 内全部裸串但未触 helpers 常量——收口波的范围缺口
- **严重度**: P3（判据：出口过期的收口残留 + 用户可见面不一致；W2 弱[前次收口记录在案但范围缺口未登记]）
- **修复方向**: 5 处改 `t('flux.flowDesigner.command.*')` 新键（沿用 b9b74eb11 键位命名法），两处测试断言改断言键或 i18n 后文案；"playground example" 措辞顺带清除（现态对生产宿主是错误承诺）
- **去向**: fixed（批内修）
- **验证方式**: filter 四门禁全绿（i18n keys 门禁 + adapter 套件直通）；`grep -n "playground example" src/` = 0
- **现状**: live
- **跨批关联**: `b9b74eb11` DR i18n 收口（范围缺口注记）；literalEn 基线 0 系探针对 .ts 常量串形态盲区（门禁微注记，见 watch 节）

### WA-pager-001 [H] 设计器上下文菜单孪生骨架：flow designer-context-menu ↔ page page-designer-context-menu ~45 行同构

- **位置**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-context-menu.tsx:57-94` ↔ `packages/page-designer-renderers/src/page-designer-context-menu.tsx:110-150`——viewport 钳制 useLayoutEffect（同 VIEWPORT_MARGIN=8、同 min/max 公式、同 focus 首项）+ 窗口 pointerdown 外点关闭 + Escape keydown 捕获关闭（两个 effect 近逐字）+ ArrowUp/Down roving focus（近逐字）
- **信号类别**: H（同波姊妹件平行生长——wa-10 「同波姊妹件不共享骨架」形态的跨包版）
- **根因**: 设计器右键菜单壳（钳制/外点关/Escape/roving focus）无共享 home；plan 526（flow）先落，plan 527（page）落笔时镜像了骨架
- **考古**: flow 版出生 `a0e50285a`（plan 526 Phase 4，2026-10-06 前后）；page 版出生 `dd72a80b3`（plan 527 Phase 2，紧随波次）——**已漂移一位点**：page 版 menuitem 选择器带 `:not([disabled])`（paste 项可禁用），flow 版无（无禁用项需求）——骨架复制后各自演化的标准漂移起点
- **严重度**: P2（判据：2 份、~45 行同根因骨架、两包均在活跃修改期[526/527 波及后续 a001e1f6e/32da9927c 连续触碰]、已现漂移位点；跨包提取涉及公共面归属决策故不入批内修）
- **修复方向**: 提取共享菜单壳（`useContextMenuShell({x, y, onClose})` 返回 {ref, clampedPos, rovingFocusProps} + 外点/Escape 关闭 effect）至 `@nop-chaos/ui`（两包已依赖 ui；ui 现有 DropdownMenu 是 portal 弹层族，本壳是 fixed 坐标菜单族，互补不冲突）——共性裁定建议 **CX-16**（新拟制编号）
- **去向**: successor-required=CX-16
- **验证方式**: CX 批内：两包 context-menu 相关 e2e/单测直通；roving focus 与外点关闭行为逐项等价
- **现状**: live
- **跨批关联**: plan 526/527（出生锚）；交互线不重复立案（纯结构维度）

### WA-pager-002 [B] template-gallery 三条 promise 链零 rejection 路径：宿主 store 边界静默

- **位置**: `packages/page-designer-renderers/src/template-gallery.tsx:72-74`（`list().then` 无 catch——门禁 :72 双报位点）+ `:89-93`（`save().then` 无 catch——失败时无 toast、nameDraft 悬置、unhandled rejection）+ `:97-99`（`remove().then` 无 catch）
- **信号类别**: B（防御式掩盖的镜像形态——不是吞错，是**没有失败路径**：宿主回调面 `PageDesignerTemplateStore` 契约允许 Promise（:25-27 签名 `| Promise<>`），reject 即静默）
- **根因**: 宿主边界（跨信任边界）的 async 面未接结构化失败路由；同文件 sync 面的 JSON.parse catch 有 toast.error（:85-88），async 面全裸
- **考古**: 随 `dbd3c327b`（plan 524 L6 S3+S4）出生即裸
- **严重度**: P2（判据：低成本可修单点缺陷——宿主 store 违契/异步存储（IndexedDB 封装等真实宿主形态）失败时用户零反馈 + unhandled rejection 上报噪声；demo 内存 store 不触发故非 P1）
- **修复方向**: 三链补 `.catch(() => { toast.error(t('flux.pageDesigner.template*Failed')) })`（save 失败还需不清 nameDraft 或提示重试；新 i18n 键 2-3 个）
- **去向**: fixed（批内修）
- **验证方式**: filter 四门禁全绿；新增单测：mock rejecting store → 断言 toast.error + 无 unhandled rejection
- **现状**: live
- **跨批关联**: plan 524 L6（登记锚）

### WA-pager-003 [B] inspector json 字段非法 JSON 静默回弹：输入无声消失零反馈

- **位置**: `packages/page-designer-renderers/src/inspector-panel.tsx:184-192`（json 控件 onBlur：`catch { /* 非法 JSON：保留 working，收口事务（无变更）。*/ }` + `setJsonDraft(null)`）
- **信号类别**: B（静默兜底——守卫触发[用户输入非法 JSON]无任何观测面，W4 违约）
- **症状**: 用户在 json 型属性字段键入非法 JSON 后 blur：事务空收口（行为正确——文档不受损）但 `setJsonDraft(null)` 使 textarea 立即回弹为上次合法值的 stringify——**用户刚键入的文本无声消失，无错误提示**。同面板 raw JSON 直编区（:250-253）对同类失败有 `rawError` 错误面上屏——同面板双标
- **根因**: json 控件草稿态只有一档（合法值），缺少错误显示位；catch 里只写了「保留 working」没写「告知用户」
- **考古**: 随 inspector 面板出生波次（a48bb04c8 MVP 后的 S3 波）；无测试钉住该行为（`grep jsonDraft *.test.tsx` = 0）——无行为约束佐证其非刻意设计
- **严重度**: P3（判据：W4 静默守卫；数据无损、影响面为单字段编辑体验）
- **修复方向**: 增加 `jsonError` 局部态：catch 时置错误文案（复用 raw 区的 `flux.pageDesigner.rawJsonInvalid` 或新键）且**保留 jsonDraft**（不回弹，让用户改到合法为止）或显式 toast——与 raw 区行为对齐
- **去向**: fixed（批内修）
- **验证方式**: filter 四门禁全绿；新增单测：非法 JSON blur → 错误面可见 + 草稿不回弹（先红后绿）
- **现状**: live
- **跨批关联**: S1 §8.3 编辑会话契约（事务收口语义保持不变——只补观测）

### WA-pager-004 [D 邻/H] schema type 读取 11 处同形态断言分散 7 文件：`(node as unknown as Record<string, unknown>).type as string`

- **位置**: `page-designer-page.tsx:109/:115/:203`、`designer-clipboard.ts:49/:67`、`canvas-layout.ts:67`、`structure-tree.tsx:37/:57`、`inspector-field-model.ts:59/:94/:97/:100/:133`、`data-binding-panel.tsx:49/:68`、`empty-container-projection.ts:31` 中的 type/record 读取形态同构者 11 处（详见误报排除清单 #2 的 17 处全落字；本条只收敛其中「读 type 键」同形态）
- **信号类别**: D 邻 + H（断言本体为动态边界豁免[见排除清单]，但同一窄化操作 11 份手写属微复制）
- **根因**: page-designer-core 提供了 `getSessionId`/`walkSchemaNodes` 等类型守卫帮手，但没有 `getSchemaType(node): string | null`——每个需要 type 的位点各写一次双跳断言
- **考古**: 随各面板出生波次逐步沉积（a48bb04c8/dbd3c327b/ux-r5 波）
- **严重度**: P3（判据：11 份 ×1 行微复制 + 断言噪声；W3——schema type 语义变更（如联合键）需 11 处同步）
- **修复方向**: 包内（或 page-designer-core——若动 core 则登记转发 WA-12 评估）新 helper `getSchemaType(node: unknown): string | null`（isSchema 守卫 + Record 承接单点），11 处改调用；断言总量 17→6（余为非 type 键的记录承接，保持豁免）

> **closure postscript（WA-13a 收口勘误）**：closure M1 补齐 inspector-field-model 2 位点后实况=**13 位点/6 文件**（designer-clipboard×2/page-designer-page×3/structure-tree×4/canvas-layout/empty-container-projection/inspector-field-model×2），typeBypass 终值 17→12（余为非 type 键记录承接豁免）；本节行号清单系 Phase 1 取证快照，终态以 ledger WA-pager-004 行为准。

- **去向**: fixed（批内修——包内 helper，不触 core 不越 WA-12 界）
- **验证方式**: filter 四门禁全绿；`grep -c "as unknown as Record<string, unknown>" src/` 下降落字
- **现状**: live
- **跨批关联**: page-designer-core 侧若有更优 home，登记转发 WA-12 评估（本批不动 core）

## 汇总

### 1. 转正清单（W2 违约项，按风险排序）

| 发现 ID      | 位置                                                   | 出生时间（git 考古）                                           | 风险                                              | 处置   |
| ------------ | ------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------- | ------ |
| WA-flowr-001 | adapter 主 switch 双死分支（含 plan-547 修复落点考古） | 1593727cd→dccce0022 影子化；40258e950→dc9ebf9c4 二次落笔死路径 | 死分支误导后续修复（已实际发生一次）；漂移影子    | 批内修 |
| WA-flowr-010 | helpers 裸英文错误面（playground 措辞）                | dccce0022 前出生；b9b74eb11 收口波范围缺口                     | 用户可见面中英分裂；playground 措辞对生产宿主失真 | 批内修 |
| WA-flowr-002 | persistViewport 不可达 case                            | e127635c5（出生即失配）                                        | 「看似已发布」误导；死代码                        | 批内修 |
| WA-pager-002 | template-gallery 三链零 rejection                      | dbd3c327b（出生即裸）                                          | 异步宿主存储失败 = unhandled rejection + 零反馈   | 批内修 |
| WA-pager-001 | 上下文菜单孪生骨架                                     | a0e50285a / dd72a80b3（同波姊妹件）                            | 第三份菜单形态出现即第三份抄写；已现选择器漂移    | CX-16  |
| WA-flowr-009 | 'CC' 跨文件字面契约                                    | 40258e950 / 02fc0bb71（消费端补丁形态）                        | 改菜单层字面 → 适配层特判静默失效                 | 批内修 |

**无出口的转正临时方案为零**——六项风险头部全部是沉积/复制/死代码形态（H/D/I 邻）+ 两条 B 类静默面，没有「按住未修问题且无出口」的转正件；literalEn/literalZh 双零 + 症状性 message 0 佐证。

### 2. 重复代码热区（按总冗余行数排序）

| 组  | 份数      | 各份位置                                                                                   | 冗余行数 | 漂移证据                                              | 裁定（三问句）                           |
| --- | --------- | ------------------------------------------------------------------------------------------ | -------- | ----------------------------------------------------- | ---------------------------------------- |
| 1   | 2（跨包） | 上下文菜单壳：flow designer-context-menu ↔ page page-designer-context-menu（WA-pager-001） | ~45      | **menuitem 选择器已漂移**（page 带 :not([disabled])） | 同根因✅ 提取需跨包归属决策 → CX-16      |
| 2   | 2         | inspector flushDraft ↔ unmount flush（WA-flowr-005）                                       | ~27      | 无（逐字同步改史在案）                                | 同根因✅ 提取干净✅ → 批内修             |
| 3   | 2         | auto-layout 树重排块 ×2（WA-flowr-006）                                                    | ~25      | 无                                                    | 同根因✅ → 批内修                        |
| 4   | 3(2+1)    | toolbar invokeAction 三联（WA-flowr-007）                                                  | ~24      | back 无 then 链（设计内差异）                         | 同根因✅ → 批内修（P1 起评降档记录在案） |
| 5   | 11        | schema type 读取断言形态（WA-pager-004，归并热区）                                         | ~11      | 断言本体豁免、复制面立案                              | 同根因✅ 单点 helper → 批内修            |
| 6   | 4         | readDesignerResolvedProp ×4（WA-flowr-003）                                                | ~24      | 无（逐字）                                            | 同根因✅ → 批内修                        |
| 7   | 2         | viewportsEqual 精确 vs ε（WA-flowr-004）                                                   | ~12      | **语义漂移（=== vs ε）双向无注释**                    | 同根因✅ → 批内修                        |

### 3. Top 重构建议（默认 3 项）

1. **command 路由死分支清扫 + 台账注记（WA-flowr-001 + WA-flowr-002 同车）**：根因修复点 = 删 adapter 主 switch 双死分支 + persistViewport 死 case；预期删除本体 = ~34 行死代码 + 1 处裸英文字面；回归 = command-adapter 全套件 + 树模式键盘 Delete e2e 直通；影响面 = 2 文件纯删除，零行为变更；附 plan-547 修复归因注记（主会话台账处置）。
2. **flow 同文件行为块三连收敛（WA-flowr-005 + 006 + 007 同车）**：根因修复点 = flushDraft 复用 / runTreeRelayout 提取 / runToolbarAction 提取；预期删除本体 = ~76 行复制块；回归 = designer-inspector-coalescing + auto-layout-guards + designer-controls 套件直通；影响面 = 3 文件包内私有重构，公共出口零变更。
3. **page 静默面 + 断言面收敛（WA-pager-002 + 003 + 004 同车）**：根因修复点 = template-gallery 三链 .catch/toast + inspector json 错误面 + getSchemaType 单点 helper；预期删除本体 = 11 处双跳断言 + 2 处静默路径；回归 = 新增 rejecting-store 单测 + json 非法输入单测（先红后绿）+ 面板族套件直通；影响面 = 7 文件 + 2-3 个新 i18n 键（公共 i18n 面，键新增不属公共导出变更）。

### 4. 误报排除清单（22 项）

| #   | 疑似点                                                       | 位置                                                                                                                                                                                                                                                      | 排除理由                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | typeBypass——SchemaInput/Record 承接（page 17 处全落字）      | designer-clipboard.ts:49/:67、canvas-layout.ts:67、page-designer-page.tsx:109/:115/:203、data-binding-panel.tsx:49/:68、structure-tree.tsx:37/:57、actions-editor.tsx:52、empty-container-projection.ts:31、inspector-field-model.ts:59/:94/:97/:100/:133 | 全部为无类型 schema 树（BaseSchema/SchemaInput 动态边界）上的结构性窄化——D 类误报排除判例（schema 反序列化边界一次性收窄）；「读 type 键」同形态 11 处的**复制维度**另立 WA-pager-004（不重复立案断言本体）                                |
| 2   | typeBypass——flow 包 0                                        | flow 全包                                                                                                                                                                                                                                                 | grep 实跑复现 flow 0（与 inventory 逐字吻合）；flow 的类型面走 DesignerCommand 联合类型 + flux-core 契约形状，无双跳断言需求                                                                                                               |
| 3   | setTimeout——inspector 300ms coalesce                         | designer-inspector.tsx:116                                                                                                                                                                                                                                | wa-10 #8 print-inspector 判例的本体：plan 2026-09-29-4 R2-P14 登记锚（:31-36 注释自证「recorded accepted consequence」），blur/unmount/selection-switch 三重 flush 守卫在案——防抖 coalesce 设计非时序贿赂                                  |
| 4   | setTimeout——canvas focus setTimeout(0)                       | designer-canvas.tsx:144                                                                                                                                                                                                                                   | 焦点投递需等注册后的同步任务出栈（命令式焦点判例 wa-7 #9 族）；无外部系统等待                                                                                                                                                              |
| 5   | setTimeout——add-node-menu 焦点 ×2                            | ding-flow-add-node-menu.tsx:44/:57                                                                                                                                                                                                                        | 弹层挂载/卸载后焦点投递（setTimeout(0)）；watch 微注记：:86 finalFocus 与 :57 手动回焦双通道并存——base-ui finalFocus 生效时 :57 冗余，下次触碰此件时二选一                                                                                 |
| 6   | setTimeout——hover intent ×2                                  | designer-xyflow-node.tsx:143（180ms）、designer-xyflow-canvas.tsx:439（160ms）                                                                                                                                                                            | 悬停工具条/边标签隐藏延迟 = hover intent UI 惯例（§2C 误报排除「动画时序」项）；两侧 clearTimeout 取消链完整                                                                                                                               |
| 7   | setTimeout——drag ghost 清理                                  | palette-panel.tsx:54                                                                                                                                                                                                                                      | setDragImage 要求 ghost 在 dragstart 同步任务后存活、随即移除——HTML5 DnD 平台 API 语义（feature-detect 守卫在案）；plan 527 Phase 1 登记锚                                                                                                 |
| 8   | domRaid——minimap SVG preserveAspectRatio 补丁 + viewBox 导航 | use-minimap-navigation.ts:29/:38                                                                                                                                                                                                                          | xyflow MiniMap 未暴露 preserveAspectRatio 与点击定位 API——第三方库内部 DOM 的宿主集成边界（wa-8 leafer 判例族）；补丁幂等（先查后写）。watch 微注记：依赖 `.react-flow__minimap` 内部类名，xyflow 升级改名即静默失效——建议升级核对清单登记 |
| 9   | domRaid——roving focus ×4                                     | designer-context-menu.tsx:53/:83、page-designer-context-menu.tsx:76/:106                                                                                                                                                                                  | wa-7 #9 命令式焦点判例：菜单 roving focus 是 a11y 键盘导航合法面（自持 DOM 非第三方）；骨架复制维度归 WA-pager-001 不在此重复                                                                                                              |
| 10  | domRaid——page 锚点投影 ×6                                    | canvas-bridge.tsx:43/:51/:153、canvas-overlay.tsx:67/:89、empty-container-projection.ts:55                                                                                                                                                                | S1 §5 设计内架构（「设计器只读 DOM 投影 + 命令通道」，两文件头注释自证）；MutationObserver 同步 + 预览态收敛为零；空容器 minHeight 投影为 ux-r5 PD-1 登记设计                                                                              |
| 11  | testEnvBranch 探针盲区——eager renderers in tests             | renderer-definitions.ts:15（`(globalThis as {process?...}).process?.env?.VITEST`）                                                                                                                                                                        | 文本探针（`process\.env\.VITEST`）对间接 globalThis 访问形态盲区；本体为懒加载 renderer 的标准可测性设计（§2G 排除项），report-designer/word-editor-renderers 三包同型惯例。watch 微注记：门禁规则如追求全覆盖可补该形态                   |
| 12  | async——tree-session 泵三处 + tree-mode 首呼                  | tree-session.ts:271/:296/:407、designer-tree-mode.tsx:104                                                                                                                                                                                                 | 见 async 定性表——dispatchNext 内部结构化失败路由闭环，void 为泵续呼惯用                                                                                                                                                                    |
| 13  | async——五处结构化 catch                                      | designer-page-body.tsx:193、template-gallery.tsx:85、json-source-view.tsx:36、expression-validation.ts:26、actions-model.ts:101                                                                                                                           | 见 async 定性表——toast/message/返回消息/契约保真，全部有观测面                                                                                                                                                                             |
| 14  | async——data-binding-panel 空候选降级                         | data-binding-panel.tsx:41                                                                                                                                                                                                                                 | 契约解析失败降级为空候选（datalist 空）；上游 schema-prop-coverage 门禁守卫。watch 微注记：catch 无日志，触发时不可诊断——建议注记或接 reportRuntimeHostIssue                                                                               |
| 15  | async——canvas-bridge dataTransfer catch                      | canvas-bridge.tsx:230                                                                                                                                                                                                                                     | 同源自产载荷（palette 写入）；catch → 空载荷 → onDrop 静默拒绝 = 「无效拖拽不动作」语义                                                                                                                                                    |
| 16  | perf——actions-editor:55 stringify 变更检测                   | actions-editor.tsx:55                                                                                                                                                                                                                                     | :59 注释自证机制（外部改值 vs 自身写回判别，保 uid 稳定）；数据面小（动作行数人数量级）。watch 微注记：`deepEqual` 已由 page-designer-core 导出可替换；record 键序扰动会误判外部变更（重投影代价 = 行集重建，非正确性损伤）                |
| 17  | perf——actions-model:92 / inspector-panel:181                 | actions-model.ts:92、inspector-panel.tsx:181                                                                                                                                                                                                              | 前者 encodeArgValue 数据变换本体；后者 json 字段显示序列化（draft ?? stringify 展示值）——均非变更检测红形态                                                                                                                                |
| 18  | 模块级可变态 ×4                                              | actions-editor uidSeed、page-designer-page sessionSeedCounter/SHARED_SID_RANDOM、xyflow-canvas activePaletteDragType                                                                                                                                      | WA-content-009 家族正面复核：全部有注释、有界、有用途（种子防撞哈希/拖拽 MIME 通道/React key 种子）；「仅作 React key，绝不写入 record」注释在案                                                                                           |
| 19  | cloneNode/copyNodeToClipboard 双别名                         | page-designer-page.tsx:61-63、designer-clipboard.ts:19-21                                                                                                                                                                                                 | 两个单行语义别名（同一 cloneDeep 单源消费）——别名即文档（调用点语义：粘贴克隆 vs 剪贴板解耦）；提取反而制造间接层，排除                                                                                                                    |
| 20  | tree-session.ts:204-207 重复空队列检查                       | tree-session.ts:205-207                                                                                                                                                                                                                                   | 第二个 `if (queue.length === 0) return;` 同步不可达（3 行防御冗余）；watch 微注记：下次触碰 tree-session 时顺手删除（不单独立案——无 W1-W6 实质违约）                                                                                       |
| 21  | 测试专用 window 通道 ×3                                      | designer-page-body.tsx:480-487、designer-canvas.tsx:171-182                                                                                                                                                                                               | b8ef4a555（P4.5）就地显式豁免声明（editor-designer-standard.md §2.6）live 注释逐字在案——已登记豁免不重复立案；G 类「测试专用分支」的登记例外形态                                                                                           |
| 22  | ding-flow-edge ↔ designer-xyflow-edge 焦点描边计算相似       | ding-flow-edge.tsx resolveStrokeWidth ↔ designer-xyflow-edge.tsx edgeStyle 三元                                                                                                                                                                           | 两条边渲染器（dingflow 树几何 vs designer 贝塞尔）各自 6 行宽度计算，路径引擎与 label 面完全不同——平行设计非同根因复制（§3 问句 1 否），排除                                                                                               |

### 5. 范围整体判断

**不是系统性临时方案文化——问题形态是「三层命令路由的分层影子沉积 + 同波姊妹件骨架不共享 + 静默边界缺失」，而非「按住问题的特判/兜底」。** 正面证据七件：①literalEn/literalZh **双零**且测试面同零（wa-10 之后最干净的字面面）；②逐字/归一双探针 **0 真实命中**（132+460 窗，复制组全部 <12 行窗外的中小块——大段复制粘贴未发生）；③async 门禁 14 行中 11 处结构化豁免，失败观测面与 wa-9/wa-10 同梯队；④cq-2/cq-6 两大收敛面 live 零复发（validator/cloneDeep/genId 注记/debug residue/route table 全在案），xyflow 静态依赖经 renderer 级懒加载定性为设计内；⑤症状性 commit message 0（30 条抽检全带 plan 锚与根因链，含 2 条用户复核驱动批 a001e1f6e/32da9927c 的完整判别读数）；⑥tree-session/tree-host 回写协议（epoch/ack/digest LRU/backpressure 上报）是本批质量最高的文件，协议注释与失败面完备；⑦两条 P2 一条是死代码（无行为危害）、一条是宿主边界防御缺口（demo 路径不触发）——**无一条是「按住活问题的转正临时方案」**。问题集中在三处：**「路由分层后旧层不清」**（command-adapter 双死分支，且已实际诱导一次修复落错层——plan-547）、**「同波姊妹件不共享骨架」**（上下文菜单跨包孪生、toolbar 三联——与 wa-10 结论同款，跨包变体建议 CX-16）、**「宿主/用户边界的静默面」**（template-gallery 零 rejection、inspector json 静默回弹）。整体判断：零星个案级，无需 roadmap 层面对策；14 条立案预期合计删除 ~110 行死代码/复制块 + 收敛 11 处断言 + 补 3 条失败路径，全部有同批或先行批判例证明修法成熟。

## 转发 WA-12（designer-core 侧发现登记）

**本批零转发**：全部 14 条立案位点均落在两包自身文件内（designer-command-adapter/action-provider/manifest/inspector/auto-layout/toolbar/xyflow-canvas/helpers/dingflow ×flow；template-gallery/inspector-panel/7 文件断言面 ×page），无需 core 侧修复。两个边缘核对记录：①WA-pager-004 的 `getSchemaType` helper 若评估后认为 page-designer-core 是更优 home（与 getSessionId 并排），登记 WA-12 批评估——本批默认包内落地不越界；②tree-session 协议本体（flow-designer-core 的 tree-session-impl）在本批审计中仅作消费方核对，未发现需立案的 core 侧信号。

## watch 微注记（不入立案，本行即登记，不允许静默）

1. **use-minimap-navigation 内部类名依赖**（误报 #8）：`.react-flow__minimap` 选择器随 xyflow 升级需核对——建议记入 xyflow 升级核对清单。
2. **actions-editor stringify 变更检测**（误报 #16）：deepEqual 单源已在 page-designer-core；行集 uid 稳定性依赖 record 键序。
3. **data-binding-panel 空候选降级无日志**（误报 #14）。
4. **add-node-menu finalFocus 双通道**（误报 #5）。
5. **eager-renderers VITEST 探针盲区**（误报 #11）：门禁规则可选扩展。
6. **literalEn 探针对 .ts 常量串盲区**（WA-flowr-010 佐证）：inventory literalEn=0 与 5 处用户可见裸英文名并行不悖——探针形态注记。
7. **tree-session:205-207 重复空队列检查**（误报 #20）：顺手删除候选。
8. **designer-inspector 可补一行 cq-2 纪律注记**（§5-6①）：为何不用 useDebouncedCallback（三重 flush 语义）。
9. **useEagerRenderersInTests 三包同型微复制**（flow/report/word 各 ~2 行）：跨包惯例形态，第三形态出现时再议收敛。

## 批内修复候选清单（供 Phase 2 执行会话）

| 发现 ID      | 严重度 | 建议去向                 | 修复要点                                                                                                                                | 约束/验收判据                                                                                                                          |
| ------------ | ------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| WA-flowr-001 | P2     | 批内修                   | 删主 switch duplicateNode case + deleteSelection 树分支（保留 graph 分支）；**不触** executeTreeCommand/executeGraphOnlyCommand 活体    | 纯删除零行为变更；command-adapter 全套件 + 树 Delete e2e 直通；`grep -c "case 'duplicateNode'" adapter` = 0；plan-547 归因注记交主会话 |
| WA-flowr-002 | P3     | 批内修                   | 删 action-provider `case 'persistViewport'`；报告注记「host action 发布」留人工决策                                                     | 纯删除零行为变更（case 本不可达）；filter 四门禁直通                                                                                   |
| WA-flowr-003 | P3     | 批内修                   | readDesignerResolvedProp 提取至 designer-page-helpers.ts，四处改 import                                                                 | 公共出口零变更（新 helper 包内私有）；四门禁直通                                                                                       |
| WA-flowr-004 | P3     | 批内修                   | viewportsEqual 收敛 xyflow-utils 单份（adapter-helpers 改 import）或双侧注释声明语义差                                                  | setViewport unchanged 断言 + 视口守卫断言直通                                                                                          |
| WA-flowr-005 | P3     | 批内修                   | unmount effect 改调 flushDraft                                                                                                          | designer-inspector-coalescing 套件直通（含 unmount flush 用例）                                                                        |
| WA-flowr-006 | P3     | 批内修                   | 提取 runTreeRelayout(requestId)，两处调用                                                                                               | auto-layout-guards 套件直通                                                                                                            |
| WA-flowr-007 | P3     | 批内修                   | 提取 runToolbarAction(action, item?)，三处改调用（back 保持无 then 链形态）                                                             | designer-controls 套件直通；P1→P3 降档理由随台账落字                                                                                   |
| WA-flowr-008 | P3     | watch-only               | 300ms → layoutSettled promise 订阅（可与 006 同车，非强制）                                                                             | 若修：大图初载 fitView 可读性断言；TF-T6 e2e 保持                                                                                      |
| WA-flowr-009 | P3     | 批内修                   | FALLBACK_NODE_LABEL 常量单源（dingflow-constants.ts），dispatch ×3 + adapter 特判改引用                                                 | dingflow/adapter 套件直通；`grep "'CC'" src                                                                                            | grep -v test` 单源落字 |
| WA-flowr-010 | P3     | 批内修                   | helpers 5 处错误串 t() 化（新 i18n 键）+ 2 处测试断言更新 + "playground example" 措辞清除                                               | i18n keys 门禁 + adapter 套件直通；`grep "playground example" src` = 0                                                                 |
| WA-pager-001 | P2     | successor-required=CX-16 | useContextMenuShell 共享壳提取（归属 @nop-chaos/ui），两包菜单改薄壳                                                                    | 跨包公共面决策 → CX-16 拟制批次；本批不单独修                                                                                          |
| WA-pager-002 | P2     | 批内修                   | list/save/remove 三链补 .catch → toast.error（save 失败保留 nameDraft）                                                                 | 新增 rejecting-store 单测先红后绿；零 unhandled rejection                                                                              |
| WA-pager-003 | P3     | 批内修                   | json 字段补错误面（对齐 raw 区 rawError 形态）+ 非法时保留草稿不回弹                                                                    | 新增非法 JSON blur 单测先红后绿；S1 §8.3 事务语义保持                                                                                  |
| WA-pager-004 | P3     | 批内修                   | 包内 getSchemaType helper，type 读取改调用（终态 13 位点/6 文件，见 closure postscript；不触 core；若评估 core home 更优 → 登记 WA-12） | 四门禁直通；typeBypass 17→12（余为非 type 键豁免承接）                                                                                 |

**批内修合计 12 项**（flowr 9 + pager 3），CX-16 一项，watch-only 一项；flow `index.tsx` / page `index.ts` 公共导出面**零变更**（全部新 helper/键为包内私有或 i18n 资源键；Phase 2 以 `git diff --exit-code` 两出口文件为验收判据之一）。
