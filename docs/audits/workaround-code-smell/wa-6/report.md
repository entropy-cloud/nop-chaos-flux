# WA-6 数据展示渲染器 临时方案与坏味道审计报告

> 批次: WA-6（roadmap `docs/backlog/workaround-code-smell-audit-roadmap.md` Phase Status 对应行）
> 审计方法: `docs/skills/workaround-code-smell-audit-prompt.md`（九类信号 A–I + W1–W6 + §5 取证协议）
> 执行 plan: `docs/plans/566-workaround-audit-wa6-data-plan.md`
> 审计日期: 2026-10-11
> 对象清单来源: `docs/audits/workaround-code-smell/inventory/modules.json`（批次 = WA-6 行，不手抄）
> 取证模式: **review-only**（本报告由独立取证 agent 产出；批内修复归 Phase 2 执行会话，台账登记归主会话）

## 快照基准注记

本批对象 flux-renderers-data 工作树含 **3 个在途源文件**（并行会话 form-target 特性：`crud-renderer.tsx` / `crud-renderer-state.ts` / `crud-renderer-ownership.ts`，另有 `__tests__/crud-renderer-state.unit.test.tsx` 非测试源码不计）。HEAD = `8061a7b5c`（WA-5 收口 commit，与 plan 五门禁基线记载逐字一致）。在途 3 文件取证一律 `git show HEAD:<path>`；其余 111 文件 HEAD 与 live 零漂移（逐文件 wc 对照实测）。

**双口径行数逐文件分解**（实测 `wc -l`）：

| 口径           | 全集行数 | 说明                                                                                                      |
| -------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| inventory 口径 | 22,319   | WA-0 枚举器值（modules.json `loc`）                                                                       |
| live wc        | 22,318   | 差 1 = `column-width-measure.ts` 无尾换行（枚举器记 88 / wc 记 87，plan draft-review m 项已登记的约定差） |
| HEAD wc        | 22,301   | = live 22,318 − 在途漂移 17                                                                               |

在途漂移（live vs HEAD，逐文件）：`crud-renderer-ownership.ts` +10（281/271）、`crud-renderer-state.ts` +4（585/581）、`crud-renderer.tsx` +3（694/691）。plan 记载的 "HEAD 口径合计 22,302" 为枚举器约定（88 计入）；本报告取证行号：非在途文件 = live = HEAD；在途 3 文件 = HEAD 口径逐字标注（keyword 嗅探位点 HEAD:283 实测与 live:283 同位，在途 diff 未触及该 hunk）。

## 覆盖声明（Coverage Declaration）

> 本节是台账 modules 行 `pending → audited` 翻转与 `pnpm workaround:reconcile` 结构校验的依据。

| 模块 id             | 文件数 | 非测试行数                                             | 取证完成 | 备注                                                                                                                                                                                                                               |
| ------------------- | ------ | ------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| flux-renderers-data | 114    | 22319（inventory）/ 22301（HEAD wc）/ 22318（live wc） | ✅       | 114/114（87 文件逐行精读 + 27 文件核心区精读；全部 schema/definition 声明文件为全文读取、无纯跳过档）；门禁 6 项实跑；12 行滑窗 token 归一化探针（阈值两档 30/60 复扫）+ 四分区覆盖；git 考古 16 commit；在途 3 文件 HEAD 快照口径 |

在途 3 文件（HEAD 口径取证）：`crud-renderer.tsx`（691）/ `crud-renderer-state.ts`（581）/ `crud-renderer-ownership.ts`（271）——三文件均完成核心区/逐行走读（HEAD 快照），live 漂移 hunk 不在取证位点。

### 门禁交叉实跑读数（prompt §5 第 3 步留痕）

| 门禁                              | 读数                                                                                                         | 处置                                                                                                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `find-async-without-failure-path` | **27 行命中**（桶 1 void-promise 9 + 桶 2 catch-located 18；唯一位置 24 处——batch-bar:142/:154 跨桶重复 ×2） | 24 处逐个定性：22 排除（内部全失败路径/带观测降级）+ 2 watch 微注记（batch-bar capability invoke 无 `.catch`，见误报排除 #20）                                                                                                |
| `find-performance-suspects`       | **2**（column-width-measure.ts:70、use-url-filter-sync.ts:145）                                              | 双排除（digest 序列化 memo 注释自证 pathsKey 同款惯例 / URL 序列化单点）                                                                                                                                                      |
| `find-runtime-raw-schema-reads`   | **2**（echarts-renderer.tsx:76-77）                                                                          | 排除：definition `{ key: 'events', kind: 'ignored' }` 双落注释（definition:126-129 + renderer:74-75）——ignored 字段的 raw 回读是设计内通道（dispatch 期求值，对齐 button onClick 语义），不预设误报成立为"设计内"而非门禁误报 |
| `find-hardcoded-type-dispatch`    | **0**                                                                                                        | 实跑确认                                                                                                                                                                                                                      |
| `find-reactive-render-reads`      | **0**                                                                                                        | 实跑确认                                                                                                                                                                                                                      |
| `find-renderer-browser-io`        | **0**                                                                                                        | 实跑确认                                                                                                                                                                                                                      |

### 取证执行记录（prompt §5 步骤逐条）

1. **字面扫描**：`TODO|FIXME|HACK|WORKAROUND|XXX` = **0 命中**；`临时|先这样|暂时|绕过|workaround|hotfix` = **0 命中**（grep exit 1 实跑留痕）。与 inventory literalEn/literalZh 基线 0 逐字吻合。
2. **模式候选 18 处逐个定性**（grep 复现与 inventory 计数逐字吻合：typeBypass 6 = delegate ×4 含 1 注释行 + schema-builders:141 + cell-popover:50；setTimeout 7；domRaid 5 非测试口径 = tree-focus-nav:8 + column-width-measure 14/25/29/73；silentCatch/keyRemount/pixelNudge/testEnvBranch 全零）：2 处升级立案（WA-data-007 关联候选见 §逐条、WA-data-010）、1 处跨引用登记（tree-focus-nav → WA-data-012）、15 处误报排除（§误报排除清单）。
3. **门禁交叉**：上表 6 项实跑；async 27 命中去重 24 处逐个定性（历批最大，未批量放行亦未批量立案——22 排除均有逐处读数）。
4. **重复块识别**：12 行滑窗 token 归一化探针（实质阈值 60 → 复扫 30 两档；跨文件合并区间），原始命中 131 组 → 去噪后 10 组跨文件候选 → 人工逐对定性坐实 **5 组**（WA-data-001/002/004/005/006）+ 小孪生群扩员 2 组（isDevRuntime 家族 9 形态、areStringArraysEqual 双份——WA-data-003）+ 排除 5 组（声明注册表格化形态 ×4、JSX props 转发样板 ×1）。探针存 `_tmp/wa6-dup-probe*.mjs`，用后即弃。
5. **范围结构走读**：114/114；87 文件逐行精读（含 ≥500 行 11 文件中 3 个全读：table-renderer.tsx 699 / list-renderer.tsx 574 / tree-renderer.tsx 665）+ 27 文件核心区精读（其余 8 个 ≥500 行：table-header-row 698 / crud-renderer 691HEAD / chart-renderer 689 / data-renderer-definitions 642 / table-body-row-rendering 615 / crud-renderer-state 581HEAD / table-editable-cell 540 / schemas 501，加 table-virtual-body/fixed-columns 等）。oversized 登记债（WARN 档）不重复立案。
6. **已收敛模式三档复核**：①echarts 懒加载——`createLazyLibLoader`（echarts-renderer.tsx:61-63，失败清缓存注释在案）live 确认，静态 `from 'echarts'` 仅存于懒加载边界模块 echarts-setup.ts 自身（设计内），渲染层零复发 ✅；②AbortController——crud-renderer-load.ts:350 真实例 + signal 入 dispatch + cleanup abort ✅；③`dataPath` 双词汇——本包 0 命中（不适用）；strip errors / ajax 双写——0 命中（不适用）。
7. **git 考古**：16 commit 溯源（详见逐条）；**症状性 message 专项**：抽检本包最近 25 个 commit message，全部带 plan 引用与根因描述（`4cabab47c` silent-blank、`b5f585e6f` MUST-split、`8e8381d94` plan 531、`5ad81bbf2` cq-3 包内去重、`c21e2dea9` 懒加载收口均语义吻合 plan 线索），**症状性 message 0**。
8. **误报排除复核**：24 项全记录（§误报排除清单）。

## 逐条发现（Findings）

### [类别H] infinite-load ActionResult 解释器 ×3 + retry 消费块逐字双份（WA-data-001）

- **位置**: 解释器 3 份——`use-infinite-scroll.ts:133-141` ↔ `crud-infinite-scroll-area.tsx:69-77` ↔ `list-renderer.tsx:545-553`（`ok === false → setError(error ?? new Error('Load failed'))`）；完整 retry 消费块 2 份逐字级 ~22 行——`crud-infinite-scroll-area.tsx:62-86` ↔ `list-renderer.tsx:538-562`（setError(undefined) → retry() → thenable 判定 → setLoading(true) → 解释 → .catch(setError) → .finally(setLoading(false))，仅 `onRetry`/`retryLoadMore` 标识符差）
- **严重度**: P2（解释器 3 份同根因 P1 起评；**降档显式记录**：行为今天正确、解释器仅 7 行惯用形、两份 retry 块语义一致且 list 侧注释自觉声明 "Mirrors the crud-infinite-scroll-area retry contract (clear error → load → settle)"——漂移尚未兑现，属复制沉积早期）
- **信号类别**: H（复制粘贴式增长）
- **症状**: 同一 "action dispatcher 把失败折叠成 resolved `{ok:false}` ActionResult" 协议解释逻辑三处手写；同一 retry 按钮管线两处手写
- **按住的根因**: 包内无"infiniteload 结果消费"共享原语；use-infinite-scroll 钩子内消费（G5 路径）与两个 UI 侧 retry 块各自实现
- **考古**: crud 侧生于 `a726191b1`（CRUD refactor）；hook 解释器随 `0dac7105e`（恢复合并）定形；list 侧复制时自觉加镜像注释——复制链可考
- **违约基准**: W3（3+2 份）、W2（无收敛登记）
- **修复方向**: 提取包内 `interpretActionResultError(value): unknown | undefined`（或 `consumeLoadResult(result, { onError, onSettle })` 一体化）+ `InfiniteRetryButton`；回归 = use-infinite-scroll 现有 G5 套件 + crud/list infinite e2e 直通；零公共导出变更
- **去向**: fixed=批内修
- **验证方式**: 包 filter typecheck/build/lint/test 全绿；提取前后行为同套同绿
- **现状**: live 三份在案（HEAD=live，三文件均非在途）
- **跨批关联**: 无（本包内聚）

### [类别H] table 体双路径（static ↔ virtual）三块复制（WA-data-002）

- **位置**: ①group-header 行渲染块 ×2 ~12 行——`table-body-rows.tsx:228-241` ↔ `table-virtual-body.tsx:167-183`（仅 key 策略差：`group-${group.key}` vs `virtualRow.key`）；②RadioGroup 包裹块 ×2 ~11 行逐字——`table-body-rows.tsx:370-379` ↔ `table-virtual-body.tsx:246-255`（virtual 侧注释自认 "must keep RadioGroupItem cells inside a RadioGroup **exactly like the non-virtual branch**"）
- **严重度**: P2（双份大块 + 双路径均在 G3 波次活跃修改——漂移风险已兑现过一次：[G3-R3-视角4-02] 的 select-all 展平修正即双路径同步修的实例）
- **信号类别**: H
- **症状**: 分页体与虚拟体各自手写同一行分派包裹逻辑
- **按住的根因**: D1 G-D 文件治理拆分（`/* virtual body split out of table-body-rows.tsx (file-size governance) */`）按文件边界切而非按机制切，共享包裹逻辑留在两侧
- **考古**: `a8dccd566`（G-D 分组聚合批）把 group-header 块复制进 virtual body；radio 块两侧分生于 `0d1a25052` 时代与 `a8dccd566`
- **违约基准**: W3、W2
- **修复方向**: 提取 `renderGroupHeaderItem(item, key, columnCount, onToggle)` + `maybeRadioGroupBody(schemaProps, content, value, onSelectRow)` 于包内共享；回归 = table 虚拟/分组/单选现有套件直通
- **去向**: fixed=批内修
- **验证方式**: 行为保持提取，红绿同套；`git diff --exit-code src/index.tsx`
- **现状**: live 双份在案
- **跨批关联**: plan 531/IS-5 已覆盖 DOM 结构与交互透镜，本条为复制沉积透镜，不重复

### [类别H微] isDevRuntime 环境探测 9 形态群 + areStringArraysEqual 双份（WA-data-003）

- **位置**: isDevRuntime——6 个本地函数副本（`use-table-tree.ts:25`【export 正典】/ `column-width-measure.ts:3` / `use-row-drag-sort.ts:38` / `table-data.ts:10` / `use-column-resize.ts:9` / `table-selection-feedback.ts:53`）+ 2 处内联 `import.meta.env?.DEV` 探测（`use-table-sort.ts:866-867`）+ 1 处内联 `process?.env?.NODE_ENV` 探测（`pagination-renderer.tsx:1014-1017`）；areStringArraysEqual——正典导出 `column-settings-state.ts:1` + 本地副本 `batch-bar.tsx:11`（readonly 形变体）
- **严重度**: P3（**降档显式记录**：每处 3-13 行惯用形、行为一致、零漂移；但正典版住在 use-table-tree.ts（树 hook 文件）属归置错位，chart-diagnostics/warn-once/table-renderer/batch-bar 跨域 import 树 hook 文件取探测函数）
- **信号类别**: H 微
- **按住的根因**: 无包内 `dev-runtime` 共享原语；每波特性各带一份（考古：`90eb63538`→`11fa5dfba`→`ec042f7bb`→`189dde6e7`→`b73f24ab7` 五波渐次沉积）
- **违约基准**: W3 弱、W2
- **修复方向**: 正典版迁 `dev-runtime.ts`（或 flux-core 若跨包），删 8 副本 + 2 内联改调用；batch-bar 副本改 import column-settings-state 导出。随下次触碰顺带
- **去向**: watch-only（顺带候选）
- **现状**: live 在案；合计 ~60 行冗余
- **跨批关联**: 无

### [类别H] toWidth ↔ toNumericWidth 13 行逐字双份（WA-data-004）

- **位置**: `table-renderer/fixed-columns.ts:16-28`（toWidth）↔ `table-renderer/use-column-resize.ts:16-28`（toNumericWidth）——`number && isFinite && >0 → return` / `string → Number(value.replace(/px$/,'')) → isFinite && >0 → return` / `return fallback` 三段逐字恒等，仅函数名差
- **严重度**: P2（双份、同目录、零依赖障碍、提取干净——§3 协议低成本可修正例）
- **信号类别**: H
- **按住的根因**: 同日两 plan（E1b resize / 列设置）各自落地，各带一份宽度解析器
- **考古**: `90eb63538`（fixed-columns 份）与 `fbf375441`（E1b resize 份）——2026-06-21 同日双落
- **违约基准**: W3
- **修复方向**: 提取 `parseColumnWidth(value, fallback)` 单份（可入 use-column-resize 已有导出面旁的包内模块），两文件 import；回归 = 列宽/固定列现有套件直通
- **去向**: fixed=批内修
- **验证方式**: 行为保持提取同套同绿
- **现状**: live 双份在案
- **跨批关联**: 无

### [类别H] 内嵌查询表单载体 builder ×2（WA-data-005）

- **位置**: `data-schema-validation.ts:44-104`（createCrudQueryFormRegion）↔ `query-filter-definition.ts:24-81`（transformQueryFilterAuthoringSchema）——同一 form 载体 envelope（`type:'form'` / `createXxxFormId(...)` / `body` / `mode: resolveFormMode(layout, mode)` / `actionsClassName: 'flex justify-end gap-2'`）+ 逐字段 `if (X !== undefined) 载体.X = ...` 拷贝（columnCount/gap 双侧同名）+ "无 actions 时注默认搜索/重置按钮组" 双分支，合计 ~45-60 行同构
- **严重度**: P2（双份大块 + 双侧活跃；**漂移已现但为词汇级**：搜索钮 variant 两派 crud `'default'` vs query-filter `'primary'`——实测 ui button.tsx:17-23 两 variant 同款式、`primary` 系 schema-facing 别名（[G1-视角2-01] 注释），视觉恒等非行为缺陷；action 通道 `component:querySubmit/queryReset`（指向 crud id）vs `component:submit/reset`（指向 formId）为真实语义差）
- **信号类别**: H
- **按住的根因**: query-filter 新件（`c61e256dd` D1 G-A）出生时复制了 crud 侧载体 builder（`a726191b1`）而非提取共享
- **违约基准**: W3、W2
- **修复方向**: 提取 `buildEmbeddedQueryFormCarrier({ id, body, layout, mode, fields, actions, defaultActions })` 包内共享；variant 词汇拍板一派；回归 = schema-validator 套件 + query-filter/crud query e2e
- **去向**: fixed=批内修（提取面稍宽，若 Phase 2 判超预算可降级 successor-required 并显式登记——**不得静默**）
- **验证方式**: 行为保持同套同绿；`resolveFormMode` 已是单份共享（query-filter-definition.ts:5 从 data-schema-validation import）——提取后该 import 落点随之整理
- **现状**: live 双份在案
- **跨批关联**: 无

### [类别D弱] Crud*/Table* 列配置声明镜像 ×5 接口（WA-data-006）

- **位置**: `crud-schema.ts:93-110,106-110,150-156,158-164` ↔ `schemas.ts:9-27,22-27,56-64`——CrudColumnFilterOption/Config、CrudQuickEditConfig、CrudColumnSettingsConfig、CrudResponsiveConfig 五组接口与 Table 前缀对应物逐字段镜像（~40 行声明复制）；消费侧靠结构化类型直通（`crud-renderer-schema-builders.ts:122-128` 直接 `base.columnSettings = schema.columnSettings` 零 cast）
- **严重度**: P3（watch。**降档显式记录**：出生即平行词汇——`18908624d` 同一 commit 双侧扩展，镜像系有意双词汇而非复制疏忽；漂移面 = Table 侧加可选字段时 Crud 作者需镜像声明，属维护摩擦非静默破坏——TS 结构化类型在两侧签名分叉时于赋值点报错）
- **信号类别**: D 弱（双词汇声明面）
- **考古**: `18908624d`（expand CRUD/Table contracts）同 commit 双落
- **违约基准**: W3（5 键组 ×2 维护面）
- **修复方向**: Crud* 五接口 extends 或 type-alias 到 Table* 对应物（crud-schema 已 import schemas 族类型；公共导出面不变——Crud\* 名字保留）；**显式引用 CX-13**（Tree 双声明收敛批）为同族先例，建议并入同批（声明层收敛手法与守卫升级同款）
- **去向**: successor-required=CX-13 扩围
- **验证方式**: 归 CX-13 plan
- **现状**: live 在案
- **跨批关联**: **CX-13**（form/form-advanced Tree 双声明）——本条为 data 包消费侧同族新面，不与 CX-13 原范围重复，作扩围证据

### [类别A弱/W6] applyQueryToRows keyword 名字嗅探（WA-data-007，载体在途）

- **位置**: `crud-renderer-state.ts:283`（HEAD 口径 = live:283 同位）：`if (field.toLowerCase().includes('keyword'))` —— 查询字段名**含 "keyword" 子串**即切换为跨全行对象的全局包含搜索
- **严重度**: P3（**降档显式记录**：AMIS crud keyword 全局搜索惯例、行为今天正确、触发条件罕见；但名字嗅探在字段恰好含 keyword 子串（如 `keywordCategory`）时劫持为全局搜索且无观测）
- **信号类别**: A 弱（名字嗅探特判）/ W6（字面量无 schema 配置解释）
- **按住的根因**: clientMode 未提供 `keywordField` 一类显式声明通道，嗅探是缺声明机制时的按名猜
- **考古**: `26878c691`（split CRUD renderer + query workflow）
- **违约基准**: W6、W4（劫持触发无观测）
- **修复方向**: `clientMode.keywordField` 显式声明 + 嗅探作兼容回退并 dev warn 一次
- **去向**: watch-only——**载体文件 crud-renderer-state.ts 在途，批内修不叠编辑**（沿 564 规则；P3 本身非借在途降级，降级理由如上显式记录）
- **验证方式**: 归后续触碰批
- **现状**: HEAD:283 = live:283
- **跨批关联**: plan 550 曾修 crud 客户端过滤匹配器（dict/区间语义），本条为其嗅探面残留

### [类别C] use-url-filter-sync form-handle 就绪轮询 50ms×5、耗尽静默（WA-data-008）

- **位置**: `use-url-filter-sync.ts:120-130`——`attempts < 5` 上限 + `setTimeout(push, 50)` 重试等待子 effect 注册的 form handle；耗尽（5 次后 applyToForm 仍 false）无任何 warn
- **严重度**: P3（深链场景 250ms 窗口内通常成功；耗尽后果 = scope 已恢复但表单输入不回显、用户零观测——W4 违约；修复低成本）
- **信号类别**: C（轮询 + 固定次数上限等待另一系统就绪）
- **按住的根因**: form handle 在子 effect 注册、父 mount effect 先跑——注册时序竞态无显式就绪信号（根因未修，轮询是务实桥）
- **考古**: `bc59fea19`（plan 512 L3.5，commit message 明写 "form-handle setValues echo with retry"——出生即设计如此）
- **违约基准**: W4（耗尽静默）、W1（根因=注册信号缺失未修）、W2
- **修复方向**: 最小修 = 耗尽分支补 `console.warn`（isDevRuntime 门控，对齐包内 warn 惯例）；根因修 = form handle 注册就绪事件/回调（涉 flux-react form bridge → 跨包，登记 watch 注记不立案）
- **去向**: fixed=批内修（仅 warn 一行 + 测试）；根因部分 watch-only 注记
- **验证方式**: 单测模拟 applyToForm 恒 false → 断言 warn 触发一次
- **现状**: live 在案
- **跨批关联**: plan 512 契约 §5 为出生载体

### [类别B] 表达式求值失败路径观测不一致家族：1 warn + 4 silent + 1 best-effort（WA-data-009）

- **位置**: warn 派——`table-body-row-rendering.tsx:160-170`（classNameExpr 失败 dev warn + 回退）；silent 派——`table-row-leading-cells.tsx:72-77`（expandableWhen，注释声明 "expr-eval-error Failure Path: degrade" 但零观测）、`table-summary-row.tsx:54-56`（catch → return ''）、`use-table-selection.ts:159-161` 与 `:171-173`（checkableWhen 双分支 catch → isCheckable=false）；best-effort——`use-crud-polling.ts:73-76`（invokeCapability 空 catch + 注释 "polling orchestration is best-effort"）
- **严重度**: P3（降级语义各自有注释声明、行为安全；同族 expr-eval catch 两派观测不一致=漂移已兑现，W4 弱违）
- **信号类别**: B（防御式掩盖——静默但非吞错：均有安全降级；缺的是触发可观测）
- **按住的根因**: 无共享 "eval-or-fallback + dev warn" 原语，各处手写 catch 时观测取舍随意
- **考古**: `57e078d25` / `2d6991057` 特性批各自落地
- **违约基准**: W4（4 处静默无观测）、W3 弱
- **修复方向**: silent 派 4 处补 isDevRuntime + warnOnce（warn-once.ts 已是现成通道，key 用 gd-\* 诊断码惯例）；use-crud-polling 保持 best-effort 语义但补 dev warn 一次。回归 = 各处降级路径现有单测直通 + warn 断言新用例
- **去向**: fixed=批内修
- **验证方式**: 新增 warn 断言用例先红后绿（或行为保持+观测新增，按特征化钉子先钉）
- **现状**: live 在案
- **跨批关联**: async 门禁命中桶的定性副产物（门禁只标位置，家族级不一致为本批新识别）

### [类别D] extractRegionSchema 数组 cast 单 schema——签名收窄一行可消（WA-data-010）

- **位置**: `crud-renderer-schema-builders.ts:141`——`return schemas as unknown as BaseSchema`（region.templateNode 多节点时把 `BaseSchema[]` 压过 `BaseSchema | undefined` 返回签名）；消费字段 `ListSchema.item?: SchemaInput` = `BaseSchema | BaseSchema[]`（flux-core schema.ts:124）——运行时消费方本就接受数组
- **严重度**: P2（低成本可修单点缺陷正例：改函数签名为 `BaseSchema | BaseSchema[] | undefined` + 删 cast，模块私有函数零公共面）
- **信号类别**: D（类型系统绕行——类型系统如实报数组，断言销毁证据，而收窄签名即可两全）
- **考古**: `81702c1e6`（oversized governance closure 文件拆分时搬运定形）
- **违约基准**: W3 不涉、W1（无根因——纯签名贪图省事）
- **修复方向**: 一行签名 + 删 cast；回归 = schema-validator 套件直通（多节点 region 用例若缺则补一粒）
- **去向**: fixed=批内修
- **验证方式**: typecheck 绿（签名收紧后调用点全部兼容自证）+ 套件直通
- **现状**: live 在案
- **跨批关联**: inventory typeBypass 6 之立案沉淀（其余 5 处见误报排除 #1/#3）

### [类别I邻] crud-renderer-load "Fix 3 once implemented" 过期临时注记（WA-data-011）

- **位置**: `crud-renderer-load.ts:405-407`（HEAD=live）——"Server-correction loop prevention relies on scope.update value comparison (**Fix 3**) **once implemented; until then**, the loop is self-stabilizing (at most 1 extra fetch)"
- **严重度**: P3（watch-only：代码行为正确——依赖的 Fix 3 **已落地**：`packages/flux-runtime/src/scope.ts:531` `Object.is(oldValue, value)` 值比较在案（落地 commit `9be4394e9`）；注释描述的 "until then" 过渡态已结束，属注记过期非行为缺陷）
- **信号类别**: I 邻（转正临时层的注记化石变体：出口条件已达成但未回写）
- **考古**: 注记生于 `abd8dea8a`（02-01/02-02 文件拆分批）；Fix 3 落地晚于注记
- **违约基准**: W5（"删掉/更新这段会怎样"当前无人能从注释读出真状态）
- **修复方向**: 注释改写为 "relies on scope.update value comparison (landed in flux-runtime scope.ts)"——一行注记更新，随下次触碰顺带
- **去向**: watch-only
- **现状**: live 在案
- **跨批关联**: 无

### [类别E邻] tree-focus-nav querySelector 惯用形——CX-11 族扩围跨引用（WA-data-012，跨引用不另立缺陷）

- **位置**: `tree-focus-nav.ts:8`（getVisibleTreeItems：`root.querySelectorAll('[role="treeitem"]')`）；消费位 tree-renderer.tsx ×5（:498 G17 焦点找回、:505 focusNode、:517 moveFocus、:543 focusFirstChild、:567 focusParent）
- **现状**: roving-tabindex 焦点管理的自家子树寻址（role 契约标记 + 本包 tree 根 ref），行为正确
- **裁定（跨引用扩围登记，非独立缺陷发现）**: 与 WA-form-003 同根因同车 **CX-11**；本包 1 定义 + 5 调用位使该族计数继续扩大，登记为 CX-11 扩围证据
- **严重度**: P3（跨引用）
- **跨批关联**: **CX-11**（field-frame aria 注入链 + getFocusTarget 族）；**CX-13 交界裁定**——本包 tree-renderer/use-table-tree/tree-focus-nav/tree-node-helpers 为消费侧实现面（form 侧双声明之根因不在本包），本批不立案 Tree 族收敛，仅 CX-11 扩围登记；plan 531/IS-5 已覆盖的 DOM/交互透镜不重复

## 汇总

### 1. 转正清单（W2 违约项，按风险排序）

| 发现 ID                     | 位置                             | 出生时间（git 考古）                  | 风险                                        | 处置                     |
| --------------------------- | -------------------------------- | ------------------------------------- | ------------------------------------------- | ------------------------ |
| WA-data-001                 | infinite 解释器 ×3 + retry 块 ×2 | `a726191b1` → `0dac7105e` → list 复制 | ActionResult 协议变更需 3 处同步            | 批内修                   |
| WA-data-005                 | 内嵌查询表单载体 ×2              | `a726191b1` → `c61e256dd` 复制        | 载体语义修 bug 两处同步；variant 词汇已两派 | 批内修                   |
| WA-data-002                 | table 体双路径三块               | `a8dccd566` 等 G3 波次                | 双路径同步修已兑现一次                      | 批内修                   |
| WA-data-006                 | Crud/Table 接口镜像 ×5           | `18908624d` 同 commit 双落            | Table 侧扩字段时 Crud 侧摩擦                | CX-13 扩围               |
| WA-data-004                 | toWidth 双份                     | `90eb63538` / `fbf375441` 同日双落    | 解析规则修 bug 两处同步                     | 批内修                   |
| WA-data-008/009             | 轮询耗尽静默 / 求值观测不一致    | `bc59fea19` / `57e078d25` 等          | 触发不可观测                                | 批内修（观测补齐）       |
| WA-data-003/007/010/011/012 | 见条目                           | 见条目                                | 低                                          | watch / CX 扩围 / 批内修 |

### 2. 重复代码热区（按总冗余行数排序）

| 组  | 份数     | 位置                                                  | 冗余行数 | 漂移证据                                    | 裁定                                      |
| --- | -------- | ----------------------------------------------------- | -------- | ------------------------------------------- | ----------------------------------------- |
| 1   | 2        | 内嵌查询表单载体（WA-data-005）                       | ~50      | variant 两派（视觉恒等）+ action 通道语义差 | 同根因✅ 已漂移✅ 提取干净✅ → P2         |
| 2   | 3+2      | infinite 解释器 + retry 块（WA-data-001）             | ~65      | 无行为漂移；list 侧自觉镜像注释             | 同根因✅ 未漂移 → P2（P1 起评降档已记录） |
| 3   | 2×2 块   | table 体双路径（WA-data-002）                         | ~46      | key 策略差（语义）；G3 波双路径同步修实例   | 同根因✅ → P2                             |
| 4   | 5 组接口 | Crud/Table 声明镜像（WA-data-006）                    | ~40      | 无（出生即平行）                            | 双词汇有意 → P3 CX-13 扩围                |
| 5   | 9+2      | isDevRuntime 群 + areStringArraysEqual（WA-data-003） | ~70      | 归置错位（正典住树 hook 文件）              | 惯形 → P3 watch                           |
| 6   | 2        | toWidth（WA-data-004）                                | 13       | 无（逐字）                                  | 同根因✅ 提取干净✅ → P2                  |

### 3. Top 重构建议（默认 3 项）

1. **infinite-load 消费原语提取（WA-data-001）**：`consumeLoadResult` + `InfiniteRetryButton`；预期删除本体 ~65 行六处手写（3 解释器 + 2 retry 块 + 钩子内联）；回归 = G5 套件 + crud/list infinite e2e；影响面 = 包内零 API 变更。
2. **查询表单载体与表体双路径收敛（WA-data-005/002 同批）**：`buildEmbeddedQueryFormCarrier` + `renderGroupHeaderItem`/`maybeRadioGroupBody`；预期删除本体 ~96 行五份手写 + variant 词汇拍板；回归 = schema-validator + table 虚拟/分组套件；影响面 = 包内。
3. **观测与声明面小修束（WA-data-008/009/010 一次过）**：轮询耗尽 warn + 求值失败 4 处 warnOnce 补齐 + extractRegionSchema 签名收窄；预期新增观测 5 位点、删 cast 1；影响面 = 包内，全部一行级。

### 4. 误报排除清单（24 项）

| #   | 疑似点                                                               | 位置                                                                                                                                      | 排除理由                                                                                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `as unknown as` ×3 + 注释行                                          | crud-renderer-delegate.ts:19/33/37/71                                                                                                     | D：AUDIT-03 登记 cast seam，注释声明与实际逐项核对一致（props/meta/helpers/schema 无 cast 属实；regions/events/reactions 单层 `as` 结构同型；:71 为 metaKey 动态键惯用）                                                                                          |
| 2   | `return base as TableSchema` 等 builder 收窄                         | crud-renderer-schema-builders.ts:128/168/174                                                                                              | D：schema 组装动态边界（组装侧宽 Record → 具型返回，wa-4 同判）                                                                                                                                                                                                   |
| 3   | `Info as unknown as LucideIconComponent`                             | table-cell-popover.tsx:50                                                                                                                 | D：第三方 lucide 组件与 ui `resolveLucideIconStrict` 返回型对齐（@nop-chaos/ui 导出型），动态边界                                                                                                                                                                 |
| 4   | setTimeout(0) dev 诊断延迟                                           | batch-bar.tsx:68                                                                                                                          | C：注释自证（等 effects flush 的 macrotask；首帧快照会误报）+ cleanup + dev-only 零生产成本                                                                                                                                                                       |
| 5   | setTimeout 有界重试 ×20                                              | use-crud-polling.ts:155                                                                                                                   | C：命名常量（250ms×20≈5s）+ 双侧 warn（首 miss + 耗尽给配置指引）+ 注释声明合法晚注册窗口；watch 微注记：上游注册事件可作根因修（不立案）                                                                                                                         |
| 6   | setTimeout(0) 任务切片                                               | tree-renderer.tsx:184                                                                                                                     | C：H17 增量渲染让出主线程（5k-50k 子节点），协作调度非等待外部就绪                                                                                                                                                                                                |
| 7   | setTimeout(triggerLoad, 0)                                           | use-infinite-scroll.ts:149                                                                                                                | C：防同步递归 + G5 短页续载，注释完备                                                                                                                                                                                                                             |
| 8   | setTimeout(setDegraded, 0)                                           | use-url-filter-sync.ts:96                                                                                                                 | C：render 级联规避（react-compiler 规则），注释在案                                                                                                                                                                                                               |
| 9   | setTimeout 1500 复制反馈                                             | table-cell-chrome.tsx:89                                                                                                                  | C：UI 反馈时限惯用 + cleanup                                                                                                                                                                                                                                      |
| 10  | rAF 重试 ≤10 帧等可见性                                              | use-auto-fill-height.ts:1470-1486                                                                                                         | C：Dialog 开场动画等待（误报排除条款明示动画时序不算贿赂）+ ResizeObserver 主通道 + 有界                                                                                                                                                                          |
| 11  | 运行时读 raw schema events                                           | echarts-renderer.tsx:76-77                                                                                                                | D：definition `{key:'events',kind:'ignored'}`（:129）双落注释——ignored 字段 raw 回读是设计内通道（门禁命中定性为设计内，非门禁误报）                                                                                                                              |
| 12  | 容器 init/dispose + ResizeObserver                                   | echarts-renderer.tsx:220-274                                                                                                              | E：宿主集成边界（第三方 canvas 库挂载点）；实例不逃逸（handle 仅暴露 resize capability）                                                                                                                                                                          |
| 13  | querySelectorAll/querySelector 列宽测量 + JSON.stringify digest memo | column-width-measure.ts:29/73/70                                                                                                          | E：测量接口抽象（MeasurableTable 依赖注入）+ 自有 `data-column-width-key` 标记 + digest memo 注释自证（perf 门禁命中排除；plan 548 列宽修复同域先例）                                                                                                             |
| 14  | asReactNode 惯用收窄 ×5                                              | crud-renderer-delegate.ts:6、table-cell-chrome.tsx:19、table-header-text.ts:5、tree-renderer.tsx:49、table-summary-row.tsx:11             | D：仓库既定收窄惯例（wa-4/wa-5 同判；table-header-text 份注释自证 "identity cast"）                                                                                                                                                                               |
| 15  | 本地 toJsonPointer 非 flux-core 版                                   | table-schema-validation.ts:159-166                                                                                                        | I：cq-2 C-group 裁决注释（deliberate divergence 登记文化——非失传化石）                                                                                                                                                                                            |
| 16  | sanitizeChildren items/rows/data 键嗅探                              | use-table-lazy-children.ts:15-26                                                                                                          | A弱：ActionResult payload 形态协议 duck-typing（消费面支持三形态；watch 微注记：形态族扩展时需同步）                                                                                                                                                              |
| 17  | `.catch(() => {})` dispatch                                          | crud-renderer-load.ts:374-376                                                                                                             | B：注释声明失败经 load callbacks（onSettle）统一路由——有结构化路由的正确防御                                                                                                                                                                                      |
| 18  | setData 空 catch                                                     | use-row-drag-sort.ts:163                                                                                                                  | E/G：测试环境兼容守卫（dataTransfer 缺实现），注释声明                                                                                                                                                                                                            |
| 19  | capability invoke 无 .catch ×2                                       | batch-bar.tsx:142/154                                                                                                                     | B：19-03（plan 483）注释登记 "capability failures currently unreachable"；**watch 微注记**：`ComponentCapabilities.invoke` 类型签名（flux-core component-handle-core.ts:38-40）不保证非 reject，建议补 `.catch` 走同一 dev warn 通道（随 WA-data-009 观测束顺带） |
| 20  | 验证/定义文件样板相似                                                | batch-bar-definition ↔ echarts-schema-validation、crud-renderer-definition ↔ data-renderer-definitions ↔ query-filter-definition ↔ w2a 等 | 探针命中排除：声明式字段注册表/逐字段校验表格化形态（§3 表格化排除；每行是真实独立规则）                                                                                                                                                                          |
| 21  | JSX props 转发三文件归一化同构                                       | table-renderer.tsx:626-660 ↔ table-data-row-render.tsx:110-136 ↔ tree-renderer.tsx:383-405                                                | 探针命中排除：`I={I}` 低实质样板，各 prop 为真实接口差（提取=props 对象化设计变更，非复制沉积）                                                                                                                                                                   |
| 22  | test-support setTimeout/cast/`as never`                              | test-support.tsx                                                                                                                          | G：fixture（探针注册器/动作探针为测试基建本体）                                                                                                                                                                                                                   |
| 23  | `'value' in data` 类 payload 嗅探 / silentBlank 检测                 | chart-diagnostics.ts、chart-sanitize.ts                                                                                                   | A弱：ux-r1 失败路径（4cabab47c 收口）+ 数据清洗边界，签名化去重 dev warn 在案                                                                                                                                                                                     |
| 24  | definition/接口文件大段 `I: I,` 归一化命中                           | echarts-renderer-definition.ts、crud-renderer-definition.ts、schemas.ts、crud-schema.ts                                                   | 探针命中排除：声明注册表（fields 数组/接口成员），表格化形态                                                                                                                                                                                                      |

### 5. 范围整体判断

**不是系统性临时方案文化，而是"特性波次各带一份小原语、UI 双路径自觉镜像但不提取"的复制沉积型，且登记文化在本包显著强于前几批均值。** 正面证据四件：①登记注释密度包级最高——AUDIT-03 cast seam（a726191b1）、cq-2 C-group toJsonPointer deliberate divergence、Adjudication 01-03 跨包耦合 accept-and-annotate、22-02/22-04/H17/H21/H23/G5 等 plan-ID 注释贯穿全部核心文件；②cq-3 去重波（`5ad81bbf2`）在本包真实生效——use-table-filter commitFilters 注释自证 "previously three verbatim copies across handleFilter/handleSearch/clearFilters" 已收敛；③症状性 commit message **0**（抽检 25 条全带 plan 引用+根因）；④门禁命中 27 行全部带结构化失败路径或注释声明，零裸吞。立案 12 条（P2×4 + P3×8；零 P0、零 P1、零根因失传），其中批内修 6 条（001/002/004/005/008/009/010 中 008/009/010 为观测与签名小修束）、CX 扩围 2 条（006→CX-13、012→CX-11）、watch-only 3 条（003/007/011）；误报排除 24 项。字面临时标记为零。载体在途发现 1 条（007），去向已按"批内修不叠编辑"裁决。整体判断：本包的问题清单是**收敛文化的长尾**而非临时方案债务——每一条立案都在登记文化照得到的地方，缺的是把"自觉镜像"升级为"提取共享"的最后一公里。

## 批内修复候选清单（供 Phase 2 执行会话）

| 发现 ID     | 严重度 | 建议去向                                       | 修复要点                                                 | 约束                          |
| ----------- | ------ | ---------------------------------------------- | -------------------------------------------------------- | ----------------------------- |
| WA-data-001 | P2     | 批内修                                         | consumeLoadResult/InfiniteRetryButton 提取               | 零公共导出变更                |
| WA-data-002 | P2     | 批内修                                         | group-header + RadioGroup 包裹提取                       | 行为保持，红绿同套            |
| WA-data-004 | P2     | 批内修                                         | parseColumnWidth 单份                                    | 同目录零依赖                  |
| WA-data-005 | P2     | 批内修（超预算可显式降级 successor，不得静默） | buildEmbeddedQueryFormCarrier + variant 拍板             | 零公共导出变更                |
| WA-data-008 | P3     | 批内修                                         | 耗尽 warn 一行 + 断言用例                                | 根因部分 watch 注记           |
| WA-data-009 | P3     | 批内修                                         | silent 派 4 处 warnOnce + polling dev warn               | 顺带 #19 微注记               |
| WA-data-010 | P2     | 批内修                                         | 签名 `BaseSchema \| BaseSchema[] \| undefined` + 删 cast | 一行                          |
| WA-data-003 | P3     | watch-only                                     | dev-runtime 归置顺带候选                                 | —                             |
| WA-data-006 | P3     | successor-required=CX-13 扩围                  | Crud* extends Table*（公共面不变）                       | 归 CX plan                    |
| WA-data-007 | P3     | watch-only                                     | **载体在途，批内修不叠编辑**                             | keywordField 显式化为后续方向 |
| WA-data-011 | P3     | watch-only                                     | 注记改写顺带候选                                         | —                             |
| WA-data-012 | P3     | successor-required=CX-11 扩围                  | 跨引用登记，无独立修复                                   | 归 CX plan                    |

## 批内修复记录（Phase 2 执行回写）

| 发现 ID     | 落地                                                                                                                                                                                                                                                                                                                                       | 验证                                                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WA-data-001 | 提取 `src/infinite-load.ts`（`interpretActionResultError` + `consumeLoadResult`）；use-infinite-scroll/crud-infinite-scroll-area/list-renderer 三文件改 import，六处手写本体删除                                                                                                                                                           | infinite 5 套件 23/23 同绿（行为保持提取）                                                                                                                                             |
| WA-data-002 | 提取 `table-renderer/table-body-shell.tsx`（`renderGroupHeaderRow` + `withRadioGroupBody`）；table-body-rows/table-virtual-body 双路径三块收敛，"exactly like" 注释使命完成                                                                                                                                                                | typecheck + table body 套件 20/20                                                                                                                                                      |
| WA-data-004 | 提取 `table-renderer/parse-column-width.ts`（`parseColumnWidth`）；fixed-columns/use-column-resize 本地双份删除（grep toWidth/toNumericWidth=0）                                                                                                                                                                                           | typecheck + 列宽相关套件直通                                                                                                                                                           |
| WA-data-005 | 提取 `src/query-form-carrier.ts`（`resolveFormMode` 迁入 + `buildEmbeddedQueryFormCarrier`；data-schema-validation re-export `resolveFormMode` 兼容既有测试导入路径）；默认按钮组语义差保留调用方、variant 别名差注记于共享模块                                                                                                            | typecheck + schema-validator/query-filter/crud query 套件直通                                                                                                                          |
| WA-data-008 | use-url-filter-sync 耗尽分支补 `warnOnce('gd-url-sync-form-handle-exhausted')`；根因（注册就绪信号）保持 watch 注记                                                                                                                                                                                                                        | 红（恰 1 failed）→绿（10/10），新增耗尽 warn + 正路径不 warn 两用例                                                                                                                    |
| WA-data-009 | leading-cells/summary-row/use-table-selection×2 四处 silent 派补 `warnOnce`（gd-table-expandable-when-eval / gd-table-summary-expr-eval / gd-table-checkable-when-eval）+ use-crud-polling 补 best-effort dev warn（gd-crud-polling-capability-invoke）+ batch-bar 双 invoke 补 `.catch` 走既有一次性 warn 通道（误报排除 #19 微注记兑现） | 红（恰 4 failed）→绿；expandable 断言并入首触发钉测试（warnOnce session-once 语义）；降级钉改用运行期抛错表达式 `name.nonexistent.deepField`（原畸形串经引擎静默回退路径不触发 catch） |
| WA-data-010 | extractRegionSchema 返回签名改 `BaseSchema \| BaseSchema[] \| undefined`（并集收窄）删 `as unknown as` cast                                                                                                                                                                                                                                | typecheck 绿（调用点兼容自证）；多节点 region 路径由 crud-list-mode 套件既有 `item: [...]` 用例覆盖（无需补测）                                                                        |

`index.tsx` 零公共导出变更（`git diff --exit-code`）；包全量 176 文件/1217 测试通过（较基线 +6 钉测试）；lint 唯一 warning 经 stash 对照证实 HEAD pre-existing。
