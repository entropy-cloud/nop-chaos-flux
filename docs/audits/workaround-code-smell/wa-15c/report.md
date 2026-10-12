# WA-15c playground 消费侧批三（component-lab 组件实验场）临时方案与坏味道审计报告

> 批次: WA-15c（roadmap `docs/backlog/workaround-code-smell-audit-roadmap.md` Phase Status 对应行）
> 审计方法: `docs/skills/workaround-code-smell-audit-prompt.md`（九类信号 A–I + W1–W6 + §5 取证协议 + §3 重复两步协议）
> 执行 plan: plan 578（`docs/plans/578-workaround-audit-wa15c-playground-3-plan.md`，draft review R1 revised 共识稿）
> 审计日期: 2026-10-12
> 对象清单来源: `docs/audits/workaround-code-smell/inventory/modules.json`（批次 = WA-15c 行，单模块 pg-component-lab，不手抄）
> 取证模式: **review-only**（本报告由独立取证 agent 产出；批内修复归 Phase 2 执行会话，台账登记归主会话——本报告不改任何源码/测试/台账/roadmap，探针脚本落 `_tmp/wa15c-*`）

## 快照基准注记

plan 578 基线记载 HEAD = `ab6cc9fa4`（WA-15b 收口提交）；本报告取证实跑时 HEAD = `ab6cc9fa46f7da3f39c65592b25138fae741a016`，**基线与实跑同锚**。`git status --porcelain -- apps/playground/src/component-lab` **零在途**（主工作树并行会话在途变更 16 路径[flux-runtime/flux-core/flux-renderers-data/form/layout 14 源文件 + roadmap + 本 plan 未跟踪件]，与 `apps/playground/src/component-lab` 零交集——porcelain 全列表逐项核过），live = HEAD。

**三口径行数逐文件分解**（156 文件逐一 `wc -l` 对照 inventory `path:loc` 后缀 + `git show HEAD` 逐文件对照，脚本化比对 `_tmp/wa15c-loc-reconcile.mjs`）：

| 口径           | 全集行数 | 说明                                                                 |
| -------------- | -------- | -------------------------------------------------------------------- |
| inventory 口径 | 17,614   | WA-0 枚举器值（单模块 pg-component-lab，156 文件）                   |
| live wc        | 17,614   | = inventory **逐文件零差**（156/156 吻合，`mismatch=0`；零在途漂移） |
| HEAD wc        | 17,614   | = live（零在途）                                                     |

目录原始口径 161 文件 = 156 非测试 TS/TSX + **5 个测试文件**（component-lab-page.test.tsx / data-source-lab-page.test.tsx / layout-content-lab-page.test.tsx / recurse-lab-page.test.tsx / scope-debug.test.ts——枚举器 TEST_FILE_PATTERN 排除；测试面临时方案形态随批取证，见误报 #11）。

**基线候选全部复现**（枚举器同款正则逐文件实跑 `_tmp/wa15c-baseline-probe.mjs`，156 文件扫描面与 inventory 清单精确一致，与 inventory baseline + plan 578 Baseline 逐 file:line 吻合）：literalEn **0** / literalZh **0**（第八批组字面双零；wa-15b literalZh 3 破档后重续口径下本批回零）+ typeBypass 非测试 **102**（历批全部模块最高；分布 = data-\*-host ×13 件 **76 处** + crud-lab-page-c4c2.ts **5 处** + lab 页 **21 处**——逐 file:line 全量列出并四族分类，见专项裁定 A 与误报 #3/#4）+ setTimeout 非测试 **3**（dialog-lab-page :91/:191/:195——全为 mock 后端延迟本体，见误报 #2）+ silentCatch/keyRemount/domRaid/pixelNudge/testEnvBranch 五探针 prod 面**全零**（domRaid 仅测试面 4 处 = component-lab-page.test 的 DOM 断言查询，标准测试形态）。

**测试面独立扫描**（5 文件，typeBypass **2**[scope-debug.test :21/:43 fixture 构造形] + domRaid **4**[component-lab-page.test DOM 断言查询] + setTimeout/字面 **0**——标准测试形态，无迁就/放松断言证据，零立案）。

**门禁交叉实跑读数**（prompt §5 第 5 步留痕，component-lab 过滤；六项全实跑）：

| 门禁                                   | 读数                                                                                                                 | 处置                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check:audit-async-failure-paths`      | component-lab 过滤 **3 行**（button-lab-page.tsx:11/:18/:25 单文件）——与 plan 3 吻合                                 | **3 全豁免**：`countDownStorage` 三处 localStorage try/catch = INV-1 宿主注入持久化适配器（:4-6 注释自证 B 档 import-injection 模式 + renderer-env.md §9）；get 臂 `return null` 为「存储不可用→无值」语义正形、set/remove 臂注释在案（quota/private mode）——wa-14 localStorage 家族 + wa-15b dashboard 判例族；get 臂无注释微瑕记 watch #2 |
| `check:audit-performance-suspects`     | **0**                                                                                                                | 实跑确认                                                                                                                                                                                                                                                                                                                                    |
| `check:audit-reactive-render-reads`    | **0**                                                                                                                | 实跑确认                                                                                                                                                                                                                                                                                                                                    |
| `check:audit-runtime-raw-schema-reads` | **0**                                                                                                                | 实跑确认                                                                                                                                                                                                                                                                                                                                    |
| `check:audit-hardcoded-type-dispatch`  | **0**                                                                                                                | 实跑确认                                                                                                                                                                                                                                                                                                                                    |
| `check:audit-renderer-browser-io`      | **0**                                                                                                                | 实跑确认（component-lab 的 `window.__c*` 写入面全部经 `window as unknown as` 显式投影而非裸 window 读——归 typeBypass 窗口探针族定性，见误报 #1）                                                                                                                                                                                            |
| `check:oversized-code-files`（lab）    | ≥500 行非测试源 **1 件**（crud-lab-page.tsx，gate 显示 603 / inventory 与 live wc 均 602——门禁自身计数法差异非漂移） | 与 plan 登记债口径吻合；602 行**全读**（见覆盖声明）；内容 = 16 场景声明 + fixture 数据 + 1 个 env stub，非逻辑密度件                                                                                                                                                                                                                       |

**补充口径（枚举器未覆盖，走读新立）**：`as unknown as BaseSchema` schema 字面尾缀 cast **63 处**（typeBypass 102 的主体亚族；全目录剥离实证见专项裁定 A）；`as never` **0**（pages 域 93 处惯用形在本域零出现——本域同 seam 写法为 `as unknown as BaseSchema`）；`(api: any, ctx: any)` 签名实参 **4 处**（input-tree:75 / tree-select:76 / input-image:26 / input-file:52——MR 树/上传 e2e 家族 env 形）；mock fetcher off-contract 失败形状 `ok: false` **10 处**（9 fetcher 位点 + 1 action-probe on-contract 位点，见 WA-clab-002）。

## 覆盖声明（Coverage Declaration）

> 本节是台账 modules 行 `pending → audited` 翻转与 `pnpm workaround:reconcile` 结构校验的依据。单模块批次，pg-component-lab 一行翻转。156 文件按实际执行方式分档落字：**36 件全文精读（6,997 行 = 39.7%）+ 2 件定点抽读（163 行）+ 118 件逐页结构走读（10,454 行 = 59.4%——`_tmp/wa15c-walk.mjs` 11 维结构画像：行数/常量数/场景数/env/data/probe/window 写入/cast/okFalse/bug-plan 注释锚/host import，逐文件有读数；dashboard-filter/list/echarts/select 等大体量画像件另做头部定点）**——非「156 全文覆盖」口径，如实分档。

| 分档                                             | 文件数 | 行数   | 取证方式与要点                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------ | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **根级 6 件（全读）**                            | 6      | 822    | component-lab-page 302（路由消费面 = ALL_SHARED_RENDERER_ROUTES 分组导航 + RENDERER_LAB_REGISTRY 查表渲染；无状态反模式）+ multi-scenario-lab-page 122（**共享壳工厂本体**——registry/env/SchemaRenderer/formulaCompiler 模块级单例 + ScenarioBlock env 覆盖通道 + attachScopeDebugToSchema 挂调试节点；:35-39 IS-labenv-001 修复注释自证 notify 接 notifyWithToast）+ renderer-lab-registry 274（134 条目声明表，route-matrix.test 双向守卫在案）+ schema-lab-page 64（**死导出本体**，→WA-clab-005）+ scope-debug.ts 55（→专项裁定 C）+ index 5 |
| **data-\*-host ×13（全读——typeBypass 76 主体）** | 13     | 2,972  | c4c3 199 / c5c1 273 / c5c2 289 / c6c1 226 / c6c2 284 / c6c3 225 / c6c4 204 / c6c5 261 / c7 212 / c8-1 196 / c8-2 264 / c8-3 153 / c9 199——形态均一：头注自证「Extracted to keep the lab pages within the lint max-lines budget」（正面提取先例）+「Covers the plan failure paths」失败路径目录 + probe 命名空间注册表（分槽防覆盖证据，注释自证设计）+ 纯 schema 字面常量（尾缀 cast →WA-clab-001）+ 少量 mock fetcher（off-contract 失败形状 →WA-clab-002；echo fetcher →WA-clab-004）                                                          |
| **crud 双件（全读，含 602 超限件）**             | 2      | 776    | crud-lab-page 602 逐行（16 场景声明 = 12 基线 + 5 c4c2 宿主挂载；crudLabEnv 泛型 fetcher 无 cast 正形；cards/list 双 mode 结构平行对 = 刻意 mode 变体）+ crud-lab-page-c4c2 174（头注自证 lint 预算提取；flaky 失败形状 + 窗口探针 ×3 + envStub cast）                                                                                                                                                                                                                                                                                           |
| **命中/特殊页精读（族代表档）**                  | 15     | 2,427  | 命中页 13：button 153（async 门禁 3 行位点 + countDownStorage 承重 cast）+ dialog 410（setTimeout ×3 + echo fetcher ×4 + bug 73 探针注释链）+ table 319 + tabs 320 + loop 189 + image 76 + ai-bubble 44 + ai-sender 44 + calendar 45 + resizable 52 + input-tree 172 + tree-select 171（**孪生对全读** →WA-clab-003）+ input-file 128 + 特殊页 2：scope-debug-lab-page 77（全读，→裁定 C）+ dynamic-renderer 231（全读，failingLoadEnv 失败形状位点）；echarts/chart/select/dashboard-filter/list 头部定点抽读入走读档读数                       |
| **定点抽读档**                                   | 2      | 163    | dropdown-button 66（残错位点 sed 定段）+ input-image 97（okFalse/upload 家族 grep 定段读）——非全读，如实入档                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **其余 lab 页（逐页结构走读档）**                | 118    | 10,454 | 11 维画像逐文件过目 + 骨架 diff 级对照（multi-scenario 消费面 134/135、场景声明形、host import 90+ 件、bug/plan 注释锚遍布 90+ 件）；此档零新增立案候选（cast/okFalse/窗写探针/超长逻辑四信号在该档画像全零或已归前四档位点）；ai 族 14 页中 12 页为 20-37 行均匀声明页（probe 注册 + host import 形）                                                                                                                                                                                                                                           |

全集 **156/156**（17,614 行，分档覆盖零遗漏）+ 测试面 5 文件独立扫描。重复块探针双版（`_tmp/wa15c-dup-probe.mjs` 逐字版：12 行窗 + 熵 ≥3.2 + 可执行行占比 ≥0.5，156 文件 15,796 窗 → **97 组跨文件窗对 / 12 文件对**；`_tmp/wa15c-dup-probe-normid.mjs` 标识符归一版：熵 ≥2.6，13,683 窗 → **36,971 对 / 4,264 文件对**）。归一版巨量对数本身即**骨架同构的直接证据**——但其成因是 134 页消费同一共享壳后的声明形趋同（场景 title/description/schema 常量形），非逻辑重复；人工同构复核裁定（逐簇）：

- **刻意模板（豁免——本批核心裁定，详见专项裁定 B）**：134 页 `MultiScenarioLabPage` 消费形——**共享壳已提取**（e811167a4 2026-04-12 lab 出生当日即带壳工厂，与 pages 域 WA-pages-001 的 50+ 份手写装配相反）；页间差异面 = fixture schema 数据 + 场景文案（声明数据非逻辑）。逐字探针最大簇 input-tree↔tree-select 44 窗（→WA-clab-003 立案例外单列）；crud-lab cards/list mode 结构平行对、list-lab single/multiple selection 三窗对（:55/:80/:122）= 刻意 mode 变体（wa-15b ⑤ m5 双形态判例族）；audio↔video 4 窗、condition-builder↔tag-list 1 窗 = 微小壳相似零逻辑重复。
- **真重复（立案）**：tree 孪生 lazyEnv 28 行逐字 ×2 + orgTreeOptions 27 行数据镜像 ×2（→WA-clab-003）；calendar↔resizable no-op env stub 3 行逐字 ×2（→WA-clab-004②）。
- **数据镜像（豁免）**：MOCK_SALES（dashboard-filter）、tasks/products/users 各页内联 fixture——页内私有数据，无跨页双写（wa-15a #19 判例族的「同宇宙双写」形态在本域不存在——host 间共享数据均经 import 单源）。

## 逐条发现（Findings）

> 每条按 12 字段模板 + **归属裁定**字段（roadmap Cross-Cutting 归属裁定规则 = 本批第一裁定维度）；全量登记归主会话写入 `docs/audits/workaround-code-smell/ledger.md`（ID `WA-clab-001` 起三位零填充，live 核验 ledger 中 `WA-clab-` 前缀零命中——零撞号），本节与台账一一对应，零静默。
> ID 编排说明：立案 **5 条 = P2 ×1 + P3 ×4；零 P0/P1**。严重度按本批任务口径映射（P0/P1=行为缺陷；P2=结构性复制漂移/W4 静默守卫族；P3=沉积/注释/命名）。

### WA-clab-001 [D·双峰] schema 字面尾缀 cast 63 处：59 处可机械去除（剥离实证）+ 4 处承重位点（interface 嵌入 ×3/函数值 prop ×1）= CX-20 根因第三波位点

- **位置**: `} as unknown as BaseSchema;` 尾缀 ×63（data-\*-host ×13 件 60 处 + ai-bubble:25 / ai-sender:25 / button:121 三页）——逐 file:line 清单见 `_tmp/wa15c-cast-classify.mjs` 输出（schemaLiteral 族 63 条）
- **信号类别**: D（断言压掉报警——但报警源分两峰：59 处为**惯例复制形**（类型系统并未真报警），4 处承重位点为**契约面真缺口**（interface 嵌入 ×3 + 函数值 prop ×1））
- **严重度**: P3（判据：零行为面——运行时值恒为合法 schema[页面正常渲染+56 个 component-lab e2e spec 守护]；63 处机械重复）
- **现状**: 全部 13 个 host 与 3 个 lab 页的 schema 常量无一例外带尾缀 cast；**全目录剥离实测**（拷贝 component-lab 至 \_tmp 剥离 80 处 cast 后 tsc 实跑）：59 处剥离后零残错——`const x = {...}` 纯字面在两步赋值与注解形（`const x: BaseSchema = {...}`）下均可直接通过；残错 12 处/7 文件收敛为两亚族+echo 车——①**承重：interface 嵌入**（`toolCall: ChatToolCall`，ChatToolCall 来自 flux-renderers-ai 无索引签名 → SchemaObject 拒收原文「Index signature for type string is missing」）：承载位点 = data-c8-1 `c8HitlSchema`（:145）+ data-c8-2 `c82ToolDialogSchema`（:93）/`c82HitlSchema`（:122），消费面残错 = ai-chat:29 + ai-tool-call:13/:20——注意 c8-1/c8-2 其余六 schema（不含 toolCall）剥离后零残错，承重面精确到 schema 级；②**承重：函数值宿主注入 prop**（button:121 `countDownStorage` 三方法对象——SchemaValue 不收函数，同文件 :148 残错）；③其余 8 处残错为 echo-fetcher env 位点（dialog:387/:393/:399 / loop:178 / tabs:315 / dropdown-button:61）——归 WA-clab-004 车非本条
- **按住的根因**: 承重亚族 = `SchemaObject` 索引签名 vs 宿主 interface/函数值字面量的类型工效缺口（与 WA-pages-008 的 `as never` ×93、CX-20 原案 `StreamApiRequest.data` 三 cast **同根因第三位点家族**——pages 用 `as never`、本域用 `as unknown as BaseSchema`，同一 seam 的两种方言）；59 处可去除形 = C 波 component-audit（2026-08-03..06）起每件 host 照抄首件模板的**惯例沉积**——cast 从「需要处」扩散为「每处」
- **考古**: 首落 `ae262311b`（2026-08-03 plan-2026-08-03-0105 C1.3 basic atomic display family audit fixes，`git log -S 'as unknown as BaseSchema'` 首现）→ C 波 13 件 host 五日内连环照抄（`6fcdb0e97`/`d5d3ccb50`/`9844c628d`/`cd4953f3d`/`dec07748a`/`ea9f2c9b9`/`aa56bd207`/`df212e605`/`dd59dcd93` C3.1→C9 全族）——首件可能真需要（如 c4c2 携带 off-contract 形状的件），后续为模板复制
- **违约基准**: W6 邻（cast 靠惯例而非类型语义解释——59 处 cast 在当下类型系统下不必要=自证惯例化）+ W3（份数 63 且每个新 host 必带）
- **风险**: 新 host/lab 页继续复制第 64 处；cast 习惯的次生危害已兑现一次（见 WA-clab-002——cast 屏蔽了 ok-removal 迁移的类型报警）
- **重构方向**: 双轨——①承重亚族（4 处承载位点，schema 级精确）归 **CX-20 扩围第三波**契约修（ChatToolCall 类 interface 嵌入给 SchemaObject 开白名单通道或 `defineSchema<T>()` 语义出口 + 宿主注入 prop[renderer definition field] 类型面拍板，执行前人工确认门）；②59 处可去除形随同一波**机械清扫**（删尾缀或改注解形，全目录 strip 探针已证零残错；playground filter 四门禁验收）
- **归属裁定**: **renderer/core 契约缺失（承重亚族，升级）+ demo 侧惯例沉积（可去除亚族）** → CX-20 扩围登记（第三波）
- **ROI 裁定**: 排期进 CX（机械清扫随车；本批不硬修 63 处——与 wa-15b WA-pages-008「局部修法成本高于契约侧一处修+随车清扫」同判例）
- **误报排除复核**: 不是「动态边界一次性收窄」——63 处是稳定惯例面；也不是全部可就地豁免——4 处承重位点经剥离实测证明类型系统在如实报警，断言在销毁证据（D 类正形态）

### WA-clab-002 [D 邻·W4 邻·迁移缺口] mock fetcher off-contract 失败形状 `{ok:false,...}` ×9：ok-removal 契约迁移的 cast 屏蔽残留

- **位置**: 9 个 fetcher 位点——input-tree:93 / tree-select:94 / input-file:63 / input-image:37（四件 `{ok:false, status:500, data:{message}} as T` 形）+ table-lab:118 / crud-lab-page-c4c2:47 / data-c4c3:27（三件 `{ok:false, status:500, error:'simulated…', data:null}` 形）+ data-c6c1:85（`{ok:false, status:404, data:null}`）+ dynamic-renderer:168（`failingLoadEnv {ok:false, status:500, data:null}`，`: Partial<RendererEnv>` 注解形）——grep `ok: false` component-lab 10 命中中第 10 处 c5c1:211 为 action probe invoke 返回（`ActionResult.ok` on-contract，见误报 #4，不属本条）
- **信号类别**: D 邻（off-contract 死字段）+ W4 邻（**cast 使契约漂移对 typecheck 不可见**——迁移扫描被断言致盲）
- **严重度**: **P2**（判据：结构性契约漂移族 9 份同源 + 已兑现的危害一次[迁移漏改]；非行为缺陷——runtime 只读 status，错误路径行为正确）
- **现状**: 契约 `ApiResponse`（flux-core/src/types/renderer-api.ts:15-35）已无 `ok` 字段、错误语义走 `msg`；runtime 分支实证 `request-runtime.ts:431` `const isOk = response.status === 0`（:428-430 注释自证「The legacy `ok` field has been removed」）。9 处 mock 的 `ok`/`error` 字段为 runtime 忽略的死字段——错误模拟实际由 `status:500/404` 驱动。其中 data-c5c1 若有人「照抄简化」出无 status 的裸 `{ok:false}`（c5c1:211 恰是隔壁 action probe 的合法形状），将靠 `undefined === 0` 为 false 的巧合进错误路径——**同形不同约的陷阱已就位**
- **按住的根因**: `01770f770`（2026-08-27，ApiResponse 移除冗余 ok）+ `db49efebf`（2026-08-28 follow-up「complete ApiResponse ok-removal migration」）迁移链**只清了成功形状**（c4c2 diff 实证：`{ok:true, status:200}` → `{status:0}`）——失败分支因 `as unknown as T`/`as unknown as Partial<RendererEnv>` 断言对 typecheck 不可见而全部漏改（follow-up 自述「typecheck 37/37」恰为断言致盲的佐证）；迁移完成后无失败形状的 grep 收尾验收
- **考古**: 失败形状出生 `d5d3ccb50`/`6fcdb0e97`（2026-08-04 C4.2/C4.3 宿主 flaky 场景首创）→ C 波复制 → `db49efebf`（08-28）迁移扫过成功臂留下失败臂——`git show db49efebf -- crud-lab-page-c4c2.ts` hunk 实证同文件同函数成功臂改而失败臂未改
- **违约基准**: W3（9 份同源形状 + 契约已单方面迁移=漂移已兑现）+ W4 邻（守卫[类型检查]被 cast 静默）
- **风险**: 契约再次演化（如 msg 语义强化）时 9 处继续不可见；`{ok:false}` 陷阱形扩散；新 mock 继续照抄死方言
- **重构方向**: 9 处 reshape 为契约形 `{status:500, msg:'…', data:null}`（保留 `data:{message}` 者不动 data——错误展示链读 `response.data` 作 errorPayload，改 msg 丢 data 会变文案）+ 随手删去已无必要的 envStub/T cast（与 WA-clab-004 同车）；验收 = 56 个 component-lab e2e spec 失败路径用例全绿（c4c2/c4c3 flaky retry、input-tree lazy-fail retry、input-file/input-image upload-fail、dynamic-renderer error state、c6c1 markdown-missing 均有判别断言在案）+ `grep -rn '"ok: false"' apps/playground/src/component-lab` = 0（fetcher 面）+ typecheck 直通（reshape 后 cast 可删本身即类型面验收）
- **归属裁定**: **demo 接线**（mock 侧死方言；契约侧 01770f770 迁移已完成且 runtime 分支正确——缺口纯在消费侧残留）→ **批内修**（9 处机械 reshape，分钟级×9）
- **ROI 裁定**: 立即重构
- **误报排除复核**: 不是「mock 有权自造错误形状」——mock 的职能是模拟契约响应而非发明第四种形状；也不是 ActionResult.ok（action 层）误伤——c5c1:211 已显式排除（误报 #4）

### WA-clab-003 [H·孪生] input-tree ↔ tree-select lab 页树宿主孪生：lazyEnv 28 行逐字 + orgTreeOptions 27 行数据镜像 + `(api:any, ctx:any)` 签名对——CX-13 Tree 族消费面镜像

- **位置**: `input-tree-lab-page.tsx:73-102` ↔ `tree-select-lab-page.tsx:74-103`（lazyFailCalls Map + lazyEnv fetcher 28 行逐字同体，仅注释差）+ `:3-29` ↔ `:3-29`（orgTreeOptions 27 行逐字数据）+ input-tree:75 / tree-select:76 / input-image:26 / input-file:52 四处 `async function <T>(api: any, ctx: any)` 签名对
- **信号类别**: H（同一宿主基础设施两份手写）+ 数据镜像随车
- **严重度**: P3（判据：2 份、28 行≥15、同根因；两份自 8c83728b8[2026-08-03]后约两月稳定——§3「稳定双份」档；逐字探针 44 窗为全集最大簇）
- **现状**: tree-select:72-73 注释自证复制链——「Shared lazy-children host env (mirrors input-tree-lab-page); per-node fail counter keeps the two labs independent.」——作者知其为复制、以「per-node fail 计数器需独立」为不共享理由；该理由**不成立为不提取的理由**：提取 `createLazyTreeHostEnv()` 工厂每次调用返回**新鲜** Map 即同时满足共享与独立性（WA-pages-005 three-scope 工厂化同款手法）；`(api:any, ctx:any)` 为绕开 fetcher 契约签名的类型擦除写法（ctx.scope.readOwn 只在树懒加载用到）
- **按住的根因**: CX-13（InputTreeSchema↔TreeSelectSchema 双声明 + tree-controls 双 renderer）在消费面的镜像落点——上游双声明不消除，lab 侧「成对新页必成对复制」的引力持续存在；MR 树 e2e 波（bug 73 模式）落第二页时直接镜像第一页
- **考古**: 两页均为 lab 元老（e811167a4 04-12 / 314eaf2fb 04-13 出生即孪生）；lazyEnv 体 `8c83728b8`（2026-08-03 C3.5 component-audit wave）同步写入两页——同波双落非巧合
- **违约基准**: W3（同一宿主 adapter 两写；第三棵树类型页[若有]必第 3 份）+ W6 邻（`any` 擦除 fetcher 契约签名——正确形态为 `<T,>(api: ExecutableApiRequest, ctx: ApiRequestContext)` 或收窄注解）
- **风险**: 懒加载/重试语义变更需两处同步；orgTreeOptions 任一侧编辑字段即数据漂移（两页树渲染静默分叉，对照 e2e 断言互不知情）
- **重构方向**: 提取 `renderers/tree-lab-host.ts`：`createLazyTreeHostEnv()`（工厂返回新鲜 lazyFailCalls 状态）+ `orgTreeOptions` 单源导出；两页改引 + identity 判别测试（两页 env 工厂同源断言，WA-pages-005/009 同款红→绿手法）；`api:any, ctx:any` 随工厂收敛为一处并给收窄注解；回归 = tree/input-tree/tree-select 相关 e2e 直通；**orgTreeOptions 数据镜像可选豁免**（fixture 数据 wa-15a #19 判例族）——随车单源为零成本顺带，裁定随车
- **归属裁定**: **demo 接线**（playground 包内共享件提取，零外部面；上游 CX-13 双声明不因本条扩围——消费面镜像不改变 renderer 侧修复责任）→ **批内修**
- **ROI 裁定**: 立即重构（~30 分钟档含测试）
- **误报排除复核**: 不是「两页刻意独立演化的巧合相似」——注释自证 mirror；「fail 计数器独立性」经工厂化新鲜状态即可满足，不构成不提取理由（§3 问句 3 提取干净=是）

### WA-clab-004 [H 微·清单合并] mock env 装配形清扫包：echo-fetcher cast ×9 + vestigial no-op stub ×2 + `as unknown as T` ×4——机械改写实证在案

- **位置**: ①echo-fetcher 方法级 cast `) as unknown as RendererEnv['fetcher']` ×7 + `['loadDict']` ×1 + data-c5c2:288 ×1（dialog:87/:99/:213/:236 / loop:19 / tabs:205 / image:46 / c5c2-host:288 / c6c1:88——返回 `data: api.data`[unknown] 的 echo 形）；②no-op env stub 逐字双份 calendar-lab:17-20 ↔ resizable-lab:31-34（`fetcher: async <T,>() => ({status:0, data:null as T})` + `as unknown as Partial<RendererEnv>`）；③`as unknown as T` ×4（crud-c4c2:51 / data-c4c3:31 / table:122/:126——随 WA-clab-002 reshape 消亡）
- **信号类别**: H 微（同域多份手写合并登记——wa-13a 微重复清单/industrial-008/wa-15a taskflow-003/wa-15b 009 先例）
- **严重度**: P3（判据：零行为面；②经 `_tmp` tsc 探针实证 **cast 不必要**——`const stub = {fetcher: async <T,>() => ({status:0, data:null as T})}; const t: Partial<RendererEnv> = stub` 零错通过，纯残留模板；①经 Case E/F 实证 **cast 承重但存在机械无 cast 改写**——`async <T,>(api: {url?: string; data?: unknown}) => ({status:0, data: api.data as T})` 泛型形零错通过）
- **现状**: echo-fetcher 写成「先箭头函数后整体断言」形而非泛型直写形；no-op stub 从带真 fetcher 的宿主模板复制到无 fetcher 需求的页后 cast 未随实体删除
- **按住的根因**: 与 WA-clab-001 同一波惯例扩散——「模板里有的 cast 照抄」；calendar/resizable 件出生 `29f94af90`（2026-09-27 plan 514 L4 deep）时复制了宿主 stub 模板
- **考古**: echo 形首落 `4de0cc003`（2026-08-02 dialog editSubmitProbeFetcher）；no-op stub 对 `29f94af90`（09-27）同 commit 双落
- **违约基准**: W6 邻（cast 不解释类型语义——两探针实证其非必要或可机械消除）+ W3（echo 形 9 份持续复制）
- **风险**: 新 mock 继续两派并立（泛型无 cast 正形 vs 箭头+cast 形）——crud-lab-page crudLabEnv 与 dashboard-filter 已是泛型正形在案（域内正反例并存=非设计一致性）
- **重构方向**: ①9 处改泛型直写形（Case F 机械改写，cast 自然消亡）+ ②2 处删 cast（或删整个 stub——若该页无 ajax 路径则连 stub 一起删，逐页裁量）+ ③随 002 车；验收 = playground typecheck/lint 直通 + 涉事页 e2e 直通（echo fetcher 均挂 e2e 判别断言）；**工厂化方向**（`createLabMockFetcher(routeMap)` 收敛四形态[泛型形/echo-cast 形/envStub 形/any 形]）落字为方向建议，随 CX-19 扩围裁定（见该节：不触发，理由落字）
- **归属裁定**: **demo 接线** → **批内修**（①②机械，随 002/003 同车执行）
- **ROI 裁定**: 立即重构
- **误报排除复核**: ①不是「契约面必须修才能消 cast」——Case F 实证宿主侧一处写法改变即零 cast，与 001 承重亚族（真契约缺口）显式分峰；②不是「env prop 类型太窄」——探针实证 Partial<RendererEnv> 直接收

### WA-clab-005 [I 邻·死导出] SchemaLabPage 出生即死的双位点导出：root 64 行本体 + renderers 1 行 shim，全历史零消费，且携带 pre-IS-labenv-001 的 no-op notify 旧装配

- **位置**: `component-lab/schema-lab-page.tsx`（64 行全读）+ `component-lab/renderers/schema-lab-page.tsx`（1 行 re-export shim）+ `component-lab/index.ts:2`（导出面）
- **信号类别**: I 邻（死代码化石）+ F 邻（若复活将带 toast 盲区缺陷——F 类是 interaction-state 轨道语义，此处按 I 邻立案）
- **严重度**: P3（判据：零行为面[无人消费]；但「活着的状态是错的」——其装配为 IS-labenv-001 修复前的旧形态）
- **现状**: `git log -S 'SchemaLabPage' -- ':(exclude)apps/playground/src/component-lab'` 全历史**零命中**——出生（e811167a4 2026-04-12，与 lab 同日）至今从未被 App/路由/测试消费；RENDERER_LAB_REGISTRY 134 键亦无 `schema` 键。本体携带三处与主壳（multi-scenario-lab-page）的漂移：①`createDefaultEnv()` 裸调用——**无 notifyWithToast 接线**（IS-labenv-001/a71b6031e 修复的正是这一盲区类缺陷，主壳修了、这个死件没修）；②registry 仅挂 4 包（basic/form/form-advanced/data）vs 主壳 9 包；③自建 SchemaRenderer/formulaCompiler 单例（与主壳平行）
- **按住的根因**: lab 初版同时落了两个壳形（多场景/单 schema），单 schema 形从未接线即被多场景形覆盖——删除动作从未做（WA-pages-007 `_unused` 化石同族：「无人能答出保留理由即化石」）
- **考古**: `e811167a4`（04-12）出生；`7730d0ca6`（04-13 scope-debug 接线波）是最后一次被触及（加 attachScopeDebugToSchema）——**修复波对死件照常维护**的化石特征（W5：删掉会怎样——什么都不会变）
- **违约基准**: W5（删除可回答=答「无影响」）+ I 邻无出口（无关联 plan/注释判据）
- **风险**: 未来作者误用 SchemaLabPage 即继承 toast 盲区+4 包缺注册两个过时语义；renderers shim 位点使「135 个 lab 页」枚举口径虚增 1
- **重构方向**: 首选**删除**三位点（root 本体 + shim + index 导出行）；备选（若维护者裁定保留为实验工具）**接线对齐主壳**（notifyWithToast + 9 包 registry 或合并进主壳参数）——二选一属公共导出面裁决。回归 = 删除路径：playground typecheck/build/lint/test 直通（零消费实证支持零影响预期）+ reconcile 枚举口径复核
- **归属裁定**: **demo 接线（文档面/死代码）** → **watch-only/successor**（**不批内修**：plan 578 保护区条款②「component-lab/index.ts 公共导出面 = 批内零变更」直接阻止删除路径触及 index.ts:2；去向由维护者在 successor/清理批裁决二选一）
- **ROI 裁定**: 挂账观察（显式登记，不允许静默——本行即登记）
- **误报排除复核**: 不是「预留实验工具桩」——零历史消费+零出口+已被主壳功能覆盖三证齐；也不是「公共导出面必有消费者在仓外」——component-lab 为 playground 应用内模块非发布包（`apps/playground/package.json` 无 exports 面消费证据）

## 归属裁定汇总（本批第一裁定维度专项节）

| 发现 ID     | 裁定                                                            | 依据（一句话）                                                                           | 去向                 |
| ----------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------- |
| WA-clab-001 | renderer/core 契约缺失（承重亚族）+ demo 惯例沉积（可去除亚族） | ChatToolCall interface 嵌入与函数值 prop 是 SchemaObject 工效真缺口；59 处为模板惯例复制 | CX-20 扩围（第三波） |
| WA-clab-002 | demo 接线                                                       | 契约迁移已完成且 runtime 分支正确；缺口纯在 mock 侧死方言残留                            | 批内修               |
| WA-clab-003 | demo 接线                                                       | 包内共享件提取即可；上游 CX-13 双声明不因消费面镜像扩围                                  | 批内修               |
| WA-clab-004 | demo 接线                                                       | echo 泛型改写与 stub 删 cast 均宿主侧机械可消（探针实证）                                | 批内修               |
| WA-clab-005 | demo 接线（死代码）                                             | 出生即死、零历史消费；删除涉 index.ts 导出面条款阻却                                     | watch/successor      |

**裁定小结**：5 条中 4 条 demo 接线（playground 自身问题）、1 条混合（001 = 契约缺失升级 + 惯例沉积双峰）；**零条「renderer 能力不足被迫特判」行为形态**——与 wa-15a/15b 三连互证：playground 消费面亦无一处「因为 renderer 行为能力不足而被迫在 demo 侧按住问题」的代码，唯一升级候选（001）仍是类型工效缺口而非行为能力缺口。

## 汇总

### 1. 转正清单（W2 违约项，按风险排序）

| 发现 ID     | 位置                           | 出生时间（git 考古）                                                 | 风险                                                | 处置            |
| ----------- | ------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------- | --------------- |
| WA-clab-001 | schema 字面尾缀 cast ×63       | ae262311b（08-03）首落 → C 波 13 件五日连环照抄                      | 第 64 处 host 必复制；cast 致盲已兑现一次（见 002） | CX-20 扩围      |
| WA-clab-002 | off-contract 失败形状 ×9       | d5d3ccb50/6fcdb0e97（08-04）出生 → db49efebf（08-28）迁移漏改        | `{ok:false}` 陷阱形扩散；契约再演化继续不可见       | 批内修          |
| WA-clab-003 | tree 孪生 lazyEnv+数据 ×2      | 两页 04-12/13 出生即孪生；lazyEnv 8c83728b8（08-03）同波双落         | 懒加载/重试语义两处同步税；数据漂移通道开放         | 批内修          |
| WA-clab-005 | SchemaLabPage 死导出           | e811167a4（04-12）出生即死；7730d0ca6（04-13）后仍被维护（化石特征） | 误用即继承 toast 盲区+4 包缺注册过时语义            | watch/successor |
| WA-clab-004 | echo/vestigial cast 装配形 ×15 | 4de0cc003（08-02）echo 首落；29f94af90（09-27）stub 对双落           | 两派写法并立扩散                                    | 批内修          |

**「按住未修问题且无出口」的经典重转正件为零**——与 wa-15a/15b 同判：本批全部发现为惯例沉积/契约迁移残留/复制孪生/死代码形态，无一处「用临时方案按住活体 bug」；佐证：literalEn 0 + literalZh 0 + 零 P0/P1 + async 门禁 3 行全豁免（INV-1 宿主注入适配器正形）+ 唯一登记在案的 workaround 形（bug 73 模式探针链）**全部有出口且有 e2e 判别断言守护**（W2 满足正面形态——bug 73 引注遍布 20+ 文件）。

### 2. 重复代码热区（按总冗余行数排序）

| 组  | 份数 | 各份位置                                                      | 冗余行数（估） | 漂移证据                                        | 裁定（三问句）                                |
| --- | ---- | ------------------------------------------------------------- | -------------- | ----------------------------------------------- | --------------------------------------------- |
| 1   | 63   | schema 字面尾缀 cast（WA-clab-001，类型重复）                 | 63             | 首件承重→全族惯例化（剥离实证分峰）             | 同根因✅ 提取干净✅（契约修+随车清扫）→ CX-20 |
| 2   | 2+2  | tree 孪生 lazyEnv 28 行 + orgTreeOptions 27 行（WA-clab-003） | 55             | 注释自证 mirror；44 窗逐字最大簇                | 同根因✅ 稳定双份 → 批内修                    |
| 3   | 9    | echo-fetcher 箭头+cast 形（WA-clab-004①）                     | ~27            | 泛型正形（crud/dashboard-filter）并存           | 同根因✅ 改写实证✅ → 批内修                  |
| 4   | 9    | off-contract 失败形状（WA-clab-002）                          | ~30            | 两派字段形（message in data vs error 顶格）并存 | 同根因✅ 已漂移✅ → 批内修                    |
| 5   | 2    | no-op env stub（WA-clab-004②）                                | 6              | cast 不必要（探针实证）                         | 同根因✅ → 批内修                             |
| 6   | 多   | 134 页 MultiScenario 消费形 + 场景声明形 + host 头注三件套    | （豁免）       | 共享壳已提取；页间差异=fixture 数据             | 刻意模板 → 不立案（专项裁定 B）               |
| 7   | 2+2  | crud-lab cards/list 平行对 + list-lab selection 三窗对        | （豁免）       | 刻意 mode 变体（schema fixture）                | 刻意骨架 → 不立案（误报 #6）                  |

### 3. Top 重构建议（默认 3 项）

1. **mock 契约卫生车（WA-clab-002 + 004 + 003 批内修合集）**：根因修复点 = 9 处失败形状 reshape 契约形（保 data.message）+ 9 处 echo-fetcher 改泛型直写形 + 2 处 vestigial cast 删 + tree 孪生工厂化（createLazyTreeHostEnv + orgTreeOptions 单源）；预期删除本体 = off-contract 死字段 9 组 + 冗余 cast 15 处 + lazyEnv/orgTree 孪生 ~55 行；回归 = 56 个 component-lab e2e spec 全绿（失败路径判别断言在案）+ identity 探针（tree 工厂）+ playground filter 四门禁；影响面 = ~20 文件，零行为变更（runtime 只读 status 实证背书）。
2. **契约类型工效第三波（CX-20 扩围 + WA-clab-001）**：根因修复点 = ChatToolCall 类 interface 嵌入的 SchemaObject 白名单通道或 defineSchema 语义出口 + 宿主注入 prop（countDownStorage 类 renderer definition field）类型面拍板；预期删除本体 = 4 处承重 cast（契约修后自然消亡）+ 59 处惯例 cast 随车机械清扫 + （上游批位）pages 域 93 处 as never 同车；回归 = core/renderer 类型面判别测试 + playground 全量 typecheck；影响面 = flux-core/flux-renderers-ai 契约面（保护区，执行前人工确认门）+ playground 63 处。
3. **死件清理裁决（WA-clab-005 successor）**：根因修复点 = SchemaLabPage 三位点删除（或接线对齐二选一的人工裁决）；预期删除本体 = 64 行死本体 + 1 行 shim + 导出行；回归 = typecheck/build/lint/test 直通 + 枚举口径复核（135 页口径去虚）；影响面 = index.ts 导出面（plan 条款②阻却批内执行——successor 载体）。

### 4. 误报排除清单（14 项）

| #   | 疑似点                                                                                                   | 位置                                       | 排除理由                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | windowProbe cast ×21                                                                                     | 13 host + dialog/table/tabs/loop/crud-c4c2 | e2e 观测契约通道——tests/e2e/component-lab/ 56 spec 中 14 个消费 `__c*` 探针键（含 `__c82${key}` 计算键形），注释自证「the e2e can assert on it」+ bug 73 引注；opt-in、文档化——wa-15b 误报 #9 判例族（G 类标准可测性设计）                                                                                                                                                                                                                                                              |
| 2   | setTimeout ×3                                                                                            | dialog-lab-page:91/:191/:195               | mock 后端延迟本体（:89 注释「模拟真实后端 DictProvider 延迟」+ :189「模拟异步数据源成功加载」）——被演示特性自身即异步加载时序，非等待他系统就绪；wa-15b 误报 #2 判例族                                                                                                                                                                                                                                                                                                                  |
| 3   | async 门禁 3 行                                                                                          | button-lab-page:11/:18/:25                 | `countDownStorage` localStorage 适配器（:4-6 注释自证 INV-1 宿主注入 B 档模式 + renderer-env.md §9）——跨信任边界降级（quota/private mode 注释在案）；get 臂 return null 为无值语义正形；无注释微瑕记 watch #2。wa-14 localStorage 家族判例                                                                                                                                                                                                                                              |
| 4   | c5c1:211 `{ ok: false }`                                                                                 | data-c5c1-host.ts registerC5c1GateProbe    | ActionScope probe invoke 返回 ActionResult 形——`ok` 为 action 层合法字段（action-adapter.ts:535 `result.ok === false` 分支在案；01770f770 明文「ActionResult 保留 ok 字段」）——**on-contract 正形**，与 002 的 fetcher 面显式切割                                                                                                                                                                                                                                                       |
| 5   | crud-lab cards/list mode 结构平行对（:65-96 ↔ :98-129）                                                  | crud-lab-page.tsx                          | 刻意 mode 变体——cards/list 双载体 demo 本身就是并列展示两 mode 的场景对（footerToolbar 文案逐字同形为场景文案）；wa-15b ⑤ m5 双形态判例族                                                                                                                                                                                                                                                                                                                                               |
| 6   | list-lab selection 三窗对（:55/:80/:122）                                                                | list-lab-page.tsx                          | single/multiple selectionMode 刻意变体；差异面 = mode 属性与文案（fixture 数据）                                                                                                                                                                                                                                                                                                                                                                                                        |
| 7   | audio↔video 4 窗 + condition-builder↔tag-list 1 窗                                                       | 逐字探针小簇                               | 微小壳相似零逻辑重复（媒体对=播放器参数差；cb↔tag=1 窗偶然）                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 8   | orgTreeOptions 27 行数据镜像                                                                             | input-tree:3-29 ↔ tree-select:3-29         | fixture 数据镜像（wa-15a #19 判例族）——随 WA-clab-003 工厂化零成本顺带单源；漂移通道记 watch #3                                                                                                                                                                                                                                                                                                                                                                                         |
| 9   | dialog:185 realSchemaDialog 巨型单行 JSON 字面                                                           | dialog-lab-page.tsx                        | nop-entropy 真实 edit-user schema verbatim 装载（:390-392 场景描述自证「Real nop-entropy edit-user schema loaded verbatim」）——回归基准 fixture 非坏味道                                                                                                                                                                                                                                                                                                                                |
| 10  | button:121 承重 cast                                                                                     | button-lab-page.tsx countDown schema       | 剥离实证类型系统如实报警（countDownStorage 函数值 prop 不可入 SchemaValue）——随 CX-20 第三波契约修，非可就地豁免也非静默绕行（与 59 处可去除形分峰）                                                                                                                                                                                                                                                                                                                                    |
| 11  | 测试面候选（typeBypass 2 / domRaid 4）                                                                   | scope-debug.test / component-lab-page.test | fixture 构造/DOM 断言查询标准测试形态；无放松断言/删用例证据（G 类排除）                                                                                                                                                                                                                                                                                                                                                                                                                |
| 12  | data host 模块级 `let` 计数器（c4c2FlakyFailures / c4c3UserFetchCount / requestOwnedFetchCount 等 6 处） | 各 host/crud-lab-page                      | fetcher 回调内事件时写入（非 render 路径——wa-15b watch#4 render 期模块 ref 写入形态在本域零命中）；模块单例计数是 e2e 断言语义的一部分（次数断言）；StrictMode 双挂载不改写 fetcher 调用次数——记 watch #4 备查                                                                                                                                                                                                                                                                          |
| 13  | scope-debug.ts 属性窄化读 cast（`as { body?: BaseSchema[] }` ×5 + `as BaseSchema` 返回 ×4）              | scope-debug.ts                             | 读形惯用收窄（非 as any/as unknown as 族，不在 102 口径内）；消费链 = basic 包一级 renderer（basic-renderer-definitions.ts:411 注册 + schemas.ts:412 类型条目 + 包内测试）——**实验工具契约面健康**（专项裁定 C）                                                                                                                                                                                                                                                                        |
| 14  | CX 交界核对                                                                                              | —                                          | CX-1..18 不涉 component-lab 面（grep 零命中）；CX-13 覆盖 form 包 schemas/tree-controls（本批 003 = 消费面镜像新增位点非重复）；CX-19 边界 = complex-pages/shared + pages/ 装配（lab 已有壳工厂 → 扩围不触发，见 CX 节落字）；CX-20 原案 = StreamApiRequest.data + WA-pages-008 = SchemaInput/registry 面（本批 001 = ChatToolCall/函数值 prop 位点 = 第三波扩围非重复）；wa-11 立案面 = ai renderer 本体（本批 ai-\*-lab 14 页为消费面，接线不重复立案）；wa-7..15b 已审域与本域零交叠 |

### 5. 范围整体判断

**不是系统性临时方案文化——与 wa-15a/15b 三连同判：零字面待办 + 零 P0/P1 的低危消费侧批组，且是 playground 三批中工程化程度最高的一域**——问题形态是「component-audit C 波的惯例复制沉积 + 一次契约迁移的 cast 致盲残留 + 少量消费面孪生」，而非「按住活体问题的特判兜底」。正面证据六件：①literalEn 0 / literalZh 0 双零回续；②零 P0/P1——17,614 行消费面无一处「为让 demo 跑起来而按住 renderer 缺陷」的代码；**共享壳工厂与 lab 同日出生**（kit-first，pages 域九波连抄的反面）+ IS-labenv-001 notify 收敛已闭环 + 13 件 host 头注自证 lint 预算提取（提取先例常态化）；③九类信号高危形态全零（symptom 特判/keyRemount/pixelNudge/testEnvBranch/silentCatch 五零）；④bug 73 模式探针链遍布 20+ 文件且全部有 e2e 判别断言守护（出口在案的正面形态）；⑤async 门禁仅 3 行且全为 INV-1 宿主注入适配器正形；⑥症状性 commit message 抽检 60 条（40 近期 + 20 C 波）= 0 条经典症状形态。

问题集中三处：**「惯例 cast 的无差别扩散」**（63 处 schema 字面 cast 中 59 处当下类型系统并不需要——C 波首件可能承重、五日 13 件连环照抄后惯例化；次生危害已兑现一次：ok-removal 迁移的类型扫描被 cast 致盲漏改 9 处失败形状[WA-clab-002]——本批对「cast 惯例」的批注是三批 playground 中最实的一笔）；**「迁移收尾缺消费面 grep 验收」第二次兑现**（01770f770→db49efebf 迁移链改了成功臂留了失败臂——与 wa-15b「收敛执行批应带全库消费面 grep 验收」流程约束同源，本案是该约束在契约迁移场景的又一证据）；**「消费面孪生的引力仍在」**（tree 孪生注释自证 mirror——CX-13 上游双声明不消除，成对页面的复制惯性持续）。整体判断：**零星个案级 + 一项契约扩围（CX-20 第三波）+ 三条批内修位点车（002/003/004）+ 一条 successor（005）**；5 条立案（P2×1+P3×4）；watch 微注记 5 条；`apps/playground/package.json` 全批零变更；零 P0/P1 → 双哨兵条款预判不触发。

## 专项裁定（plan 578 单列四项）

### A. typeBypass 102 家族归属三分裁定

**四族分布**（`_tmp/wa15c-cast-classify.mjs` 逐位点分类）：schema 字面尾缀 `as unknown as BaseSchema` **63**（data-host 60 + ai-bubble/ai-sender/button 3）+ 窗口探针投影 `window as unknown as {...}` **21** + envStub `as unknown as Partial<RendererEnv>` **5** + fetcher/loadDict 方法级 **9** + `as unknown as T` **4** = 102。

**①data-\*-host 76 处与 WA-pages-008（93 处 as never，CX-20 扩围在案）同根因裁定——是，第三波扩围，不重复立案**。同根因证据三层：①同一 seam——宿主侧对象字面量 → `BaseSchema`/`RendererEnv` 契约面的赋值不可直赋（pages 域为 SchemaObject 索引签名 vs interface 嵌套字段；本域剥离实测残错同为 interface 嵌入[ChatToolCall「Index signature for type 'string' is missing」原文]与函数值 prop）；②同一方言演化——pages 用 `as never`、本域用 `as unknown as BaseSchema`，都是同一缺口的社区方言变体，且 scada-editor:171 惯例注释（wa-15b 在案）与本域 13 件 host 无注释全铺互为扩散证据；③同根因修法复用——CX-20 的「SchemaObject 工效缺口契约修」一体覆盖三波位点（StreamApiRequest.data → SchemaInput/registry → 本波 ChatToolCall/函数值 prop），契约修后全部自然消亡。**76 处内部再分峰**：承重亚族 3 处承载位点（data-c8-1 `c8HitlSchema`:145 + data-c8-2 `c82ToolDialogSchema`:93/`c82HitlSchema`:122——schema 级精确，各嵌入 ChatToolCall；c8-1/c8-2 其余六 schema 不含 toolCall、剥离零残错）+ 惯例可去除亚族 57 处 schema 字面（剥离实证零残错）+ envStub 1（c4c3:40→002 车）+ fetcher 2/T 1（→002/004 车）+ 窗口探针 12（→③豁免）；核对 3+57+1+2+1+12=76 ✓。前者是契约修的靶心，后者随车机械清扫。

**②lab 页 21 处 + crud-lab-page-c4c2 5 处逐个定性**：lab 页 21 = schemaLiteral 3（ai-bubble/ai-sender 可去除形[剥离实证] + button 承重形[countDownStorage→CX-20]）+ envStub 3（calendar/resizable vestigial[探针实证不必要] + table 承重形[flaky 形状→002 reshape 后可删]）+ 窗口探针 6（dialog ×3/table/tabs/loop——e2e 契约通道豁免）+ fetcher/loadDict 6（echo 形→004 泛型改写）+ T 2（table:122/:126→002 车）；crud-c4c2 5 = 窗口探针 3（`__c4c2QuickEditProbe`/`__c4c2LoadProbe`/`__c4c2IncludeScopeProbe`——e2e `_probe-crud-row.spec.ts` 消费在案，豁免）+ envStub 1（flaky 形状→002）+ T 1（→002 车）。

**③窗口探针 21 处单列豁免**：`tests/e2e/component-lab/` 56 个 spec 中 14 个直接消费 `__c*` 键（c8-2 经 `__c82${key}` 计算键消费）；探针写入全部带显式投影类型、分槽防覆盖设计注释、bug 73 引注——文档化 e2e 契约通道（wa-15b 误报 #9 判例族），非 type-system bypass 语义。

### B. 135 lab 页同构骨架「刻意模板 vs 可提取共同件」三问句裁定（本批核心）

**裁定：全豁免（刻意模板——共享壳已提取）**；例外位点已单列立案（003/005），不影响族裁定。

- **问句 1 同根因？是——但与 pages 域方向相反**：134/135 页消费同一共享壳 `MultiScenarioLabPage`（e811167a4 2026-04-12 与 lab **同日出生**——kit-first 设计；pages 域是 50+ 份手写装配后才补工厂提案 CX-19）。壳内已收敛：registry/env/SchemaRenderer/formulaCompiler 模块级单例一处装配 + env 覆盖参数通道 + notifyWithToast 接线（a71b6031e IS-labenv-001 修复在案）+ scope-debug 自动挂载。**「demo-env 工厂」在 lab 域已经存在**——这正是 plan 交界防重复③预设的裁定分支：lab 页 env stub 与 pages demo-env 同型性不成立（壳已工厂化），CX-19 扩围不触发（详见 CX 节落字）。
- **问句 2 已漂移？壳面零漂移**——134 页共享同一壳实现，页间差异面 = fixture schema 数据 + 场景文案（声明数据非逻辑）；归一探针 36,971 对的巨量对数是**声明形趋同的统计影子**（title/description/schema 常量的结构同构），非逻辑重复（逐簇人工复核：最大可 Action 簇即 tree 孪生 44 窗→003 立案，其余为 mode 变体对/微壳相似→误报 #5/#6/#7）。数据面零「同宇宙双写」（pages 域 MOCK\_\*↔PRODUCTS 形态在本域不存在——host 间共享数据经 import 单源）。
- **问句 3 提取干净？无需再提取**——共同件已存在且依赖方向健康（playground → @nop-chaos/\* 单向）；再提取只剩「页内 fixture 数据上提」，属声明数据整理非坏味道修复，零立案价值。
- **附注**：壳唯一的域内残差是 env stub 形态方差（四形态并存——泛型正形/echo-cast 形/envStub cast 形/any 形），已按位点拆入 002/004 批内修；「createLabMockFetcher 工厂」方向落字在 004 重构方向，规模不足以独立成 CX。

### C. scope-debug.ts 与 schema-lab-page 实验工具契约面定性

- **scope-debug.ts（55 行）：定性健康，零立案**。契约面三层核验：①renderer 本体是 flux-renderers-basic 一级公民（basic-renderer-definitions.ts:411 注册定义 + schemas.ts:412 schema 类型条目 + `__tests__/scope-debug.test.tsx` 包内测试）——非 lab 私有 hack；②lab 侧 helper（createScopeDebugNode/attachScopeDebugToSchema）是受控 schema 增强：纯函数、不可变拷贝（spread 后追加调试节点）、经 `testid` 可寻址、`COMPONENT_LAB_SCOPE_DEBUG_RENDERER_ID` 与 basic 注册面同字面常量——读形属性窄化 cast（`as { body?: BaseSchema[] }`）为惯用形不入口径（误报 #13）；③历史风险评估在案——a71b6031e（plan 552 IS-8a）recurse-001 撤案先例（scope-debug dump 嵌入数据标签导致审查组误读）证明该工具的观测输出已被interaction-state 轨道校准过。消费面 = 主壳对每场景自动挂载（attachScopeDebugToSchema）+ schema-lab（死件，005）+ scope-debug-lab-page。
- **schema-lab-page（root 64 + shim 1）：定性为死导出化石，已立案 WA-clab-005**。要点复述：全历史零消费 + 携带 pre-IS-labenv-001 no-op notify 旧装配 + 4 包子集 registry 漂移——「活着的状态是错的、死了的状态无人知晓」双态皆不利， successor 裁决二选一（删除优先）。

### D. wa-15a/15b watch/转发条款在 component-lab 的关联位点核验

**结论：本体位点零关联（预期零兑现），一处同族新位点随批登记（watch #1）**。逐条对账落字：

- wa-15a watch #1（env/stream-impl reader.cancel 静默）——本体在 pg-env/stream 域；component-lab 消费面仅 C8_MOCK_ENV（`../../ai/mock-ai-env.js` 经 wa-15a 已审域单源 import），无 reader.cancel 位点。零关联。
- wa-15a watch #2（showcase-env 未知端点静默兜底）/ wa-15b watch #3（m5 createMockFetcher 同族）——本体在 complex-pages/pages 域；**component-lab 存在同族新簇**：mock fetcher 未知 URL 臂静默 `return { status: 0, data: null }`（crudLabEnv:45 / c4c3HostEnv:38 / dialog 三 fetcher / tableHostEnv:129 / protectedImageFetcher:45 / c6c1MarkdownSrcFetcher:87 / c5c2CrudRowFetcher:287 / lazyEnv:100 等 ≥9 位点）——typo 端点呈空数据零信号。**→ 本批 watch #1 登记**（修复须先核 console-baseline 门禁容否；量级与 demo 性质判定随 002/004 同窗口裁量，不入立案）。
- wa-15a watch #3（taskflow getDesignerDoc catch→null）/ #4（App.tsx routeKey stringify）/ #5（confirm-bridge 未挂载恒 true）——pg-taskflow/pg-src-root/pg-complex-pages 域，本域零命中。
- wa-15b watch #1（setState updater 内嵌 setSearchResults）/ #2（textContent 模糊匹配）/ #5（m5 数据对漂移）/ #6（schema 探针三元组）——pages 域形态，本域画像逐文件核过零同形（本域模块级计数器为事件时写入非 render 路径——误报 #12）。
- wa-15b watch #4（render 期模块 ref 写入）——本域零命中（误报 #12 同条核验）。
- wa-15b 承接转发四项（ai-conversations 接线/ai-hitl init/toast 12 处/watch 关联）——全部 pages 域本体已收口，component-lab 零转发位点。

## CX-n 裁定

**本批拟制 0 项 CX-n 新插入 + 1 项 CX-20 扩围登记（第三波）+ 1 项 CX-19 扩围裁定（不触发，落字）**（是否落 roadmap 由主会话执行；共性门槛逐一核对——同根因 ≥2 模块或跨包机制）：

- **CX-20 扩围（拟）第三波：renderer payload/interface 与宿主注入 prop 的 SchemaObject 工效位点（WA-clab-001 承重亚族）**。CX-20 现覆盖 = StreamApiRequest.data（原案）+ SchemaInput/registry 边界 93 处 as never（WA-pages-008 扩围）；本波新增位点 = `ChatToolCall` interface 嵌入 schema 字面（承载位点 data-c8-1 `c8HitlSchema` + data-c8-2 `c82ToolDialogSchema`/`c82HitlSchema` 三 schema，消费面 ai-chat/ai-tool-call）+ 函数值宿主注入 prop（button countDownStorage，**renderer definition field 契约面**——renderer 定义字段=保护区 plan-first）+ 顺带 59 处惯例 cast 机械清扫随车。扩围依据 = 同一根因（SchemaObject 索引签名语义 vs 宿主构造类型）第三位点家族、剥离实测残错定向锁定承重位点、方言演化（as never → as unknown as BaseSchema）自证惯例化扩散；执行批位 flux-core/flux-renderers-ai 契约批，**执行前人工确认门**（与 CX-20 原口径一致）。
- **CX-19 扩围裁定：不触发（落字）**。plan 交界防重复③预设分支「若 lab 页 env stub 与 demo-env 同型，Phase 1 裁定并入扩围」——裁定不同型：pages 域的 demo-env 缺口是「50+ 份手写装配壳、无工厂」；lab 域**壳工厂已存在**（multi-scenario-lab-page，04-12 与 lab 同日出生）且 IS-labenv-001 已修 notify 接线。lab 域残余的 env stub 方差是 mock **fetcher 形状**层面（echo/vestigial/off-contract 三组共 20 处），全部在批内修档可达（002/003/004），不构成「同族同批执行更省」的扩围依据；`createLabMockFetcher` 工厂方向已落字 004 重构方向，若未来 lab 页继续增长使形态再增殖，由当批重新评估。
- **其余核对不触发**：tree 孪生（003）包内单源批内修档可达（WA-pages-005 同判例——不升 CX）；CX-13 不扩围（上游双声明修复责任在 form 包原案，消费面镜像不新增修复责任）；scope-debug 契约面健康不立案（裁定 C）；SchemaLabPage 死件单点不升 CX（005 watch/successor 载体）。**对照 CX-1..20 零重复**：CX-1..18 不涉 component-lab（grep 零命中）；CX-19/CX-20 处理见上——零重复立案。

## watch 微注记（不入立案，本行即登记，不允许静默）

1. **mock fetcher 未知 URL 静默兜底簇（≥9 位点）**——crudLabEnv:45 / c4c3HostEnv:38 / dialog:86/:212/:235 / tableHostEnv:129 / protectedImageFetcher:45 / c6c1MarkdownSrcFetcher:87 / c5c2CrudRowFetcher:287 / lazyEnv:100 等：未知端点静默 `return { status: 0, data: null }`，schema 端点 typo 呈空数据零信号——wa-15a watch #2 / wa-15b watch #3 同族第三批位点。修复（未知前缀 console.warn 一次）须先核 console-baseline 门禁容否；随 002/004 批内修同窗口裁量。
2. **button-lab-page:11 get 臂 catch 无注释**——set/remove 臂有「ignore quota / private mode」注释而 get 臂裸 `return null`；下次触碰该文件补一行同款注释（async 门禁豁免的文档完整性）。
3. **orgTreeOptions 双写漂移通道**——input-tree↔tree-select 27 行数据镜像无一致性守卫；任一侧编辑字段将使两页树 demo 静默分叉（误报 #8 豁免的配套 watch）；随 WA-clab-003 工厂化顺带单源后自动消解。
4. **host 模块级 fetch 计数器 ×6**（requestOwnedFetchCount / clientModeFetchCount / c4c2FlakyFailures / c4c3UserFetchCount / c4c3FlakyFailures / lazyFailFirst + lazyFailCalls Map ×2）——e2e 断言依赖模块单例跨用例累计语义；若未来 lab 路由改按需加载策略或引入模块重载型测试，计数断言需复核（误报 #12 配套）。
5. **SchemaLabPage 若裁定保留（非删除）**——必须补 IS-labenv-001 同款 notifyWithToast 接线并对齐 9 包 registry，否则 toast 盲区类缺陷在其消费面复活（WA-clab-005 备选路径的强制约束）。

## 批内修复候选清单（供 Phase 2 执行会话）

| 发现 ID     | 严重度 | 建议去向                  | 修复要点                                                                                                                                                                                                                                                | 约束/验收判据                                                                                                                                                                                                                                                                                 |
| ----------- | ------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WA-clab-002 | P2     | 批内修                    | 9 处 fetcher 失败形状 reshape `{status:500/404, msg?, data}`（**保 data.message 不动**——错误展示链读 response.data 作 errorPayload，删 data 会变文案）；`ok`/`error` 死字段删除；顺手删 envStub/T cast（c4c2:60/c4c3:40/table:131 + :51/:31/:122/:126） | 56 个 component-lab e2e spec 全绿（c4c2/c4c3 flaky-retry、input-tree lazy-fail-retry、input-file/input-image upload-fail、dynamic-renderer error state、c6c1 markdown-missing 判别断言在案）；typecheck 直通（cast 删除本身即类型面验收）；`grep '"ok: false"' component-lab`=0（fetcher 面） |
| WA-clab-003 | P3     | 批内修                    | 提取 `renderers/tree-lab-host.ts`（createLazyTreeHostEnv 工厂每次返回新鲜 lazyFailCalls + orgTreeOptions 单源导出）；两页改引；`(api:any, ctx:any)` 随工厂收敛为收窄注解一处                                                                            | identity 判别测试先红后绿（两页 env 工厂同源断言）；input-tree/tree-select 相关 e2e 直通；orgTreeOptions 单源后 watch #3 自动消解                                                                                                                                                             |
| WA-clab-004 | P3     | 批内修（随 002/003 同车） | ①9 处 echo-fetcher 改泛型直写形 `async <T,>(api: {url?; data?}) => ({status:0, data: api.data as T})`（Case F 实证零 cast）②calendar/resizable no-op stub 删 cast（或逐页裁量删整个 stub）③T 形 ×4 随 002 车；createLabMockFetcher 工厂方向落字不动实施 | playground typecheck/lint 直通；dialog/loop/tabs/image/c5c2/c6c1 涉事页 e2e 直通（echo fetcher 均挂判别断言）；探针窗口 cast ×21 **不动**（e2e 契约通道豁免）                                                                                                                                 |
| WA-clab-005 | P3     | watch/successor           | 本批不动（index.ts:2 导出面条款②阻却）；successor 载体裁决删除优先（删 root 64 行 + shim 1 行 + index 导出行）或保留则强制接线对齐（watch #5 约束）                                                                                                     | 删除路径验收 = typecheck/build/lint/test 直通 + 枚举口径复核（135 页口径去虚）；保留路径验收 = notify 接线判别测试（IS-labenv-001 同款）                                                                                                                                                      |
| WA-clab-001 | P3     | CX-20 扩围（第三波）      | 本批不动；承重亚族契约修 + 59 处机械清扫随车                                                                                                                                                                                                            | roadmap CX-20 扩围条目 + ledger CX 去向；执行前人工确认门（renderer definition field + flux-renderers-ai 契约面=保护区）                                                                                                                                                                      |

**批内修合计 3 条位点车**（P2×1 + P3×2[003/004]，004 随 002/003 同车执行）+ watch/successor 1 条（005）+ CX 扩围 1 条（001）；watch 微注记 5 条（行即登记）；`apps/playground/package.json` 全批零变更路径（无依赖面触碰）；**零 P0/P1 → 双哨兵条款预判不触发**（002/003/004 均为组件外 mock/fixture 面+包内共享件提取，不触及模块顶层求值路径——若执行中发现某修复需上提模块级初始化，当场触发条款并披露）；其余为注释/探针豁免面。

## 批内修复记录（Auto-Remediation）

> 本报告为 review-only 取证产出；本节由 Phase 2 执行会话按 roadmap 自动修复契约 §2–§4 回填（每项验证临时方案本体已删除）。

| 发现 ID     | 严重度 | 修复方式                                                                                                                                                           | 回归测试（红→绿证据）                                                                                                                                                                                                   | 本体删除验证                                                                                                                                                       | commit           |
| ----------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| WA-clab-002 | P2     | fix（9 处失败形状 reshape 契约形 status:500/404+msg+data[data.message 全保]；ok/error 死字段删；envStub cast ×3+T 形 ×4 随车消亡）                                 | 契约化验收 grep `ok: false`（带引号形）=0[全域裸 ok:false 仅剩 c5c1 action on-contract 豁免例]；`error: 'simulated` =0；typecheck 直通（cast 删除即类型面验收）；错误文案链零变化[data.message 保留论证见 finding 正文] | off-contract 形 ×9 全数消亡                                                                                                                                        | （本批收口提交） |
| WA-clab-003 | P3     | fix（提取 renderers/tree-lab-host.ts createLazyTreeHostEnv 工厂[新鲜 lazyFailCalls+orgTreeOptions 单源+收窄注解一处]两页改引，孪生 28 行 ×2+镜像 27 行 ×2 全删）   | identity 判别测试 4 用例（红=模块不存在导入失败→绿 4/4；含工厂新鲜态/双页独立性/懒加载契约/002 契约形判别）                                                                                                             | 两页本地 lazyEnv/orgTreeOptions 删除 grep=0；watch #3 随单源自动消解                                                                                               | （本批收口提交） |
| WA-clab-004 | P3     | fix ①②③（echo-fetcher 8 处 Case F 泛型直写形[方法级双跳 ×8 消亡]/calendar+resizable 无 ajax stub 整删/T 形 ×4 随车[table:126 落正形 as T]）；④工厂方向落字不动实施 | typecheck/lint 直通；探针窗口 cast ×21 未动（e2e 契约通道豁免）                                                                                                                                                         | `as unknown as Partial<RendererEnv>` 5→0；`as unknown as T` 4→0；方法级双跳 9→1[唯一残留=dialog:106 loadDict 承重亚位点，停手裁定并入 001/CX-20——见 plan Deferred] | （本批收口提交） |
| WA-clab-005 | P3     | watch/successor（本批不动——index.ts 导出面条款②阻却）                                                                                                              | 不适用                                                                                                                                                                                                                  | 不适用                                                                                                                                                             | —                |
| WA-clab-001 | P3     | CX-20 扩围第三波（本批不动；执行期新增承重位点 dialog:106 loadDict 并入）                                                                                          | 不适用                                                                                                                                                                                                                  | 不适用                                                                                                                                                             | —                |

## 台账回写核对

- 本批新增 findings：**5 条**（WA-clab-001/002/003/004/005——`WA-clab-` 前缀 live 核验 ledger 零命中，零撞号）
- modules 行翻转 audited：pg-component-lab（单行；批次 WA-15c；reconcile 后预期 uncovered 0）
- 台账登记/翻转与 roadmap WA-15c 状态回写归主会话执行（本报告 review-only 不写台账）
- 探针脚本归档：`_tmp/wa15c-loc-reconcile.mjs`（三口径对账）/ `_tmp/wa15c-baseline-probe.mjs`（基线复现）/ `_tmp/wa15c-cast-classify.mjs`（102 四族分类）/ `_tmp/wa15c-dup-probe.mjs` + `_tmp/wa15c-dup-probe-normid.mjs`（重复双版）/ `_tmp/wa15c-walk.mjs`（结构走读画像）/ `_tmp/wa15c-inventory-files.txt`（对象清单）/ `_tmp/wa15c-commit-sample.txt`（考古样本）；临时剥离实证副本已清理（`_tmp/wa15c-striplab` 等），保留脚本可复跑
