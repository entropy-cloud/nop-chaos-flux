# D2 一致性门禁沉淀与 roadmap 收口（R2/R3 共性模式 → check:\* 门禁候选落地 + 全 roadmap 终态盘点）

> Plan Status: completed（2026-08-31 四 Phase 全部完成 + Closure Gates 全勾 + closure audit 通过后收口；audit 与收口证据见文末 Closure 区）
> Mission: ui-review
> Work Item: D2. 一致性门禁沉淀与 roadmap 收口（roadmap Phase Status 唯一剩余 `todo`；依赖 R3/C2/D1 均已 `done`，就位条件满足——R3 2026-08-29 closure audit 通过、C2 初版裁决收口且回写 ①–⑮ 齐备、D1 产品化六项能力（七个 plans）全部 completed）
> Last Reviewed: 2026-08-31
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（D2 条目 + Phase Details D 系列 + Phases 表 D2 行）；R2 owner doc `docs/analysis/ui-review/R2-consistency-audit.md`（§共性归类族 1–10 + §R3 收口节含 7 行清扫记录/8 批次标签）；C2 `docs/analysis/ui-review/C2-capability-gaps.md`（初版裁决表 + §2 预清单 + 回写 ①–⑮）；R1 `docs/analysis/ui-review/R1-framework-benchmark.md`（复评基线）；`docs/context/ai-autonomy-policy.md`
> Related: `docs/plans/2026-08-29-0419-1-r3-consistency-p0p1-remediation.md`（门禁输入源：批次 grep 清扫模式 + P2/P3 裁决台账）；D1 产品化七个 plans（六项能力收口，0721-1/0721-2 为第六项的两个 plan）`2026-08-30-1333-2` / `2026-08-30-1737-1` / `2026-08-30-1737-2` / `2026-08-30-2312-1` / `2026-08-30-2312-2` / `2026-08-31-0721-1` / `2026-08-31-0721-2`（deferred 候选触发状态盘点输入 + 复评证据源）

## Purpose

把 R2/R3 沉淀的共性一致性模式按 roadmap D2 裁定逐条终审为 `check:*` 门禁候选，落地其中可静态化的门禁脚本（沿 `pnpm check` 体系、零新增未登记命中红线）；随后完成全 roadmap 终态盘点（对标分数复评 + C2 终版 + 各复刻页清单 + debt 台账）落盘 `docs/analysis/ui-review/D2-closure.md`；最终同步 owner docs / 日志并把 roadmap D2 状态收口。

## Current Baseline

- **roadmap 唯一剩余 `todo` = D2**（2026-08-31 live 实读 Phase Status 区）：R0–R3、C1/C2、P1–P7b、D1 全部 `done`；D2 依赖（R3、C2、D1）已全部满足，无阻塞前置。
- **`pnpm check` 体系现状**（live 实测 `package.json`）：主链 `check` = 14 个门禁（react19 / src-artifacts / oversized-code-files / active-doc-code-anchors / package-css-exports / flux-bundle-pack / i18n-keys / workspace-manifest-deps / schema-prop-coverage / scada-symbol-keys / audit-suspects / audit-renderer-browser-io / audit-event-dispatch-ctx / ai-engine-invariants）；另有约 17 个独立 `check:*` 未入主链（audit-\* 族 scanners + docs-garbled / renderer-definition-fields-only / finite-prop-contracts / duplicates 等）。scanner rule 模型 = `scripts/audit/rules.mjs`（规则对象：`id`/`severity`/`description`/`include`/`patterns`/`filterMatch`/`scanWithContent`）+ `scripts/audit/shared.mjs`（`runScanner`）；脚本测试在 `scripts/__tests__/`（`pnpm test:scripts` = `vitest.scripts.config.ts`）。
- **豁免基线治理先例**：`check:oversized-code-files` 的 `OVERSIZED_EXEMPTIONS`（脚本内 `{ path, reason }` 常量，命中仍打印并标记 `[exempt]` 不翻转 exit code，每条豁免可审计）；登记状态记入 `docs/logs/`（AGENTS.md「registered pre-existing red list」口径）。新门禁的既有实例豁免沿此先例。
- **R2 产出**（`R2-consistency-audit.md`）：276 发现 → 273 保留（HIGH 17 / MEDIUM 172 / LOW 87）；共性族 1–10 落在 §共性归类表（① disabled 门禁通道缺失 ② 状态已发射样式零消费（死状态）③ 长内容无滚动/溢出契约 ④ hover-only/低触点 ⑤ 失败静默 ⑥ 写后界面不同步 ⑦ 键盘等价路径缺失 ⑧ 确认/取消语义与顺序分裂 ⑨ i18n/语义色硬编码 + 枚举直出 ⑩ 空态/加载态标准分裂）。
- **R3 收口沉淀**（同文件 §R3 收口节）：P0/P1 17 条全修复（15 个回归测试文件先红后绿）；§3 类别清扫记录 7 行表格覆盖 8 个批次标签（⑧⑨ 合并一行）的 grep 清扫模式（批次① `readOnly) return` + `meta.disabled` 反查、② `DetailSurface|closeDraft`、④ `useVirtualizer|virtualThreshold`、⑤ body-only helper cell 清点（`__drag__`/`__row_save_bar__` 配对）、⑥ `conversation-delete`、⑦ `data:text|data:application`、⑧⑨ `DrawerBody` 消费面 + `data-selected` 消费反查）；P2 172 条裁决（3 随批修 + 169 条「登记后续修复候选」）；P3 87 条登记终态并明示「不入 D2 门禁候选」（§5）。
- **既有门禁与 R2 族 9 的覆盖缺口**（live 复核）：`check:i18n-keys` 只校验 `t('flux.*')` key 定义存在性，不检测 renderer 源码硬编码 CJK 文案字面量；`check:audit-styling-suspects` 现有规则仅 `bare-data-slot-selector`，无硬编码色值/字面色规则——R2 族 9 的 renderer 硬编码色（graph HSL、scheduling hex/red-400）与字面色类（kanban `bg-white`、`color-mix(...,white)`，R2 P2 已裁决登记）当前零门禁覆盖。
- **复刻页 live 实测 26 张**（`apps/playground/src/complex-pages/page-schemas/` 共 40 张 schema）：sundial 5 + antdpro 9 + cal 3 + linear 6 + notion-database 1 + airtable-grid 1 + stripe-payments 1。
- **D1 deferred 候选触发状态**（D1 产品化 plans `Deferred But Adjudicated` 区 live 实读）：G-C overflow 收纳菜单（触发 = 多视图溢出真实消费页）、个人视图偏好存储层（触发 = 消费页）、G-D fill-handle 编辑器选区模型（触发 = consuming 复刻页/页面）、动态列模型（触发 = 用户自定义列真实诉求）、G-C 视图类型↔peek 联动建模（Successor Required: no）——**当前零消费页，全部不可复活，不立项**；归 Phase 3 的 C2 终版 open-candidates 台账登记。
- **本计划预期零 `packages/` 产品代码改动**；worktree 纪律：全部工作在 worktree `nop-chaos-flux-ui-review`（分支 `ui-review`），commit 格式 `feat(ui-review): <description>`（roadmap Cross-Cutting 1 + Rule 4）。

## Goals

- R2 共性族 1–10 + R3 §3 清扫记录（7 行表格覆盖 8 个批次标签，⑧⑨ 合并一行）逐条终审归类落字（四态：`gate landed`（本计划 Phase 2）/ `gate deferred`（带触发条件）/ `not gate-able`（带理由）/ `already covered`（带既有 check id）），零静默缺项。
- Phase 1 终审选中的可静态化门禁落地为 `check:*` 脚本（候选池见 Phase 2，预期 2–4 个）：沿 `scripts/audit/` scanner rule 模型实现，注册进 `package.json`（入主链或独立 `check:*`，沿治理先例裁定并落字理由），配套 `scripts/__tests__/` 先红后绿测试；**零新增未登记命中**——既有裁决实例走脚本内豁免基线（沿 `OVERSIZED_EXEMPTIONS` 先例，每条含 R2/R3 裁决回链）。
- `docs/analysis/ui-review/D2-closure.md` 落盘全 roadmap 终态盘点：对标分数复评（R1 双维评分 post-D1 增量复评）+ C2 终版节（append-only 追加：已收口候选汇总 + open candidates 台账）+ 各复刻页清单（live 复核计数）+ roadmap 四条工作线终态盘点。
- owner docs / 日志同步 + roadmap D2 状态收口（`todo` → `done`，仅在独立 fresh session closure audit 通过后）。

## Non-Goals

- **不修复 P2 169 条「登记后续修复候选」与 P3 87 条 backlog**：登记即终态，修复归属后续独立裁决；P3「不入 D2 门禁候选」既有裁定仅在 Phase 1 有证据时才可推翻，否则维持。
- **不复活 D1 deferred 候选**：overflow 收纳 / 个人视图偏好存储 / fill-handle 选区模型 / 动态列模型 / peek 联动建模——触发条件均未满足（零消费页），只在 C2 终版台账登记。
- **不做新 renderer 能力产品化，不改 renderer 产品行为**：门禁豁免登记只动脚本内豁免常量/allowlist，不改任何产品代码；某门禁若因既有实例无法达成零命中，走登记豁免，不顺手修复（与 P2 裁决「登记后续修复候选」口径一致）。
- **不重写 R1/R2/C2 既有文档终稿**：C2 终版以追加「终审节」方式落在 C2 文档回写区语义内（或 D2-closure.md 引用式汇总，Phase 3 落字裁定），历史初版/回写文本不动。
- **不新增 runtime / renderer 契约能力**：门禁是静态扫描器，不引入 schema 字段、renderer type 或 runtime API 变更。

## Scope

### In Scope

- `scripts/audit/`（新规则或新 scanner）+ `scripts/`（独立 check 入口，若裁定不并入 audit-suspects 聚合）+ `scripts/__tests__/`（测试与 fixtures）
- `package.json`（`check:*` 注册，主链或独立命令）
- `docs/analysis/ui-review/D2-closure.md`（新建）
- `docs/backlog/ui-review-roadmap.md`（Phase Status 区 D2 状态，仅 Phase 4 closure audit 通过后变更）
- `docs/logs/2026/08-31.md`（收口日志）+ 豁免基线登记（脚本内常量 + 日志记录，沿 `check:oversized-code-files` 先例）
- `docs/index.md`（如 ui-review 产出文档有导航登记义务则同步；否则落字说明）

### Out Of Scope

- P2/P3 backlog 修复、D1 deferred 复活、renderer/ui 产品代码改动、R1/R2/C2 初版文档重写、任何新 renderer 能力。

## Failure Paths

| 可测场景编号           | 触发                                 | 行为（含退出码语义）                                                                           | 可重试 | 用户可见表现                      |
| ---------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------- | ------ | --------------------------------- |
| gate-false-positive    | 新门禁对合法代码模式误报             | 修正 `patterns`/`filterMatch` 或补豁免（含理由），不得把规则降级为 advisory（Minimum Rule 13） | 是     | `pnpm check` exit 0，误报实例消失 |
| gate-pre-existing-hits | 新门禁命中既有 R2/R3 已裁决实例      | 实例写入脚本内豁免基线（含裁决回链），门禁仍打印命中并标 `[exempt]`；红线 = 零**新增**实例     | 是     | 豁免清单可审计，exit 0            |
| gate-chain-fails       | 新门禁入主链后 `pnpm check` 非预期红 | 先修脚本/豁免基线；未收敛前不得收口本 plan（Closure Gates 红线）                               | 是     | `pnpm check` exit 0 恢复          |
| gate-flaky-fs          | scanner 受文件系统/编码异常干扰崩溃  | 沿 `handleFatalError` 语义非零退出（fail-fast），不允许静默吞错                                | 是     | 报错信息含 scanner label          |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（Phase 2 门禁脚本属 `pnpm check` 体系 = CI fail-fast 硬约束，Minimum Rule 13；每个门禁先红后绿测试 + fixtures 三态：命中/豁免/无关）。Phase 1/3/4 为裁决与文档项，对 docs 部分 `不适用：纯文档无行为变更`，以独立 review 验证。

## Execution Plan

### Phase 1 - R2/R3 共性模式门禁候选终审

Status: completed
Targets: 本 plan（终审表落字）；只读输入：`docs/analysis/ui-review/R2-consistency-audit.md`、`docs/analysis/ui-review/r2-audit/r3-p2-adjudication.md`、`scripts/audit/rules.mjs`、`package.json`

- Item Types: `Decision`

- [x] 逐族终审表落字：R2 共性族 1–10 逐族给出四态归类（`gate landed` 本计划 Phase 2 / `gate deferred` 带触发条件 / `not gate-able` 带理由 / `already covered` 带既有 check id），每族引用代表条目（R2 §共性归类表）与涉及组件面证据
- [x] R3 §3 清扫记录逐组归类（7 行表格覆盖 8 个批次标签，⑧⑨ 合并一行；同四态口径），可静态化模式并入 Phase 2 候选池
- [x] Phase 2 门禁候选定形：每个入选门禁写出 pattern 规格（include 范围 / 匹配模式 / `filterMatch` 语义 / 豁免基线来源与预估既有实例数 / 注册位置主张），不写实现代码
- [x] P3 87 条「不入 D2 门禁候选」既有裁定复核（R3 收口节 §5 声明）：维持或推翻均须落字证据；族 9 已有 R2 P2 裁决登记的实例（graph HSL / scheduling hex / kanban `bg-white` 等）确认为豁免基线来源而非修复对象
- [x] 注册位置裁定：新门禁入主链 `check` 还是独立 `check:*` 命令，沿既有治理格局（audit-\* 族独立命令 + 主链精选）落字理由

Exit Criteria:

- [x] 终审表在本 plan 内可整表复核，四态零缺项（10 族 + R3 §3 的 7 行清扫记录全覆盖，每格有归类与证据/理由）
- [x] 每个入选门禁有可执行的 pattern 规格（include/patterns/filterMatch/豁免来源），任何人可据规格直接实现
- [x] 注册位置裁定落字（主链 vs 独立命令 + 理由）

#### 终审落字（Phase 1 执行产出，2026-08-31，live 复测基线 = 执行期 HEAD）

**一、R2 共性族 1–10 四态终审表**（代表条目引用 R2 §共性归类表，行号锚点见该表）

| 族                                   | 归类                                               | 证据 / 理由                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 disabled/readOnly 门禁通道覆盖缺失 | `not gate-able`                                    | 「全部写入通道是否接门禁」是组件运行时语义属性：`meta.disabled` 消费反查只能定位候选点，无法判定某次要通道的门禁完备性（合法无门禁通道与漏接通道在源码形态上不可区分，误报率不可接受）。R3 批次①修复面已由 6 个回归测试文件锁定（input-time steppers / period shortcut / barcode 五通道 / upload / scada 三面板 / 三 board 根容器）。                     |
| 2 状态已发射、样式零消费（死状态）   | `not gate-able`                                    | 需要「状态发射点 × CSS/类消费面」跨文件数据流交叉比对，静态不可判定；G-F option-row 原语（D1 回写 ⑨ 已产品化）从机制上消解族主体——新状态面应走 `optionRow` 声明 + 标准 marker 输出通道，「未声明 optionRow」是合法形态，静态无法区分合法与漏消费。样本回归保护在库（button-group-selected-visual 等）。                                                   |
| 3 长内容无滚动/溢出契约 + 几何断裂   | `not gate-able`                                    | 滚动/溢出契约正确性取决于 DOM 层级上下文（flex/min-h-0/overflow 组合随宿主而异），静态规则无法判定某容器「应该有」滚动契约；基类契约已修（DrawerBody 对齐 DialogBody）并由 ui `drawer-body-scroll-resize.test.tsx` 回归锁定。                                                                                                                             |
| 4 hover-only / 低触点 / 触摸不可达   | `not gate-able`                                    | 触点尺寸/可达性需渲染后几何测量（getComputedStyle 层），非源码静态可判定；复刻页由 visual e2e 抽样覆盖。                                                                                                                                                                                                                                                  |
| 5 失败/错误静默                      | `already covered`（部分）+ `gate landed`（候选 C） | 静默 catch / then / fire-and-forget 已有主链门禁覆盖：`check:audit-suspects`（`scripts/audit/rules.mjs`）的 `catch-without-structured-failure-path` / `void-promise-no-catch` / `then-chain-no-catch` 三规则（already covered，既有 check id = `check:audit-suspects`）；raw `error.message` 直出 JSX 子模式静态可判定，由候选 C 落地（gate landed）。    |
| 6 写后界面不同步                     | `not gate-able`                                    | 「写动作后数据源/界面刷新」是 action 链运行时语义（ajax success → refreshSource / component:refresh / scope 回写接线完备性），需运行时数据流验证；复刻页写链路由交互 e2e 逐条锁定。                                                                                                                                                                       |
| 7 键盘等价路径缺失                   | `not gate-able`                                    | 「哪些交互需要键盘等价」是产品语义判断（同族交互逐点对照），静态不可判定；通道层缺口已由 G-B2 键盘导航框架（D1 回写 ⑫：keyboard renderer + chord + table modifierSelect）机制性补齐。                                                                                                                                                                     |
| 8 确认/取消按钮语义与顺序分裂        | `not gate-able`                                    | 确认流语义（是否需要确认、文案、顺序）是设计规范层约束：ui 基类层 AlertDialog/confirm 顺序已统一（`[secondary, primary]`，R2 summary 设计规范 #8）；业务层「该动作是否需要确认」需产品语义判断，静态不可判定。                                                                                                                                            |
| 9 i18n / 语义色硬编码 + 枚举直出     | `gate landed`（候选 A + B + C）                    | 三类可静态化子模式全部入选落地：硬编码字面色（候选 A）、CJK UI 文案字面量（候选 B）、raw `error.message` 直出（候选 C）。既有实例全部走脚本内豁免基线（来源 = R2 P2 族9 裁决登记：`r2-audit/r3-p2-adjudication.md` #5、#6、#19、#20、#29、#31、#35、#36、#39、#57、#98、#100、#120、#130 等——确认其为豁免基线来源而非修复对象，修复归 P2 169 条候选池）。 |
| 10 空态/加载态标准分裂               | `not gate-able`                                    | 「该组件是否应有空态/加载态、用 Empty 组件还是文案」是设计规范判断（ui Empty 通道在库），无统一可静态化的违规形态；静态规则只能匹配具体组件×缺失形态组合，泛化即误报。                                                                                                                                                                                    |

四态零缺项复核：10 族全覆盖，每格有归类与证据/理由；`gate deferred` 本轮无（候选池 4 项全部入选落地，无触发条件待延期项）。

**二、R3 §3 清扫记录逐组归类**（7 行表格覆盖 8 个批次标签，⑧⑨ 合并一行；R2 owner doc §R3 收口节 §3 表）

| 批次                                                                 | 归类                                | 理由                                                                                                                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ① disabled 门禁（`readOnly) return` + `meta.disabled` 反查）         | `not gate-able`（同族 1）           | 清扫模式是候选点定位器非违规判定器；修复面已由批次①回归测试族锁定。                                                                                                                                   |
| ② 脏态守卫（`DetailSurface\|closeDraft`）                            | `not gate-able`                     | 消费面闭合（仅 detail-view / detail-field 两文件）+ dirty-guard 回归 7 条锁定；「弹层是否可能含脏草稿」需表单 dirty 运行时状态，静态不可判定。                                                        |
| ④ 虚拟化组合（`useVirtualizer\|virtualThreshold` + RadioGroup 反查） | `not gate-able`                     | 虚拟器 × ref 路由 × RadioGroup 包裹正确性需渲染运行时验证（table-virtual-radio / table-virtual-autofill-scrollref 回归在库）；静态无法判定「该虚拟器是否需要包裹」。                                  |
| ⑤ 列配对（body-only helper cell 清点 `__drag__`/`__row_save_bar__`） | `not gate-able`                     | helper cell 与表头 th / colgroup col 的配对是渲染 DOM 结构属性，需运行时 DOM 断言（table-helper-column-pairing 回归 7 条在库）；静态行列模型推断误报率高。                                            |
| ⑥ 删除确认（`conversation-delete`）                                  | `not gate-able`                     | 生产点唯一（ai-conversations.tsx）已修 + ai-conversations-delete-confirm 回归 5 条锁定；「某删除动作是否需要确认」是产品语义判断。                                                                    |
| ⑦ 下载链接（`data:text\|data:application`）                          | `gate landed`（候选 D）             | 唯一可静态化模式：`data:`/`blob:` 字面量 href 无 `download` 透传——候选 D 纯回归守卫落地。                                                                                                             |
| ⑧⑨ 家族扫查（`DrawerBody` 消费面 + `data-selected` 消费反查）        | `not gate-able`（⑧ 同族 3；⑨ 拆分） | ⑧⑨ 合并行的 DrawerBody 消费面与 `data-selected` 消费反查均为运行时/DOM 交叉验证；⑨ 中可静态化的字面色与 CJK 文案子模式即候选 A/B 本体（归族 9 `gate landed`），其余枚举直出语义审查 `not gate-able`。 |

**三、Phase 2 门禁候选定形（4 候选全部入选；候选 A–D 规格）**

- **候选 A `hardcoded-literal-color`（severity: medium）**
  - include：`packages/flux-renderers-*/src/**` 非 test（`isTestFile` 排除 + `test-support` 排除），扩展名 ts/tsx/css。
  - 匹配模式：① hex 字面量 `#[0-9a-fA-F]{3,8}\b`；② `hsl(`/`rgb(`/`rgba(` 函数字面；③ Tailwind 字面色类 `\b(bg|text|border|ring|fill|stroke|from|to|via|outline|decoration|divide|accent|caret)-(white|black|(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)(-\d{2,3})?)\b`；④ `color-mix(` 含 white/black 字面。
  - `filterMatch` 语义：逐行剥注释后匹配（沿 `getCodeTextForLine` 语义——注释内不命中、字符串字面量内命中，因 className 串与 style hex 本体即在字符串中）。
  - 豁免基线来源与预估：R2 P2 族9 裁决登记（graph styles.css HSL #100、map #98、scheduling hex/red-400 族 #35/#36/#39、diff-view #5、content #6 等）+ 未列域登记（industrial SCADA 符号 canvas 绘图域、chart/sparkline/heatmap 数据可视化调色板、qrcode/map-color 色域工具、CSS 变量回退 hex `var(--x, #fff)`、kanban/gantt/calendar Tailwind 字面色族、ai/mobile/industrial 包级 styles.css）。live 复测预估 ~330–380 实例 / ~65 文件，按目录/文件级豁免归并登记。
- **候选 B `hardcoded-cjk-ui-copy`（severity: medium）**
  - include：同候选 A 但仅 ts/tsx。
  - 匹配模式：CJK 字符 `[\u4e00-\u9fff]` 出现在剥注释后的源码文本（含字符串字面量与 JSX 文本位）。
  - `filterMatch` 语义（两类边界裁定，回应 draft review Minor）：① `t(..., { defaultValue: '中文' })` i18n 回退字面量 = **合法通道排除**（key 未命中回退非硬编码直出，i18n 通道在库）；② dev `warnOnce`/`devWarn`/`console.*` 开发者日志串 = **不在扫描面**（开发者诊断非用户可见 UI 文案，live 实例 pivot-renderer/pivot-option 先例）；另排除 schema 定义 `description:` 字段行（作者侧文档非终端用户文案，live 实例 pivot-renderer-definitions/batch-bar-definition）。
  - 豁免基线来源与预估：**0 实例，纯回归守卫**——live 复测确认（`'+ 添加列'` 已迁移 `t('scheduling.kanban.addColumn')`，JSX 文本位/属性位 CJK 零命中，`t(` 直字面量零命中）。
- **候选 C `raw-error-message-direct-out`（severity: medium）**
  - include：同候选 A 但仅 ts/tsx。
  - 匹配模式：`\b(?:error|err)\.message\b`（覆盖 `result.error.message` 嵌套形）。
  - `filterMatch` 语义：剥注释后匹配；排除 dev 诊断接收器行（`console.*`/`devWarn(`/`warnOnce(`）；排除 i18n 插值通道 `t('...', { message: err.message })`（结构化本地化模板承载用户可读文案，live 实例 barcode cameraError）。
  - 豁免基线来源与预估：~35–45 实例，全部豁免登记——三类豁免理由：结构化诊断 `message:` 载荷（industrial scada 诊断通道族）、本地化回退双轨（`error instanceof Error ? error.message : t('...')` 且落结构化状态而非裸 JSX）、R2 族5/族9 已裁决登记实例（map-renderer [G5-R2-视角5-02] 等）。
- **候选 D `data-blob-href-without-download`（severity: high）**
  - include：`apps/** + packages/**`（repo 级）非 test，扩展名 ts/tsx/js/jsx/mjs。
  - 匹配模式：① 字符串字面量内 `data:(text|application)/`；② `(href|src)` 赋值/属性指向 `data:`/`blob:` 字面。
  - `filterMatch` 语义：剥注释后匹配。
  - 豁免基线来源与预估：**1 实例**——`apps/playground/src/complex-pages/shared/showcase-env.ts:229`（R3 时点 219，live 229 已复核）CSV 导出 data URL 生成点；schema 侧 `download: true` 已补（R3 ⑦ 修复 [G7-R2-视角11-01]，`link-download.test.tsx` 回归在库），生成点本身无 download 语义可表达 → 豁免登记。其余面零命中，纯回归守卫。

**四、P3 87 条「不入 D2 门禁候选」既有裁定复核（R3 收口节 §5）**：**维持**。理由：LOW 级发现多为单点视觉/文案细节（`r2-audit/summary.md` §可暂缓项），无共性族沉淀价值；族级共性已由上表 10 族终审全覆盖——若某 P3 条目落在候选 A/B/C 扫描面内，将自然被门禁捕获为新增命中（届时按门禁流程登记），无需推翻「登记即终态」的批量裁定。族 9 已有 R2 P2 裁决登记的实例（graph HSL / scheduling hex / kanban `bg-white` 等）确认作为候选 A 豁免基线来源，本计划零修复（Non-Goals 口径一致）。

**五、注册位置裁定**：4 候选合并为一个新 runner `scripts/audit/find-ui-consistency-gaps.mjs`（四规则同脚本、各自 include 作用域），注册为独立命令 `check:audit-ui-consistency-gaps` 并**入主链 `check`**。理由：① Minimum Rule 13——一致性门禁是 fail-fast 硬约束，不入主链的独立命令（现有 17 个）历史上为 advisory 性质，不满足硬约束语义；② 先例——`check:audit-event-dispatch-ctx` / `check:audit-renderer-browser-io` / `check:ai-engine-invariants` 均为 bespoke scanner 独立脚本直挂主链，本门禁的豁免基线打印（`[exempt]` 标记 + 豁免计数）需要自定义 runner，`check:audit-suspects` 聚合 runner（`runScanner` 通用打印）无此能力且双注册会双打印，故不并入聚合、以独立脚本挂主链；③ 候选 D 需扫 `apps/`，与共享 `scanRoots`（apps/packages/tests）一致，单 runner 可承载。

### Phase 2 - 门禁脚本落地与注册

Status: completed
Targets: `scripts/audit/`、`scripts/`（如独立入口）、`package.json`、`scripts/__tests__/`、脚本内豁免基线常量

- Item Types: `Fix | Proof`

候选池（Phase 1 定形后逐个落地；预期 2–4 个；每个候选要么落地、要么给出 `gate deferred` 终态，零静默丢弃；**统一测试先行**——每候选先写 fixtures 三态测试（先红）再实现（后绿），满足 Test Strategy「必须自动化」档的 Proof-before-Fix 要求）：

- [x] 候选 A：renderer 包源码硬编码字面色门禁（hex 字面量 + Tailwind 字面色类如 `bg-white`/`text-red-400` + `color-mix(..., white)`；include = `packages/flux-renderers-*/src` 非 test；playground 复刻层 CSS 与 schema 数据色不在范围——样式契约归属先例：复刻页 CSS 走 playground 层 scope 专用类，roadmap Cross-Cutting 4；既有命中已实测确认存在：graph `styles.css` hsl 字面量、kanban `bg-white`/`red-400` 族、`gantt.css` color-mix）
- [x] 候选 B：renderer 包源码硬编码 CJK UI 文案门禁（TSX 字符串字面量直出用户可见文案；与 `check:i18n-keys` 互补——该校验 key 存在性、不检测字面量；`filterMatch` 排除注释与测试。**Phase 1 须显式裁定两类边界**：① `t(..., { defaultValue: '中文' })` i18n 回退字面量（mobile pull-refresh/infinite-scroll 先例）算命中还是豁免；② dev `warnOnce`/`console.error` 开发者日志串（pivot-renderer 先例）是否在扫描面内。R2 时代的 `'+ 添加列'` 实例已迁移 `t('scheduling.kanban.addColumn')`，live 实例清单以 Phase 1 复测为准，不沿用 R2 旧例）
- [x] 候选 C：renderer 包源码 raw `error.message` 直出 JSX 门禁（族 5/9 交叉：barcode/map 错误直出等；有结构化失败通道用法的除外；live 实测既有命中：map-renderer/wizard-renderer/scada-editor-canvas）
- [x] 候选 D：`data:`/`blob:` href 无 `download` 透传门禁（R3 ⑦ 回归面收窄版；include 须含 `apps/` + `packages/`（或 repo 级）——已知唯一生成点在 playground 层 `showcase-env.ts`（R3 时点行号 219，live 现 229，行号以执行期 live 复核为准）且已修复，预期零命中纯回归守卫）
- [x] 每个落地门禁：`scripts/__tests__/` 测试（fixtures 覆盖命中/豁免/无关三态，先红后绿，测试先行）
- [x] 每个落地门禁：既有实例逐一核对 R2/R3 裁决台账，豁免基线写入脚本内常量（`{ path, reason, 裁决回链 }`，沿 `OVERSIZED_EXEMPTIONS` 先例），零新增未登记命中
- [x] `package.json` 注册 `check:*`（按 Phase 1 裁定位置），`pnpm check` 全链 + `pnpm test:scripts` 全绿

Exit Criteria:

- [x] 入选门禁全部落地并完成 `package.json` 注册；`pnpm check` exit 0（零新增未登记命中）且 `pnpm test:scripts` 全绿
- [x] 每个门禁在 `scripts/__tests__/` 有先红后绿测试（fixtures：命中/豁免/无关三态各有断言）
- [x] 落选候选在本 plan `Deferred But Adjudicated` 区有终态（分类 + Why Not Blocking Closure + Successor Path），零静默丢弃
- [x] 豁免基线每条含 R2/R3 裁决回链，可在脚本内直接审计

#### 执行记录（Phase 2 落地证据，2026-08-31）

- **落地物**：`scripts/audit/find-ui-consistency-gaps.mjs`（单 runner 四规则：`hardcoded-literal-color` / `hardcoded-cjk-ui-copy` / `raw-error-message-direct-out` / `data-blob-href-without-download`；`FLUX_AUDIT_SCAN_ROOT` 沿 0150-1 stagedDirs 治理契约）；注册 `check:audit-ui-consistency-gaps` 入主链 `check`（第 15 个门禁）。
- **测试**：`scripts/__tests__/find-ui-consistency-gaps.test.ts` 17 条（四规则命中态 6 + 豁免态 3 + Phase 1 边界裁定断言 5 + 无关/清洁态 3），fixtures 三态齐备（`scripts/__tests__/fixtures/ui-consistency-gaps/` 17 个，closure audit 勘误：执行记录原写 15 系两次 gate-false-positive 修正轮期间的陈旧计数）。先红实测：实现前 17 failed → 实现后 68/68 全绿（含既有 51 条）。
- **豁免基线终值**：399 既有实例 / 116 文件 / 30 条脚本内豁免常量（每条含 reason + R2/R3 裁决回链）；候选 B 确认 0 既有实例（纯回归守卫）；候选 D 确认唯一既有实例 `showcase-env.ts:229`（已豁免，schema 侧 `download: true` 修复在案）。
- **执行期 pattern 修正（Failure Path `gate-false-positive` 一次）**：候选 D 匹配模式 ② 由 `(href|src)\s*[:=]\s*...(data:|blob:)` 收窄为 `href` 单属性——live 实测 `component-lab/renderers/audio-lab-page.tsx:10` 的 `<audio src="data:audio/wav...">` 媒体源误报（media/embed 源非导航 href，download 语义不适用）；修正后该实例消除，门禁其余面零变化。
- **执行期 filterMatch 修正（同 Failure Path）**：① 命中按（规则×文件×行）去重（CJK 单字模式逐字符重复计数）；② 多行 `console.warn(`/`devWarn(` 接收器（接收器在上一行行尾）纳入 dev 诊断排除；③ `rgba(0, 0, 0, 0)` 透明色比较惯用法（getComputedStyle 探针）排除。
- **验证**：`pnpm check` 全链 exit 0（新增门禁零新增未登记命中）；`pnpm test:scripts` 68/68 全绿；`pnpm typecheck` 37/37、`pnpm lint` 37/37（零 `packages/` 产品代码改动，Closure Gate「零产品代码改动」红线保持）。

### Phase 3 - D2-closure.md 全 roadmap 终态盘点

Status: completed
Targets: `docs/analysis/ui-review/D2-closure.md`（新建）；只读输入：R0/R1/R2 owner docs、C2、D1 产品化七个 plans、七个复刻 plan 群、`apps/playground/src/complex-pages/`

- Item Types: `Proof | Decision`

- [x] 对标分数复评：沿 R1 双维评分卡（美观度/完善度，1–5 分 + live 证据）对五组对标（AMIS / Ant Design Pro / shadcn/ui blocks / Retool 系低代码构建器 / Vant）中本 roadmap 实际改善的维度做 post-D1 增量复评；每个分数变动附 live 证据（D1 产品化产物：option-row / command-palette / 页面模板语义件族 / 键盘导航框架 / batch-bar / 多视图数据库语义件 / 网格编辑语义件族）；无证据支撑的维度记「维持」不复分
- [x] C2 终版节（append-only，落 C2 回写区语义内或 D2-closure.md 引用式汇总，执行时落字裁定并保持与回写 ①–⑮ 零矛盾）：已收口候选终态汇总（G-A…G-I → D1 六 plan 映射）+ open candidates 台账（D1 deferred 五项带触发条件、P2 169、P3 87、Phase 2 门禁豁免基线索引）
- [x] 各复刻页清单：复刻 schema 逐页登记（来源应用 / plan / mock 端点 / e2e spec / 明暗姿态），live 复核计数（起草期实测 26 张：sundial 5 + antdpro 9 + cal 3 + linear 6 + notion 1 + airtable 1 + stripe 1）
- [x] roadmap 终态盘点节：四条工作线（对标分析 / 一致性审查 / 复杂页面构想 / 参考应用复刻）各自终态一句话 + 全量验证基线引用（最近 full-green 记录）+ `pnpm check` 门禁清单终态（含本计划新增）

Exit Criteria:

- [x] `D2-closure.md` 存在且四节齐全；所有计数 live 复核（复刻页数、P2/P3 数、deferred 项数）
- [x] 分数复评每项变动有 live 证据引用，维持项有理由；C2 终版内容与回写 ①–⑮ 零矛盾

#### 执行记录（Phase 3 落地证据，2026-08-31）

- `D2-closure.md` 落盘四节：§1 分数复评（完善度 3.0 → 3.5：页面模板层 +1.5 / 交互深度 +1.5 / 微交互 +0.5 / a11y +0.5 / 产品完成度 +0.5，美观度 3.5 维持；五个维持维逐条理由含 `main.tsx:14-15` live 复核）；§2 C2 终版引用式汇总（落式裁定 = 引用式，C2 文档零改动——回写 ①–⑮ 为权威记录，已收口 G-F/G-B1/G-A/G-B2/G-B3/G-C/G-D → 七 plans 映射 + open candidates 14 行台账含 D1 deferred 五项、P2 169、P3 87、门禁豁免基线索引）；§3 复刻页清单 26 张（live grep：mock 端点标识 AntdPro 8/Cal 10/Linear 11/Notion 8/Airtable 5/Stripe 5 = 47，复刻 e2e 151 条 live grep 校准——修正起草期 cal visual 12→3 口径误植与总数 152→151）；§4 四工作线终态 + 15 门禁终态清单。
- 执行期计数勘误（live grep 复核）：`cal-replica-visual.spec.ts` 实测 3 条（roadmap P3a 记录的 12 为 mock 单测数，§3 表已按 live 口径登记）；复刻 e2e 总数 live 校准为 151（六应用 127 + sundial visual 24）。

### Phase 4 - owner docs / 日志同步与 roadmap 收口

Status: completed（items 1–4 全部完成；item 4 于 closure audit 通过后执行）

#### 执行记录（Phase 4 收口验证，2026-08-31）

- 六项全量验证由执行 session 本轮独立重跑（非沿用 prior session 记录）：`pnpm typecheck` 37/37、`pnpm build` 37/37、`pnpm lint` 37/37、`pnpm test` 68/68 任务全绿、`pnpm check` exit 0（新门禁输出 "No new unregistered UI consistency gap instance"，豁免基线 399 实例 / 116 文件 / 30 条豁免常量与注册值逐项一致）、`pnpm test:scripts` 10 files / 68 tests 全绿。
- 日志收口记录与 index.md 落字说明（`docs/logs/2026/08-31.md` Phase 4 条目）经执行 session 逐项核对与 live 状态一致后确认有效。
  Targets: `docs/backlog/ui-review-roadmap.md`（Phase Status 区）、`docs/logs/2026/08-31.md`、`docs/index.md`（如需）

- Item Types: `Proof | Follow-up`

- [x] 日志收口记录（`docs/logs/2026/08-31.md`）：门禁落地清单 + 豁免基线索引 + 验证结果 + D2-closure.md 链接
- [x] `docs/index.md` 导航登记 D2-closure.md（若该文档在 ui-review 产出导航义务范围内则同步；否则在日志落字说明为何不需要）
- [x] 收口全量验证执行并记录输出摘要（`pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` / `pnpm check` / `pnpm test:scripts`；全量验证的 Closure Gate 归属不变——本项为收口执行与留痕动作，Minimum Rule 18）
- [x] roadmap Phase Status D2 → `done`（**仅在独立 fresh session closure audit 通过后执行**；执行 session 不得自审、不得以 self-audit 或 human-gate 占位替代；audit 证据记入本 plan Closure 区与日志）

Exit Criteria:

- [x] 日志与（如需的）索引更新落盘；六项全量验证命令全绿且输出摘要已记录
- [x] roadmap D2 状态变更附 closure audit 证据链接；audit 未通过则保持 `todo` 并在本 plan 记录阻塞项

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent fresh session `ses_fa9487dffffeYh4IFzDY4MMfba`（general 子 agent，2026-08-31）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed: 无 Blocker/Major；8 Minor 全部随共识修复（详见顶部 Plan Status 注记）——含候选 B 过时例证（`'+ 添加列'` 已迁移 i18n）与两类边界（`t defaultValue` 回退 / dev warn 串）前置到 Phase 1 裁定、候选 D include 范围补 `apps/`、`showcase-env.ts` 行号漂移标注（R3 时点 219 → live 229）、R3 §3 口径改「7 行表格覆盖 8 个批次标签」、D1 计数改「七个 plans（六项能力收口）」、commit 格式引用改「Cross-Cutting 1 + Rule 4」、Phase 4 Item Types 改 `Proof | Follow-up` + 验证归属澄清（Minimum Rule 18）、候选池统一测试先行注记
- Reviewer live 核验记录（摘）：check 主链 14 门禁逐一比对一致；`rules.mjs` 规则模型与 A–D 零既有重叠；styling suspects 仅 `bare-data-slot-selector`、i18n-keys 仅 key 存在性均实证；`OVERSIZED_EXEMPTIONS` 先例实证；复刻页 26 张（40 张 schema 总数）实证；R2 族表 ①–⑩、P2 裁决 3+169、P3 §5 声明实证；C2 回写 ①–⑮ 齐备；roadmap D2 唯一 `todo` 实证；D1 五项 deferred 触发条件与源 plan 逐字一致；门禁 A/C 既有命中点 live 实证（graph styles.css / kanban / gantt.css；map/wizard/scada-editor-canvas）

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量验证归此处（Minimum Rule 18）。

- [x] Phase 1 终审表四态零缺项（10 族 + R3 §3 的 7 行清扫记录全覆盖）
- [x] Phase 2 入选门禁全部落地注册且有先红后绿测试；落选候选 deferred 终态落字零静默
- [x] `pnpm check` 零新增未登记命中；豁免基线每条有 R2/R3 裁决回链
- [x] `D2-closure.md` 四节齐全且全部计数 live 复核
- [x] owner docs / 日志同步完成（roadmap D2 状态收口 + 日志记录）
- [x] 本 plan 零 `packages/` 产品代码改动（若执行期证明某门禁必须改产品代码才能零命中，须先按 scope change 显式修订本 plan，不得静默扩张）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（含新增门禁）
- [x] `pnpm test:scripts`

## Deferred But Adjudicated

> Phase 1/2 执行期落字；以下为起草时预登记槽位（Phase 1 可修订，但零静默丢弃红线不变）。

### 未入选门禁候选（若有）

> Phase 1 终审结果：候选池 4 项（A/B/C/D）全部入选落地，**无落选候选**（本槽位空置，零静默丢弃红线满足——Phase 1 终审表即逐候选归类证据）。R3 §3 清扫记录中 `not gate-able` 批次（①②④⑤⑥⑧⑨）归类理由见 Phase 1 终审落字第二节，属「静态不可判定」而非延期，无触发条件，Successor Required: no。

- Classification: `optimization candidate`（无实例——本节保留模板槽位）
- Why Not Blocking Closure: Phase 1 终审逐条落字（静态不可判定 / 误报率不可接受 / 已有既有门禁覆盖等）
- Successor Required: yes（触发条件出现时重评）/ no（终审落字）
- Successor Path: D2-closure.md open candidates 台账（+ 触发条件）

### D1 deferred 五项（overflow 收纳 / 个人视图偏好存储 / fill-handle 选区 / 动态列 / peek 联动）

- Classification: `optimization candidate`（维持各源 plan 终态裁定，本计划不重开）
- Why Not Blocking Closure: 触发条件均为「出现真实消费页/诉求」，当前零消费页（D1 产品化 plans Deferred 区 live 实读）
- Successor Required: yes（各项源 plan 已登记 successor path）
- Successor Path: 各源 plan Successor Path 原文；台账登记于 D2-closure.md C2 终版节

## Non-Blocking Follow-ups

- 门禁豁免基线实例的修复（P2 169 条候选中与本计划门禁同源者）——归后续独立裁决，触发 = 修复候选被立项
- 对标分数复评中「维持」维度的下轮复评——触发 = 下一轮 roadmap 级 UI 专项立项

## Closure

Status Note: completed（2026-08-31）。四 Phase 全部执行完毕：Phase 1 终审表（10 族 + R3 §3 七行八批次）四态零缺项；Phase 2 门禁 `check:audit-ui-consistency-gaps` 落地主链第 15 位（四规则 + 豁免基线 399 实例/116 文件/30 条常量 + 17 条先红后绿测试 + 17 fixtures 三态）；Phase 3 `D2-closure.md` 四节落盘；Phase 4 owner docs/日志同步 + 六项全量验证（typecheck/build/lint 37/37、test 68/68、check exit 0 零新增未登记命中、test:scripts 68/68）+ roadmap D2 `planned` → `done`。全 plan 零 `packages/` 产品代码改动。

Closure Audit Evidence:

- Auditor / Agent: independent fresh session `ses_fa898977cffezFLkRTqXoP4xJx`（general 子 agent，2026-08-31，Fresh Context 输入 = plan + diff summary + verification output）
- Evidence: 1 轮 `VERDICT: APPROVED — zero Blocker, zero Major`（1 Minor 随共识修复：fixtures 计数 15→17 live 复核勘误，落 plan Phase 2 执行记录与日志；2 Informational 在案：目录级豁免 governance tradeoff 沿 OVERSIZED_EXEMPTIONS 先例、测试分类口径差异，均无需返工）。审计独立复核八项：① 零产品代码红线（git status/diff 确认 packages//apps/ 零改动）；② 四规则 + 30 条豁免逐条含 reason + R2/R3 裁决回链、`[exempt]` 打印不翻转 exit code、fail-fast 语义实证；③ `pnpm check:audit-ui-consistency-gaps` exit 0 与基线 399/116/30 逐位一致 + `pnpm test:scripts` 68/68 独立重跑；④ Phase 1 终审表完备性；⑤ D2-closure.md 四节 + 抽查（复刻页 26/40、端点标识 47、复刻 e2e 151、15 门禁清单与 package.json 逐一对齐）全部 live 复核通过；⑥ Phase 4 执行与审计前协议状态正确（roadmap 未提前翻转）；⑦ plan Status 一致性；⑧ Deferred 零静默丢弃。

Follow-up:

- 门禁豁免基线实例的修复（与 P2 169 条候选同源者）——归后续独立裁决，触发 = 修复候选被立项（plan Non-Blocking Follow-ups 原文）；D2-closure.md §2 open candidates 台账（14 行）为权威登记处，无 remaining plan-owned work。
