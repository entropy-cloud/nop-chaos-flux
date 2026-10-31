# 831 安全边界加固（deep-audit 2026-11-01 S1-S5）

> Plan Status: completed
> Last Reviewed: 2026-11-01
> Source: `docs/audits/deep-audit-2026-11-01.md` §3（S1-S5）
> Related: `docs/architecture/security-design-requirements.md`、`packages/flux-core/src/utils/path.ts`（危险键守卫先例）

## Purpose

闭合审计确认的原型污染、ReDoS、mXSS 汇点，把分散在四处的正则安全判定统一到 flux-core 单一实现，并把这些安全要求补入安全需求 owner doc（当前仅覆盖动态代码执行/权限/fail-closed）。

## Current Baseline

- **S1**：`packages/flux-renderers-ai/src/engine/utils.ts` 的 `combineDeltaData`（:86-96）遍历 `Object.keys(source)` 递归 `obj[key] = combineDeltaData(obj[key], source[key])`，仅跳过已设的 `type`；本地 `isPlainObject`（:20-22）对 `Object.prototype` 返回 true。SSE 增量 `{"__proto__":{...}}` 会写入全局 `Object.prototype`。同文件 `deepClone`（:24 起）同样逐键复制，需一并核查。调用点 `:285`（`combineDeltaData(message, chunk.delta)`）。
- **S2**：`packages/flux-compiler/src/validation-lowering.ts:216-218` `isSafeValidationPattern` 为单条黑名单正则（拒绝组内 `+*` 后接 `+*`、`.*`、`.+`、字符类后 `+*`），不识别交替型嵌套量词（`^(?:a|aa)+$`）与 `{n,}` 量词、嵌套括号；`packages/spreadsheet-core/src/core/search-operations.ts:6` 复制了同一正则；`packages/flux-runtime/src/validation/validators.ts:197` `precompiled?.regex ?? new RegExp(input.rule.value)` 回退路径不经守卫；`packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:147` 直接 `new RegExp(resolved.pattern)` 无守卫。四个汇点所在包均依赖 `@nop-chaos/flux-core`。
- **S3**：`packages/flux-renderers-content/src/markdown.tsx:136-141`：`allowHtml` 开启时（默认关闭，:43）DOMPurify 字符串清洗 → `rehype-raw` 重解析注入；`packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx:105-114`：**无 allowHtml 闸门、无条件**清洗后 `[rehypeRaw, rehypeKatex]`（ai 包已依赖 content 包，package.json:28）。未验证出可用载荷，属纵深防御缺口。
- **S4**：`packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:403-440` 本地 `readNestedPath`/`setNestedPath` 无危险键守卫（flux-core `getIn`/`setIn` 已守卫，path.ts:3）。
- **S5**：`packages/flux-print-core/src/print.ts:14-22` `mountPrintFrame` srcdoc iframe 无 `sandbox`；`packages/flux-print-renderers/src/print-preview.tsx:51-57` 同；`packages/flux-print-core/src/export-pdf.ts:17` 顶层 `innerHTML`。数据汇点当前全部转义（`render-html.ts`）。
- 安全需求文档 `docs/architecture/security-design-requirements.md` 无原型污染/正则安全/HTML 清洗分层/iframe sandbox 条目。

## Goals

- 任何外部 JSON（SSE delta、schema 字段名）都无法写入 `Object.prototype` 或替换本地对象原型。
- 所有由 schema/用户提供的正则在编译前经同一个 flux-core 安全判定 `isBacktrackingSafePattern`；判定按指数级（量词化歧义分组，含嵌套）与多项式级（相邻无界量词原子、≥3 个无界 `.` 通配）回溯风险拒绝。**执行期修订（2026-11-01，见 Deferred 节裁决记录）**：原 Goal「不放宽现有拒绝面」撤回——旧黑名单把所有量词化字符类（`[^@]+`、`[a-z]+`）与单个 `.*`/`.+` 一律拒绝，实证导致用户指南示例 pattern 使字段永久报错（live defect），新判定精确化后放行线性安全 pattern。
- markdown `allowHtml` 路径在 HTML 重解析之后有一层 hast 级清洗兜底。
- S5 有基于实测的裁决；安全需求文档记录上述要求。

## Non-Goals

- 不引入 RE2/新依赖；不改 `allowHtml` 默认值；不改 `data:` scheme 策略（已文档化接受风险，报告 S6）。
- 不重做 DOMPurify 配置本身。

## Scope

### In Scope

- S1-S4 修复 + 判别性测试；S5 实测裁决（采纳则修复+测试）；flux-core 新增 `safe-regex` 工具并从 `packages/flux-core/src/index.ts` 新增导出（additive 公共面变更，由本计划授权）；安全需求文档补节。

### Out Of Scope

- 非 schema 来源的内部常量正则；print 模板作者可信假设本身。

## Failure Paths

| 编号           | 触发                                   | 行为                                                       | 可重试 | 用户可见表现                     |
| -------------- | -------------------------------------- | ---------------------------------------------------------- | ------ | -------------------------------- |
| unsafe-pattern | 校验规则 pattern 被判定为回溯风险      | 编译期 `precompiled.error`，运行期返回配置错误（既有通道） | 否     | 字段显示"无效校验规则"类配置错误 |
| unsafe-barcode | barcode `pattern` 被判定为回溯风险     | 走既有 `flux.barcode.invalidPattern` 分支                  | 否     | 输入框提示无效 pattern           |
| unsafe-search  | 表格正则搜索输入被判定为回溯风险       | `createSearchRegex` 返回 null（既有通道：视为无匹配）      | 是     | 搜索无结果                       |
| proto-delta    | SSE delta 含 `__proto__`/`constructor` | 跳过该键，其余字段正常合并                                 | —      | 无感知                           |

## Test Strategy

必须自动化：安全修复必须先有失败的判别性测试（旧实现下污染/挂起/放行），再修复。

## Execution Plan

### Phase 1 - 原型污染（S1、S4）

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/utils.ts`、`condition-builder.tsx`、对应测试

- Item Types: `Proof | Fix`

- [x] Proof：ai engine 测试——对 `combineDeltaData({}, JSON.parse('{"__proto__":{"polluted":true}}'))` 及经 `deepClone` 采纳路径断言 `({}).polluted === undefined` 且结果对象原型未被替换（旧实现必挂；测试结束清理全局以防串扰）
- [x] Fix：`combineDeltaData`/`deepClone`（及同文件其他逐键复制处）跳过 `__proto__`/`constructor`/`prototype`
- [x] Proof+Fix（S4）：condition-builder 字段名 `__proto__.x` 写值不改变值对象原型——**选定加同款危险键守卫**（本地 `setNestedPath` 遇数组改建对象、逐层浅拷贝，与 flux-core `setIn` 语义不同，复用会改变既有点路径行为）；两函数原样移入 `condition-builder/utils.ts` 导出以便直测，新测试 `condition-builder-nested-path.test.ts`

Exit Criteria:

- [x] 两处判别性测试通过，且在修复前实跑失败（ai utils.test 3/14 失败 → 14/14；nested-path 2/3 失败 → 3/3）
- [x] `flux-renderers-ai` 104 文件/856 测试全绿；`flux-renderers-form-advanced` condition-builder 全目录 27 文件/292 测试全绿（全包回归归 Closure Gates）

### Phase 2 - 正则安全统一（S2）

Status: completed
Targets: `packages/flux-core/src/utils/safe-regex.ts`（新）、`packages/flux-core/src/index.ts`、`validation-lowering.ts`、`validators.ts`、`barcode-input.tsx`、`search-operations.ts`

- Item Types: `Proof | Fix`

- [x] Proof：`safe-regex` 表驱动测试——必须拒绝：`^(?:a|aa)+$`、`(a|ab)*c`、`((a+))+`、`(a{1,})+`、`(\w+\s?)*$`，以及现有黑名单拒绝的全部形态（`(a+)+`、`.*`、`.+`、`[a-z]++`）；必须接受：`^\d{6}$`、`^[A-Z]{2}-\d+$`、`^1[3-9]\d{9}$`、`^(\d{3})-(\d{4})$`
- [x] Proof：盘点仓库内全部 schema/示例/测试中的 `pattern` 取值（`_tmp/safe-regex-inventory.mjs`，19 个不同取值）：新判定**零新增拒绝**（唯一新增拒绝为本计划判别性测试载荷 `^(?:a|aa)+$`）；旧黑名单拒绝的 8 个取值中 7 个为线性安全（`^[^@]+@[^@]+\.[^@]+$`〔flux-guide 06 示例〕、`^[a-z]+$`、`[A-Za-z]+`、`^[A-Z0-9]+$`、`^[0-9]+$`、`.*`、`^[a-zA-Z][a-zA-Z0-9_-]*$`），新判定放行；`(a+)+$` 仍拒绝
- [x] Fix：实现 `isBacktrackingSafePattern`（`packages/flux-core/src/utils/safe-regex.ts`，基于原子的单遍扫描：指数级 = 组体含交替/变宽量词且组后接无界或跨度≥10 的量词，特征向父组传播；多项式级 = 同层直接相邻的两个无界量词原子、或 ≥3 个无界 `.` 通配），flux-core index 新增导出 `isBacktrackingSafePattern`。**执行期改判**：原写「保留现有黑名单四类」——实证旧黑名单误拒线性 pattern 致 live defect（见 Deferred 节），改为精确规则替换旧黑名单
- [x] Fix：四个汇点统一调用——validation-lowering 替换本地函数；validators.ts 回退路径不安全时返回配置错误；barcode-input 不安全时走 invalidPattern；search-operations 删除本地常量
- [x] Proof：validators 回退路径（`validators-edge-cases.test.ts`）、barcode-input（`barcode-input.test.tsx`）各一条判别性测试，均以 `_tmp/revcheck.py` 去守卫反向验证失败；另增两条 live defect 回归：`flux-core/src/utils/safe-regex.test.ts`「flux-guide 全部 pattern 示例被接受」（编译期 precompile 即调用该判定；以旧黑名单反向验证失败——初稿置于 flux-compiler 测试，因该包 tsconfig 无 node 类型致 typecheck 红而迁移）、`validators-edge-cases.test.ts`「线性字符类 pattern 正常求值而非配置错误」

Exit Criteria:

- [x] `safe-regex.test.ts` 32 例（10 指数拒绝 + 5 多项式拒绝 + 16 线性接受 + 指南示例全接受）与汇点测试通过；盘点结论如上
- [x] flux-core 784、flux-compiler 576、flux-runtime 1559、flux-react 655、flux-renderers-form 1160、spreadsheet-core 339、flux-renderers-scheduling 1096 全绿

### Phase 3 - markdown 清洗兜底（S3）与打印 sandbox 裁决（S5）

Status: completed
Targets: 两个 markdown 渲染器、`flux-print-core`、`flux-print-renderers`

- Item Types: `Decision | Proof | Fix`

- [x] Decision：落位 content 包 `sanitize.ts`（`rehypeStripUnsafeHtml`，与 `sanitizeHtml` 并列从 content index 导出——additive）；ai 包已从 content 导入 `sanitizeHtml`，复用不新增跨包依赖。插件用本地结构类型（不引入未声明的 `@types/hast`）
- [x] Proof：`sanitize.test.ts` 两例——手工 hast 树（script/style/iframe+srcDoc/onError/onerror/javascript: href 被剥离，className/alt/https href/title 保留）+ `react-markdown`+`rehype-raw` 喂未清洗原始 HTML 集成；插件置空后两例均失败（反向验证）
- [x] Fix：content markdown 的 `allowHtml` 路径与 ai-bubble markdown（无条件路径）均在 `rehypeRaw` 之后追加清洗插件（ai 侧置于 rehypeKatex 之前，避免剥离 katex 产物）
- [x] Decision（S5）：Chromium 实测（`_tmp/print-sandbox-probe.mjs`）——无 sandbox：内容渲染、print 可调、**内联脚本执行**；`allow-same-origin allow-modals`：内容渲染、print 可调且未被忽略、脚本不执行；仅 `allow-same-origin`：print 被忽略（"Ignored call to 'print()'"）。**采纳**：打印帧 `allow-same-origin allow-modals`（`print.test.ts` 断言，去属性反向验证失败）、预览帧 `allow-same-origin`（`print-designer.test.tsx` 断言；`print-designer.spec.ts` e2e 9/9）。`export-pdf.ts` 顶层 innerHTML：**watch-only**（html2canvas 需顶层渲染；安全性依赖 render-html.ts 全汇点转义，已入 R9）

Exit Criteria:

- [x] 插件单测通过；content 49 文件/379、ai 104 文件/856 全绿
- [x] S5 裁决有实测记录；print-core 88、print-renderers 86 全绿，print-designer e2e 9/9 `--retries=0`

### Phase 4 - 安全需求文档

Status: completed
Targets: `docs/architecture/security-design-requirements.md`、`docs/architecture/flux-core.md`

- Item Types: `Fix`

- [x] Fix：`docs/architecture/flux-core.md` 新增「Regex Safety Utility」节（Protected Area 要求的 owner doc 记录）
- [x] Fix：`security-design-requirements.md` 新增 R6（外部数据危险键守卫）、R7（schema/用户正则，单一判定）、R8（HTML 清洗分层）、R9（打印 iframe）四节 + Prohibited Patterns 两条，只写最终设计

Exit Criteria:

- [x] 安全需求文档四节存在且与 live 实现一致；flux-core.md 记录 safe-regex 工具

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（agent_46662c2c-6498-41b3-8630-5f8d95a753a4）
- Verdict: pass（零 Blocker / 零 Major / 4 Minor）
- Rounds: 1
- Findings addressed: Minor 全部就地修正——Phase 2 Fix 明写"保留现有黑名单四类 + 新增扫描器"（否则 `.*`/`.+`/`[a-z]++` 无组可判、自身 Proof 会挂）；search-operations 行号 7→6；Protected Area owner doc：Phase 4 增 flux-core.md 记录项；ai-bubble markdown 实为无 allowHtml 闸门的无条件路径，Fix 措辞与插件顺序（rehypeKatex 之前）校准。

## Closure Gates

- [x] S1-S4 修复且判别性测试反向验证；S5 已裁决
- [x] flux-core 新增导出已记录于 daily log（公共面 additive 变更）
- [x] 安全需求文档已同步
- [x] 不存在被静默降级的 in-scope 缺陷
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据（agent_1ed7d2e3，approved）
- [x] `pnpm typecheck`（46/46；首跑 flux-compiler 测试 node 类型红 → 测试迁移 flux-core 后复跑 46/46）
- [x] `pnpm build`（46/46）
- [x] `pnpm lint`（46/46；迁移后两文件补跑 eslint 零告警）
- [x] `pnpm test`（`turbo run test --continue`：86/86 任务、17,415 passed / 0 failed——含 830 待修的 barrel 重复注册；迁移后 flux-core 785、flux-compiler 575 复跑全绿）
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

### 执行期改判：旧正则黑名单误拒线性 pattern（live defect，已在本计划内修复，非延期）

- 裁决时点：2026-11-01 Phase 2 执行中。
- 证据：barcode 接入旧黑名单后既有测试 `^[0-9]+$` 失败 → 盘点发现旧黑名单（2026-05-08 `650bfa0c0` 随大提交引入、无文档）拒绝所有量词化字符类与单个 `.*`/`.+`；探针实证 `flux-guide/06-form-validation.md:28` 的 email 示例 `^[^@]+@[^@]+\.[^@]+$` 编译为 `precompiled.error`，运行期该字段对 `a@b.c` 与空值均返回 "Invalid validation pattern"——表单永久无法提交。
- 处置：Goals「不放宽现有拒绝面」撤回，以精确规则替换旧黑名单（Phase 2 Fix）；新增两条 live defect 回归测试。
- Classification: 不适用（已修复，不进入延期）；本条为 When Executing 7 的改判记账。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: S1-S5 全部落地（S5 打印帧/预览帧 sandbox 采纳，export-pdf 顶层渲染裁 watch-only 并入 R9）；执行期发现并修复 live defect——旧正则黑名单使 flux-guide email 示例 pattern 永久报配置错误，以精确的指数/多项式回溯判定替换并在 Goals/Deferred 当场记账；安全需求文档 R6-R9 与 flux-core.md 同步；全量门禁绿。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（agent_1ed7d2e3-b923-4d00-b970-5c39b640d6ad）
- Evidence: verdict **approved**（零 Blocker/Major；2 Minor 非阻塞：R7 可补述跨组相邻近似局限、R7 "三个及以上" 与常量 `MAX_UNBOUNDED_WILDCARDS = 2` 表述一致）。审计员逐项核对代码与测试断言、聚焦套件实跑计数与计划一致，并以独立探针实证旧黑名单"误拒 email/`^[0-9]+$`、漏放 `^(?:a|aa)+$`"，印证执行期改判。

Follow-up:

- no remaining plan-owned work
