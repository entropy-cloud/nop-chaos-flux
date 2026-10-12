# WA-15a playground 消费侧批一（complex-pages + taskflow-designer-lib + designer-hosts + ai + env + src 根级散文件）临时方案与坏味道审计报告

> 批次: WA-15a（roadmap `docs/backlog/workaround-code-smell-audit-roadmap.md` Phase Status 对应行）
> 审计方法: `docs/skills/workaround-code-smell-audit-prompt.md`（九类信号 A–I + W1–W6 + §5 取证协议）
> 执行 plan: plan 576（`docs/plans/576-workaround-audit-wa15a-playground-1-plan.md`，draft review R1 revised 共识稿）
> 审计日期: 2026-10-12
> 对象清单来源: `docs/audits/workaround-code-smell/inventory/modules.json`（批次 = WA-15a 行，不手抄）
> 取证模式: **review-only**（本报告由独立取证 agent 产出；批内修复归 Phase 2 执行会话，台账登记归主会话——本报告不改任何源码/测试/台账，探针脚本落 `_tmp/wa15a-*`）

## 快照基准注记

plan 576 基线记载 HEAD = `07cf78dd2`（WA-14 收口提交）；本报告取证实跑时 HEAD = `07cf78dd2bdba12c0183e0eb2d2a46aa559bf8cd`，**基线与实跑同锚**。六模块**零在途**：主工作树并行会话在途变更（runtime/core/data/form/layout + docs 14 文件）与 `apps/playground/src` 零交集（`git status -s` 无一 playground 源文件），live = HEAD。

**三口径行数逐文件分解**（67 文件逐一 `wc -l` 对照 inventory `path:loc` 后缀，脚本化比对）：

| 口径           | 全集行数 | 说明                                                                                                    |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| inventory 口径 | 13,863   | WA-0 枚举器值（complex-pages 7,399 + taskflow 2,213 + dhosts 80 + ai 1,171 + env 438 + src-root 2,562） |
| live wc        | 13,863   | = inventory **逐文件零差**（67/67 吻合，零在途漂移；六目录非测试 11,301 + src-root 17 件 2,562）        |
| HEAD wc        | 13,863   | = live（零在途）                                                                                        |

**基线候选全部复现**（grep/门禁实跑与 inventory + plan 576 Baseline 逐 file:line 吻合）：literalEn **0** / literalZh **0**（六模块非测试与测试面双双全零——wa-10 起连续第七个双零批组）+ typeBypass 非测试 **14**（complex-pages 1[showcase-env.ts:230] + taskflow 2[index.ts:85/:115] + ai 4[openai-connector:52/:63、coverage-connectors:115、mock-ai-env:159] + env 7[stream-impl ×6 + socket-impl:104]，测试面命中 ×14 全在 `__tests__`/`*.test.ts` 夹具构造，正确排除）+ setTimeout 非测试 **7**（全在 ai/：tool-mock:44、coverage-connectors:46/50/71、mock-ai-env:119/130/139）+ domRaid **1**（main.tsx:20 `getElementById('root')`）+ keyRemount/pixelNudge/testEnvBranch/silentCatch 四探针全零。

**门禁交叉实跑读数**（prompt §5 第 5 步留痕，六模块过滤）：

| 门禁                                   | 读数                                                                                                                                                                                   | 处置                                                                                                                                                                                                                                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check:audit-async-failure-paths`      | playground 全域 **48 行**；六模块子集 **7 行**（ai/local-storage-storage:47 + env/stream-impl:233 + taskflow dsl:74 + index:49/:400 + theme:29/:57）——plan 预估「约 5 行」实跑修正为 7 | 7 行逐个定性：**6 处豁免**（in-band 协议 ×3[stream-impl 网络错误契约/tryParseJson null 协议/invoke wrapper {ok:false,error}] + 跨信任边界降级注释在案 ×2[theme 双 catch/local-storage-storage] + taskflow getDesignerDoc 降级语境合法）+ **1 处 watch 微注记 #3**（getDesignerDoc 异常与合法空态不可区分） |
| `check:audit-performance-suspects`     | playground 全域 **10**；六模块子集 **4**（App.tsx:247 + env/stream-impl:48/:72/:76）——plan 预估「约 3」实跑修正为 4                                                                    | 3 行为表单序列化必需 stringify（豁免，误报 #3）+ 1 行 App routeKey（watch 微注记 #4，误报 #4）                                                                                                                                                                                                             |
| `check:audit-reactive-render-reads`    | **0**                                                                                                                                                                                  | 实跑确认                                                                                                                                                                                                                                                                                                   |
| `check:audit-runtime-raw-schema-reads` | **0**                                                                                                                                                                                  | 实跑确认                                                                                                                                                                                                                                                                                                   |
| `check:audit-hardcoded-type-dispatch`  | **0**                                                                                                                                                                                  | 实跑确认（taskflow buildProps/createDefaultProps/lowerCommonStep 均判别联合完整分派）                                                                                                                                                                                                                      |
| `check:audit-renderer-browser-io`      | **0**                                                                                                                                                                                  | 实跑确认（theme/local-storage-storage 的 localStorage 为 app 宿主面非 renderer 包；`window.__*` 命中全为 mock e2e 观测契约通道，误报 #11）                                                                                                                                                                 |
| `check:oversized-code-files`（六模块） | ≥500 行非测试源 **2 件**（showcase-env.ts 582、domain-route-entries.ts 565）——与 plan 登记债口径逐字吻合                                                                               | 2 件**全读**（逐行，见覆盖声明）；无新增超限                                                                                                                                                                                                                                                               |

## 覆盖声明（Coverage Declaration）

> 本节是台账 modules 行 `pending → audited` 翻转与 `pnpm workaround:reconcile` 结构校验的依据。

| 模块 id                  | 文件数 | 非测试行数                                          | 取证完成 | 备注                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | ------ | --------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| pg-complex-pages         | 33     | 7,399（inventory）/ 7,399（live wc）/ 7,399（HEAD） | ✅       | 33/33 **全文覆盖读取**（零抽样）：≥500 行 1 件全读（showcase-env.ts 582 逐行——fetcher 大分支 + env 通道面）+ 行为面 9 件逐行精读（model/registry/showcase/index/page-data/schema-page + shared confirm-bridge/page-frame/render-host）+ mock-backend 族 23 件全文（core 486 + airtable 族 5 + antdpro + cal + linear 族 3 + notion 族 5 + stripe 族 5 + sundial 族 2）；page-schemas/\*.json 与 mock-backend-\* 行为面按 plan 条款取证（JSON 本体不立「坏味道」案）            |
| pg-taskflow-designer-lib | 7      | 2,213（inventory）/ 2,213（live wc）/ 2,213（HEAD） | ✅       | 7/7 **全文覆盖读取**（本批最重结构面）：index 448 / sync 421 / dsl 362 / lowering 266 / validation 262 / types 261 / projection 193 全部逐行；`as unknown as` ×2 编译探针复现（`_tmp/wa15a-compile-probe/probe.ts`——直接注解可编译，断言可删）                                                                                                                                                                                                                                 |
| pg-designer-hosts        | 1      | 80（inventory）/ 80（live wc）/ 80（HEAD）          | ✅       | 1/1 **全文覆盖读取**：registry-factory.ts（P4.4 plan 558 recipe 声明式工厂——五 recipe 常量表 + 单循环消费，零信号）                                                                                                                                                                                                                                                                                                                                                            |
| pg-ai                    | 7      | 1,171（inventory）/ 1,171（live wc）/ 1,171（HEAD） | ✅       | 7/7 **全文覆盖读取**：mock-ai-env 226 / coverage-connectors 150 / tool-mock 126 / local-storage-storage 88 / openai-connector 69 / ai-coverage-example 284（schema 声明体）/ ai-widgets-fixture 228（fixture 数据 + 锚注释密度极高的 D1/D5 契约面）；setTimeout 7 + typeBypass 4 逐个定性；WA-11 装配链取证（见承接转发节）                                                                                                                                                    |
| pg-env                   | 2      | 438（inventory）/ 438（live wc）/ 438（HEAD）       | ✅       | 2/2 **全文覆盖读取**：stream-impl 311 + socket-impl 127 逐行；typeBypass 7 + async 1 + perf 3 逐个定性——**零立案**（全部动态边界/facade/契约形态，见误报 #2/#3/#8；env 前缀零使用仅翻转）                                                                                                                                                                                                                                                                                      |
| pg-src-root              | 17     | 2,562（inventory）/ 2,562（live wc）/ 2,562（HEAD） | ✅       | 17/17 **全文覆盖读取**：≥500 行 1 件全读（domain-route-entries.ts 565——62 条目声明目录）+ App 262 / domain-route-pages 286 / form-route-entries 375 逐行 + 其余 12 件全文（main 24 / theme 90 / theme-switcher 40 / use-route 33 / route-model 121 / home-cards 46 / 6 个 route 目录件）；模块顶层求值面单列定性（main.tsx:13 initFluxI18n 先行 init 半边 + App.tsx:78-107 registry/debugger 顶层装配——init 链见承接转发节，registry 装配为 app 壳契约位[wa-14 面已核其消费]） |

全集 **67/67**（13,863 行，无抽样档）。重复块探针双版（`_tmp/wa15a-dup-probe.mjs` 逐字版：12 行窗 + 熵 ≥3.2 + 可执行行占比 ≥0.5，67 文件 12,502 窗 → **56 组跨文件对命中 / 5 个文件对**；`_tmp/wa15a-dup-probe-normid.mjs` 标识符归一版：熵 ≥2.6，9,527 窗 → **4,355 对 / 44 文件对**）。逐字 5 对人工同构复核：linear-detail↔linear-issues 25 窗（34 条标题数组复制——**坐实 WA-cpages-004**）+ projection↔sync 15 窗（findContainer 逐字孪生——**坐实 WA-taskflow-001** 三份之一）+ dsl↔lowering 14 窗（DSL 形状镜像——并入 **WA-taskflow-003**）+ antdpro↔linear-issues 1 窗（paginate 四胞胎——并入 **WA-cpages-002**）+ coverage-connectors↔mock-ai-env 1 窗（importLoader 双写——并入 **WA-pgai-002**）；归一 44 对按簇核对：fetcher-branch 骨架族（airtable↔notion 34 + airtable↔linear 18 + linear↔notion 17 + airtable↔stripe 8 + notion↔stripe 4 + linear↔stripe 2——**坐实 WA-cpages-002**）、validation 自身 18 窗 + sync 自身 16 窗（同文件孪生对——并入 WA-taskflow-003），其余大簇为路由目录/mock 数据声明表（纯数据豁免，误报 #18）。

## 逐条发现（Findings）

> 每条按 12 字段模板 + **归属裁定**字段（roadmap Cross-Cutting 归属裁定规则 = 本批第一裁定维度）；全量登记归主会话写入 `docs/audits/workaround-code-smell/ledger.md`（ID `WA-cpages-001`/`WA-taskflow-001`/`WA-dhosts-001`/`WA-pgai-001`/`WA-pgenv-001`/`WA-pgroot-001` 起三位零填充，live 核验六前缀零撞号），本节与台账一一对应，零静默。
> ID 编排说明：立案 **13 条 = P2 ×5 + P3 ×8；零 P0/P1；pg-designer-hosts / pg-env 零立案**（dhosts 80 行声明式工厂零信号；env 14 候选全豁免——零立案仅翻转）。严重度按本批任务口径映射（P0/P1=行为缺陷；P2=结构性复制漂移/W4 静默守卫族；P3=沉积/注释/命名）。

### WA-cpages-001 [I 邻·双写覆盖] PAGE_DATA['cal-booking'] 同键双写、后写静默吞掉先写：ux-r12 CP-6 种子出生即死

- **位置**: `apps/playground/src/complex-pages/page-data.ts:17-21`（CP-6 种子块 `calDate: '2026-09-03'`）↔ `:128-132`（P3a 块 `{ calTimezone, cal24h }`——模块求值序在后，整体覆盖前者）
- **信号类别**: I 邻（死代码 + 同注册表键双写）+ W5（死块带强说服力注释，编辑者无法从局部判断其无效）
- **严重度**: **P2**（判据：结构性双写覆盖 + W5 违约 + 误导性高；**行为面零缺陷**——同 commit 的 schema 级 `"date": "2026-09-03"` 锚定承担了全部职能，故不入 P0/P1）
- **现状**: page-data.ts 对同一 `PAGE_DATA['cal-booking']` 键先后两次整对象赋值；求值序使 ：19-21 的 `calDate` 种子恒被 :129-132 覆盖，最终对象只含 `calTimezone/cal24h`。
- **按住的根因**: 无现行根因——被按住的问题（ux-r12 CP-6「月历显示当月而选中日期在 9 月」）已由**同一 commit 在 schema 侧根治**（cal-booking.json calendar 节点 `"date": "2026-09-03"` + mock `CAL_DEFAULT_DATE` fallback 双保险）；page-data 种子是同一修复波冗余的第二落点，且因插入位置在前、执行在后而出生即死。
- **考古**: `f823efd9d`（P3a Cal.com 复刻）在文件尾出生 ：128-132 块；`02fc0bb71`（ux-r12 CP-6，2026-10-02）在文件头插入 ：17-21 种子块并在同 commit 给 schema 加 `"date"` 锚定——`git show` 双 hunk 证实；此后零波触及。cal-replica-visual.spec:71 断言的选中日期文本由 mock payload 承载，与死种子无关。
- **违约基准**: W5（删掉这段会怎样——答：什么也不变，且无法局部回答）、W2 邻（无出口登记；注释声称的职能实际由 schema 履行）。
- **为什么是临时方案**: 症状消失（CP-6 已修）+ 根因已另址根治（schema date）+ 本体残留无出口——三要素满足「残留型」而非「按住型」。
- **风险**: 后续编辑者按 ：17-21 注释改锚定日期 → 零生效（真值在 schema），排障成本兑付；第三处同键赋值继续累积的先例效应。
- **重构方向**: 删 ：16-21 死块（schema `"date"` 字段为锚定唯一事实源）；回归 = e2e cal-replica-visual 直通 + 新增判别测试断言 `PAGE_DATA['cal-booking']` 键集恒等 `{calTimezone, cal24h}`（先红后绿：先对现态断言发现键集与块序一致，再删死块保持绿——防第三写复活）。
- **归属裁定**: **demo 接线**（playground 演示数据装配自身的赋值结构问题；renderer 无涉）→ **批内修**。
- **ROI 裁定**: 立即重构（删除 + 一个判别测试，约 15 分钟档）。
- **误报排除复核**: 不是合法多页注册——`PAGE_DATA` 为 `Record<string, …>` 单值映射，同键必须单写；也不是 React/JS 重载语义——对象字面量赋值无合并语义。

### WA-cpages-002 [H·结构性] 复刻 mock 后端 fetcher-branch 骨架族 7 份手写：read 闭包/endpoint 计数钩子/patch 解包/paginate/回退语义逐份重抄

- **位置**: `shared/mock-backend-antdpro.ts:392-469` ↔ `mock-backend-cal.ts:343-499` ↔ `mock-backend-linear.ts:366-474` ↔ `mock-backend-notion.ts:141-264` ↔ `mock-backend-airtable.ts:93-199` ↔ `mock-backend-stripe.ts:89-201` ↔ `mock-backend-sundial-branch.ts:13-233`（七域 fetcher branch）+ 分散件：`read()` 三源合并闭包逐字 ×6（antdpro:409-412 / cal:369-372 / linear:375-378 / notion:207-210 / airtable:144-148 / stripe:142-145）、`patchSource` 解包 `input.patch && typeof … ? input.patch : input` ×6（airtable-writes ×2 / linear-issues:380 / notion-writes ×3）、`paginateXxx` 四胞胎（antdpro:152 ↔ linear-issues:233 ↔ notion-records:163 ↔ airtable-records:253 同语义）+ showcase-env 内联分页三连（:126-141 Department/Tag 与 users 内联）、`asNumber` 三胞胎（showcase-env:24 ↔ antdpro:278 ↔ sundial-branch:7 逐字）、`countXxxEndpointCall` 五份两形（airtable/linear/notion/stripe 独立函数 vs antdpro/cal 内联）、`nowStamp` 族三形
- **信号类别**: H（同一基础设施[mock fetcher-branch 骨架]按批复制的家族式增长）+ 已漂移
- **严重度**: **P2**（判据：≥3 份同根因按 §3 P1 起评；无行为缺陷且各份 failure-path 表在各自 plan 有登记 → 按任务口径归 P2 结构性复制；**家族内语义漂移已现**——未知端点回退三态并存：airtable/notion 未知写端点 `{status:1,ok:false}`、linear/sundial 未知端点返回 `null`（由 showcase-env 兜底为 `{status:0,data:null}` 静默）、stripe/antdpro 混合；e2e 钩子实现两形）
- **现状**: 七个复刻批次（P2a→P7a，2026-08-29→08-30 七个 plan）各自照抄上一批「precedent」落一份完整 branch 骨架；共同件（read 闭包/paginate/计数钩子/patch 解包/id 生成 `nextXxxId` max-reduce 形 ×4/占位记录构造 ×3）从未提取。
- **按住的根因**: 「showcase-env.ts 700 行硬门」迫使每批把 branch 沉到独立文件，但**提取共享原语的动作从未做**——每批以「再抄一份」绕开结构收敛；探针归一 83 窗跨 6 文件对为族级证据。
- **考古**: 逐文件出生：`2b3fa8d9a`(P2a)→`f823efd9d`(P3a)→`cd86e9686`(P4a)→`ae78657c4`(P5a)→`2c1488b4e`(P6a)→`ab7b98687`(P7a)→V12f sundial 拆分——七波各自 full-green，注释互引「XXX precedent」自证复制链。
- **违约基准**: W3（同类逻辑份数=7，新复刻批次必然第 8 份）+ H 已漂移（回退语义/钩子形态）。
- **风险**: 第 8 个复刻域（若来）继续复制；跨域行为一致性靠人肉对齐（同情境三种回退已是证据）；修一个骨架 bug 需 N 处同步。
- **重构方向**: 提取 `shared/mock-backend-replica-kit.ts`（createReplicaBranch({prefix, onCall?, read/write handlers}) + readParam 闭包 + paginateRows + unwrapPatch + optInTestHooks 工厂），七 branch 改薄壳；回归 = mock 单测全量（airtable 13 + stripe 15 + 各族既有）直通 + 每域 1 条回退语义判别测试钉住统一裁定。
- **归属裁定**: **demo 接线**（playground mock 基础设施自身的收敛缺口；renderer 无涉）→ 体量超低成本档（7 文件 ~2,900 行重构）→ **不批内硬修，登记 CX-n/独立 successor**（修复执行可随 WA-15b/15c 收口波或独立批）。
- **ROI 裁定**: 排期进 plan（CX-n 拟制条目见 CX 裁定节）。
- **误报排除复核**: 各域**端点语义**（筛选/分页/写协议字段）是复刻对象差异，非可提取重复——本案只收骨架共同件；`clone`/`FetcherApi` 等已单源（mock-backend.ts）证明提取方向在本包成立。

### WA-taskflow-001 [H·结构性] 容器查找三份手写：findContainerById 三胞胎，其中两份带「条件+返回」双递归低效形态

- **位置**: `taskflow-designer-lib/index.ts:407-425`（findContainerById）↔ `projection.ts:27-49`（findContainer + findContainerRecursive）↔ `sync.ts:155-177`（findContainer + findContainerRecursive——与 projection **逐字孪生**，探针 15 窗）
- **信号类别**: H（同一机制按文件复制三份）+ 已漂移
- **严重度**: **P2**（判据：≥3 份同根因 → §3 P1 起评；无行为缺陷 → 任务口径 P2；**漂移证据**——projection/sync 的 workflow 臂 `if (node.step.body && findContainerRecursive(…)) return findContainerRecursive(…)` 对命中子树遍历两次（O(n²) 形态），index 份单调用——同一逻辑两种遍历成本并存）
- **按住的根因**: projection/sync/index 三文件分批落笔（plan 547/556 交互波），每文件各自需要容器查找即各自手写；无共享层。
- **考古**: 三文件均 plan 547（taskflow-1）波成形（index.ts 头注与 sync.ts 注释锚在案）；`git log --follow` 三文件同波进入 taskflow-designer-lib。
- **违约基准**: W3（三份）+ W5 邻（双递归形态无人指出 = 无人通读）。
- **风险**: 容器查找语义变更（如 ownerStepId 路径）需三处同步；双调用在深嵌套模型上放大遍历成本。
- **重构方向**: 提取单源 `findContainerById(model, containerId)`（types.ts 或新 container-search.ts 导出），三处改引并消除双调用；回归 = playground taskflow 既有套件直通 + 嵌套容器 projectToGraphDocument 判别用例；`grep -c "findContainerRecursive" taskflow-designer-lib` 收敛到 1。
- **归属裁定**: **demo 接线**（playground 宿主库内部）→ **批内修**（包内提取，~30 分钟档）。
- **ROI 裁定**: 立即重构。
- **误报排除复核**: 三份不是巧合相似——同模型同遍历目标，逐字探针证实两份完全相同。

### WA-taskflow-002 [D] index.ts bootstrap 双跳断言 `as unknown as TaskFlowAuthoringModel` ×2：类型可直答，断言为残留

- **位置**: `taskflow-designer-lib/index.ts:79-86`（bootstrapTreeModel）+ `:110-115`（graph bootstrap 字面量）
- **信号类别**: D（type-system bypass 形态；编译探针证实两侧真实类型**满足**契约）
- **严重度**: P3（判据：机械删除断言 + 直接注解，零行为面）
- **现状**: 两个 bootstrap 字面量经 `as unknown as` 双跳压掉检查；`_tmp/wa15a-compile-probe/probe.ts`（复刻类型后直写注解）`tsc --strict` **编译通过**——断言销毁的是本来不需要销毁的证据。
- **按住的根因**: 疑为 plan 547 波 bootstrap 初稿时模型类型与字面量曾有出入，类型演化后断言未回收（类型残留型 bypass）。
- **考古**: bootstrap 注释锚 plan 547 (taskflow-1)/plan 556 (taskflow-002)；两 cast 随同波落笔，其后零波触及。
- **违约基准**: W5（断言存在理由不可答）。
- **重构方向**: 两处改直接 `const model: TaskFlowAuthoringModel = {…}`（探针已证可编译）；回归 = `pnpm --filter @nop-chaos/flux-playground typecheck` 直通 + 既有 taskflow 测试直通。
- **归属裁定**: **demo 接线** → **批内修**。
- **ROI 裁定**: 立即重构（分钟级）。
- **误报排除复核**: 与 WA-industrial-003（46 处 geometry cast 族）不同型——那里是真实结构缺口需收窄，这里类型已满足、纯残留。

### WA-taskflow-003 [H 微·清单合并] taskflow 域微重复清单（守卫三胞胎/DSL 镜像对/validation 孪生对/树走四件/payload 解包惯用形）

- **位置**: ①类型守卫三胞胎 `dsl.ts:360-362 isValidStepType` ↔ `sync.ts:26-28 isTaskFlowStepType` ↔ `validation.ts:10-12 isKnownTaskFlowStepType`（同一体 ×3）；②DSL 形状镜像对 `dsl.ts:30-69 NopDSLStep` ↔ `lowering.ts:10-51 NopTaskStep`（~40 行 ×2；漂移化石=lowering 份混入 `enterSteps?/exitSteps?` **task 级字段**（:40-41）——从 DSL-input 接口复制时带入 step 形状，永不被 step 写入）；③validation 分支校验孪生对 `validation.ts:148-177`（validateStep 内）↔ `:223-250`（validateTreeSteps 内）（case-match 去重 + otherwise 唯一性 ~25 行 ×2）；④树走四件 `sync.ts:244-264 collectStepsFromTree` ↔ `:266-286 collectStepsFromBranch`（~20 行逐字孪生，仅递归目标不同）+ `projection.ts:169-180 extractStepsFromTree` ↔ `:182-193 extractStepsFromBranch`（~11 行 ×2）；⑤invoke() payload 解包惯用形 `(payload?.model ?? authoringModel) as …` ×4 对（index.ts:175/:184/:193/:204）
- **信号类别**: H 微（同包内多份手写合并登记——wa-13a 微重复清单/industrial-008 先例）
- **严重度**: P3（判据：多为 ≤25 行微重复、零现行漂移；②的化石字段是最实际的漂移证据）
- **考古**: 全部随 plan 547/556 两波落笔（三文件同批成形，dsl↔lowering 镜像为 parse/lower 对偶的复制实现）。
- **重构方向**: ①守卫单源到 types.ts（导出 isTaskFlowStepType）三处改引；②NopTaskStep 改 `Omit<NopTaskStep…>` 共享或显式声明独立并删化石字段（执行期拍板：parse/lower 对偶是否合并声明）；③提取 `validateBranches(step.branches, errors, path)`；④`collectStepsFromBranch` 自递归消 Tree 变体（Tree 版首步后即同构）；⑤提取 `resolveInvokePayload(payload)`。回归 = taskflow 既有测试直通。
- **归属裁定**: **demo 接线** → 批内修候选（①④⑤低成本可并车；②③中成本随批裁量，允许部分挂账 watch——**不允许全部静默**）。
- **ROI 裁定**: 立即重构（①④⑤）/ 排期裁量（②③）。
- **误报排除复核**: parse/lower 对偶的字段映射本体（buildProps ↔ lowerCommonStep）是互逆语义非重复——不入清单。

### WA-pgai-001 [I 邻·失实注释] createAiImportLoader 头注声称「P1 exposes a conversation controller helper via `${$ai.controller}`」——本体从未存在且消费面已改道（双重失实，WA-11 装配链在案证物）

- **位置**: `apps/playground/src/ai/mock-ai-env.ts:192-195`（失实注释本体）；同族失实对照 `pages/ai-conversations-demo.tsx:41-43` 头注（**WA-15b 域**，转发注记）
- **信号类别**: I 邻（描述不存在能力的注释化石）+ WA-11 承接转发条款位点
- **严重度**: P3（判据：误导性文档沉积，零行为面；但它是 WA-11 转发链的取证锚点，勘误价值高于一般注释）
- **现状**: 注释称 loader 暴露 controller helper 供 schema 以 `${$ai.controller}` 绑定；实况三层失实：①`createExpressionHelpers` 只返回 `connectors/tools/toolExecutor`，**无 controller**；②`ai-conversations-example.json` 全文零 `$ai` 引用（实际绑定走 page-data `conversationController: "${controller}"` 相对读）；③plan 549（IS-ai-conversations-001/bug-163 缓解）后 schema **已不再声明 xui:imports**——loader 声称的绑定通道整个改道。
- **按住的根因**: c8826c321（P1 demo，2026-07-23）出生即此注释（`git show` 证实 :92 原文在案）——能力以注释先行、实现未跟；549 改道波未回扫注释。
- **违约基准**: W5（注释职能不可考）+ W2 邻（无出口）。
- **重构方向**: 注释改写为实况（「connector/tools/toolExecutor 经 `ai://` loader 暴露；controller 由宿主经 page-data 注入——见 pages/ai-conversations-demo」）；pages 侧半边（:41-43 同款失实）**转发 WA-15b**。
- **归属裁定**: **demo 接线（文档面）** → 批内修（注释勘误）；renderer/runtime 契约面不涉。
- **ROI 裁定**: 立即（注释一处改写）。
- **误报排除复核**: 不是「描述设计意图」的说明性注释——它描述的是一个可查证为假的导出面（W1 意义上指不出任何被按住的根因，属根因失传的注释变体）。

### WA-pgai-002 [H·结构性] AI/展示域 env 装配件三份手写：notify toast 路由 ×3（**单源 `notifyWithToast` 已存在、5 消费者已接，此三份未接**）+ importLoader/buildRequest 形状双写

- **位置**: notify 路由逐字 ×3：`ai/mock-ai-env.ts:180-186` ↔ `ai/coverage-connectors.ts:100-106` ↔ `complex-pages/shared/showcase-env.ts:514-520`；**既有单源** `pages/notify-toast.ts` `notifyWithToast`（逐字同逻辑；消费者 component-lab/multi-scenario-lab-page + pages/taskflow-designer-page + report-designer(-host)-demo + map-demo ×5）；附属双写：importLoader module 形状 `mock-ai-env.ts:204-225` ↔ `coverage-connectors.ts:126-149`（load('ai://') + resolveImportUrl 骨架同构，探针 1 窗）+ `buildRequest` data cast 形 ×3（见 WA-pgai-003）
- **信号类别**: H（三份逐字 + 单源在案未接——W3 最强形态：一处改动早已全局生效的能力已存在）
- **严重度**: **P2**（判据：3 份同根因 + 单源未采纳；零漂移[三份与单源逐字一致]——恰恰证明收敛零风险）
- **考古**: 三份出生早于单源：mock-ai-env `c8826c321`（2026-07-23）/ coverage-connectors `19445478b`（plan 2026-07-25-2）/ showcase-env `f0f86d359` 波；单源 `notifyWithToast` 由 `dc9ebf9c4`（plan 547 IS-4「notify-toast.ts helper 接入 taskflow/report/report-host 三页」，2026-08+）引入——**当时只接了 designer 域三页，ai/complex-pages 域三份漏接**（收敛面止步层，wa-8 dashboard-001/wa-14 industrial-001 同族第 3 例）。
- **违约基准**: W3（收敛面止步）。
- **重构方向**: 三处 `notify:` 改 `(level, message) => notifyWithToast(level, message)`（或直接传函数引用）；零行为变化（逐字同体）；回归 = playground vitest 直通 + e2e ai-coverage/cal 复刻 toast 用例直通；验收 `grep -rn "toast.error(text || 'Error')" apps/playground/src --include="*.ts*" | grep -v pages/notify-toast.ts | wc -l` = 0。
- **归属裁定**: **demo 接线**（跨目录 import 不改 pages/ 文件本体，跨域零写入）→ **批内修**。
- **ROI 裁定**: 立即重构（三行改动）。
- **误报排除复核**: 不构成「@nop-chaos/ui 应内建 notify 适配」的 renderer 缺口——notify 是 RendererEnv 宿主通道契约（renderer-env.md INV-1），宿主自装配为设计内；缺的只是宿主内单源采纳。

### WA-pgai-003 [D·归属升级] `as unknown as StreamApiRequest['data']` 三份同字面 cast：SchemaValue 索引签名 vs 宿主 interface 数组的类型工效缺口（renderer/core 契约缺失）

- **位置**: `ai/mock-ai-env.ts:159` ↔ `ai/coverage-connectors.ts:115` ↔ `ai/openai-connector.ts:52`（同一 cast 三份逐字）；同根因旁证 `env/stream-impl.ts:310`（facade 泛型收窄）+ `openai-connector.ts:63`（import.meta env 读取，动态边界豁免）
- **信号类别**: D（断言销毁报警——但报警源是 core 类型工效缺口而非数据违约）
- **严重度**: P3（判据：零行为面——运行时值恒为合法 JSON body；三份机械重复 + 每个新 AI 连接器必第 4 份）
- **按住的根因**: `ExecutableApiRequest.data?: SchemaValue`（flux-core schema-base-types.ts:3-9）——`SchemaObject` 要求索引签名，宿主构造的 `{ messages: ChatMessage[], tools, stream: true }` 携 interface 数组字段，TS 不可直接赋值 → 类型系统如实报警，宿主各自 `as unknown as` 销毁。**归属裁定：renderer/core 契约缺失（升级）**——StreamApiRequest 的 body 语义是「JSON 请求体」而非 schema 数据树，core 未给该语义一个可用类型（`unknown`/JsonValue 变体）。
- **考古**: 三份随各自连接器出生（c8826c321 / 19445478b / 2bbfa34f5 波）——首个连接器即需此 cast，后续两份照抄。
- **违约基准**: W6 邻（cast 无语义解释）+ W3（份数=3 且必然增长）。
- **重构方向**: flux-core 侧为 `StreamApiRequest` 收窄/覆写 `data` 类型（如 `data?: unknown` 或 `JsonValue`）→ 三 cast 自然消亡；判别测试 = core 类型面测试 + 三连接器 typecheck 直通。**不批内修**（涉 flux-core 契约面=保护区 plan-first）。
- **归属裁定**: **renderer/core 契约缺失** → **CX-n 登记**（去向见 CX 裁定节；执行批位 flux-core/契约批）。
- **ROI 裁定**: 排期进 CX。
- **误报排除复核**: 不是「动态边界一次性收窄」——三份是稳定接口面上的持续税；也不是宿主可局部修——任何局部类型体操都改变公共形状或仍需断言。

### WA-pgroot-001 [A 邻·分类漂移] gantt 实验室路由分类 `category: 'data'`：C9 审计波引入 'scheduling' 类别时未迁移，家族内割裂

- **位置**: `apps/playground/src/scheduling-renderer-routes.ts:13`（gantt `category: 'data'`；同文件 kanban:21 / calendar:29 / barcode-input:37 均为 `'scheduling'`）
- **信号类别**: A 邻（家族内字面量分叉）+ W6（'data' 分类对 gantt 无领域解释——`RendererCategory` 已有 `'scheduling'` 成员）
- **严重度**: P3（判据：实验室侧栏分组不一致，零行为面；`route-matrix.test.ts` 不钉 category 值——live 核验 grep 零命中，改动安全）
- **考古**: `74cb612e0`（2026-07-20 gantt playground page，route-model 时代归 'data' 正确）→ `dd59dcd93`（2026-08-05 C9 audit 拆分本文件并给 kanban/calendar/barcode 落 'scheduling'）——**审计波自身未回扫家族首个成员**（wa-13b「收口波范围缺口」同族、wa-14 debugger-004 上游删除未回扫同型第 5 例）。
- **重构方向**: :13 一词改 `'scheduling'`；回归 = route-matrix.test 直通 + 实验室侧栏目测。
- **归属裁定**: **demo 接线** → 批内修。
- **ROI 裁定**: 立即。
- **误报排除复核**: 非刻意跨域归类——gantt 在 domain-route-entries.ts:21 eyebrow 即 'Scheduling'，同一页面两个目录里分类口径相反即自证非设计。

### WA-pgroot-002 [I 邻·化石] App.tsx:30-59 连续 30 空行带：cq-6 路由表重构删除 60+ 静态 import 后未清空行

- **位置**: `apps/playground/src/App.tsx:30-59`
- **信号类别**: I 邻（注释/代码化石的空行变体）
- **严重度**: P3（判据：零行为面，纯清扫）
- **考古**: `git log -L` 单 commit 溯源 `2c94d9d7f`（2026-10-01 cq-6「debug residue removal, route table」批）——删除静态 import 块（Component/lazy + 30+ page imports 迁往 domain-route-pages.tsx lazy 表）后原位留下空行带。
- **重构方向**: 删空行带（保留 import 区与常量区之间一个空行）；回归 = lint 直通。
- **归属裁定**: **demo 接线** → 批内修。
- **ROI 裁定**: 立即。
- **误报排除复核**: 非刻意分段——30 行远超任何分段惯例，且 `-L` 证实为删除残迹。

### WA-pgroot-003 [I 邻·死声明] knip dependencies 转发条消费面核验完成：`@nop-chaos/page-designer-core` 为真实死声明（传递覆盖在案）

- **位置**: `apps/playground/package.json:40`（`"@nop-chaos/page-designer-core": "workspace:*"`）
- **信号类别**: I 邻（依赖化石）；**WA-12→WA-14→本批三手转发③条款位点**
- **严重度**: P3（判据：机械清理零行为面）
- **现状/核验结论**: playground src/config 全域 **零 import**（grep 仅 package.json 一处命中）；唯一直接消费 `@nop-chaos/page-designer-renderers`（pages/page-designer-demo.tsx:1）而后者 package.json **自持** `@nop-chaos/page-designer-core: workspace:*` ——playground 直接声明为死重，传递覆盖完整。knip live 复跑（`--workspace ./apps/playground --include dependencies`）1 条逐字复现。
- **考古**: page-designer 装配波引入（plan 523 域）；575 拟制时已登记、576 draft review F4 修订口径在案。
- **重构方向**: 删该行 + lock 同步 + knip 基线以修代重立（plan 571 先例）。
- **归属裁定**: **demo 接线（依赖面）**——但 plan 576「`apps/playground/package.json` 依赖声明零变更」条款护住该条不被顺手处理 → **successor-required**（随 WA-15b/15c 收口波或 knip 基线重立批执行，本批只落核验结论）。
- **ROI 裁定**: successor-required（登记去向，非静默）。
- **误报排除复核**: 非间接运行时需要——pnpm 严格隔离下无隐式解析路径；`page-designer-boundary` 门禁不依赖此声明（其检查源码面）。

### WA-cpages-003 [H·清单合并] complex-pages/shared 微重复清单（orderId 提取惯用形 ×8 / 状态标签映射内联 ×4 / 占位记录构造三胞胎 / 分页样板内联）

- **位置**: ①`typeof body.orderId === 'string' ? body.orderId : (typeof params.orderId === 'string' ? params.orderId : '')` ×6（showcase-env:332/:339/:344/:351/:364 + Order\_\_get :283 同族）+ id 双源变体 ×2（ApprovalTask :254/:259）；②`STATUS_LABELS`/`METHOD_LABELS` 中文映射表内联 ×4（showcase-env:240/:352-353/:458 与 mock-backend.ts STATUS_LABELS 族——部分刻意[聚合端点局部映射]）；③占位记录构造三胞胎 `airtable.ts:97-100 placeholderRecord` ↔ `notion.ts:249` 内联 ↔ `stripe.ts:90-93 placeholderPayment`（「未找到记录（占位样本）」同文案三写）；④分页样板（并入 WA-cpages-002 paginate 组不重复计）
- **信号类别**: H 微（同文件族微惯用形合并登记）
- **严重度**: P3（判据：≤5 行微惯用形、零漂移；随 WA-cpages-002 kit 提取顺带收口最高效）
- **重构方向**: ①提取 `readOrderId(params, body)` 或并入 replica-kit read 闭包；③提取 `placeholderOf(rows, id, titleFallback)`；②维持现状（映射局部性是可读性设计）——Phase 2 裁量。
- **归属裁定**: **demo 接线** → 随 WA-cpages-002 同车（kit 化时顺带），不独立批内修。
- **ROI 裁定**: 排期（挂 WA-cpages-002 车）。
- **误报排除复核**: ①的「params/body 双源回退」是对 fetcher 契约的正确适配（GET 走 params、POST 走 body）——重复的是惯用形而非语义。

### WA-cpages-004 [H] linear 域 34 条标题数组复制：`LINEAR_DETAIL_TITLES` ↔ `LINEAR_TITLES` 逐字孪生 + 索引耦合无守卫

- **位置**: `shared/mock-backend-linear-detail.ts:58-93`（LINEAR_DETAIL_TITLES，34 条）↔ `shared/mock-backend-linear-issues.ts:97-132`（LINEAR_TITLES，34 条——逐字探针 25 窗，全集最大跨文件块）
- **信号类别**: H（同数据集复制）+ 结构耦合无守卫
- **严重度**: P2（判据：2 份 ×34 行、同根因、**已具漂移通道**——detail 的 relations 用 `LINEAR_DETAIL_TITLES[(seq + 9) % 34]` 按同一索引数学生成「关联问题」标题，issues 侧用 `LINEAR_TITLES[i]` 生成问题本体；两表一旦单独编辑，关联标题与问题本体静默错配（复刻页显示假关联），且无任何测试钉住两表一致）
- **考古**: `cd86e9686`（P4a）先落 LINEAR_TITLES；`c4dfae3b4`（P4b detail 拆分）需要标题数据时**未导出原表、整表复制改名**（`git log -S` 单 commit 出生）。
- **按住的根因**: 模块拆分波（P4b Phase 1）的 500 行门迫使 detail 独立文件，原表未加 export，作者选择复制而非导出。
- **违约基准**: W3（单一事实来源破坏——同一数据集两写）。
- **重构方向**: linear-issues.ts 导出 `LINEAR_TITLES`，detail 侧删除副本改 import（34 行净删）；回归 = linear 既有 mock 单测直通 + 新增一致性判别测试 `expect(LINEAR_DETAIL_TITLES).toBe(引用同源)`（改 import 后自然恒真，红态在改前可复现为两引用不等）。
- **归属裁定**: **demo 接线** → **批内修**。
- **ROI 裁定**: 立即重构（导出 + 删副本，分钟级）。
- **误报排除复核**: 非刻意分叉数据集——两表 34 条逐字相同、索引数学生共享，复制即事故。

## 归属裁定汇总（本批第一裁定维度专项节）

| 发现 ID         | 裁定                               | 依据（一句话）                                                                  | 去向                              |
| --------------- | ---------------------------------- | ------------------------------------------------------------------------------- | --------------------------------- |
| WA-cpages-001   | demo 接线                          | PAGE_DATA 注册表自身赋值结构问题，renderer 无涉                                 | 批内修                            |
| WA-cpages-002   | demo 接线（结构性）                | mock 基建收敛缺口，纯 playground 域                                             | CX-n/独立 successor（7 文件体量） |
| WA-cpages-003   | demo 接线                          | 同上（微惯用形随 002 车）                                                       | 随 WA-cpages-002                  |
| WA-cpages-004   | demo 接线                          | 模块拆分波复制，包内可单源                                                      | 批内修                            |
| WA-taskflow-001 | demo 接线                          | 宿主库内部三份手写                                                              | 批内修                            |
| WA-taskflow-002 | demo 接线                          | 类型残留，包内可删                                                              | 批内修                            |
| WA-taskflow-003 | demo 接线                          | 宿主库微重复                                                                    | 批内修（部分可挂账）              |
| WA-pgai-001     | demo 接线（文档面）                | loader 注释失实；pages 半边转发 15b                                             | 批内修 + 转发注记                 |
| WA-pgai-002     | demo 接线                          | 宿主内单源已存在未采纳（notify 为宿主通道契约非 renderer 缺口）                 | 批内修                            |
| WA-pgai-003     | **renderer/core 契约缺失（升级）** | StreamApiRequest.data 的 SchemaValue 工效缺口在 flux-core，宿主三份 cast 是症状 | **CX-n**（flux-core 契约批）      |
| WA-pgroot-001   | demo 接线                          | 路由目录分类词漂移                                                              | 批内修                            |
| WA-pgroot-002   | demo 接线                          | 删除残迹                                                                        | 批内修                            |
| WA-pgroot-003   | demo 接线（依赖面）                | 死声明传递覆盖在案；plan 零变更条款护住                                         | successor-required                |

**裁定小结**：11 条中 10 条 demo 接线（playground 自身问题）、1 条升级 renderer/core（WA-pgai-003→CX）；零条归属 flux-renderers-\* 渲染契约缺失——**playground 作为纯消费者的消费面总体健康**：六模块没有出现「因为 renderer 能力不足而被迫在 demo 侧特判/兜底/复制」的形态，两处升级候选（WA-pgai-003 + WA-11 转发的 runtime namespace 面）均为类型工效与多实例语义，非 demo 侧写不出正确代码的场景。

## 汇总

### 1. 转正清单（W2 违约项，按风险排序）

| 发现 ID         | 位置                       | 出生时间（git 考古）                                 | 风险                                      | 处置                    |
| --------------- | -------------------------- | ---------------------------------------------------- | ----------------------------------------- | ----------------------- |
| WA-cpages-002   | 七域 fetcher-branch 骨架族 | 2b3fa8d9a→ab7b98687 七波（2026-08-29→08-30）         | 第 8 份复刻必复制；跨域回退语义已三态并存 | CX-n/独立 successor     |
| WA-cpages-001   | page-data.ts 双写覆盖      | f823efd9d（P3a）+ 02fc0bb71（CP-6，出生即死）        | 死块误导排障（W5）                        | 批内修                  |
| WA-cpages-004   | LINEAR_DETAIL_TITLES 复制  | c4dfae3b4（P4b detail 拆分）                         | 两表单独编辑→关联标题静默错配（无守卫）   | 批内修                  |
| WA-taskflow-001 | findContainer 三胞胎       | plan 547/556 波（dc9ebf9c4 era）                     | 查找语义变更三处同步税 + 双递归低效       | 批内修                  |
| WA-pgai-002     | notify 三份（单源未接）    | c8826c321/19445478b/f0f86d359（早于 dc9ebf9c4 单源） | 收敛面止步（同族第 3 例）                 | 批内修                  |
| WA-pgai-001     | loader 失实注释            | c8826c321（2026-07-23）出生即失实，549 后双重失实    | 误导宿主作者按错误通道绑定                | 批内修（+15b 转发半边） |
| WA-pgroot-001   | gantt category 'data'      | 74cb612e0（2026-07-20）→ dd59dcd93 未迁移            | 实验室分组口径割裂                        | 批内修                  |
| WA-pgroot-002   | App.tsx 空行带             | 2c94d9d7f（2026-10-01 cq-6）                         | 纯化石                                    | 批内修                  |
| WA-pgroot-003   | page-designer-core 死声明  | plan 523 域装配波                                    | 死重                                      | successor-required      |

**「按住未修问题且无出口」的经典重转正件为零**——本批全部发现为残留/复制/失实文档/分类漂移形态，无一处「用临时方案按住活体 bug」；佐证：literalEn/literalZh 双零 + 零 P0/P1 + async 门禁 7 行 6 豁免（in-band 协议与注释化降级为底色）。

### 2. 重复代码热区（按总冗余行数排序）

| 组  | 份数   | 各份位置                                                                                                       | 冗余行数                   | 漂移证据                                | 裁定（三问句）                         |
| --- | ------ | -------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------- | -------------------------------------- |
| 1   | 7      | fetcher-branch 骨架族（WA-cpages-002）                                                                         | ~200（骨架件）             | 回退三态 + 钩子两形 + patch 解包逐字 ×6 | 同根因✅ 已漂移✅ 提取干净✅ → CX      |
| 2   | 2      | LINEAR_DETAIL_TITLES ↔ LINEAR_TITLES（WA-cpages-004）                                                          | 34                         | 索引耦合无守卫（漂移通道开放）          | 同根因✅ 提取干净✅ → 批内修           |
| 3   | 3      | findContainer 族（WA-taskflow-001）                                                                            | ~40（两份逐字 + 一份变体） | 双递归 vs 单调用两形                    | 同根因✅ 已漂移✅ 提取干净✅ → 批内修  |
| 4   | 3+1源  | notify toast 路由（WA-pgai-002）                                                                               | 14                         | 零漂移（逐字一致含单源）                | 同根因✅ 提取已完成✅ → 批内修（接线） |
| 5   | 2+对偶 | NopDSLStep ↔ NopTaskStep 镜像（WA-taskflow-003②）                                                              | ~40                        | enterSteps/exitSteps 化石字段           | 同根因✅ 已漂移✅ → 批内修/裁量        |
| 6   | 2+2    | validation 孪生对 + collect/extract 树走四件（WA-taskflow-003③④）                                              | ~60                        | 零漂移（仅递归目标异）                  | 同根因✅ → 批内修                      |
| 7   | 3      | StreamApiRequest['data'] cast（WA-pgai-003，类型重复）                                                         | 3                          | 零漂移（逐字）                          | 同根因✅ → CX（core 修则自然消亡）     |
| 8   | 6+     | read 闭包/paginate 四胞胎/asNumber 三胞胎/占位记录三胞胎/orderId 惯用形 ×8                                     | ~80                        | 归属组 1 骨架（部分散在 showcase-env）  | 并入 WA-cpages-002/003                 |
| 9   | 多     | 路由目录声明表 8 件 + domain-route-pages 86 行表 + domain-route-entries 62 条目（归一探针最大簇 3,156+902 窗） | （豁免）                   | 声明式注册表 + completeness test 在案   | 纯数据豁免 → 不立案（误报 #18）        |
| 10  | 2      | NOTION_PEOPLE ↔ AT_PEOPLE 五人注册表                                                                           | （豁免）                   | 复刻宇宙刻意一致性（数据镜像）          | 数据镜像 → 不立案（误报 #19）          |

### 3. Top 重构建议（默认 3 项）

1. **复刻 mock 骨架单源化（WA-cpages-002 + 003 同车，CX-n/独立 successor）**：根因修复点 = `shared/mock-backend-replica-kit.ts`（read 闭包/paginate/unwrapPatch/占位记录/e2e 钩子工厂/branch 装配器）；预期删除本体 = 七份 branch 骨架共同件 ~200 行 + 回退三态收敛为一；回归 = 各域 mock 单测全量直通 + 每域回退语义判别测试；影响面 = complex-pages/shared 9 文件、showcase-env 分发层微调、零 schema 零 e2e 断言变更。
2. **taskflow 宿主库收敛同车（WA-taskflow-001 + 002 + 003）**：根因修复点 = findContainerById 单源 + bootstrap 直注解 + 守卫/树走/分支校验四件小提取；预期删除本体 = 三份查找 + 2 双跳断言 + 守卫 ×2 副本 + 孪生对 ×3 + 化石字段；回归 = playground taskflow 套件直通 + compile probe 复跑；影响面 = taskflow-designer-lib 包内 5 文件，零导出面变更。
3. **宿主装配接线清扫同车（WA-cpages-001 + 004 + pgai-001 + pgai-002 + pgroot-001/002 批内修合集）**：根因修复点 = 删死种子/单表导出/注释勘误/notify 单源接线/一词分类/删空行带；预期删除本体 = 六处沉积本体全数；回归 = 判别测试（PAGE_DATA 键集 + LINEAR_TITLES 同源）+ playground vitest + e2e cal-replica/linear 复刻直通；影响面 = 6 文件零行为变更（notify 接线为逐字等价替换）。

### 4. 误报排除清单（22 项）

| #   | 疑似点                                                                                                                           | 位置                                                                 | 排除理由                                                                                                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | domRaid 1：getElementById('root')                                                                                                | main.tsx:20                                                          | React 挂载点本体——E 类「宿主集成边界受控 DOM 访问」显式豁免；全模块 querySelector/getElementById 零其他非测试命中                                                                                                    |
| 2   | env typeBypass 7：coerceChunk 泛型 ×5 + facade 收窄 + WebSocket 结构子集                                                         | stream-impl.ts:107/197/206/209/212/310 + socket-impl.ts:104          | 泛型 wire 反序列化动态边界（chunkType 判别返回类型）+ 泛型函数→RendererEnv 契约的 variance seam + 可注入测试缝（文档「最小结构子集」在案）——三形皆动态边界/ фасade 惯用                                              |
| 3   | perf 门禁 3 行 JSON.stringify                                                                                                    | stream-impl.ts:48/72/76                                              | flattenToStringRecord 的表单序列化必需 stringify——非「stringify 做重对象变更检测」红形态                                                                                                                             |
| 4   | perf 门禁 1 行 routeKey                                                                                                          | App.tsx:247                                                          | 路由对象（3-6 键）identity-key 惯用形 + ErrorBoundary 重置正确性依赖全量身份（R3-U5 注释）；微低效记 watch #4                                                                                                        |
| 5   | setTimeout 7                                                                                                                     | ai/ 六位点                                                           | mock/coverage 流 fixture 模拟 token 逐字延迟=**被测/被演示特性本体**（「流式输出可见化」），非等待他系统就绪；plan 472 注释在案——C 类误报全排除                                                                      |
| 6   | env async 1：catch→in-band response                                                                                              | stream-impl.ts:233                                                   | 连接级错误经 response 报告为文档化契约（头注「**不**抛出」裁定 + 评审来源注释）——in-band 协议正面形态                                                                                                                |
| 7   | theme/local-storage-storage catch ×3                                                                                             | theme.ts:29/:57 + ai/local-storage-storage.ts:47                     | 跨信任边界（隐私模式/配额/坏 JSON）降级 + 逐处注释在案；theme 会话级降级、storage fail-safe-to-empty 有下游 storage-save-error 协议——wa-14 localStorage 家族判例族                                                   |
| 8   | taskflow async 2：tryParseJson + invoke wrapper                                                                                  | dsl.ts:74 + index.ts:400                                             | in-band null 协议（parseNopTaskDSL 显式判 null）+ `{ok:false,error}` 结构化协议——两形正面                                                                                                                            |
| 9   | taskflow async 1：getDesignerDoc catch→null                                                                                      | index.ts:49                                                          | 「无 doc」为合法态（plan 547 注释：fresh page 无 authoring model）——降级语境合法；异常不可区分性记 watch #3                                                                                                          |
| 10  | mock e2e 钩子族 `window.__*EndpointCalls/TestHooks` ×6 域 + reset 尾块                                                           | airtable/linear/notion/stripe（独立函数形）+ antdpro/cal（内联形）   | opt-in 观测通道：addInitScript 预建、生产恒 no-op、逐文件文档在案——G 类标准可测性设计（时间注入/端口注入同族）；两形实现差异随 WA-cpages-002 kit 收敛                                                                |
| 11  | 确定性写戳三胞胎（airtableWriteStamp/linearWriteStamp/notionWriteStamp）                                                         | 各 -records/-issues 模块                                             | 确定性时间注入（e2e 稳定），文档「deterministic sample time」在案——G 类豁免                                                                                                                                          |
| 12  | render-host onActionError 形状过滤（静默 return）                                                                                | shared/render-host.tsx:96-111                                        | plan 551 文档化裁定：表单校验拒绝由表单内联呈现（toast+aria-invalid），宿主级 console.error 会误报每次 gated submit——被过滤错误仍有观测（表单内联）                                                                  |
| 13  | confirm-bridge 模块级可变桥 + 未挂载时 confirm 恒 true                                                                           | shared/confirm-bridge.tsx:24-39                                      | 设计内桥接（plan 550 注释完整：per-request 挂载保留 z-index 的机制性理由）；恒 true 默认=「无宿主即无确认 UI」演示语境；卸载恢复 no-op 对称——watch #5 注记漏挂风险                                                   |
| 14  | User\_\_save vs batchUpdate 字段集差异（deptId/tagIds 只在 save）                                                                | showcase-env.ts:161-205                                              | 刻意：批量编辑面板只触 name/email/role/status 四列（对应 crud 批量 UI），save 承担全字段编辑——非漂移                                                                                                                 |
| 15  | 平凡 facade/投影 cast（complex-pages-registry:17、render-host:92、records:175 `as AtRecordRow`、theme-switcher as ThemeName ×2） | 各处                                                                 | Object.fromEntries/组件 props/行投影/受控 select 的惯用收窄——非 `as unknown as` 双跳、无契约违约                                                                                                                     |
| 16  | RouteErrorBoundary window.location.reload()                                                                                      | App.tsx:152                                                          | 用户显击的 stale-chunk 恢复按钮（非自动 reload hack）+ routeKey 变化重置的正规恢复路径在案（R3-U5）——E 类排除                                                                                                        |
| 17  | 路由目录声明表八件 + domain-route-pages 域表                                                                                     | 8 个 \*-routes.ts + domain-route-pages.tsx + domain-route-entries.ts | 声明式注册表/纯数据（探针最大簇）+ completeness test 守护 + cq-6 单源裁定注释在案——数据镜像豁免（wa-14 locales 判例族）                                                                                              |
| 18  | mock 数据种子/标题数组（TITLES ×3 域、DEPT_SEED、CUSTOMERS 等）                                                                  | 各 mock-backend-\*                                                   | 各复刻域各自原创数据集（域间不同源不同文）——非复制；域内复制仅 linear 一例（已立案 WA-cpages-004）                                                                                                                   |
| 19  | NOTION_PEOPLE ↔ AT_PEOPLE 同五人                                                                                                 | notion-types:101 ↔ airtable-types:167                                | 复刻宇宙刻意人物一致性（数据镜像非逻辑重复）                                                                                                                                                                         |
| 20  | dsl buildProps default 臂 cast + sync createDefaultProps 无 default                                                              | dsl.ts:355-357 + sync.ts:34-55                                       | 前者为判别联合不可达安全臂；后者 exhaustive switch（type-dispatch 门禁 0 印证）                                                                                                                                      |
| 21  | sundial-branch 同形 return 块（归一自簇 16 窗）                                                                                  | mock-backend-sundial-branch.ts                                       | `{status:0, data: clone({…}) as T}` 返回形状是 fetcher 契约惯用形——形状重复非逻辑重复                                                                                                                                |
| 22  | CX 交界核对：CX-7（t() 前缀）/CX-15（test-support 骨架）/CX-18 + wa-11 已立案面 + wa-13/14 判例                                  | —                                                                    | CX-7/CX-15/CX-18 不涉六模块面（grep 零命中）；wa-11 立的是 renderer namespace 面，本批 pgai-001/002 为宿主装配面新发现非重复；notify 单源未接=industrial-001 收敛止步同族第 3 例（已按本批口径独立登记不扩 CX-旧项） |

### 5. 范围整体判断

**不是系统性临时方案文化——本批是「零字面 + 零 P0/P1」的低危消费侧批组，问题形态是「复刻批次流水线的复制沉积 + 收敛面止步 + 少量删除残迹」，而非「按住活体问题的特判兜底」。** 正面证据六件：①literalEn/literalZh 双零（第七个连续双零批组）；②零 P0/P1——六模块没有一处「为让 demo 跑起来而按住 renderer 缺陷」的代码，13,863 行消费面全部走正道（schema 驱动 + 契约通道 + 注释锚）；③async 门禁 7 行 6 豁免——in-band 协议（`{ok:false,error}`/null 协议/契约化不抛出）与注释化降级是底色；④mock 域的 e2e 钩子、确定性时间戳、opt-in forceMiss 全部是文档化的标准可测性设计而非测试迁就；⑤playground 无一处 pixel nudge/keyRemount/testEnvBranch，domRaid 唯一命中是 React 挂载点；⑥近 era commit message 症状性为零（200 条抽检，40 条无锚且 20 条症状形态**全部集中在 2026-07 crud-demo→complex-pages 迁移时代**[「move submit button ×3 连击」「fix scroll」族]，plan 纪律确立后与 wa-12/14 读数一致）。问题集中三处：**「复刻流水线的结构收敛缺席」**（七个复刻 plan 各自照抄上一批 precedent 落骨架，提取动作从未做——这是唯一需要 roadmap 层面对策的形态，且对策是「下一个复刻域来之前先 kit 化」的时点纪律）；**「收敛波的采纳面缺口」**（notify-toast 单源只接了 designer 三页——三波同类先例[wa-8/wa-14/wa-15a]指向「收敛执行批应带全库消费面 grep 验收」的流程约束）；**「波次删除/迁移的回扫缺口」**（cal 死种子、gantt 分类、App 空行带、loader 失实注释——四件全是上游波自己留下的尾巴）。整体判断：**零星个案级 + 一项流程性对策（复刻域 kit 化时点）**；13 条立案（批内修 9 行 + 随车 1 行[WA-cpages-003 挂 002 车] + CX/successor 3 条[WA-cpages-002、WA-pgai-003、WA-pgroot-003]）；watch 微注记 5 条；`apps/playground/package.json` 在全部批内修路径下零变更（WA-pgroot-003 以 successor 落）。

## 承接转发三项核验结论（plan 576 承接转发节落字）

1. **WA-11 转发（create→列表回路接线缺陷，import-stack 命名空间竞态嫌疑）——三段式裁决完成**。①**装配材料消费链取证（本批）**：`pages/ai-conversations-demo.tsx` 消费 pg-ai 三材料链证实——`createMockAiConnector/createMockAiEnv/createAiImportLoader`（`../ai/mock-ai-env.js`）+ `createOpenAICompatibleConnector/resolveOpenAIConfigFromEnv`（`../ai/openai-connector.js`）+ `ai-conversations-example.json`；材料面本身**零缺陷**（真/假连接器切换路径干净、loader 契约自洽），唯一发现为 loader 失实注释（WA-pgai-001 立案）。②**路由不对称本批可证部分**：schema 侧 `ai:createConversation/ai:deleteConversation/ai:renameConversation` 为裸 action 名（example.json:19-22）、`ai:send` 为外部按钮 action（:41）、controller 绑定走 page-data 相对读（:49 `conversationController: "${controller}"`，`$ai` 通道零引用）——与 wa-11 探针「send 可用而 createConversation 静默无效」吻合的机制面已在 wa-11 落字（`ai` ActionScope 命名空间非实例隔离 + `ai-action-provider` ok:false 无宿主 toast 通道），本批 live 复核无新证据。③**归属裁定结论落字**：缺陷本体位点 `pages/ai-conversations-demo.tsx` 物理在 WA-15b——**demo 接线半边修复执行归 WA-15b**（携本批 pgai-001 勘误与本节证据）；「namespace 非实例隔离 + ok:false 无宿主观测通道」属 flux-runtime/flux-core 契约面，**维持 wa-11 原裁定：结构性修复走 CX-n/独立 successor，不批内不越权**。
2. **WA-14 转发（ai-hitl-demo initFluxI18n 时序）——先行 init 半边取证完成**。`main.tsx:13` `initFluxI18n()`（无参，默认 zh-CN）为 app 壳的**合法唯一先行 init 位**（模块求值序最早、语义即「playground 全局语言 = zh-CN」）；WA-i18n-001 根因包侧修复（二次带参 warn）已 verified——ai-hitl-demo.tsx:6 顶层带参 init（WA-15b 位点）的英文意图自此**可观测地失效**（warn 在案）但行为仍被 main.tsx 先行 init 压制。**结论：main.tsx 半边零缺陷零变更**；ai-hitl 半边（移入组件 effect 或改消费全局语言的裁定）执行归 WA-15b，本体修复与本批无耦合。模块顶层求值面单列定性其余两处：App.tsx:78-107 registry+debuggerController 顶层装配（app 壳契约位，renderer 注册幂等、debugger 通道 wa-14 已核）豁免；`@leafer-in/animate` 顶层 import（main.tsx:6，plan 530 D-530-1 注释锚在案）为声明的副作用导入契约豁免。
3. **knip dependencies 1 条（wa-12 转发③）——消费面核验完成**：`@nop-chaos/page-designer-core` 为**真实死声明**（src 零 import + page-designer-renderers 自持传递依赖，knip live 复跑逐字复现）；按 plan 576 零变更条款不批内动，**successor-required** 落 WA-pgroot-003。

## CX-n 裁定

**本批拟制 2 项 CX-n 插入建议**（是否落 roadmap 由主会话执行；共性门槛逐一核对）：

- **CX（拟）复刻 mock 骨架单源化（WA-cpages-002/003）**：跨文件 7 域、归一探针 83 窗、回退语义已三态并存——满足「跨文件家族 + 已漂移」共性门槛；属 playground 域基础设施，执行可独立小批或随 WA-15b/15c 收口波。
- **CX（拟）flux-core StreamApiRequest.data 类型工效（WA-pgai-003）**：跨包契约面（flux-core → playground/任意宿主连接器），三份 cast + env facade cast 为症状；flux-core 保护区 plan-first。

其余核对不触发：notify 单源接线/taskflow 收敛/linear 表单源均为包内或已存在单源的接线，批内修档可达（WA-pgai-002 虽与 industrial-001「收敛止步」同族，但**单源已存在且接线仅三处**，不构成需要独立计划的新机制共性——区别于 industrial-001 当时的多文件提取体量）；WA-11 runtime namespace 面维持 wa-11 原登记不新增。

## watch 微注记（不入立案，本行即登记，不允许静默）

1. **env/stream-impl.ts:279/:283 `reader.cancel().catch(() => {})` ×2**——拆除路径零后果静默（cancel 失败时流已在 teardown）；下次触碰 stream-impl 时补一行契约注释或保持现状落字。
2. **showcase-env.ts:509 未知端点静默 `{status:0, data:null}`**——schema 端点 typo 呈现空 UI 零信号；修复（未知前缀 console.warn 一次）须先核 playground console-baseline 门禁容否，随 WA-cpages-002 kit 化时一并裁定。
3. **taskflow index.ts:49 getDesignerDoc catch→null**——scope 读异常与「fresh page 无 doc」合法态不可区分、零观测；下次触碰时补契约注释或 console.debug。
4. **App.tsx:247 routeKey = JSON.stringify(route) 每 render**——路由小对象微低效；下次触碰 App.tsx 时可换字段拼接（正确性依赖全量身份，改动须带 R3-U5 判别测试）。
5. **confirm-bridge 未挂载时 confirm 恒 true**——新复刻页作者漏挂 `<ConfirmHost/>` 会静默自动确认（mock 语境可接受）；下次新增复刻页 checklist 注记。

## 批内修复候选清单（供 Phase 2 执行会话）

| 发现 ID         | 严重度 | 建议去向            | 修复要点                                                                      | 约束/验收判据                                                                           |
| --------------- | ------ | ------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --- | -------------------------------------------------- |
| WA-cpages-001   | P2     | 批内修              | 删 page-data.ts:16-21 死块 + PAGE_DATA['cal-booking'] 键集判别测试            | e2e cal-replica 直通；键集断言恒 {calTimezone,cal24h}                                   |
| WA-cpages-004   | P2     | 批内修              | linear-issues 导出 LINEAR_TITLES + detail 删副本改引                          | 两引用同源判别测试；linear mock 单测直通                                                |
| WA-pgai-002     | P2     | 批内修              | 三处 notify 改 notifyWithToast（pages/notify-toast.ts 只 import 零修改）      | `toast.error(text                                                                       |     | 'Error')` 非 notify-toast 文件 grep=0；vitest 直通 |
| WA-taskflow-001 | P2     | 批内修              | findContainerById 单源提取三处改引 + 消双递归                                 | `findContainerRecursive` grep=1；taskflow 套件直通                                      |
| WA-taskflow-002 | P3     | 批内修              | 两处 bootstrap 改直接注解（compile probe 已证可编译）                         | playground typecheck 直通                                                               |
| WA-taskflow-003 | P3     | 批内修（①④⑤）/裁量  | 守卫单源 + collectStepsFromBranch 自递归 + payload 解包提取；②③允许挂账 watch | 挂账项必须落字不允许静默                                                                |
| WA-pgai-001     | P3     | 批内修              | mock-ai-env:192-195 注释改实况                                                | pages:41-43 半边转发 WA-15b 注记落 ledger                                               |
| WA-pgroot-001   | P3     | 批内修              | scheduling-renderer-routes:13 改 'scheduling'                                 | route-matrix.test 直通                                                                  |
| WA-pgroot-002   | P3     | 批内修              | 删 App.tsx:30-59 空行带                                                       | lint 直通                                                                               |
| WA-cpages-002   | P2     | CX-n/独立 successor | replica-kit 提取（本批不动）                                                  | roadmap CX 条目 + ledger successor-required                                             |
| WA-pgai-003     | P3     | CX-n                | flux-core data 类型工效（本批不动）                                           | roadmap CX 条目 + ledger CX-n 去向                                                      |
| WA-pgroot-003   | P3     | successor-required  | 删死依赖声明（本批零变更条款护住）                                            | ledger successor-required；`git diff --exit-code apps/playground/package.json` 全批通过 |

**批内修合计 9 项**（P2×4 + P3×5 位点）+ CX/successor 3 项；watch 5 条（行即登记）；playground `package.json` 全批零变更；触及模块顶层求值面的修复（WA-pgroot-002 仅空行、WA-cpages-001 仅 page-data 数据面——均非 init 链）**不触发 ai 哨兵加跑条款**（plan 跨包测试隔离条款：求值路径无新增副作用调用）。

## 批内修复记录（Auto-Remediation）

> 本报告为 review-only 取证产出；本节由 Phase 2 执行会话按 roadmap 自动修复契约 §2–§4 回填（每项验证临时方案本体已删除）。

| 发现 ID         | 严重度 | 修复方式（fix/CX-n/watch-only/…）                                                 | 回归测试（先红后绿证据）                                                                                                                                      | 本体删除验证                                                                                                                                                                                                                                                                               | commit           |
| --------------- | ------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| WA-cpages-001   | P2     | fix（删 page-data.ts 16-21 死块）                                                 | page-data.test.ts 键集判别：红态=死块临时置后获胜 `expected [ 'calDate' ] to deeply equal [ 'cal24h', 'calTimezone' ]`（1 failed）→ 删后绿 453/453            | grep 死块 calDate 种子=0；schema `"date"` 锚定为唯一事实源                                                                                                                                                                                                                                 | （本批收口提交） |
| WA-cpages-004   | P2     | fix（linear-issues 导出 LINEAR_TITLES + detail 删 34 行副本改引）                 | linear-titles-single-source.test.ts identity 探针：红态两表独立实例 `Object.is equality` fail → 改引后绿；行为漂移守卫（索引数学 (seq+9)%34/(seq+17)%34）钉住 | LINEAR_DETAIL_TITLES grep=0；linear 既有 38 用例直通                                                                                                                                                                                                                                       | （本批收口提交） |
| WA-pgai-002     | P2     | fix（三处 notify 改 notifyWithToast 函数引用；pages/notify-toast.ts 零修改）      | 逐字同体零行为——playground vitest 460/460 直通                                                                                                                | 六模块 grep `toast.error(text                                                                                                                                                                                                                                                              |                  | 'Error')`=0（**口径披露**：报告验收 `grep=0` 系六模块子集口径；全库 12 处基线命中全在 pages/ 域=WA-15b 范围，转发 WA-15b 登记 ledger） | （本批收口提交） |
| WA-taskflow-001 | P2     | fix（findContainerById+findContainerRecursive 单源落 types.ts，三处改引消双递归） | container-search.test.ts 特征化 6 用例：改前基线嵌套 workflow 体判别 2 failed（`expected undefined to be 'nop-taskflow-workflow'`）→ 提取后 460/460 全绿      | `findContainerRecursive` grep=1 文件（单源实现内 4 处：wrapper 调用+定义+2 自递归，不可再少）；projection/sync/index 三本地实现删除                                                                                                                                                        | （本批收口提交） |
| WA-taskflow-002 | P3     | fix（两处 bootstrap 改直接 `const model: TaskFlowAuthoringModel = {…}`）          | playground typecheck 直通（compile probe 已证可编译）                                                                                                         | lib 内 `as unknown as` grep=0                                                                                                                                                                                                                                                              | （本批收口提交） |
| WA-taskflow-003 | P3     | fix ①④⑤（守卫单源+树走自递归+payload 解包提取）；②③挂账 watch（位点落 ledger）    | isTaskFlowStepType 副本 grep=0（dsl/sync/validation 三处改引）；taskflow 既有套件直通 460/460                                                                 | ① isValidStepType/isKnownTaskFlowStepType 删除 ④ sync collectStepsFromTree 删、projection extractStepsFromTree 改一行委托 ⑤ index 四对解包改引（:216/:238/:246 单值形不在清单未动）；②③挂账位点：dsl.ts:30-69↔lowering.ts:10-51（化石字段 lowering:40-41）+ validation.ts:148-177↔:223-250 | （本批收口提交） |
| WA-pgai-001     | P3     | fix（loader 头注失实句改实况；纯注释零行为）                                      | 不适用（注释面）；playground vitest 直通                                                                                                                      | 失实句 `$ai.controller` grep mock-ai-env=0                                                                                                                                                                                                                                                 | （本批收口提交） |
| WA-pgroot-001   | P3     | fix（scheduling-renderer-routes.ts:13 'data'→'scheduling'）                       | route-matrix.test 直通（不钉 category 值，live 核验在案）                                                                                                     | :13 'data' grep=0（家族四成员齐 'scheduling'）                                                                                                                                                                                                                                             | （本批收口提交） |
| WA-pgroot-002   | P3     | fix（删 App.tsx:30-59 空行带）                                                    | lint 直通                                                                                                                                                     | diff 纯删除（31 空行 0 新增），无重复 import 残留                                                                                                                                                                                                                                          | （本批收口提交） |

## 台账回写核对

- 本批新增 findings：**13 条**（WA-cpages-001/002/003/004 + WA-taskflow-001/002/003 + WA-pgai-001/002/003 + WA-pgroot-001/002/003 —— cpages 4 + taskflow 3 + pgai 3 + pgroot 3；**WA-dhosts / WA-pgenv 前缀零使用**，仅 modules 行翻转）
- modules 行翻转 audited：pg-complex-pages / pg-taskflow-designer-lib / pg-designer-hosts / pg-ai / pg-env / pg-src-root（六行）
- `pnpm workaround:reconcile` 输出摘录（13 行登记+modules 六行翻转后实跑）：
  - `modules: 49 total / audited 47 / uncovered 2 / orphan 0`（uncovered=pg-pages[WA-15b]+pg-component-lab[WA-15c] 属未执行批次，符合预期）
  - `findings: 206 total = pending 0 + found 90 + fixed 9 + verified 107`
  - `未处置: 0 (pending 0 + found-without-disposition 0)`；`violations: 0`
- 收口翻转后复跑（9 行 fixed→verified，closure audit approved 后）：`findings: 206 total = pending 0 + found 90 + fixed 0 + verified 116`；未处置 0；violations 0。
- 验收口径勘误（WA-pgai-002，执行期披露）：报告重构方向验收 `grep … | grep -v pages/notify-toast.ts | wc -l` = 0 在**全库口径不可达**——`toast.error(text || 'Error')` 于 pages/ 域现有 12 处基线命中（m4/w4b/w1a/m3/w1b/m2/w4a/m5/mobile-components/w2a/w3a-w3b 各 demo + m5-showcase-shared），全部属 WA-15b 范围非本批六模块；本批修复范围内口径 = 0（已达成）。12 处随 WA-15b 同族收敛，已落 ledger WA-pgai-002 行。
