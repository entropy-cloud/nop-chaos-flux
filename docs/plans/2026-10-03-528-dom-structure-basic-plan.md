# 528 flux-renderers-basic 渲染器 DOM 结构契约审计与整改

> Plan Status: completed
> Last Reviewed: 2026-10-03
> Source: `docs/architecture/renderer-markers-and-selectors.md`（DOM 结构契约）、`docs/backlog/dom-structure-audit-roadmap.md`（W1）、`docs/audits/dom-structure-checklist.md`
> Related: `docs/plans/2026-10-03-527-dom-marker-shared-infra-plan.md`（前置：`data-renderer` 注入与共享 helper）

## Purpose

把 flux-renderers-basic 全部 renderer type 的 DOM 结构收口到契约 6 维（D1 根身份 / D2 根自然性 / D3 包装付租 / D4 区域 slot / D5 无自带 frame；本包无 canvas 引擎容器，D6 预期全部 n-a），产出逐组件审计卡并冻结为包级 `dom-structure` 契约测试。本包另负责裁定 **portal/surface 口径**（挂载态三件套确认 + 关闭态豁免），供后续包引用。

## Current Baseline

- 组件清单（type → `packages/flux-renderers-basic/src/` 文件）：page → `page.tsx`；container/flex → `container.tsx`/`flex.tsx`；fragment/loop/recurse → 同名文件（结构性，轻 DOM）；text/button/icon/badge → 同名文件（leaf 单元素）；tabs → `tabs.tsx`（composite）；dialog/drawer/command-palette → `surface-renderer-definitions.ts`（portal surface）；dynamic-renderer/reaction/keyboard/scope-debug → 同名文件（结构/行为/调试）。
- **dialog/drawer portal 内容根已有身份标记**：`packages/flux-react/src/dialog-host.tsx:374-377` 输出 `nop-dialog`/`nop-drawer` + `data-testid` + `data-cid`（cid 经 `use-surface-renderer.ts:240-247`）——唯缺 `data-renderer`，由 527 Phase 1 在 dialog-host 侧补齐后本包只需确认+登记。
- command-palette 为自绘根：`command-palette.tsx:479-480` 已带 `nop-command-palette` 标记；`data-renderer` 落点（AutoRenderer 可达性）待 Phase 1 确认。
- `flex.tsx`、button/icon/badge 无任何 `data-slot`（单元素，预期 D4 豁免）。
- text/icon/badge/button 单元素直出、无包装——本包即 D2 合规范本。
- 盘点未发现本包自带 frame。
- **执行中发现（2026-10-03，D1 通道缺口）**：本包 18 个 type 全部走 `component:` 自定义通道，W0 的 auto 路径注入（`reactComponent:` 专用）实际不可达——已按契约在 `ensureRendererComponent` 增加渲染输出 clone 补章（flux-react，537 测试全绿）：`data-renderer` 由 stamp 补齐至全部 custom 通道渲染器根；`data-cid` 经裁定**不**由 stamp 补（field-frame 唯一性契约要求 cid 单点，input-number.test.tsx 实证双 cid 冲突），继续由既有通道（AutoRenderer/组件手写/FieldFrame 链）提供。该修复为跨包共享能力，W2-W9 直接受益。

## Goals

- 全部 type 六维判定落卡（`docs/audits/dom-structure/<type>.md`），fix/exempt 均带理由
- dialog/drawer 经 W0 注入后确认 portal 根 D1 三件套并登记（预期 pass）；command-palette 的 `data-renderer` 挂点裁定并落地
- 产出 portal/surface 口径（挂载态 vs 关闭态、标记挂点）写回 checklist，供全路线图引用
- `dom-structure` 契约测试冻结包内全部 type 的 D1 三件套与登记过的关键项

## Non-Goals

- 功能契约 18 维审计（component-audit 轮负责）
- 视觉样式、schema 语义、交互行为变更
- 其它包的结构问题

## Scope

### In Scope

- `packages/flux-renderers-basic/src/` 全部 renderer type 的审计卡、整改、契约测试
- `docs/audits/dom-structure-checklist.md` 的 portal/surface 口径补充
- command-palette 根的标记补点（如裁定为 fix，落点在本包 `command-palette.tsx`）
- **Scope change（2026-10-03，执行中发现）**：`ensureRendererComponent` 渲染输出 clone 补章（`packages/flux-react/src/auto-renderer.tsx`）——custom `component:` 通道的 D1 注入缺口，属跨包共享的契约落地修复；发现记录于 Current Baseline，审计卡 18 张均按此通道判定

### Out Of Scope

- `packages/flux-react/src/dialog-host.tsx`（W0 527 负责，本包只确认）
- portal 挂载机制重构（仅补标记）

## Test Strategy

档位选择：`建议有测`——D1 三件套与 portal 挂载态标记为契约测试必修断言（不随档位降级）；其余结构项以审计卡 + focused 断言覆盖。

## Execution Plan

### Phase 1 - 逐组件审计卡

Status: completed
Targets: `docs/audits/dom-structure/*.md`（本包 18 张，已全部落盘）

- Item Types: `Proof`

- [x] 按 6 维逐 type 落卡，含结构图（根 → 首个内容/交互元素逐层归因）——18 张卡落 `docs/audits/dom-structure/`
- [x] dialog/drawer：确认 portal 根三件套（527 host 注入 + 本包契约测试），登记挂载态/关闭态口径
- [x] command-palette：确认 stamp 不可达（输出根为 Dialog 组件树），手动盖章落卡
- [x] flex/button/icon/badge 的 D4 豁免登记（无内部区域）；fragment/loop/recurse/reaction/keyboard structural 豁免落卡

Exit Criteria:

- [x] 包内全部 type 均有卡且六维判定齐全，无悬置（18/18）
- [x] portal/surface 口径文本已写回 `docs/audits/dom-structure-checklist.md`（含 custom 通道 stamp 口径）

### Phase 2 - 整改

Status: completed
Targets: `packages/flux-react/src/auto-renderer.tsx`（通道缺口修复）、`packages/flux-renderers-basic/src/button.tsx`、`packages/flux-renderers-basic/src/command-palette.tsx`

- Item Types: `Fix | Proof`

- [x] D1 通道缺口：`ensureRendererComponent` 对 custom `component:` 输出 clone 补章 `data-renderer`（Fragment 跳过；组件自带值不覆盖；data-cid 不补章避免双层 cid）——flux-react 新增 2 用例（custom stamp + fragment untouched），537/537；forwardRef 型组件（gantt）经 exotic `.render(props, ref)` 通道兼容
- [x] command-palette 可见面板手动补 `data-renderer="command-palette"`（portal 通道豁免）
- [x] button 根补 `nop-button` class（两分支）+ anchor 分支补 `data-slot="button"`；旧"button 无 nop- 标记"测试按新契约更新（widget-markers-contract.test.tsx）

Exit Criteria:

- [x] 每个 fix 项落地且有 focused 断言
- [x] 既有 basic 包测试无回归（69 文件 643/643；flux-react 59 文件 537/537）

### Phase 3 - 契约测试冻结

Status: completed
Targets: `src/__tests__/dom-structure-contract.test.tsx`

- Item Types: `Proof`

- [x] `dom-structure` 契约测试：默认配置渲染包内全部 type——page 根 + 9 个 inline type 三件套 + button anchor 分支身份 + structural 豁免 + null-render 豁免 + dialog/drawer/command-palette portal 根（16 用例全绿，使用 527 helper）

Exit Criteria:

- [x] 契约测试落位并通过
- [x] `docs/backlog/dom-structure-audit-roadmap.md` W1 状态回写就绪（closure audit 后置 done）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子代理 R1（fresh session）
- Verdict: pass（Round 1 issues → 2 项 Major 已修订：dialog/drawer 基线改为"已有 nop-*/data-cid、缺 data-renderer 归 W0"、command-palette 引用修至 command-palette.tsx:479-480；Round 2 复核通过）
- Rounds: 2
- Findings addressed: ①重写 dialog/drawer 基线与 Phase 2（确认+登记而非补标记）②修正 command-palette 引用位置 ③roadmap W1 描述同步

## Closure Gates

- [x] 全部 type 审计卡六维收口（pass/fix/exempt）——18/18 卡
- [x] 全部 in-scope fix 已落地并有 focused proof（stamp 通道/button/command-palette）
- [x] `dom-structure` 契约测试冻结（16 用例）
- [x] portal/surface 口径已写回 checklist（含 custom 通道 stamp 口径）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] owner docs 同步核对完成
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（exit 0）
- [x] `pnpm build`（exit 0）
- [x] `pnpm lint`（exit 0）
- [x] `pnpm test`（全量 exit 0；flux-react 537/537、basic 643/643、report-designer-renderers 206/206）
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

（暂无）

## Closure

Status Note: 2026-10-03 收口。18 type 审计卡全落盘；执行中发现并修复 D1 通道缺口（ensureRendererComponent 渲染输出 clone 补章 data-renderer，WeakMap 记忆化 + forwardRef 兼容 + data-cid 不补章裁定）；button/command-palette 身份补齐；16 用例契约测试冻结；portal/surface 与 custom 通道口径回写 checklist。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理（fresh session，agent_fe6c072b）
- Evidence: approved 判定——逐交付物核对 live repo（18 卡、auto-renderer.tsx stamp/WeakMap/exotic render、button.tsx、command-palette.tsx:480、契约测试 16 用例、checklist L17-18）；门禁数字与 plan 声明精确吻合。
