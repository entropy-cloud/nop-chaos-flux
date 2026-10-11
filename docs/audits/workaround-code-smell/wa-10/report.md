# WA-10 3D/图/地图/打印/代码编辑器六包 临时方案与坏味道审计报告

> 批次: WA-10（roadmap `docs/backlog/workaround-code-smell-audit-roadmap.md` Phase Status 对应行）
> 审计方法: `docs/skills/workaround-code-smell-audit-prompt.md`（九类信号 A–I + W1–W6 + §5 取证协议）
> 执行 plan: plan 570（draft review 修正后口径）
> 审计日期: 2026-10-12
> 对象清单来源: `docs/audits/workaround-code-smell/inventory/modules.json`（批次 = WA-10 行，不手抄）
> 取证模式: **review-only**（本报告由独立取证 agent 产出；批内修复归 Phase 2 执行会话，台账登记归主会话）

## 快照基准注记

plan 570 基线记载 HEAD = `a439c55a3`（WA-8 收口 commit）；本报告取证实跑时 HEAD = `a439c55a3`，**基线与实跑同锚**。六包**零在途**：`git status -s` 对六包 src 全目录 = 0 文件（同刻工作树在途变更全部位于 WA-9 收口面 `flux-renderers-industrial` 与并行会话的 runtime/core/data/form 六处，与本批六包零交集，按任务口径忽略其噪声），live = HEAD。

**双口径行数逐文件分解**（92 文件逐一 `wc -l` 对照 inventory `path:loc` 后缀）：

| 口径           | 全集行数 | 说明                                                                                                               |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| inventory 口径 | 13,252   | WA-0 枚举器值（3d 2,950 + code-editor 3,376 + graph 1,402 + map 1,924 + print-core 1,548 + print-renderers 2,052） |
| live wc        | 13,252   | = inventory **逐文件零差**（92/92 逐字吻合，零在途漂移文件）                                                       |
| HEAD wc        | 13,252   | = live（零在途）                                                                                                   |

**基线候选 21 处全部复现**（grep 实跑与 inventory baseline 逐字吻合）：literalEn **0** + literalZh **0**（**双零批**——全仓库登记批次中继 industrial 后第二、第三个双零包组）+ typeBypass **16**（3d 10 / map 3 / graph 2 / print-renderers 1）+ setTimeout **4**（3d 2[reconnection-manager:41/renderer-test-support:86] + print-core 1[print.ts:47] + print-renderers 1[print-inspector:151]）+ domRaid **1**（print-designer.tsx:96，全六包唯一非测试命中）。keyRemount/pixelNudge/testEnvBranch/silentCatch 四探针全零实跑复核。

oversized 门禁实跑：非测试 2 件全 WARN（`flux-renderers-graph/src/graph-renderer.tsx` 650、`flux-renderers-3d/src/engine/scene-manager.ts` 603），两件**全文读取**（见取证执行记录第 5 步）。scene-manager 603 系 plan 559 抽 `scene-json-assembly.ts` 守 700 行门后、559 后记 tween/关键帧体系删除（731→604，`d475194c8`）的残留位；两件均低于 700 硬门，属登记治理债非本批新红。

## 覆盖声明（Coverage Declaration）

> 本节是台账 modules 行 `pending → audited` 翻转与 `pnpm workaround:reconcile` 结构校验的依据。

| 模块 id              | 文件数 | 非测试行数                                          | 取证完成 | 备注                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------- | ------ | --------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| flux-renderers-3d    | 25     | 2950（inventory）/ 2950（live wc）/ 2950（HEAD wc） | ✅       | 25/25 **全文覆盖读取**（零抽样档）：scene-manager 602（WARN 件）逐行精读 + 引擎八件（pointer-hover/model-loader/hover-highlight/label-sprite/primitive-factory/scene-json-assembly/shadow-setup/three-defaults）+ ai 两件 + binding 三件 + data-source 两件 + renderer 三 hooks + three-canvas + definitions/schemas/index + test-support 两件（mock 死桩坐实见 WA-3d-001）；typeBypass 10 处逐个定性；门禁 6 项实跑；git 考古 4 commit（5569a53a6/850895bdd/d475194c8/afde79407） |
| flux-renderers-graph | 10     | 1402（inventory）/ 1402（live wc）/ 1402（HEAD wc） | ✅       | 10/10 **全文覆盖读取**：graph-renderer 649（WARN 件）逐行精读 + **reactive-render-reads 16 行单列定性（全豁免，见单列节）** + store/layout/search/node/xyflow-canvas/definitions/schemas/index/test-support 全读；typeBypass 2 处豁免（xyflow 泛型边界 + CX-15 夹具）；出生锚 `ec57f4d50`（G1）+ 后续 10 commit 演进链核对                                                                                                                                                         |
| flux-renderers-map   | 11     | 1924（inventory）/ 1924（live wc）/ 1924（HEAD wc） | ✅       | 11/11 **全文覆盖读取**：map-renderer 447 逐行精读 + layer-manager/data/color/ol-loader/definitions/schemas/use-map-geojson/test-support 全读 + ol-fake 262；window 锚 ×2 按 wa-8 #2 判例豁免；c21e2dea9 装载点（map-ol-loader `createLazyLibLoader`）live 复核零复发；IS-5 生产包面复核（map-renderer:325-333 CX-10 event 键契约 live 在案）                                                                                                                                       |
| flux-print-core      | 10     | 1548（inventory）/ 1548（live wc）/ 1548（HEAD wc） | ✅       | 10/10 **全文覆盖读取**：bind 343/layout 379（分页引擎几何切割全链）/render-html 185/schemas 246/validate 114 逐行精读 + print/export-pdf/barcode/unit/index 全读；async 门禁 6 行逐条定性；assertPrintable↔assertExportable 孪生坐实（WA-print-core-001，走读发现、探针 12 行窗外）                                                                                                                                                                                                |
| flux-print-renderers | 11     | 2052（inventory）/ 2052（live wc）/ 2052（HEAD wc） | ✅       | 11/11 **全文覆盖读取**：print-inspector 465/print-designer-canvas 405/print-designer 240 逐行精读 + use-print-editor/domain-adapter/canvas-math/palette/preview/renderer-definitions/schemas/index 全读；perf 门禁双报位点（print-domain-adapter:127）定性；createEmptyTemplate 单源未接坐实（WA-print-renderers-001）；draft coalesce 出生锚 `4c4a5da14`                                                                                                                          |
| flux-code-editor     | 25     | 3376（inventory）/ 3376（live wc）/ 3376（HEAD wc） | ✅       | 25/25 **全文覆盖读取**：code-editor-renderer 483/use-code-mirror 166/use-merge-view 226/use-sql-editor-state 249/extensions/base 249 逐行精读 + colorize/assembly/body/toolbar/snippet/binding/handle/source-resolvers/types/sql-result-panel/variable-panel/expression 四件/sql 两件/index 全读；async 门禁 4 行逐条定性；CM 双 hook 骨架复制坐实（WA-code-editor-001）+ 点路径取值三份手写坐实（WA-code-editor-002）                                                             |

全集 **92/92**。重复块探针双版（存 `_tmp/wa10/dup-probe.mjs` 逐字版：12 行窗 + 熵 ≥3.2 + 可执行行占比 ≥0.5，87 文件 3,724 窗 → **0 原始区域/0 文件对——六包零逐字重复**；`_tmp/wa10/dup-probe-normid.mjs` 标识符归一版：熵 ≥2.6 + >8 份均匀表剔除，6,598 窗 → **11 原始区域/5 文件对**）→ 人工同构复核坐实生产代码 **4 组**（归 WA-code-editor-001/002 + print-inspector 段落对排除 + use-merge-view 对称对排除）+ 走读补充 **2 组**（assert 孪生 → WA-print-core-001；createEmptyTemplate → WA-print-renderers-001）→ 其余探针命中全排除（见误报排除清单）。

### 门禁交叉实跑读数（prompt §5 第 5 步留痕）

| 门禁                                   | 读数                                                                                   | 处置                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check:audit-async-failure-paths`      | **19 行命中**（3d ×7 + code-editor ×4 + print-core ×6 + map ×2，与 plan 基线逐字吻合） | 19 处逐个定性、未批量放行亦未批量立案：**全 19 处均有结构化失败路径或显式契约豁免**（明细见取证执行记录第 3 步）——**0 升级立案**；3 处 watch 微注记（variable-panel:42 clipboard 静默、use-map-geojson:49 cacheKey 降级键、print.ts:47 afterprint 替代面）。                                                                                                                                                                                                                                            |
| `check:audit-runtime-raw-schema-reads` | **0**                                                                                  | 实跑确认（六包 schema 面均走 props 通道 / definition fields 注册 / literal fieldRules 保留位——3d bindings 的 preserve-literal 信封链在案）                                                                                                                                                                                                                                                                                                                                                              |
| `check:audit-reactive-render-reads`    | **16 行命中**——**历批首次点亮**，全部 `flux-renderers-graph/src/graph-renderer.tsx`    | **单列定性节见下**——16/16 全豁免（0 立案）：全部命中位于事件回调/effect/命令式句柄通道，渲染期消费面经 useStore 六选择器订阅，零渲染期 getState 直读。                                                                                                                                                                                                                                                                                                                                                  |
| `check:audit-performance-suspects`     | **2 行命中**——`print-domain-adapter.ts:127` 同 file:line 双报                          | **排除不立案**：`printValuesEquivalent` 的 stringify 相等性回退，:120-122 注释自述为 plan 2026-09-29-4 R2-P20 的修复现场（引用相等快路径在前，引用不等才付 stringify）——B/D 邻域定性：非「stringify 做变更检测」的临时方案，而是**有登记锚的性能修复残余回退**，每次 editor commit 至多付一次 O(n) 序列化、模板元素量为小数据面。watch 微注记：元素规模上千时考虑字段级比较（本行即登记，不允许静默）。双报系门禁对同一行两条规则各记一次（json-stringify-change-detection 计数重复），非两处独立命中。 |
| `check:audit-hardcoded-type-dispatch`  | **0**                                                                                  | 实跑确认（print 元素渲染走 `PRINT_ELEMENT_RENDERERS` 注册表 + `getPrintElementRenderer` 回退 UnknownRenderer；3d 灯光/几何走工厂表 GEOMETRIES/MATERIALS；CM 语言走 createLanguageExtension switch——均为类型→工厂映射表，非硬编码 type 字面量分派红形态）                                                                                                                                                                                                                                                |
| `check:audit-renderer-browser-io`      | **0**                                                                                  | 实跑确认（map 底图瓦片走 OL 内部网络栈非 fetch 红线；print iframe/srcdoc/print() 走浏览器打印协议面；code-editor clipboard 走 navigator API——均不触 fetch/localStorage 红线；六包无 localStorage/sessionStorage 命中）                                                                                                                                                                                                                                                                                  |

### reactive-render-reads 16 行单列定性（本批第一焦点）

**门禁语义**：`scripts/audit/rules.mjs:353-371` 对 `.tsx` 非测试文件做文本级 `store.getState(`/`scope.get(` 等模式扫描（severity high），`filterMatch` 仅剔除注释/字符串位——**无法判定外层函数是否处于渲染期执行路径**，属「渲染敏感文件内的命令式读取」启发式。

**逐处判定**（16/16 全豁免，零立案）：

| 行号 | 外层函数             | 执行通道                                                                                    | 判定            |
| ---- | -------------------- | ------------------------------------------------------------------------------------------- | --------------- |
| :181 | syncSelection        | 事件回调（onNodeClick/onSelectionChange/onPaneClick/cycleAndLocate/focusNodeById）          | 命令通道豁免    |
| :185 | syncSelection        | 同上（写方向 setSelectedNodeId）                                                            | 命令通道豁免    |
| :204 | zoomBy               | useEffectEvent 包装（:376）+ 控制按钮 onClick                                               | 命令通道豁免    |
| :225 | resetViewport        | useEffectEvent 包装（:377）+ invoke('resetView')                                            | 命令通道豁免    |
| :230 | applySearchKeyword   | Input onChange + useEffectEvent（:378）+ invoke('search')                                   | 命令通道豁免    |
| :235 | clearSearch          | Button onClick + useEffectEvent（:379）                                                     | 命令通道豁免    |
| :239 | cycleAndLocate       | handleSearchKeyDown（Enter keydown）                                                        | 命令通道豁免    |
| :244 | cycleAndLocate       | 同上（写方向 advanceMatchIndex）                                                            | 命令通道豁免    |
| :276 | handleViewportChange | xyflow onMove/onMoveEnd 画布回调（经 canvasHandlersRef 镜像 + stable useCallback）          | 命令通道豁免    |
| :280 | handleViewportChange | 同上（受控视口写回，:274-275 等值守卫注释在案——防「prop→onMove→写回」更新风暴的正确性设计） | 命令通道豁免    |
| :343 | layout 同步          | `useEffect`（schema layout prop → store 单向同步，:339-341 值不等才写回注释在案）           | effect 通道豁免 |
| :345 | layout 同步          | 同上（写方向 setLayoutMode）                                                                | effect 通道豁免 |
| :415 | invoke('setLayout')  | ComponentHandle capabilities.invoke——component:\* action 派发期命令式调用                   | 句柄通道豁免    |
| :418 | invoke('setLayout')  | 同上（写方向）                                                                              | 句柄通道豁免    |
| :458 | getDebugData         | ComponentHandle 调试访问器（外部诊断工具拉取式读取）                                        | 句柄通道豁免    |
| :639 | layout toggle        | Button onClick（读取的 `layoutMode` 恰是渲染期已订阅值，store.getState 仅作写入口）         | onClick 豁免    |

**裁决依据三件**：①**真实响应式契约成立**——渲染期消费的全部六项 store 状态（viewport/layoutMode/searchKeyword/matchNodeIds/matchIndex/selectedNodeId）在 :128-133 经 `useStore(store, selector)` 逐一订阅，渲染路径（:157-158、canvasNodes useMemo :479-505、JSX :546-643）零 getState 直读；②16 处 getState 全部位于「事件回调 / effect / 命令式句柄」通道——这正是 Zustand vanilla store 在回调内取最新态的**规范 API**（防闭包陈旧），其中 :283-285 注释自证「最新交互处理函数镜像」机制（xyflow 回调 identity 稳定性契约）；③组件自建 local store（graph-store.ts:37-40 注释：design §7 裁定视口/布局/搜索/选中全 local 不写 scope，flow-designer-core 拆分模式先例）——包内 local store + useStore 订阅是 AGENTS.md「Zustand vanilla stores + use-sync-external-store 订阅」的正型，不触「渲染器禁止直读（全局）store」红线。**watch 微注记（不入立案）**：该门禁对「事件通道内 getState」零免疫，后续渲染器包接入 local-store 模式时预计复发同类命中——建议门禁侧下次迭代吸收「外层函数是否被 render 直接调用」的调用图线索，或在 rules 注记 graph 先例防后续批重复定性成本。

### 取证执行记录（prompt §5 八步逐条）

1. **字面扫描**：`TODO|FIXME|HACK|WORKAROUND|XXX` 非测试 = **0 命中**；`临时|先这样|暂时|绕过|workaround|hotfix` 非测试 = **0 命中**——与 inventory literalEn 0 + literalZh 0 **双零基线逐字吻合**（对照 wa-9 industrial 10 处 literalZh 的说明性注释形态，本批六包连说明性命中都没有）。测试文件仅 `flux-print-core/src/print.test.ts` 一处「临时」字样（测试上下文注释），不属生产面。
2. **模式候选 21 处逐个定性**（grep 复现与 inventory 计数逐字吻合）：typeBypass 16 = **5 处豁免 + 5 处立案沉淀（WA-3d-002）+ 6 处判例排除**（schema-generator:113 SchemaObject 索引签名承接、pointer-hover:49/101 headless 能力探针、graph-node:24 xyflow 泛型边界、test-support ×2 CX-15、map window 锚 ×2 wa-8 #2 判例、print-designer-canvas:209 DragEvent→PointerEvent 换算复用）；setTimeout 4 = 全豁免（timer 注入 + 测试基建 + 打印宿主 escape hatch + 防抖 coalesce，逐条见误报排除清单 #7-#10）；domRaid 1 = 豁免（命令式焦点判例）。
3. **门禁交叉**：上表 6 项实跑。async 19 命中去重 19 处逐个定性——3d 7（use-scene-manager:59 `void loadModels` 的失败路径经 onError 回调通道结构化透出、schema-generator:154 catch→`{ok:false,error}` 判别联合、transform-engine:74 catch→onError('transform-compile-failed')/92 catch→reportOnce 去重回退原值、industrial-adapter:103 catch→reportOnce('socket-message-parse')、use-binding-bridge:117/:130 catch→reportOnce 去重 + continue 逐绑定跳过）；code-editor 4（colorize:49 catch→`{ranges:null,fallback:true}` + `data-colorize-fallback` DOM 锚可观测降级、use-sql-editor-state:215 catch→abort/stale 双守卫后 setSqlResult error 态上屏、linter:18 catch→错误**转正为 lint Diagnostic 输出**即结构化产物本体、variable-panel:42 clipboard catch→静默但注释在案）；print-core 6（barcode:23/:53 catch→空串返回「非法值不抛错」契约注释在案、bind:103/:120 compile/exec 两段 catch→PRINT_BIND_SYNTAX/PRINT_BIND_EVAL 诊断、bind:194 catch→cellErrors 聚合入诊断、layout:350 catch→NaN 汇入 Number.isFinite 过滤）；map 2（map-renderer:71 catch→主题回退色、use-map-geojson:49 catch→序列化降级键）。**0 升级立案**。
4. **重复块识别**：双探针 + 人工同构复核（三个问句逐组裁定）。逐字版 **0 命中**（六包零逐字重复——较 wa-8/wa-9 显著更干净）；归一版 11 区域/5 对 → 坐实 4 组：CM 双 hook Compartment/镜像骨架（→ WA-code-editor-001）、source-resolvers 内部 useResolved\* 四 hook 同构体（→ WA-code-editor-002）、print-inspector barcode/qrcode 段落对（排除——声明式字段面）、use-merge-view :160↔:173 对称对（排除——双编辑器受控同步设计内）。走读补充 2 组：assertPrintable↔assertExportable（探针 12 行窗外，→ WA-print-core-001）、createEmptyTemplate 单源未接（→ WA-print-renderers-001）。
5. **范围结构走读**：**92/92 全文覆盖**（13,252 行，无抽样档）。≥400 行 7 件全读（graph-renderer 649 / scene-manager 602 / code-editor-renderer 483 / print-inspector 465 / map-renderer 447 / print-designer-canvas 405 / map-layer-manager 302）；其余 85 件全文过读 + 信号扫描。分档落字：核心实现（渲染器组件/hooks/引擎类/分页引擎/域适配器/编辑器控制器/扩展装配）逐行精读约 40 件；definitions/schemas/index/test-support/纯声明件全文过读 + 信号扫描（全零）。
6. **已收敛模式复核**：①`createLazyLibLoader`/`createLazyRendererComponent`（`c21e2dea9` 收敛）——3d renderer-definitions.ts:7、graph graph-definitions.ts:6、map map-renderer-definitions.ts:6、code-editor index.ts:9 四个组件级装载点 + map-ol-loader.ts:50 模块级 **live 全部在案，手写 promise 缓存 0 复发**（grep 实跑）；print-core html2canvas/jspdf 走函数内 `await import`（一次性用户触发语义，无需 promise 记忆化）✅；②plan 559 3D 桥接面——tween/关键帧体系已被 559 后记 `d475194c8` **整体删除**（冻结升级为移除，scene-manager 731→604、mock 死桩残留见 WA-3d-001）、SceneJSON ObjectLoader 薄桥 scene-json-assembly.ts live 在案、three-gallery 装载点零复发 ✅；③IS-5（plan 548）map-demo 消费侧收口的生产包面对应——map-renderer.tsx:325-333 事件派发 CX-10 event 键契约 live 在案 ✅；④undo/会话栈——print-renderers 走 editor-core `createEditorCore` 共享单源（policy=auto），无手写 undo 实现 ✅；⑤**WA-content-009 模块顶层副作用教训**——正面复核：六包模块顶层 `t()`/`initFluxI18n`/store 订阅/DOM 探测 **0 命中**（实跑清单仅常量表/CM Compartment 单例/print id 计数器，均为无外部状态写入的惯例形态）✅；⑥isDevRuntime 家族——六包 0 命中（WA-data-003 判例无需扩员）✅。
7. **git 考古**：12 commit 溯源（详见逐条发现）。锚点核验——`ec57f4d50`（G1 graph 包出生）、`fa3c2b623`（print 双包同 commit 出生，assert 孪生即同波落笔）、`25350824d`（E2h merge view）、`b27c9aaf2`（source-resolvers 抽取）、`4c4a5da14`（round-3 designer 批，print-inspector coalesce + R2-P20 同期）、`d59f38f5e`（ux-r3 map window 锚 + 投影修复）、`5569a53a6`/`850895bdd`（3d 引擎与协议适配器 WIP 出生）、`d475194c8`/`afde79407`（559 后记删除与 559 本体）。**症状性 message 专项**：抽检六包最近 commit 22 条（含 d475194c8/afde79407/cb05858b0/4b117a864/d59f38f5e/ed9cbf8af/5a0dcc401/4c4a5da14/3bcace223/8c5ca8ffd/52b4e610f/0c85b2de8 等），全部带 plan 引用/根因链/full-green 标记，**症状性 message 0**。
8. **误报排除复核**：24 项全记录（§误报排除清单）；与 wa-7/wa-8/wa-9 判例互通（window 诊断锚 wa-8 #2、命令式焦点 wa-7 #9、声明表格化 wa-7 #22、test-support 归 CX-15、headless 能力探针 wa-8 leafer 判例、双份稳定重复不立案）。

## 逐条发现（Findings）

> 每条按 prompt §6 单条模板；全量登记归主会话写入 `docs/audits/workaround-code-smell/ledger.md`（ID `WA-<pkg短名>-<seq>`），本节与台账一一对应，零静默。
> ID 编排说明：立案清单以包分组、严重度排序编号（**P3 ×6；零 P0/P1/P2**）。graph/map 两包零立案（候选全豁免，见覆盖声明与误报排除清单）。

### [类别I邻] 3D 测试替身死桩：SceneManager mock 残留 559 后记已删除的 registerClips/startClip 方法（WA-3d-001）

- **位置**: `packages/flux-renderers-3d/src/test-support/scene-manager-mock.ts:41-42`（`registerClips = vi.fn(); startClip = vi.fn();`）+ `packages/flux-renderers-3d/src/renderer/three-canvas-lifecycle-ui.test.tsx:22-23`（partial mock 同名两桩）
- **严重度**: P3
- **现状**: 引擎测试替身与一处内联 partial mock 仍暴露 `registerClips`/`startClip` 两个方法桩，而真实 `SceneManager` 已无此二者
- **按住的根因**: plan 559 后记（2026-10-10 用户裁定「不用的部分删除」，`d475194c8`）将自研 tween/关键帧动画体系整体删除——删除波次触达 engine/schemas/renderer-definitions/demo/文档六面，**测试替身面未纳入清扫范围**（`git grep registerClips packages/flux-renderers-3d/src/engine/` = 0 命中，mock 侧 4 行残留）
- **考古**: mock 两桩随 559 后记删除前的动画体系出生；`d475194c8` 删除本体时未扫 `test-support/`
- **违约基准**: W2 弱（559 后记删除记录在案但范围缺口未登记）、W5（两桩零消费——`grep` 全包测试无任何用例驱动 `mock.registerClips()`，纯化石特征）
- **为什么是临时方案**: 症状消失（真实引擎面已删、测试全绿）✅；根因仍在（替身契约面与真实引擎面漂移——后续若有测试经 mock 断言 clip 能力将**假绿**：mock 有而真身无，违背测试替身契约诚实性）✅；出口缺失（删除波次的范围缺口无登记）✅——三要素成立
- **风险**: ①替身面宽于真实面是「测试在测 Mock 回声」的温床（§2G）；②后续 SCADA/3D 波次的贡献者会被误导以为 clip 能力仍存在
- **重构方向**: 删 mock 两行 + three-canvas-lifecycle-ui.test.tsx partial mock 两行（机械删除，零行为变更）。回归 = 3d 包测试套件直通
- **ROI 裁定**: 批内修（2+2 行机械删除）
- **误报排除复核**: 非测试基建演进中的合理兼容层——真实引擎没有「渐进删除」窗口（同 commit 内本体已消失），替身残留无任何过渡价值

### [类别D] scene-manager 类型断言清理家族：3 处冗余 domElement 双跳 cast + controls Record 宽化 seam + dispose 链 removeChild cast（WA-3d-002）

- **位置**: ①`packages/flux-renderers-3d/src/engine/scene-manager.ts:164`、`:196`、`:198`（`renderer.domElement as unknown as HTMLElement` ×3——three `WebGLRenderer.domElement` 静态类型即 `HTMLCanvasElement`，本就可直接赋给 `HTMLElement`，双跳断言纯冗余）；②`:208`（`this.controls as unknown as Record<string, unknown>`——`ControlsFactory` 返回类型钉窄为 `Pick<OrbitControls,'update'|'dispose'>`，applyControlsConfig 需写 6 个配置字段只能宽化）；③`:594`（`domElement as unknown as { parentNode?: { removeChild... } }`——够到 `removeChild` 的结构性 cast）
- **严重度**: P3（零行为风险——纯类型面；但 ① 是「类型系统没报警、断言白写」的噪声，② 是可收窄而不收窄的 seam）
- **信号类别**: D（type-system bypass 的包内主 family；对照 wa-9 WA-industrial-003 46 处 cast 家族判例的同型小案）
- **按住的根因**: ①三处疑为 headless-stub 时代防御书写的残留（同文件 :154-155/:160-161/:165-166 的 stub 守卫均**有注释且是运行时能力探针**，①三处则无运行时作用）；②`SceneManagerOptions.controlsFactory`（:51）为测试注入把返回类型钉在最小接口上，559 Phase 2 的 `camera.controls` schema 可配面（:205-215）到来时没有同步放宽结构类型，于是 schema 驱动路径整体 cast
- **考古**: ①随 `5569a53a6`（I2.1 引擎实现）出生；②seam 于 559 Phase 2（`afde79407`）引入 controls 配置时落笔
- **违约基准**: W3（同一 seam 的裁定一次即可消除 5 处断言）、W6 弱（:594 的结构 cast 无法被领域语义解释——`Element.remove()` 即现代等价物）
- **为什么是临时方案**: 症状消失（typecheck 通过、运行正确）✅；根因仍在（ControlsLike 结构类型未建，新增 controls 配置字段时 :208 邻域继续宽化）✅；出口缺失（无类型收窄登记）✅
- **风险**: 每新增一个 OrbitControls 可配字段就再写一行宽化写入；冗余断言误导读者以为 domElement 类型有缺口（实际没有）
- **重构方向**: ①删 3 处 `as unknown as HTMLElement`（直接传 `renderer.domElement`）；②定义 `type ControlsLike = Pick<OrbitControls,'update'|'dispose'> & Partial<Pick<OrbitControls,'autoRotate'|'autoRotateSpeed'|'minDistance'|'maxDistance'|'maxPolarAngle'|'enablePan'>>`，applyControlsConfig 免 cast；③:594 改与 ：164 同型的 `as HTMLElement` + `el.remove()`（ChildNode 接口，headless stub 侧按既有降级族补 `typeof el.remove === 'function'` 守卫）。回归 = 3d 包套件直通 + typecheck，零行为变更
- **ROI 裁定**: 批内修（机械类型收窄；验收判据 `grep -c "as unknown as" scene-manager.ts` 10→5，剩余 5 处为 headless 能力探针豁免保留）
- **误报排除复核**: 与 wa-8 leafer 第三方类型缺口判例不同——three 的 domElement/controls 字段**有完整具名类型**，属「可收窄而不收窄」；headless 能力探针 5 处（:49/:101 pointer-hover、:154-155/:160-161/:165-166 scene-manager）按 wa-8 #3 判例豁免不在本案

### [类别H] print 校验闸门孪生：assertPrintable ↔ assertExportable 9 行逐字同 + PRINT_VALIDATION_BLOCKED 消息模板 ×2（WA-print-core-001）

- **位置**: `packages/flux-print-core/src/print.ts:12-20`（assertPrintable）↔ `packages/flux-print-core/src/export-pdf.ts:12-20`（assertExportable）——过滤 error 级诊断 + 抛 `[flux-print-core] PRINT_VALIDATION_BLOCKED: 模板存在 N 个 error 级诊断（codes）` 逐字同（仅函数名异）
- **严重度**: P3（双份、9 行、出生同波、零漂移；P1 起评按「两份稳定小件」降档并显式记录）
- **信号类别**: H（复制粘贴式增长——同一校验闸门两份手写）
- **按住的根因**: design.md §10 打印前校验闸门（error 级诊断阻断打印/导出）没有单份实现——两个出口（浏览器打印 P3.2 / PDF 导出 P3.3）各自内联
- **考古**: 两件同 commit 出生 `fa3c2b623`（print 双包 P1/P3/P5 首波）
- **违约基准**: W3（闸门语义或文案修改需双处同步——消息模板已逐字同即同步修税在案）
- **重构方向**: `validate.ts` 提取 `assertNoErrorDiagnostics(template, action: 'print' | 'export')` 单份（message 模板单源），print/export-pdf 改调用。回归 = print.test/export-pdf.test 既有 PRINT_VALIDATION_BLOCKED 断言直通
- **ROI 裁定**: 批内修（行为保持提取，同包内依赖方向零变更）
- **误报排除复核**: 非概念级重复（同名同签名逐字代码块，消息模板含同一中文串）；非「各自独立演化的巧合相似」——同一 design 契约（§10 闸门）的两个出口

### [类别H] 打印设计器空模板工厂单源未接：use-print-editor createEmptyTemplate 内联复制 flux-print-core createEmptyPrintTemplate（WA-print-renderers-001）

- **位置**: `packages/flux-print-renderers/src/editor/use-print-editor.ts:228-239`（createEmptyTemplate，EMPTY_SNAPSHOT :213-226 消费）↔ 单源 `packages/flux-print-core/src/schemas.ts:238-246`（createEmptyPrintTemplate + DEFAULT_PRINT_PAGE :27-36）
- **严重度**: P3（双份 ~12 行；依赖方向已就绪——use-print-editor.ts:3 本就从 flux-print-core 导入）
- **信号类别**: H（复制粘贴式增长的「单源已建而位点未接」形态——同 wa-8 WA-dashboard-001 / wa-9 WA-industrial-001 判例族）
- **按住的根因**: 打印模板空文档工厂在 flux-print-core 已单源化（含 DEFAULT_PRINT_PAGE 常量表），设计器会话层置 EMPTY_SNAPSHOT（controller 为 null 的守卫快照）时未调用单源，而是内联重写了同一组字面值（a4 210×297、margins [15,15,15,15]）
- **考古**: 两件同 commit 出生 `fa3c2b623`（core 先建、renderer 内联未接，出生即分叉）
- **违约基准**: W3（默认纸张/页边距演进需双处同步——单源改 DEFAULT_PRINT_PAGE 不会传播到设计器守卫快照）
- **为什么是临时方案**: 症状消失（守卫快照值正确）✅；根因仍在（空模板默认值双源）✅；出口缺失（无回接登记）✅——三要素成立；**字段级分叉在案**：单源版带 `paperName: 'a4'`，内联版缺该字段（出生即不一致，非事后漂移）
- **风险**: 打印默认纸张演进（如新增出血边距）时设计器守卫路径静默保留旧值；「已单源化」的错觉
- **重构方向**: createEmptyTemplate 删除，EMPTY_SNAPSHOT 改 `createEmptyPrintTemplate('')`（paperName 字段随单源补齐——仅影响 null-controller 守卫路径，无消费方断言该字段缺失，需在回归中核对 print-designer 套件）。回归 = print-renderers 包测试直通
- **ROI 裁定**: 批内修（机械回接；paperName 补齐属单向收敛非行为回归）
- **误报排除复核**: 非声明表格化（含行为函数）；非两份独立域语义——同一「空打印模板」概念的两大消费方

### [类别H] CodeMirror 双 hook 平行骨架：Compartment 四联 + 回调 latest-ref 镜像 + reconfigure effect 家族两份手写（WA-code-editor-001）

- **位置**: `packages/flux-code-editor/src/use-code-mirror.ts:26-29`（Compartment 四联模块级单例）↔ `use-merge-view.ts:27-30`（**逐字同**四联）+ `use-code-mirror.ts:71-81` ↔ `use-merge-view.ts:97-107`（optionsRef/onChangeRef/onFocusRef/onBlurRef 镜像 quartet 同构 ~10 行）+ 两文件的 readOnly/extensions/placeholder/contentAttributes 四对 reconfigure effect（单点 dispatch ↔ a/b 双点 dispatch，结构骨架同型）
- **严重度**: P3（双份 ~50 行同根因骨架、零漂移；真实差异仅在 dispatch 单点 vs a/b 双点——MergeView 的 a/b 是设计内对称；P2 线「活跃修改期」经「姊妹件同波设计非无意识抄写」裁定降档）
- **信号类别**: H（同波设计的平行生长沉积）
- **按住的根因**: CM6 外桥的「Compartment 集合 + 回调新鲜度镜像 + 受控 reconfigure」基础设施无包内 single home；第三个编辑器形态（如 preview-only/diff-3way）出现即是第三份抄写点
- **考古**: use-code-mirror 出生 `423a95131`；use-merge-view 出生 `25350824d`（E2h diff 批）——merge view 落笔时镜像了既有 hook 骨架
- **违约基准**: W3（Compartment 语义调整/新增 compartment[如 theme compartment] 需两文件同步）
- **重构方向**: 提取 `src/shared/editor-compartments.ts`：`createEditorCompartments()`（四联单源）+ `useLatestCallbacks(options)`（镜像 quartet 单源）+ `reconfigureAll(view | {a,b}, compartments, options)` 帮手；两 hook 改薄壳。回归 = code-editor 包 use-merge-view.test/code-editor-handles/integration 套件直通
- **ROI 裁定**: 批内修（行为保持提取；code-editor 96 commit 活跃包，第三个形态出现前收口最划算）
- **误报排除复核**: Compartment 模块级单例本体是 CM 惯例（无状态再配置令牌）不立案——立案维度仅「同一套四联+镜像+effect 骨架维护两份」；两 hook 的创建/dispose 生命周期差异（单 EditorView vs MergeView a/b）为真实语义不强行合并

### [类别H] 点路径取值原语三份手写：bind.resolveDataPath + source-resolvers.getDataAtPath + use-sql-editor-state 内联 walk（WA-code-editor-002）

- **位置**: ①`packages/flux-print-core/src/bind.ts:51-57` resolveDataPath（**字面键优先**语义：`path in scope` 先命中再点分下钻）；②`packages/flux-code-editor/src/source-resolvers.ts:17-26` getDataAtPath（纯点分下钻）；③`packages/flux-code-editor/src/code-editor-renderer/use-sql-editor-state.ts:48-55`（内联点分下钻，**与同包 ② 同语义**）——而共享原语 `getIn` 已存在于 `@nop-chaos/flux-core`（同包 use-code-editor-binding.ts:8 即其消费方）
- **严重度**: P3（合并登记防台账碎片化；同根因——「点路径取值」，各自 ~8 行）
- **信号类别**: H（微复制沉积——同一基础设施多处手写，§2H 已坐实案例同族）
- **按住的根因**: 点路径取值无统一 home：flux-core `getIn` 在案但三处未接；③ 与 ② 同包同语义纯冗余
- **考古**: ①随 `fa3c2b623` print 首波；②随 `b27c9aaf2`（source-resolvers 抽取批）；③随 SQL execution 波次
- **违约基准**: W3（路径语义修 bug——如数组索引段支持——需三处同步）
- **重构方向**: ③改调同包 ② getDataAtPath（零语义差，机械收敛）；① 的字面键优先语义是 print scope 扁平键契约（`${a.b}` 可命中字面键 `'a.b'`），保留但函数注释显式声明与 getIn 的语义差；② 与 flux-core getIn 的合并属跨包裁定，挂账观察。回归 = print-core bind 套件 + code-editor sql 套件直通
- **ROI 裁定**: ③ 批内修；①② 挂账观察（本行即登记，不允许静默）
- **误报排除复核**: 三份各有真实语义变体（字面键优先/schema 值守卫/纯下钻），不做强行三合一——按 §3「不提取是合法裁定」仅收敛同包同语义对

## 汇总

### 1. 转正清单（W2 违约项，按风险排序）

| 发现 ID                | 位置                                            | 出生时间（git 考古）                   | 风险                                                  | 处置       |
| ---------------------- | ----------------------------------------------- | -------------------------------------- | ----------------------------------------------------- | ---------- |
| WA-3d-001              | scene-manager-mock registerClips/startClip 死桩 | 残留自 `d475194c8`（559 后记）删除缺口 | 替身契约漂移，clip 能力断言假绿温床                   | 批内修     |
| WA-print-renderers-001 | use-print-editor createEmptyTemplate 内联       | `fa3c2b623`（print 首波，出生即分叉）  | 默认纸张演进双源不传播；paperName 字段已分叉          | 批内修     |
| WA-print-core-001      | assert 孪生 + 消息模板 ×2                       | `fa3c2b623`（print 首波）              | 闸门文案/语义双处同步税                               | 批内修     |
| WA-3d-002              | scene-manager 类型断言家族 ×5                   | `5569a53a6` / 559 Phase 2              | controls 每新增字段 +1 行宽化；冗余断言误导类型面认知 | 批内修     |
| WA-code-editor-001     | CM 双 hook 骨架 ×2                              | `423a95131` / `25350824d`              | 第三个编辑器形态出现即第三份抄写                      | 批内修     |
| WA-code-editor-002     | 点路径取值 ×3                                   | 各波次                                 | 路径语义修 bug 三处同步                               | 部分批内修 |

**无出口的转正临时方案为零**——六项立案全部是沉积/复制形态（H/D/I 邻），没有「按住未修问题且无出口」的转正件；literalEn/literalZh 双零 + 症状性 message 0 佐证。

### 2. 重复代码热区（按总冗余行数排序）

| 组  | 份数 | 各份位置                                                               | 冗余行数 | 漂移证据                                  | 裁定（三问句）                         |
| --- | ---- | ---------------------------------------------------------------------- | -------- | ----------------------------------------- | -------------------------------------- |
| 1   | 2    | CM 双 hook Compartment/镜像/reconfigure 骨架（WA-code-editor-001）     | ~50      | 无（逐字/同构，单/双点差异为设计内）      | 同根因✅ 提取干净✅ → P3 批内修        |
| 2   | 2    | assertPrintable↔assertExportable（WA-print-core-001）                  | ~9       | 无（逐字同含消息模板）                    | 同根因✅ 稳定 → P3 批内修              |
| 3   | 2    | createEmptyTemplate↔createEmptyPrintTemplate（WA-print-renderers-001） | ~12      | **paperName 字段出生即分叉**              | 同根因✅ 单源已在依赖包 → P3 批内修    |
| 4   | 3    | 点路径取值（WA-code-editor-002）                                       | ~25      | 语义三变体（字面键优先/值守卫/纯下钻）    | 同根因✅ 强合不干净 → 同包对收敛余观察 |
| 5   | 4    | source-resolvers useResolved\* 同构体（归 WA-code-editor-002 邻）      | ~40      | 无（同构体，sanitize/predicate 参数不同） | 同根因✅ → 归 002 同车观察             |
| 6   | 2    | print-inspector barcode/qrcode 段落（排除）                            | ~14      | 字段集即语义                              | 声明式字段面 → 排除（wa-7 #22 判例）   |
| 7   | 2    | use-merge-view :160↔:173 对称同步 effect（排除）                       | ~13      | a/b 读侧写侧对称                          | 设计内对称 → 排除                      |

### 3. Top 重构建议（默认 3 项）

1. **print 域单源双回接（WA-print-core-001 + WA-print-renderers-001 同车）**：根因修复点 = `validate.ts` 提取 `assertNoErrorDiagnostics` + print-renderers 改引 `createEmptyPrintTemplate`；预期删除本体 = assert 孪生 9 行 ×2 + createEmptyTemplate 12 行；回归 = print-core/print-renderers 两包既有套件直通（PRINT_VALIDATION_BLOCKED 断言 + designer 套件）；影响面 = 3 文件，零公共导出变更（assert 为模块内私有）。
2. **3D 类型面与替身面清扫（WA-3d-001 + WA-3d-002 同车）**：根因修复点 = ControlsLike 结构类型 + 删冗余断言 ×3 + :594 改 `remove()`；预期删除本体 = mock 死桩 2+2 行 + 断言 5 处；回归 = 3d 包 200 用例直通 + typecheck；影响面 = 3 文件类型面 + 2 文件替身面，零运行时行为变更。
3. **code-editor 编辑器骨架单源（WA-code-editor-001 + WA-code-editor-002 同车）**：根因修复点 = `shared/editor-compartments.ts`（四联 + 镜像 + reconfigure 帮手）+ use-sql-editor-state 改调 getDataAtPath；预期删除本体 = 双 hook 平行骨架 ~50 行 + 内联 walk 8 行；回归 = code-editor 包套件直通（含 merge-view/handles/integration 三套）；影响面 = 包内 4 文件，`index.ts` 公共导出面零变更（新 shared 件包内私有）。

### 4. 误报排除清单（24 项）

| #   | 疑似点                                                       | 位置                                                           | 排除理由                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | reactive-render-read 16 行                                   | graph-renderer.tsx（16 处）                                    | 见单列定性节：16/16 命令/effect/句柄通道，渲染面 useStore 六选择器全订阅；local store + useStore 为 AGENTS.md 正型                                                                                                                                       |
| 2   | 3d typeBypass——SchemaObject 索引签名承接                     | ai/schema-generator.ts:113                                     | 平台判例（schemas.ts:25 注释自证「结构化 prop 按平台索引签名约束以 `& SchemaObject` 承载，scada config 字段同法」）：builder 输出受控（同文件数行前构造），断言仅补索引签名非销毁真实报警                                                                |
| 3   | 3d typeBypass——headless 能力探针 ×2                          | engine/pointer-hover.ts:49/:101                                | wa-8 #3 leafer/stub 判例同族：测试替身 DOM 缺方法时 `typeof === 'function'` 探针 + `?.()` + 回退值，`:53` 显式守卫在案；类型收窄即防御本体                                                                                                               |
| 4   | 3d typeBypass——headless stub 守卫                            | engine/scene-manager.ts:154-155                                | 注释在案（「headless stub 无 setter 时跳过」）：toneMapping 能力探测与 ：160-161 setPixelRatio/:165-166 setAttribute 同一降级族，正确防御非掩盖                                                                                                          |
| 5   | 3d setTimeout——重连定时器                                    | data-source/reconnection-manager.ts:41                         | §2C 误报排除双命中：timer 注入是标准可测性设计（config.timer ?? setTimeout）；退避本身有协议依据（baseDelay×2^n ±25% 抖动 + clamp + give-up 上限，design-protocol §3 注释在案）                                                                          |
| 6   | 3d setTimeout——测试基建                                      | test-support/renderer-test-support.tsx:86                      | flushMicrotasks 宏任务冲刷 = 测试基建标准件（CX-15 族测试支撑，非生产时序贿赂）                                                                                                                                                                          |
| 7   | print-core setTimeout——打印 iframe 清理延迟                  | print.ts:47                                                    | 浏览器打印协议无「打印完成」信号（afterprint 事件 Safari 不可靠）；iframe 须存活至打印作业落池，cleanupDelayMs 可配（默认 1000）+ 注释在案——宿主集成边界 escape hatch。watch 微注记：可补 afterprint 优先 + 超时兜底双通道                               |
| 8   | print-renderers setTimeout——inspector 草稿合并窗口           | print-inspector.tsx:151                                        | 300ms coalesce 是「一串击键 = 一个 undo 步」的防抖设计（:115-119 注释：mirroring the flow designer inspector；unmount flush + draft-merged 显示 + selection-switch 定时器落自家 target 三重守卫在案）——非等待外部就绪，出生 `4c4a5da14`                  |
| 9   | print-renderers domRaid——诊断定位                            | print-designer.tsx:96                                          | wa-7 #9 命令式焦点判例：validate 诊断点击 → setSelection + querySelector(CSS.escape) + scrollIntoView + focus 是焦点管理合法面（无 DOM 数据流绕过、无样式直写）                                                                                          |
| 10  | print-renderers typeBypass——DropEvent 换算                   | print-designer-canvas.tsx:209                                  | `event as unknown as React.PointerEvent` 复用 paperPointFromEvent 几何换算：DragEvent 与 PointerEvent 共享 clientX/Y 面，边界单次窄化 + 同 handler 语义，非契约破坏                                                                                      |
| 11  | graph typeBypass——xyflow 节点数据边界                        | graph-node.tsx:24                                              | 第三方泛型擦除边界（xyflow Node data 流转经内部 Record 化）；GraphNodeViewData 与下发结构同文件互证（graph-renderer:494-502 构造），一次性边界断言合理用法                                                                                               |
| 12  | graph/map typeBypass——测试夹具                               | graph test-support.ts:34 / map test-support.ts:34              | CX-15 族测试支撑（createMockRendererProps 跨包副本族）；**本批扩围登记**：graph/map 两位点入 CX-15（drift 证据：graph 版 `node: {}` 无 scope、map 版带 mock scope——graph-renderer:176 消费 props.node.scope，graph 夹具事件派发场景 scope 为 undefined） |
| 13  | map typeBypass——window 诊断锚 ×2                             | map-renderer.tsx:81/:88                                        | wa-8 #2 判例直引：`__flux_map_<id>` 为 pivot `__flux_pivot_<id>` 先例的 id 化变体（:76 注释自证），e2e/自动化程序化断言契约面 + clearExposedMapInstance 清理对称在案                                                                                     |
| 14  | map async——cacheKey 序列化降级                               | use-map-geojson.ts:49                                          | schema action 恒为可序列化编译产物（stringify 实际不可达）；降级键仅在假想循环结构下触发。watch 微注记：降级键 `String(obj)` 恒 "[object Object]" 会合并缓存键——可达时改 structuredHash                                                                  |
| 15  | map async——主题色解析 catch                                  | map-renderer.tsx:71                                            | getComputedStyle 环境边界（SSR/异构宿主）+ 回退主题常量可观测（色面恒有值）；ux-r3 RC-3 修复链（resolveTokenColor :40-62）注释自证来源                                                                                                                   |
| 16  | code-editor async——clipboard 静默                            | variable-panel.tsx:42                                          | 权限/宿主边界 best-effort UX 通道，失败不产生数据完整性影响；注释在案。watch 微注记：可接 ui 包 toast 反馈失败（Toaster 在案）                                                                                                                           |
| 17  | code-editor async——linter/colorize/sql-state 三处            | linter.ts:18 / colorize.tsx:49 / use-sql-editor-state.ts:215   | 分别为：错误转正为 lint Diagnostic 本体、fallback 布尔 + DOM 锚可观测降级、abort/stale 守卫后错误态上屏——全部结构化失败路径                                                                                                                              |
| 18  | print-core async——barcode/qrcode 空串降级 + bind/layout 五处 | barcode.ts:23/:53、bind.ts:103/:120/:194、layout.ts:350        | 「非法值返回空串不抛错」为渲染管线 fail-soft 契约（注释在案，打印面崩溃代价高于空框）；bind 五处全部走 PRINT*BIND*\* 诊断聚合通道（:224 同元素去重注释在案）；layout:350 的 catch 不可达（纯属性导航）且 NaN 汇入值域过滤                                |
| 19  | perf 双报——stringify 相等性回退                              | print-domain-adapter.ts:127                                    | R2-P20 修复现场（:120-122 注释）：引用相等快路径在前、回退仅引用不等时付费；watch 微注记：千级元素时考虑字段级比较（本行即登记）                                                                                                                         |
| 20  | code-editor——SQL 执行缺省端点                                | use-sql-editor-state.ts:197                                    | `/api/report/execSql` 缺省约定源自归档 plan 22（SQL 增强 demo 契约），schema 面经 `sqlConfig.execution.executeAction` 可覆写。watch 微注记：建议 propContract description 载明缺省端点约定或收紧必填（docs-only）                                        |
| 21  | 3d——label-sprite 哨兵导出                                    | engine/label-sprite.ts:56                                      | `__labelSpriteCanvasPathIgnored` 零消费方，但已登记 `scripts/baselines/knip-baseline.json:107`（v8 ignore 段锚点，plan 465 Phase 5 覆盖率政策）——已在台账的死代码不重复立案。watch 微注记：随 3d 下次触碰裁撤                                            |
| 22  | graph——asReactNode 裸 cast                                   | graph-renderer.tsx:45-47                                       | 单份 3 行；wa-8 008③ 已收敛 industrial 侧为 `?? null` 版——现全仓 2 个包级位点。watch 跨包微注记：第三包位点出现时提取共享（flux-react 层）                                                                                                               |
| 23  | map——geojsonName 静默二值化                                  | map-renderer.tsx:132-133                                       | 与 map-renderer-definitions validateMapSchema 的 dev warning（falling back to china-provinces）配对 = 编译期告警 + 运行期收敛的双层契约，非静默特判                                                                                                      |
| 24  | 六包 module-top 状态                                         | CM Compartment 单例 ×2 / print elementSeq / 常量表 / 静态 JSON | WA-content-009 家族正面复核零复发：无 t()/initFluxI18n/store 订阅/DOM 探测；Compartment 为 CM 无状态令牌惯例、id 计数器有 seed（review D07-02）+ reset 测试注入、静态 JSON 为数据资产                                                                    |

（另两条微注记不入表：①print.ts:47 afterprint 双通道化建议——见 #7；②use-print-editor EMPTY_SNAPSHOT 内联 page 对象在 001 回接后随单源获得 paperName，回归时核对 print-designer 套件无该字段缺失断言。）

### 5. 范围整体判断

**不是系统性临时方案文化——本批是全仓库登记批次中「临时方案信号面」最干净的批次之一，问题形态是「同波姊妹件的平行生长沉积 + 删除波的替身面缺口」，而非「按住问题的特判/兜底」。** 正面证据七件：①literalEn **0** + literalZh **0** 双零批（连说明性注释命中都没有）；②逐字重复探针 **0 命中**（wa-8 17 候选区、wa-9 18 原始区域对照下，六包 3,724 窗零逐字重复——复制粘贴式增长在这个代码面上基本未发生）；③async 门禁 19 命中**零静默**——全部走诊断聚合/错误态上屏/判别联合/可观测降级，失败观测面与 wa-9 industrial 同梯队；④两大横切收敛面 live 复核零复发：懒加载统一机制（c21e2dea9 四装载点 + createLazyLibLoader）与 WA-content-009 模块顶层副作用纪律；⑤reactive 门禁历批首次点亮的 16 行经逐处定性**全为契约内命令通道**（graph local-store + useStore 订阅是教科书式 Zustand 用法），零渲染期越界；⑥症状性 commit message 0（抽检 22 条全带 plan 引用与根因链）；⑦六包各自有 owner design 文档且代码注释密度与裁定引用（design § / review D 编号 / plan 锚）显著高于均值。问题集中在三处：**「同波姊妹件不共享骨架」**（CM 双 hook、print 双出口闸门——都是同一 commit 内落笔的两份，说明作者当时没有「先建 home 再填两格」的习惯）、**「单源已建而位点未接」**（createEmptyTemplate、点路径 getIn——共享件都在，接线没做完）、**「删除波不扫测试替身」**（559 后记 mock 死桩）。整体判断：零星个案级，无需 roadmap 层面对策；六个批内修项预期合计删除约 110 行冗余 + 5 处断言 + 4 行死桩，且全部有同批或先行批判例证明修法成熟。建议后续渲染器包接入 local-store 模式时，把 graph-reactive 定性节作为门禁豁免先例引用，避免每批重复 16 行级的人工定性成本。

## 批内修复候选清单（供 Phase 2 执行会话）

| 发现 ID                | 严重度 | 建议去向         | 修复要点                                                                                                                                                             | 约束                                                                                                               |
| ---------------------- | ------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| WA-3d-001              | P3     | 批内修           | 删 scene-manager-mock.ts:41-42 两桩 + three-canvas-lifecycle-ui.test.tsx:22-23 两桩                                                                                  | 纯删除零行为变更；3d 套件直通；`grep -rn "registerClips\|startClip" packages/flux-renderers-3d/src` = 0 为验收判据 |
| WA-3d-002              | P3     | 批内修           | 删 :164/:196/:198 冗余断言 ×3；ControlsLike 结构类型收窄 :208；:594 改 HTMLElement 断言 + `remove()`（补 stub 能力守卫）                                             | typecheck 直通零行为变更；`grep -c "as unknown as" scene-manager.ts` 10→5（余 5 处 headless 探针豁免）             |
| WA-print-core-001      | P3     | 批内修           | validate.ts 提取 `assertNoErrorDiagnostics(template, action)`；print.ts/export-pdf.ts 改调用                                                                         | PRINT_VALIDATION_BLOCKED 既有断言直通；消息文案逐字保持                                                            |
| WA-print-renderers-001 | P3     | 批内修           | use-print-editor 删 createEmptyTemplate，EMPTY_SNAPSHOT 改 `createEmptyPrintTemplate('')`                                                                            | paperName 字段随单源补齐（守卫路径单向收敛）；print-renderers 套件直通                                             |
| WA-code-editor-001     | P3     | 批内修           | 提取 `shared/editor-compartments.ts`（四联 + useLatestCallbacks + reconfigureAll）；双 hook 改薄壳                                                                   | code-editor 套件直通；`index.ts` 公共导出面零变更（`git diff --exit-code` 判据）                                   |
| WA-code-editor-002     | P3     | ③批内修 + 余观察 | use-sql-editor-state 内联 walk 改调 source-resolvers `getDataAtPath`；bind.resolveDataPath 字面键优先语义补显式注释；与 flux-core getIn 的合并挂账观察（本行即登记） | print bind 套件 + code-editor sql 套件直通                                                                         |
| reactive 门禁 watch    | —      | watch-only       | graph local-store 先例注记入 rules 或门禁文档（防后续批重复定性）；print-domain-adapter stringify 千级阈值观察项（本报告 #19 即登记）                                | docs-only；不触生产代码                                                                                            |
| CX-15 扩围             | —      | 归 CX-15         | createMockRendererProps 跨包副本 +2（graph test-support.ts / map test-support.ts）；drift 证据：graph 版缺 node.scope                                                | 归 CX-15 拟制批次统一收敛，本批不单独修                                                                            |

## 批内修复记录（Auto-Remediation）

| 发现 ID                | 落地                                                                                                                                                                                                                                                                                                                         | 验证                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| WA-3d-001              | scene-manager-mock.ts + three-canvas-lifecycle-ui.test.tsx 各删 registerClips/startClip 双桩                                                                                                                                                                                                                                 | 3d 套件直通；`grep registerClips\|startClip packages/flux-renderers-3d/src` = 0 |
| WA-3d-002              | :164/:196/:198 三处 domElement 双跳 cast 直接删除（HTMLCanvasElement 本就是 HTMLElement）；:208 写缝单层化（`as Record<string, unknown>`）；:594 结构 cast 改 HTMLElement 断言 + parentNode.removeChild（**stub 契约保持**——headless 桩 mock 的是 parentNode.removeChild 而非 Element.remove，报告原 remove() 建议按此修正） | `as unknown as` scene-manager.ts 10→2（余为 headless 探针豁免）；3d 200/200     |
| WA-print-core-001      | validate.ts 提取 `assertNoErrorDiagnostics(template, validate)`；print.ts/export-pdf.ts 改调用（本地孪生删除）                                                                                                                                                                                                               | PRINT_VALIDATION_BLOCKED 既有断言直通（83/83）；消息文案逐字保持                |
| WA-print-renderers-001 | use-print-editor 删内联 createEmptyTemplate；EMPTY_SNAPSHOT 改 `createEmptyPrintTemplate('')`（name='' 语义保持；paperName 字段随单源补齐）                                                                                                                                                                                  | print-renderers 78/78                                                           |
| WA-code-editor-001     | 新建 `shared/editor-compartments.ts`（quartet 工厂 + 四个 reconfigure builder + initialCompartmentExtensions + editorUpdateListener 共享监听）；use-code-mirror/use-merge-view 改薄壳（merge-view 保留 ariaLabel 合并初装配与双 pane dispatch 形态）                                                                         | code-editor 104/104；index.ts 零公共导出变更                                    |
| WA-code-editor-002     | ③ use-sql-editor-state 两处内联 walk（value. 前缀/resultPath）改调 source-resolvers `getDataAtPath`（export 打开）；bind.resolveDataPath 字面键优先语义注释 + 与 flux-core getIn 合并挂账（本行即登记）                                                                                                                      | code-editor 104/104                                                             |

### 批内修复补充记录（门禁）

- 四包 filter：typecheck/build OK、lint **0 error**、test 3d **200/200**（修正 dispose stub 契约后）/print-core **83/83**/print-renderers **78/78**/code-editor **104/104**；跨包哨兵 flux-renderers-ai **850/850**。
- 执行期尾修：print-core 两文件未用 validatePrintTemplate 导入；3d dispose 路径报告建议的 remove() 与 headless 桩契约冲突（桩 mock parentNode.removeChild）→ 按 stub 契约回改 removeChild + 单次 HTMLElement 断言（200/200 复绿）。
- 四包 `index.ts` 零公共导出变更（`git diff --exit-code` 逐一验证）。
