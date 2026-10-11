# WA-4 基础与表单渲染器 临时方案与坏味道审计报告

> 批次: WA-4（roadmap `docs/backlog/workaround-code-smell-audit-roadmap.md` Phase Status 对应行）
> 审计方法: `docs/skills/workaround-code-smell-audit-prompt.md`（九类信号 A–I + W1–W6 + §5 取证协议）
> 执行 plan: `docs/plans/564-workaround-audit-wa4-basic-form-plan.md`
> 审计日期: 2026-10-11
> 对象清单来源: `docs/audits/workaround-code-smell/inventory/modules.json`（批次 = WA-4 行，不手抄）

## 快照基准注记（本批特有）

主工作树存在并行会话对 flux-renderers-form 的在途未提交变更 3 文件（`renderers/form-definition.ts`/`renderers/form.tsx`/`schemas.ts`——form target 特性）。**本报告对这 3 文件的全部走读取证与行号基于 HEAD 提交态 `f84e35612` 的快照（`git show HEAD:` 口径，行号标注"HEAD 口径"）**，在途 diff 不取证；其余 88 个 form 文件与全部 basic 文件工作树与 HEAD 一致。inventory 的 form loc=15,464 为生成时点计数；**HEAD 口径实测 91 文件 15,383 行**（wc -l 与 inventory 同口径；3 HEAD 快照文件 1,500 + 其余 88 文件 13,883），与 inventory 差 **-81**：form.tsx -66、form-definition.ts -8、schemas.ts -8（并行在途演化）+ field-utils.tsx -1、stepper-button.tsx -1（清单时点差）+ cron-editor-wizard.tsx +3（本批修复新增，取证后落盘）。**closure audit M1 勘误（agent_a94d2038）：首版注记"16,323 行/-6 漂移全落 form.tsx/其余 90 文件零漂移"的会计不成立，已按上列实测更正。**basic 6,527 行实测逐字吻合。

## 覆盖声明（Coverage Declaration）

> 本节是台账 modules 行 `pending → audited` 翻转与 `pnpm workaround:reconcile` 结构校验的依据。
> 声明口径：列出的模块 = 本批执行了 prompt §5 全量取证协议（字面扫描 → 模式扫描 → git 考古 →
> 重复块识别 → 抽读走读 → 误报排除）的对象。部分覆盖不得声明 audited（缩水走显式注记）。

| 模块 id              | 文件数 | 非测试行数         | 取证完成 | 备注                                                                                                                                      |
| -------------------- | ------ | ------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| flux-renderers-basic | 34     | 6527               | ✅       | 34/34 全读（6,527 行实测逐字吻合）；jscpd+token 归一化双探针；11 出生 commit 考古；3 份 plan 文档回查；marker-classes-only 契约符合性核查 |
| flux-renderers-form  | 91     | 15383（HEAD 口径） | ✅       | 91/91（66 文件逐行精读 + 25 纯算法/数据文件信号扫描+结构走读）；3 在途文件 HEAD 快照口径；token 归一化探针 288 窗组；门禁 5 项交叉        |

合计 125 文件（basic 6,527 + form 15,383 = 21,910 行，HEAD 口径；inventory 计 21,991，差异 -81 已逐文件注记如上）。

### 取证执行记录（prompt §5 步骤逐条，两包并行取证、各自独立探针后汇裁）

1. **字面扫描**：两包 `TODO|FIXME|HACK|WORKAROUND|XXX` = 0 命中；`临时|先这样|暂时|绕过|workaround|hotfix` = 0 命中（与 inventory baseline 一致）。
2. **模式扫描**（HEAD 口径）：basic typeBypass 3（command-palette ×2 D 排除 + interaction-owner ×1 D 排除）+ setTimeout 1（text.tsx:74 C 排除；button.tsx Date.now ×5 系倒计时数学）+ domRaid 1（tabs.tsx:252 自子树 scrollIntoView，E 排除）；form typeBypass 9（全部为同一形态 `props as unknown as {'aria-describedby'…}`——升级立案 WA-form-001；另发现生成器词表外 `as never` ×2/`as ActionSchema` ×2 等 D 排除）+ setTimeout 9（8 产线 + 1 fixture，逐个定性）+ domRaid 16（全部定性：12 处升级并入 WA-form-003，其余 E/F 排除）；silentCatch/keyRemount/pixelNudge/testEnvBranch 两包 0。
3. **门禁交叉核对**：basic——`check:audit-runtime-raw-schema-reads` **[high] ×2 live**（use-surface-renderer.ts:218,539，升级立案 WA-basic-001）+ audit-suspects/async 12 处 catch 全排除；form——audit-suspects/async 6 产线命中（5 排除 + 1 升级 WA-form-008），hardcoded-type-dispatch/runtime-raw-schema-reads/fieldframe-bypasses/event-dispatch-without-ctx 均 0。
4. **重复块识别**：basic jscpd 10 clones + token 归一化 201 窗组（坐实 3 组 + 表状排除）；form 288 窗组（坐实 10 组）；逐组人工对照控制流。探针用后即弃。
5. **git 考古**：全部 18 条立案 + 重点候选 `git log -S`/`--follow` 溯源。症状性 message：basic 1 处（`45443c5f7` 13-03 修复批只叙述 addTab、未披露同机制其余三操作未修——WA-basic-002）；form 0 处，但有 2 处"收敛计划完成后复制仍扩散"实证（plan 2026-09-28-4 a11y sweep completed 后 injected-aria cast 仍 9 份；P14 targets 未含 recurse）。
6. **范围结构走读**：basic 34/34 全读（含 marker-classes-only 契约符合性核查——全部 schema-prop→class 纯映射或 widget 件内交互类，零违反）；form 66 文件逐行精读 + 25 纯算法/数据文件信号扫描+结构走读（form 容器/生命周期 5 件、字段全家族、cron 全 5 件、org 全 11 件）。grep 外信号逐个消账（顺序耦合、静默兜底、无出口兼容层、时序贿赂）。
7. **已收敛模式 live 复核**：live 可证档 AbortController——两包零手写复发（basic dynamic-renderer 用真 AbortController；form 6 文件正用，use-org-source `disposedRef` 为协议登记的 fire-and-forget 设计非取消标记回归）；createLazyLibLoader——两包零重库静态 import（react-day-picker/@tanstack 为即用 UI 库）；历史教训档——`dataPath` 双词汇两包 0 命中、strip errors/ajax 两包不涉；**form-runtime\*.ts 运行时族（WA-2/CX-3）不重复立案**，本批 WA-form-001/003/004 为渲染器消费侧新面，已显式引用。
8. **误报排除复核**：汇总前逐条对照 §2 与 W1–W6，54 项排除记录见 §4（basic 24 + form 30）。

## 逐条发现（Findings）

> 每条按 prompt §6 单条模板；全量登记 `docs/audits/workaround-code-smell/ledger.md`
> （ID `WA-basic-<seq>` / `WA-form-<seq>`），本节与台账一一对应，零静默。
> 本报告为审计产出；批内修复由执行会话按 roadmap 契约 §2–§4 实施（见《批内修复记录》节）。

### [类别D+A+I] dialog/drawer 受控 open 仍是运行时 raw-schema 正则回读——治愈原语 compileOpenBinding 已在包内且已接线 palette，dialog/drawer 未接线；门禁 [high] ×2 live（WA-basic-001）

- **位置**: `packages/flux-renderers-basic/src/use-surface-renderer.ts:28`（`extractControlledOpenPath` 正则）、`:218-222`、`:539-543`（两处 `(templateNode.schema as { open?: unknown } | undefined)?.open` 运行时回读）；`surface-renderer-definitions.ts:261-276`（compileOpenBinding 编译期捕获原语，仅登记在 commandPaletteRendererDefinition fields:352）、`:104-128`（sharedSurfaceFields 的 `open` 为普通 prop，dialog/drawer 未挂 compile 钩子）
- **严重度**: P2（同根因双词汇并存 + 门禁 [high] live ×2 + 收敛路径明确；不升 P1：plan-459/460 语义当前正确、有测试兜底）
- **现状**: dialog/drawer 判定"受控 open 的源路径"靠渲染期正则解析 raw schema 字符串（3 个调用点）；同包 palette 已用 flux-core `SchemaFieldRule.compile` 把 `${path}` 编译期捕获为载体，注释明言 "WITHOUT a runtime raw-schema read"——同一问题的"无回读"解法已在本包存在并验证
- **按住的根因**: resolved/compiled prop 通道不携带受控表达式的源路径（compile-once 原则缺口）；本包已持有正确桥接原语，只差在 dialog/drawer 定义上接线
- **违约基准**: W3（正则文法包内 3 处复制：use-surface-renderer.ts:28 + surface-renderer-definitions.ts:267 + structural-loop.tsx:58 同族）、W4 弱（文法扩展时正则静默 miss → 退化为 pure-latch）、W2（无收敛登记；palette commit 自证知道该门禁）
- **为什么是临时方案**: 症状消失 ✓（plan-459 幂等重开工作）；根因仍在 ✓（compile-once 违背、门禁 live [high] ×2）；出口缺失 ✓（无登记收敛 dialog/drawer 侧）
- **风险**: 表达式文法演化时 dialog/drawer 与 palette 行为分叉；门禁红长期悬置
- **重构方向**: compileOpenBinding 并入 sharedSurfaceFields（或 dialog/drawer fields），use-surface-renderer 改从 resolved props 读 binding，删除 extractControlledOpenPath 与 2 处 raw read。**Renderer 定义字段契约变更 → plan-first + 人工确认（CX-n 载体）**。回归 = 现有 surface 重开套件（plan 459/460 用例）+ 门禁清零断言
- **重复组**: 正则 ×2（包内）+ keyBy slice ×1 同族
- **ROI 裁定**: CX-n 拟制（涉 renderer 定义字段契约，执行前人工确认）
- **误报排除复核**: templateNode.schema 是自家编译产物非外部数据，不属动态边界收窄；与 wa-3 WA-react-004/005 同属契约缺口家族但根因/修法独立（包内已有原语、接线即收敛），不并入 CX-7
- **git 出生**: raw read `f616f0163`（2026-08-18 plan 459）；治愈原语 `33cb4f9ab`（2026-08-30 palette，message 自述避开门禁——**知道门禁存在而为 palette 避开、未回移 dialog/drawer**，W1 弱化信号）

### [类别A邻·顺序耦合] tabs 视图集合"同 tick 兄弟变异丢弃"根因修复单侧落地：13-03 只修 addTab，remove/rename/move 仍以渲染闭包快照写绝对值（WA-basic-002）

- **位置**: `packages/flux-renderers-basic/src/tabs-view-management.ts:99-112`（commitCollection 机制 + 注释宣称 "every mutation is expressed as (prev) => next"）↔ `:163-183`（runRemoveTab：`commitCollection(() => next)`——updater 忽略 prev）、`:195-206`（runRenameTab 同形）、`:218-231`（runMoveTab 同形）；对照 `:136-148` runAddTab 真函数式
- **严重度**: P2（单点潜伏行为缺陷：同 tick rename+remove / remove+move 最后写者胜、先者被静默丢弃；触发面与 13-03 实证过的 addTab 完全相同）
- **现状**: 四个集合变异操作共享 commitCollection(prev=>next) 外形，但 remove/rename/move 传入的 updater 是 `() => next`（next 预先从渲染闭包快照算好），commit 时 live prev 被丢弃
- **按住的根因**: 13-03（ui-review 1941-1）登记的根因原文指向快照-提交语义；机制未消除，只把 addTab 改成函数式；注释宣称与 3/4 实现不符
- **违约基准**: W1（根因已登记但仅 1/4 操作消除）、W2（无剩余三操作的 follow-up 登记；1941-1 proof 表仅覆盖 addTab）
- **为什么是临时方案**: 症状消失 ✓（addTab 场景已修有测试）；根因仍在 ✓；出口缺失 ✓
- **风险**: rename 后同 tick remove → 改名静默丢失；remove 后同 tick move → 位置回跳
- **重构方向**: 三个 run\* 改为与 addTab 同形的函数式更新（updater 内对 prev 做 filter/map/splice）。回归 test-first：新增"同 tick rename+remove / remove+move 双操作均落地"用例（先红）。**可批内修（不涉在途文件）**
- **重复组**: —
- **ROI 裁定**: 批内修（先红后绿）
- **误报排除复核**: 非防御式误报——这是已登记缺陷的部分修复；非各自独立演化（同文件同机制同注释）
- **git 出生**: `45443c5f7`（2026-08-31 13-03 修复批，message 只叙述 addTab 范围——症状性单列）

### [类别H] container.tsx 可点击/非可点击全树复制 ~52 行，包内 flex.tsx 即单树正解反例（WA-basic-003）

- **位置**: `packages/flux-renderers-basic/src/container.tsx:60-109` ↔ `:111-162`；逐字 diff 实证 67-101 ↔ 121-155 仅缩进差（35 行 body+header 块完全相同），两分支唯一差异是根 div 的 role/tabIndex/onClick/onKeyDown 四属性
- **严重度**: P2（双份大块 + 低成本可修：条件 props 单树即可）
- **按住的根因**: 无"可选交互包装"参数化；同 commit 的 flex.tsx:96-126 用单树+条件属性解决了同一问题——包内反例在案
- **违约基准**: W3、W2
- **为什么是临时方案**: 症状消失 ✓；根因仍在 ✓（第 3 个交互模式出现时既定路线仍是再复制）；出口缺失 ✓
- **风险**: body 块 15 行 className 装配 ×2，漏改一处即静默分叉
- **重构方向**: 折叠为单树 + interactiveProps（flex.tsx 同文件族先例）；回归 = flex-container-click 套件直通复用
- **重复组**: 2 份（同文件）；冗余 ~52 行；漂移证据：无（逐字仅缩进）
- **ROI 裁定**: CX-n 拟制（basic 包内收敛批；行为保持提取）
- **误报排除复核**: 非声明式表；两分支 DOM 结构逐字同
- **git 出生**: `189d1462e`（2026-08-17 plan 457，同 commit flex 落单树形——一次成型非增量沉积）

### [类别H] loop↔recurse itemData scratch-scope 求值双实现已漂移：P14 性能修复单侧落地，recurse 保留 plan 明文点名的每条目 create/dispose 热点（WA-basic-004）

- **位置**: `packages/flux-renderers-basic/src/loop.tsx:99-122`（evaluateItemDataViaScratch：scratch scope 复用 + merge，plan 2026-09-28-6 P14）↔ `recurse.tsx:86-100`（每次求值 `helpers.createScope({...})` + `finally disposeScope`——per-item per-render 双 store 分配）
- **严重度**: P2（双份 ~25 行、同根因、**已漂移**——同机制一份拿了性能修复另一份没有。recurse 未入 plan 2026-09-28-6 targets、亦无显式 Deferred 裁定，**不构成"已登记的性能分叉"**）
- **按住的根因**: P14 原文点名的热点形态（每条目每渲染创建/销毁真实子 scope 仅为求值一个 compiled value）；修复只落 loop.tsx
- **违约基准**: W3（性能语义修复需两处）、W2（recurse 侧零登记）、W1（根因已在 plan 文档指认却未触达 recurse）
- **为什么是临时方案**: 症状消失 ✓（loop 路径）；根因仍在 ✓（recurse 路径原样）；出口缺失 ✓
- **风险**: 深嵌套 recurse 重渲染场景分配放大；求值语义修 bug 需两处同步
- **重构方向**: recurse 的 evaluateItemData 复用同款 scratch-scope（提取包内共享原语）；回归 = loop dispose-pairing 契约测试 + recurse 同款新增
- **重复组**: 2 份 ~25 行；漂移证据：分配策略分叉（复用 vs per-call）即 P14 单侧落地
- **ROI 裁定**: CX-n 拟制（basic 包内收敛批）
- **误报排除复核**: 两者求值同一 `CompiledRuntimeValue.itemData` 对 item/index/key 绑定，非"语义不同不能合"；非巧合相似
- **git 出生**: recurse 现形 `eda0655c4`（2026-08-07，当时是正确性修复）；loop 优化 `23ee9a323`（2026-09-28/29，targets 明证未含 recurse）

### [类别H] loop↔recurse Provider 脚手架孪生 ~30 行（WA-basic-005）

- **位置**: `loop.tsx:17-58`（LoopProviderProps + contextValue useMemo ×7 依赖）↔ `recurse.tsx:23-63`（同形 + `...props.loopContext` 展开差异）
- **现状**: structural-loop 家族两个 Provider 各自手写同一"props 转发 + contextValue 稳定化"脚手架，仅 loopContext 继承差异
- **严重度**: P3（**降档显式记录**：结构同构但存在真实语义差（recurse 继承并覆盖 loopContext），提取属纯行为保持——wa-2/wa-3 表状降档先例）
- **按住的根因**: structural-loop 家族无共享 Provider 原语；`43e11ab88` 同时给两文件落同形脚手架
- **违约基准**: W3 弱、W2
- **为什么是临时方案**: 行为正确，观察项
- **风险**: 低；第 3 个 structural-loop 家族成员继续复制
- **重构方向**: 并入 WA-basic-004 的收敛批（`StructuralLoopScopeProvider` children-as-function）
- **重复组**: 2 份 ~30 行；漂移证据：无
- **ROI 裁定**: CX-n 拟制（basic 包内收敛批）
- **误报排除复核**: 非 import 噪音（逻辑体复制）
- **git 出生**: `43e11ab88` / `5d7227810`

### [类别I/W5] status-hooks.ts 10 行纯转发放射层（改两处 import 即消失）（WA-basic-006）

- **位置**: `packages/flux-renderers-basic/src/status-hooks.ts:1-10`（全文件：把 flux-react 的 `useStatusPathPublication` 原名 re-export，零增值）；消费者 tabs.tsx、page.tsx（同两文件其余 flux-react 导入全部直连，唯此一项绕行）
- **现状**: 10 行转发 shim 悬置——目标符号早已从 flux-react 公共面直出，间接层仅剩多跳一查的阅读成本
- **严重度**: P3（W5：删除可回答——两处 import 各改一行，零行为变化，化石特征；W2 无出口）
- **按住的根因**: `9411c534e` 边界收口期的过渡转发放射层；目标符号本就从 flux-react 公共面导出
- **为什么是临时方案**: 编译期边界问题当时消失；间接层在，读者多跳一查；出口缺失
- **风险**: 极低
- **重构方向**: 删文件，tabs.tsx:30/page.tsx:28 改直连 flux-react；回归 = typecheck。包内文件不涉公共导出面
- **重复组**: —
- **ROI 裁定**: 挂账观察（watch-only；~10 分钟清理候选随下次触碰）
- **误报排除复核**: 非公共导出面（index.tsx 不导出它）；非 barrel 惯例（包内无第二个此类 shim）
- **git 出生**: `9411c534e`

### [类别H] isDevRuntime 微 helper 3 份三名（WA-basic-007）

- **位置**: `keyboard.tsx:12-15` ↔ `tabs-utils.tsx:11-14`（isDevTabsRuntime）↔ `copy-to-clipboard.ts:7-10`——同一 `import.meta.env?.DEV === true` 4 行函数三份两名
- **现状**: 同一 dev 门控谓词三份独立手写、两个命名，行为一致零漂移
- **严重度**: P3（**降档显式记录**：微 helper 惯用形、零漂移、每份 4 行——wa-3 micro-idiom 先例；全仓对照 ≥13 份跨包属他批 scope，单包内立案为观察项防缓增）
- **按住的根因**: 无包内 utils 收敛点；三次独立手写（`9a21ad932`/`bd03bb8c7`/`dc1775afd`）
- **违约基准**: W3 弱（repo 级微 helper 热区）、W2
- **为什么是临时方案**: 行为正确，观察项
- **风险**: 极低
- **重构方向**: 包内 utils 收敛单份（跨包收敛归共享原语批）；回归 = 零（typecheck）
- **重复组**: 3 份；冗余 12 行；漂移证据：无
- **ROI 裁定**: 挂账观察（watch-only）
- **误报排除复核**: 非 G 类（DEV 门控 dev-warn 噪声为既有排除口径），立案对象仅为重复本体
- **git 出生**: 三次独立手写（2026-06-22/08-31 等三个批次）

### [类别H] 表状/包装层小孪生群合并登记（WA-basic-008）

- **现状**: 四组小孪生（事件 ctx 装配形状 ×8 站点、类型哨兵 ×2、事件契约载荷 ×3、wrapper 壳 ×4）各自手写，行为正确零漂移
- **位置/内容**: ①事件 dispatch-arg ctx 形状 8 站点 3 个本地 helper 无共享原语（use-surface-renderer.ts:190-197、tabs-view-management.ts:51-55、command-palette.tsx:344-349+370-374、keyboard.tsx:139-143、tabs.tsx:303-307+506-510——约定注释在案（"CX-10 / bug-83 family convention"）但 ~40 行人肉同步）；②command-palette.tsx:177,186 `undefined as unknown as Record<string,unknown>` 索引对齐哨兵（一行类型修复）；③basic-renderer-definitions.ts onClick eventContracts 载荷 ×3 逐字（同包 surfaceEventContracts 共享先例未套用）+ flex.tsx:8-33 三张同构 literal→class 映射表；④dynamic-renderer.tsx:242-302 四个 return 分支重复 3 行 wrapper div 壳
- **严重度**: P3（**降档显式记录**：每处 3-16 行、稳定、行为正确——wa-2 WA-runtime-006/wa-3 WA-react-012/013 合并登记先例直通）
- **按住的根因**: 各文件内小工具无提取；约定注释所指 "family convention" 无单一实现
- **违约基准**: W3 弱、W2
- **为什么是临时方案**: 行为正确，观察项群
- **风险**: 低；逐处缓增
- **重构方向**: ①提取包内 `createEventDispatchCtx(scope)`；②`(Record<string,unknown>|undefined)[]` 类型修正；③提取 clickableElementEventContracts 常量；④wrapper 壳提取局部变量——均随下次触碰顺带
- **重复组**: 8 站点+2+4+4；冗余 ~110 行；漂移证据：无（②下游有守卫无行为缺陷）
- **ROI 裁定**: 挂账观察（watch-only）
- **误报排除复核**: 各事件 payload 键差为真实语义差，立案对象仅为 ctx 装配形状与壳
- **git 出生**: 08-07 事件 ctx 批起始逐文件复制；`33cb4f9ab`/`189d1462e`/`2d6991057` 等

### [类别D+H] FieldFrame 注入 aria 引用链消费：9 份同构 cast + 消费矩阵已漂移（choice 族整链丢弃）（WA-form-001）

- **位置**: 全量消费版 `renderers/input.tsx:217-224`、`input-number-renderer.tsx:73-77`、`textarea-renderer.tsx:42-46`、`date-range-renderer.tsx:123-127`、`input-time-renderer.tsx:60-64`；**声明了 `aria-errormessage` 却从不读取** `input-date-renderer.tsx:34-36`、`input-datetime-renderer.tsx:55-57`；**只声明 describedby** `markdown-editor-renderer.tsx:171-172`、`period-renderers.tsx:96-97`；**整链不消费** `input-choice-renderers.tsx`（SelectRenderer controlProps:271-281）、`checkbox-group-renderer.tsx:163,209-210`、`button-group-select-renderer.tsx`。上游注入点 `packages/flux-react/src/field-frame.tsx:186-202`（cloneElement 注入三键，wrap:true 定义全命中）
- **严重度**: P2（≥3 份同根因 P1 起评；**降档显式记录**：7/9 文件行为今天正确，4 文件是 a11y 语义降级非数据缺陷；提取属纯行为保持 → P2）
- **现状**: 9 个渲染器各自 `props as unknown as {'aria-describedby'?: string; 'aria-errormessage'?: string}` + 手写兜底
- **按住的根因**: RendererComponentProps 公共契约未声明 FieldFrame 注入通道（上游 flux-react）；正确通道 = flux-react 导出注入类型 + `resolveFieldAriaErrorRefs` helper
- **违约基准**: W1、W3（9 处人肉同步）、W2
- **为什么是临时方案**: 症状消失 ✓；根因仍在 ✓（第 10 个字段渲染器仍会再抄）；出口缺失 ✓。**plan 2026-09-28-4 a11y sweep completed（`6bbece7d2`）做完扫尾仍未收敛 9 份——收敛窗口错过的直接证据**
- **风险**: 漂移已兑现——注释 3 变体逐字、消费矩阵 3 档并存、choice 族整链丢弃
- **重构方向**: flux-react 导出注入类型 + 本包 field-utils 落唯一 accessor，9 文件改 import；choice 族是否接 frame 链作 a11y 决策单列（test-first）。**涉 flux-react 公共导出新增 → CX 载体 + 人工确认**
- **重复组**: 9 份 + 邻接漂移面 4 文件；冗余 ~60 行
- **ROI 裁定**: CX-n 拟制（涉跨包公共面，执行前人工确认）
- **误报排除复核**: 注入方是同仓库 flux-react，契约可声明，非动态边界
- **git 出生**: `b777508e6`（2026-06-21 E2a 首落 cast）→ `6bbece7d2`（2026-09-28 扩散至 9 份）

### [走读立案·A/B 邻类] cron weekly 向导"周几"选择标签渲染为 cron 分段名（秒/分/时/日/月/周/年）——weekday 词表缺失 + 分段清单复制（WA-form-002）

- **位置**: `renderers/cron-editor-wizard.tsx:62`（`DOW_LABEL_KEYS = ['Second','Minute','Hour','Day','Month','Week','Year']`——名字叫 DOW 却装着 7 个分段名）+ `:96-100`（选项 label `t('flux.cron.seg'+DOW_LABEL_KEYS[dow])`）；词表证据 `flux-i18n` cron 块无任何 weekday 键
- **严重度**: P2（单点行为缺陷：weekly 档向导 7 个周几选项全部标错——值 0-6 语义正确但用户无法分辨周几；值与标签双通道，值正确故不升 P1）
- **现状**: dow=0（周日）选项显示"秒"（zh）/"Second"（en）
- **按住的根因**: i18n weekday 词表从未建立；实现复制了手边最近的 7 元素清单（CRON_SEGMENTS 派生键），常量命名即混淆现场
- **违约基准**: W4（错误标签静默呈现——t() 键存在所以连 fallback 都不触发）、W6（标签与领域语义错位）、W2
- **为什么是临时方案**: 症状消失 ✓（功能"能用"、e2e 只断言值）；根因仍在 ✓；出口缺失 ✓
- **风险**: 用户按错误标签选周几 → 提交错误 cron
- **重构方向**: 补 `flux.cron.dow0..dow6` zh/en 7 键 + 修映射 + 补标签断言测试。零 API 变更，**可批内修**；不涉在途文件
- **重复组**: —
- **ROI 裁定**: 批内修（先红后绿）
- **误报排除复核**: 非设计意图（常量名自证复制来源）；非 locale 未翻译（键根本不存在）
- **git 出生**: `6a0d9f672`（plan 541 C6 cron-editor v2，e2e 只钉值不断言标签——盲区实证）

### [类别E/H] getFocusTarget 焦点寻址 querySelector 惯用形 ×12：ui 原语不转发可聚焦 ref 的渲染器侧补偿层，无出口（WA-form-003）

- **位置**: 12 处（全部自家子树 + `?? rootRef.current` 兜底）：`slider-renderer.tsx:30`、`rating-renderer.tsx:30`、`input-color-renderer.tsx:32`、`verification-code-renderer.tsx:64`、`button-group-select-renderer.tsx:60`、`checkbox-group-renderer.tsx:49`、`input-choice-renderers.tsx:292,512,583`、`org/org-select-control.tsx:67`、`org/region-renderer.tsx:60`、`cron-editor-renderer.tsx:217`（生产键盘 roving 用 data-testid 寻址）。对照：9 处 getFocusTarget 已用直接 ref——ui 原语肯给 ref 的都没这问题
- **严重度**: P3（12 份同根因 P1 起评；**降档显式记录**：每处 1-3 行惯用形、自家子树受控、data-slot 是仓库自有标记契约、行为正确）
- **按住的根因**: **上游在 ui**——Slider/Rating/ColorPicker/Checkbox 等不 forward 可聚焦元素 ref，渲染器无法持有焦点句柄。与 wa-3 WA-ui-006 同根因方向不重复
- **违约基准**: W2（无出口：ui 升级/改名无判据）、W4 弱（ui data-slot 改名 → 焦点静默退化 no-op）
- **为什么是临时方案**: 症状消失 ✓；根因仍在 ✓；出口缺失 ✓
- **风险**: 第 N 个新 ui 原语继续 querySelector；selector 落空静默无观测
- **重构方向**: ui 侧补 forwardRef（或 `data-focus-target` 单一契约）；渲染器侧可先落 `useFocusTargetRef(selector)` 小原语止增。**涉 ui 公共面 → CX 载体**
- **重复组**: 12 份 ~25 行；漂移证据：选择器风格两派
- **ROI 裁定**: CX-n 拟制（涉 ui 公共面，ask-first）
- **误报排除复核**: 自家子树+受控成立但"无替代 API"正在自我延续；非 WA-ui-006 式"契约在位却按标签嗅探"
- **git 出生**: `58e716164`（plan 503 L1 atoms）起逐家族复制

### [类别H] useInputComponentHandle 注册样板 ~19 份（WA-form-004）

- **位置**: 19 个字段渲染器文件的 useInputComponentHandle 调用块（~12-15 行/份）：input:229-244、input-number:109-123、textarea:51-65、markdown:186-196、period:111-121、date-range:179-189、date-field-control:128-138、input-time:81-91、slider:23-38、rating:24-38、input-color:25-40、verification-code:57-72、signature:268-286、select:285-311、switch:505-515、radio-group:576-586、checkbox-group:42-53、button-group-select:53-64、org-select-control:60-76 + region-renderer:53-69
- **严重度**: P3（19 份 P1 起评；**降档显式记录**：与 wa-3 WA-react-006 同族先例直通——共享 hook 已存在，复制的是调用侧样板）
- **现状**: methods/isInteractive/isVisible/clearValue/resetValue 逐字重复
- **按住的根因**: 无 `useStandardFieldHandle` 默认值层
- **违约基准**: W3（弱）、W2
- **为什么是临时方案**: 行为正确，观察项立案保零静默
- **风险**: **漂移已兑现一次**：checkbox-group 的 clear 曾是死控制（plan 549 注释自证——handle 只声明 focus，`component:clear` 被静默吞）；resetValue 三变体；**单选 checkbox 完全无 handle 注册**（与 switch/radio-group 的 FOCUS_ONLY 不一致）
- **重构方向**: `useStandardFieldHandle(props, presentation, { getFocusTarget, clearValue?, resetValue? })` 吸收样板；checkbox 单选补 capability 决策单列。归包内收敛 CX 载体
- **重复组**: ~19 份 ~180 行；漂移证据：resetValue 三变体 + 549 事故 + checkbox 缺注册
- **ROI 裁定**: CX-n 拟制（form 消费侧收敛批）
- **误报排除复核**: getFocusTarget/clearValue 参数是真实差异，立案对象仅为同构骨架
- **git 出生**: 与 flux-react handle 家族统一计划同根（`4051b4e6b`/`4252eea59`）

### [类别C邻] signature 收笔后全局 click 吞噬窗 400ms（WA-form-005）

- **位置**: `renderers/signature-renderer.tsx:229-234`（document 级 capture click 监听 + 400ms 时间窗）
- **现状**: 收笔后 400ms 内 document 级捕获吞噬一切 click（once 自移除），防合成 click 误触 toolbar
- **严重度**: P3（有注释、有界、once；风险=收笔后 400ms 内任何合法点击被全局吞噬；根因"收笔布局位移把 toolbar 按钮挪到指针下"未修，双闸另一半 pointerdown preventDefault 已在）
- **按住的根因**: 笔画提交引发布局位移 → 合成 click 落点漂移；修法选了"事件窗"而非"布局稳定/落点命中判定"
- **违约基准**: W2（无出口）、W6 弱（400ms 是调出来的窗）
- **为什么是临时方案**: 症状消失 ✓；根因仍在 ✓；出口缺失 ✓（watch 而非排除——全局副作用）
- **风险**: 中低；时间窗调参无判据
- **重构方向**: swallow 收窄为 canvas bbox 命中测试，或消除位移源；回归=现有 signature e2e/单测
- **重复组**: —
- **ROI 裁定**: 挂账观察（watch-only）
- **误报排除复核**: 非 dispatchEvent 模拟；非 §2C 动画时序豁免
- **git 出生**: plan 507 功能批

### [类别H] date 族双实现群 6 块：calendarLocaleFor/buildDisabledMatchers/clamp 家族/stepper 行/时间行（WA-form-006）

- **位置**: `calendarLocaleFor` 逐字 ×2（date-field-control:24-26 ↔ date-range:34-36）；`buildDisabledMatchers` ~8 行 ×2；`clampToRange` ↔ `clampDateToRange` ~10 行 ×2（**后者注释自认 "Mirrors date-field-control's clampToRange"——镜像关系已书面化**）；input-time 同文件双 clamp；stepper UI 块 ×2（~35 行）；时间输入行 ×2
- **现状**: date 族六块同构实现散落三文件，clamp 已现第三变体（input-time maxDate-only 分支）
- **严重度**: P3（两份、稳定、镜像注释在案 → §3"可观察"；冗余 ~70 行）
- **按住的根因**: date/ 目录缺共享 time-steppers/clamp 模块；W2b 当日一次落两份（`795b973c7`）
- **违约基准**: W3、W2；**风险**：clamp 语义已现第三变体
- **为什么是临时方案**: 行为正确，观察项
- **风险**: clamp 三变体漂移中
- **重构方向**: date/ 内提取（零 API 变更）；回归=现有 date 族套件
- **重复组**: 6 块 ~70 行；漂移证据：clamp 第三变体
- **ROI 裁定**: CX-n 拟制（form 消费侧收敛批）
- **误报排除复核**: 非巧合相似——镜像注释自证同根
- **git 出生**: `795b973c7`

### [类别I/W5] createFormLifecycleScope 死参数 `_formName`/`_getFormValues`（WA-form-007）

- **位置**: `renderers/form-lifecycle-helpers.ts:3-7`（形参带 `_` 前缀零使用）；调用点 HEAD form.tsx:129-148 双处传实参
- **现状**: 拆文件批把函数签名原样搬走，两个参数自此无读者，调用点仍照传
- **严重度**: P3（W5：删除零行为变化，化石特征成立；**重构方向涉在途文件 form.tsx——不叠编辑**，登记为 form target 特性合入后的顺带清理）
- **按住的根因**: `81702c1e6`（oversized 治理拆文件批）整体搬迁函数时签名原样带走，参数自此失配
- **违约基准**: W5、W2
- **为什么是临时方案**: 死参数化石；非预留扩展点（无读者无注释）
- **风险**: 极低
- **重构方向**: 删参数与实参（待 form target 特性收口后顺带）
- **重复组**: —
- **ROI 裁定**: 挂账观察（watch-only；在途文件——不叠编辑）
- **误报排除复核**: 见上
- **git 出生**: `81702c1e6`

### [类别B弱] input-suggest refreshSource 失败静默 `.catch(() => undefined)` ×2（WA-form-008）

- **位置**: `renderers/input-suggest.tsx:132,156`
- **现状**: refreshSource 失败被 `.catch(() => undefined)` 吞掉，建议面板静默保持旧值，与空结果不可区分
- **严重度**: P3（门禁命中同形但 select-combobox-lists:66 / select-mobile:47 有 warn+兜底故排除；本两处零观测——失败时建议面板静默不更新，与空结果不可区分）
- **按住的根因**: suggest 数据源刷新失败通道未定义；同包三种标准并存即漂移证据
- **违约基准**: W4、W2
- **为什么是临时方案**: 症状消失（面板不崩）；根因仍在；出口缺失
- **风险**: 调试视图静默失真
- **重构方向**: console.warn 或走 reportRuntimeHostIssue（field-handlers 已有同型通道）；行为不变观测补齐，~10 分钟，可随下次触碰顺带
- **重复组**: —
- **ROI 裁定**: 挂账观察（watch-only）
- **误报排除复核**: 降级无观测即 §2B 定义
- **git 出生**: `dc35badcc`（2026-06-22 suggest 功能批）

### [类别H/A弱] surface-shell 哨兵嗅探 dialogId/drawerId ×3（HEAD 口径）——在途特性已示范正确通道（WA-form-009）

- **位置**: HEAD form.tsx:161-167、:187-194（`visibleScope.dialogId ?? drawerId` 链 ×2，同 effect 内即重复）；form-lifecycle-helpers.ts:82-89（`looksLikeSurfaceShell` 数据嗅探）
- **现状**: 三处用 scope 数据哨兵字段嗅探 surface shell 身份，业务值恰含 dialogId 即误判
- **严重度**: P3（**涉在途文件——不叠编辑**：在途 `seedInitialValuesFromSurfaceScope` 已改走 `ScopeRef.source === 'dialog'|'drawer'` 结构化通道，证明正道存在；登记为 form target 合入后的收敛候选）
- **按住的根因**: ScopeRef 无一等 surface 身份通道（与 wa-3 WA-react-004 同方向不同位点，不重复立案）
- **违约基准**: W6（业务值恰含 dialogId 即误判）、W2
- **为什么是临时方案**: 症状消失；根因仍在；出口缺失（正确通道已在途示范）
- **风险**: 低；哨兵误判面
- **重构方向**: 嗅探三处迁 source 通道（随 form target 收口）
- **重复组**: 3 份 ~24 行；漂移证据：第 4 份已迁正道
- **ROI 裁定**: 挂账观察（watch-only；在途文件——不叠编辑）
- **误报排除复核**: 非领域哨兵（AMIS 无此协议规定）
- **git 出生**: 嗅探逻辑早于 `81702c1e6` 拆分

### [类别C注记·不立案] form.tsx 提交失败焦点 rAF 有界重试（WA-form-010）

- **位置**: HEAD form.tsx:360-391；配套 fieldset.tsx:37-60（MutationObserver auto-reveal，带登记）
- **裁定**: **排除（记录）**——轮询+固定上限形态命中 §2C 信号，但注释完备、有界、等待对象是自身 re-render 与 fieldset 展开的复合时序；替代方案重构面大、当前行为正确。挂 watch：若 aria-invalid 写入时序重构（如 store 派生）落地，此 rAF 环应同步退役——此即其缺席的出口
- **ROI 裁定**: 排除记录 + watch 注记

### 【跨包增补注记，不另立 ID】form.tsx StrictMode 延迟 dispose 骨架 = WA-react-001 同型第 7 份

form.tsx StrictMode 延迟 dispose 骨架（HEAD 行号 :80-81 refs/:113-125 effect 体；首版误标工作树在途行号 149-155，closure audit m4 勘误）与 wa-3 WA-react-001（flux-react 6 份）骨架同构。**归 CX-8 载体扩围**（flux-renderers-form 实例一并收敛），此处仅登记防后续审计重复发现。

## 汇总

### 1. 转正清单（W2 违约项，按风险排序）

| 发现 ID      | 位置                                                                         | 出生时间（git 考古）                                                | 风险                                               | 处置               |
| ------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------- | ------------------ |
| WA-basic-001 | use-surface-renderer.ts:28,218,539 + surface-renderer-definitions.ts:261-276 | raw read `f616f0163`（08-18）→ 治愈原语 `33cb4f9ab`（08-30 未回移） | 门禁 [high] ×2 live；文法演化即分叉                | CX-n（人工确认门） |
| WA-form-001  | 9 字段渲染器 injected-aria cast（+choice 族 4 文件丢弃）                     | `b777508e6`（06-21）→ `6bbece7d2`（09-28 sweep 后仍扩散）           | 消费矩阵 3 档漂移；choice 族 errormessage 整链丢弃 | CX-n（人工确认门） |
| WA-basic-002 | tabs-view-management.ts:163-231                                              | `45443c5f7`（08-31 单侧修复）                                       | 同 tick 双操作 last-writer-wins 静默丢弃           | 批内修             |
| WA-form-002  | cron-editor-wizard.tsx:62,96-100                                             | `6a0d9f672`（plan 541）                                             | weekly 7 选项全标错（值对标签错）                  | 批内修             |
| WA-basic-003 | container.tsx:60-162                                                         | `189d1462e`（08-17，flex 反例同 commit）                            | 52 行双写漂移面                                    | CX-n               |
| WA-form-003  | 12 处 getFocusTarget querySelector                                           | `58e716164`（plan 503）起                                           | ui 契约升级即静默退化                              | CX-n（ask-first）  |
| WA-basic-004 | loop.tsx:99-122 ↔ recurse.tsx:86-100                                         | `23ee9a323`（09-28 P14 单侧）                                       | recurse 保留 plan 明文点名热点                     | CX-n               |
| WA-form-004  | 19 处 useInputComponentHandle 样板                                           | `4051b4e6b`/`4252eea59` 家族扩散                                    | 549 事故形态（死控制）已兑现一次                   | CX-n               |
| 其余 P3      | 005/006/007/008（basic）+ 005/006/007/008/009（form）                        | 各见条目                                                            | 低                                                 | watch-only         |

### 2. 重复代码热区（按总冗余行数排序）

| 组  | 份数   | 各份位置                                    | 冗余行数 | 漂移证据                                       | 裁定（三问句）                                |
| --- | ------ | ------------------------------------------- | -------- | ---------------------------------------------- | --------------------------------------------- |
| 1   | ~19    | useInputComponentHandle 样板（WA-form-004） | ~180     | resetValue 三变体 + 549 事故 + checkbox 缺注册 | 同根因✅ 已漂移✅ 提取干净✅ → P3（样板降档） |
| 2   | 9(+4)  | injected-aria cast（WA-form-001）           | ~60      | 注释 3 变体 + 消费矩阵 3 档 + choice 族丢弃    | 同根因✅ 已漂移✅ 提取需跨包契约 → P2         |
| 3   | 6 块   | date 族双实现（WA-form-006）                | ~70      | clamp 第三变体                                 | 同根因✅ 已漂移✅ 稳定 → P3                   |
| 4   | 2      | container 全树（WA-basic-003）              | ~52      | 无（逐字仅缩进）                               | 同根因✅ 已漂移❌ flex 反例在旁 → P2          |
| 5   | 12     | getFocusTarget（WA-form-003）               | ~25      | 选择器风格两派                                 | 同根因✅ 已漂移✅ 上游 ui 契约 → P3（降档）   |
| 6   | 8 站点 | 事件 dispatch ctx（WA-basic-008①）          | ~40      | 无                                             | 同根因✅ 已漂移❌ 惯形 → P3                   |
| 7   | 2      | loop↔recurse scratch-scope（WA-basic-004）  | ~25      | 分配策略分叉（P14 单侧）                       | 同根因✅ 已漂移✅ → P2                        |
| 8   | 2      | loop↔recurse Provider（WA-basic-005）       | ~30      | loopContext 展开为真实差异                     | 同根因✅ 已漂移❌ → P3                        |
| 9   | 3      | isDevRuntime（WA-basic-007）                | 12       | 无                                             | 微 helper → P3                                |
| 10  | 7      | capability-contracts 数据表（form）         | ~60      | 描述文案小异                                   | 数据表低危 → watch                            |

### 3. Top 重构建议（默认 3 项）

1. **form 渲染器消费侧契约缺口收敛（WA-form-001/003 合并载体）**：根因修复点 = ①flux-react 导出 FieldFrame 注入类型 + resolveFieldAriaErrorRefs helper（9 份 cast + choice 族决策收敛）；②ui 侧可聚焦原语 forwardRef（或 data-focus-target 单一契约）（12 处 getFocusTarget 收敛）；预期删除本体 = 9 份 cast + 12 处 selector 补偿；回归 = form a11y 套件 + 焦点套件；影响面 = flux-react/ui 公共面（**结构性，执行前人工确认/ask-first**）。
2. **basic 包内收敛批（WA-basic-003/004/005）**：container 单树 + interactiveProps、loop↔recurse scratch-scope 与 Provider 共享原语化；预期删除本体 ~107 行双写 + recurse 性能热点；回归 = flex-container-click + loop/recurse 套件；影响面 = 包内零 API 变化（非结构性）。
3. **form 消费侧复制沉积收敛批（WA-form-004/006）**：useStandardFieldHandle 默认值层（19 份样板 + checkbox capability 决策）+ date 族共享模块；预期删除本体 ~250 行；回归 = 字段全家族套件；影响面 = 包内（非结构性）。另：CX-8 扩围吸收 form.tsx StrictMode 骨架第 7 份。

### 4. 误报排除清单（54 项）

#### flux-renderers-basic（24 项）

| #   | 疑似点                                | 位置                                                                                                            | 排除理由                                                                                                                             |
| --- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | domRaid 唯一命中 querySelector        | tabs.tsx:252-257                                                                                                | E：自家子树 `[data-slot="tabs-trigger"][data-active]` 标记契约寻址 + scrollIntoView（React 无声明式滚动 API）；[G1-R6-视角8-01] 登记 |
| 2   | setTimeout 1500ms                     | text.tsx:74                                                                                                     | C：复制成功图标回置的 UI 反馈时序，timerRef cleanup 完备                                                                             |
| 3   | Date.now ×5 + setInterval 250ms       | button.tsx:106-176                                                                                              | C：倒计时数学（endsAt 重算防漂移，注释在案）；interval 是推进源非等待他系统                                                          |
| 4   | catch ×5                              | button.tsx:112,127,152,176                                                                                      | B：host 注入 CountDownStorage 适配器信任边界，每处注释 + 降级语义明确                                                                |
| 5   | `catch { return; }`                   | button.tsx:228                                                                                                  | B：rejection 由 action runtime notify() 路由；"不启动倒计时"可重试即设计                                                             |
| 6   | catch ×2                              | copy-to-clipboard.ts:25,44                                                                                      | B：结构化降级链（clipboard-api→exec-command→none 判别联合）+ dev warn                                                                |
| 7   | catch                                 | dynamic-renderer.tsx:178                                                                                        | B：aborted 判别 + setState error 渲染 role=alert                                                                                     |
| 8   | catch ×3                              | keyboard.tsx:98,126,132                                                                                         | B：:98 fail-closed + one-shot dev warn（登记）；:126/:132 warnOnce                                                                   |
| 9   | catch                                 | page.tsx:212                                                                                                    | B：releasePointerCapture NotFoundError 常规竞态（wa-3 同形先例）                                                                     |
| 10  | `UNUSED as unknown as TValue`         | interaction-owner.ts:23                                                                                         | D：禁用订阅通道哨兵惯例（Object.is 身份比较 + 立即还原）                                                                             |
| 11  | `as never`/cast 面                    | tabs.tsx:92、recurse.tsx:69-71、dynamic-renderer.tsx:79,146、icon.tsx:36、utils.ts:3-5、command-palette.tsx:490 | D：resolved-props/schema 反序列化动态边界一次性收窄                                                                                  |
| 12  | `outcome as {...}`                    | tabs-view-management.ts:149                                                                                     | D：TS 闭包赋值窄化惯例                                                                                                               |
| 13  | `!id.startsWith('_')` 生成 id 嗅探    | button.tsx:53-61                                                                                                | A/W6 注记级排除：注释登记领域依据；**watch 注记**：flux-core 改 id 方案时静默漂移                                                    |
| 14  | tabTitleRegionCache 渲染期 WeakMap 写 | tabs.tsx:113-131                                                                                                | 排除：plan 2026-09-29-4 R2-P17 + audit r1 F5 双登记的性能缓存                                                                        |
| 15  | candidate-fix 写回 effect             | tabs.tsx:151-162                                                                                                | 排除：design.md §10 登记设计                                                                                                         |
| 16  | overflow-y-hidden 配对                | tabs.tsx:318-325                                                                                                | F：根因修复先例本身（after: 指示线 1px，#39）                                                                                        |
| 17  | container/flex 硬编码 Tailwind 类     | container.tsx:81-90、flex.tsx:8-33、page.tsx resize handle                                                      | 契约核查排除：schema-prop→class 纯映射即"styling from schema"机制本体；resize-handle 为交互控件合法                                  |
| 18  | Trigger 内 role="button" close span   | tabs.tsx:388-417                                                                                                | 排除：HTML/ARIA 违规规避注释在案                                                                                                     |
| 19  | isDevRuntime DEV 门控 ×3              | keyboard/tabs-utils/copy-to-clipboard                                                                           | G：dev-only warn 噪声门控                                                                                                            |
| 20  | test-support stub fetcher             | test-support.tsx:7-12                                                                                           | G：测试夹具                                                                                                                          |
| 21  | `'use no memo'`                       | dynamic-renderer.tsx:73                                                                                         | 排除：plan 2026-09-28-4 R2-P16 登记的 React Compiler 退出指令                                                                        |
| 22  | loadAction 声明为 prop 非 event       | basic-renderer-definitions.ts:474-482                                                                           | 排除：注释明示 "lying contract" 规避 + schemaValidator 兜形状——契约决策                                                              |
| 23  | command-palette rawAction 双轨        | command-palette.tsx:44-56,132-135,355-361                                                                       | I：带编号登记（23-01）+ 双轨动机注释完整；**watch 注记**：第三渲染器需要时应上收编译期通道                                           |
| 24  | page dataPatch WeakSet 键控           | page.tsx:109-126                                                                                                | 排除：scope 身份键控注释在案（StrictMode 正确防御）                                                                                  |

#### flux-renderers-form（30 项）

| #   | 疑似点                                         | 位置                                                    | 排除理由                                                                |
| --- | ---------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | input-number long-press setTimeout/setInterval | input-number:14-15,177-192                              | C：长按步进交互协议，命名常量，清理完备                                 |
| 2   | suggest debounce 300                           | input-suggest:125                                       | C：防抖原语，suggestDebounce 可配，generation 守卫                      |
| 3   | BLUR_CLOSE_DELAY 150                           | input-suggest:16,241                                    | C：UI 惯例 + mousedown preventDefault 双保险                            |
| 4   | select 远搜 debounce 300                       | use-select-remote-search:56                             | C：AbortController+完整错误呈现，模范实现；注记：300 硬编码与可配不一致 |
| 5   | org 搜 debounce 300                            | use-org-source:324                                      | 同上                                                                    |
| 6   | region-wheel settle 120ms + suppress 600ms     | region-wheel:25,62                                      | C：scroll-snap settle 惯例；watch 注记                                  |
| 7   | submitOnChange debounce 300                    | HEAD form.tsx:441-444                                   | C：防抖原语；注记：未入 schema，随 target 特性后可参数化                |
| 8   | parse.ts `catch (code)` 字符串控制流           | cron/parse.ts:110                                       | B：类型化 Result 收敛，注释自证                                         |
| 9   | org `.catch(() => {})` ×2                      | use-org-source:177,302                                  | B：失败已建模 `{ok:false}`，逃逸仅 AbortError                           |
| 10  | useOrgEcho disposedRef                         | use-org-source:362-421                                  | G：协议 §4 登记 fire-and-forget，非取消标记回归                         |
| 11  | select-mobile optionTemplate catch             | select-mobile:47-54                                     | B：warn + label 兜底                                                    |
| 12  | field-handlers onChange catch                  | field-handlers:151,166                                  | B：warn + reportRuntimeHostIssue 双通道                                 |
| 13  | form-init/load void+catch                      | form-init-action:47 / form-load-action:69               | B：结构化上报 + abort 三重判别                                          |
| 14  | use-dict-options catch                         | use-dict-options:96-100                                 | B：warn + errorMessage 状态 + generation 守卫                           |
| 15  | `{action:'refreshSource'} as ActionSchema` ×2  | input-suggest:130,154                                   | D 弱：excess-property 抑制，改引子类型即可，微项                        |
| 16  | searchSource/region casts                      | use-select-remote-search:62 / region-renderer:44-47     | D：schema 动态边界                                                      |
| 17  | `as CronScheduleValue` ×2                      | use-cron-editor-controller:149,155                      | D 弱：plan 541 提交门控设计                                             |
| 18  | `{type:'markdown'} as never`                   | markdown-editor:252                                     | D：跨包开放注册表边界，注释登记                                         |
| 19  | resolveInputMode override cast                 | mobile-touch-utils:25                                   | D：schema 字符串→union 动态边界                                         |
| 20  | PREVIEW_CURSOR 模块级 Date.now                 | cron-editor-renderer:46,102-103                         | I：渲染期纯度规则的登记式解法（plan 540 出口在案）                      |
| 21  | cron roving 用 data-testid                     | cron-editor-renderer:217                                | E 弱：plan 541 裁决在案；并入 WA-form-003                               |
| 22  | PRESET_LABEL_KEYS 扁平键 + 兜底                | cron-editor-renderer:34-43,75,238,255                   | I：与 C4 规划偏离有注释登记；动态键兜底为 i18n 惯例                     |
| 23  | cron-editor 原生 select                        | cron-editor-renderer:280-305                            | 规约违反注记（非 workaround）：走常规规约通道                           |
| 24  | fieldset MutationObserver                      | fieldset:37-60                                          | E：plan 485 P2-18 登记 remediation；深层根因挂 watch                    |
| 25  | Enter 提交 tag/role 黑名单                     | HEAD form.tsx:468-489                                   | A：HTML 交互语义协议集（W6 满足）                                       |
| 26  | resolveErrorFocusTarget + tabIndex=-1          | HEAD form.tsx:29-46                                     | E：[G2-R5-视角4-01] 登记修复                                            |
| 27  | autoHeight/scrollIntoView 直写 style           | markdown:227-241、textarea:77-93、mobile-touch-utils:37 | F：feature 实现（登记含 Safari 裁决）                                   |
| 28  | contactGroup 双 Input 三连                     | test-support:216-238                                    | G：测试夹具                                                             |
| 29  | test-support setTimeout/beforeEach             | test-support:25,59,143                                  | G：fixture                                                              |
| 30  | date-range data-range-kind 隐藏 span           | date-range:471-472                                      | G：标准可测性设计；注记：改挂根 div 更净                                |

### 5. 范围整体判断

**零星个案叠加字段家族消费侧样板复制与上游契约缺口补偿，不是系统性临时方案文化。** 两包字面临时标记为零、根因失传 0（basic 002 的根因已登记但修复单侧落地）、症状性 commit 仅 1 处；错误路由纪律严格（basic 12 处 catch 全观测/结构化；form 6 门禁命中 5 排除 1 升级）；登记出口文化良好。沉积集中在两维：**字段家族落地时的消费侧样板复制**（injected-aria ×9、handle 样板 ×19、getFocusTarget ×12——flux-react/ui 上游契约缺口的渲染器侧补偿）与**修复/优化单侧落地**（13-03 只修 addTab、P14 只落 loop、compileOpenBinding 只接 palette——三处"已知正解未回移同机制兄弟"是本批特有形态）。两处单点行为缺陷（tabs 同 tick 丢弃、cron weekly 标签）均批内修。与 wa-1/2/3 结论同构：机制落地不提取共享原语、正解不回移、事后无收敛登记。批内修 2 项，结构性收敛归 CX-10/11/12 + CX-8 扩围，处置时机 WA-16 收口前。

## 批内修复记录（Auto-Remediation）

> roadmap 自动修复契约 §2–§4：P0/P1 单点行为缺陷先红后绿修复；P2 低成本（约 15 分钟内）当场修；
> 结构性/跨批共性发现一律不批内硬修，以 CX-n 拟制独立修改计划。每项修复验证临时方案本体已删除。

| 发现 ID      | 严重度 | 修复方式（fix/CX-n/watch-only/…）                                           | 回归测试（先红后绿证据）                                                                                                                           | 本体删除验证                                                                                                                                                                                                                                           | commit          |
| ------------ | ------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| WA-basic-001 | P2     | CX-n（dialog/drawer open 编译期通道接线；renderer 定义字段契约→人工确认门） | 归 CX-12 plan                                                                                                                                      | —                                                                                                                                                                                                                                                      | —               |
| WA-basic-002 | P2     | 批内修（remove/rename/move 改函数式更新，对 live prev 按 value 定位）       | 红→绿 3/3：同 tick rename+remove/remove+move/move+rename 三用例先红（last-writer-wins 复现）→ 修复后全绿（tabs-same-tick-mutations.test.tsx 新增） | 本体=快照绝对值提交，commitCollection(() => 残留 grep=0。**残差注记（closure m5）**：payload/activeValue 仍在快照侧（既有语义非本修引入）；同 tick remove+remove 可绕过按快照 length 判定的 last-tab 守卫（旧实现同场景更差，非回归）——归 CX-10 观察面 | 本批收口 commit |
| WA-basic-003 | P2     | CX-n（basic 包内收敛批）                                                    | 归 CX-10 plan                                                                                                                                      | —                                                                                                                                                                                                                                                      | —               |
| WA-basic-004 | P2     | CX-n（同上）                                                                | 归 CX-10 plan                                                                                                                                      | —                                                                                                                                                                                                                                                      | —               |
| WA-basic-005 | P3     | CX-n（同上）                                                                | 归 CX-10 plan                                                                                                                                      | —                                                                                                                                                                                                                                                      | —               |
| WA-basic-006 | P3     | watch-only（~10 分钟清理候选随下次触碰）                                    | —                                                                                                                                                  | —                                                                                                                                                                                                                                                      | —               |
| WA-basic-007 | P3     | watch-only                                                                  | —                                                                                                                                                  | —                                                                                                                                                                                                                                                      | —               |
| WA-basic-008 | P3     | watch-only（①~④顺带候选）                                                   | —                                                                                                                                                  | —                                                                                                                                                                                                                                                      | —               |
| WA-form-001  | P2     | CX-n（form 消费侧契约缺口批；flux-react 公共导出→人工确认门）               | 归 CX-11 plan                                                                                                                                      | —                                                                                                                                                                                                                                                      | —               |
| WA-form-002  | P2     | 批内修（DOW_LABEL_KEYS 改 weekday 语义键 + flux-i18n zh/en 补 7 键）        | 红→绿：红实证 labels=[秒,分,时,日,月,周,年]（与取证逐字同）→ 修复后 [周日..周六]（cron-wizard-weekday-labels.test.tsx 新增）                       | seg 键映射本体删除（flux.cron.dow 新通道）；类别清扫 seg 嗅探无兄弟                                                                                                                                                                                    | 本批收口 commit |
| WA-form-003  | P3     | CX-n（同 CX-11；ui 公共面→ask-first）                                       | 归 CX-11 plan                                                                                                                                      | —                                                                                                                                                                                                                                                      | —               |
| WA-form-004  | P3     | CX-n（同 CX-11）                                                            | 归 CX-11 plan                                                                                                                                      | —                                                                                                                                                                                                                                                      | —               |
| WA-form-005  | P3     | watch-only                                                                  | —                                                                                                                                                  | —                                                                                                                                                                                                                                                      | —               |
| WA-form-006  | P3     | CX-n（同 CX-11）                                                            | 归 CX-11 plan                                                                                                                                      | —                                                                                                                                                                                                                                                      | —               |
| WA-form-007  | P3     | watch-only（在途文件——不叠编辑，target 收口后顺带）                         | —                                                                                                                                                  | —                                                                                                                                                                                                                                                      | —               |
| WA-form-008  | P3     | watch-only（~10 分钟顺带候选）                                              | —                                                                                                                                                  | —                                                                                                                                                                                                                                                      | —               |
| WA-form-009  | P3     | watch-only（在途文件——不叠编辑，target 收口后迁 source 通道）               | —                                                                                                                                                  | —                                                                                                                                                                                                                                                      | —               |
| WA-form-010  | —      | 排除记录 + watch 注记（rAF 环退役出口=aria-invalid 时序重构）               | —                                                                                                                                                  | —                                                                                                                                                                                                                                                      | —               |

共性裁定：CX-10（flux-renderers-basic 包内复制沉积收敛批：WA-basic-003/004/005，非结构性）、CX-11（form 渲染器消费侧契约缺口与复制沉积收敛批：WA-form-001/003/004/006——**001 涉 flux-react 公共导出、003 涉 ui 公共面，执行前人工确认/ask-first**）、CX-12（dialog/drawer 受控 open 编译期通道接线：WA-basic-001——**renderer 定义字段契约，执行前人工确认门**）已插入 roadmap Phase Status（CX-9 与 WA-16 之间）；CX-8 扩围吸收 form.tsx StrictMode 骨架第 7 份（跨包增补注记）。

## 批内修复 filter 门禁

- flux-renderers-basic：typecheck/build/lint/test **652/652** 全绿（含新增 same-tick 3 用例）。
- flux-renderers-form：typecheck/build/lint/test **1096/1096** 全绿（含新增 weekday 1 用例；主树含并行在途 3 文件，隔离口径见 Closure Gates）。
- flux-i18n（词表涉改）：typecheck/build/lint/test **30/30** 全绿。
- 两包 `git diff --exit-code src/index.tsx` 通过——零公共导出变更。

## 台账回写核对

- 本批新增 findings：18 条（WA-basic-001…008、WA-form-001…010，其中 010 为排除记录）
- modules 行翻转 audited：flux-renderers-basic、flux-renderers-form
- `pnpm workaround:reconcile` 输出摘录（收口终态）：modules 49 total / audited 9 / uncovered 40 / orphan 0；findings 56 = pending 0 + found 48 + fixed 0 + verified 8（WA-basic-002/WA-form-002 于 closure audit R2 approved 后 fixed→verified）；dispositions watch-only 19 / successor-required 28 / n-a 1；未处置 0；violations 0（中途一次：WA-form-010 误用 withdrawn 作 status，已改 found+n-a——排除记录的正确表达）
- **closure audit**：R1 issues（agent_a94d2038-3053-4d6f-9fb9-6a1007462380，0B/1M/6m——M1 覆盖声明行数会计失真，即本报告快照注记勘误所自）→ 修正后 delta 复核 R2 approved（0B/0M/0m）；审计员独立复现三包 filter test + check-i18n-keys + reconcile + 8 处 live 抽查 + 6 commit 考古 + 隔离五门禁
