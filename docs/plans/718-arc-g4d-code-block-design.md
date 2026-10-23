# 718 Arc G4D — 只读高亮 code-block 落点裁决与设计

> Plan Status: completed
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/arc-component-gap-roadmap.md` §5.1 G4 / §7 G4D（roadmap item G4D，`todo`）
> Related: `docs/components/code-editor/design.md`、`docs/components/markdown/design.md`、`docs/backlog/arc-component-gap-roadmap.md` §9 Cross-Cutting 6（依赖硬门禁）

## Purpose

三选一裁决只读高亮 code-block 落点，产出协议并落 owner 文档。纯设计 plan；实现归 G4I。

## Current Baseline（live 核对 2026-10-24）

- 高亮底座已存在三处（roadmap §3）：`code-editor` `colorize` 只读高亮模式（E3 done，`code-editor-renderer.tsx:78-90` 字段契约、`:306-307` 分支、`ColorizeView` 已从 `flux-code-editor/src/index.ts:65` 导出）；`diff-view` 行级 adapter（`flux-renderers-content/src/diff-view/adapters/`）；CodeMirror 语言包（js/ts/json/md/python/sql/html/css/xml/yaml 共十种，`flux-code-editor/package.json:23-31`，审查 m1 校准）。
- `markdown` 渲染器 code fence 仅溢出滚动无高亮（`markdown.tsx:134-145`，ReactMarkdown + remarkGfm，容器 `nop-markdown` overflow 契约在 :138）。
- `docs/components/code-editor/design.md` 与 `docs/components/markdown/design.md` 均在案。
- `flux-renderers-content` 现无 `@nop-chaos/flux-code-editor` 依赖（package.json deps：core/i18n/react/ui）。
- 裁决约束：新 type → matrix 增行 human gate；新增依赖 → `pnpm check`（workspace-manifest-deps）硬门禁 + 论证（roadmap §9 CC6）。

## Goals

- 一票裁决三选一（被拒方理由入决策表）。
- 协议：独立声明场景与 markdown 内嵌场景的 schema 字段、高亮底座绑定、溢出/行号/复制语义、命名 pass、失败路径。
- owner 文档落稿 + 登记。

## Non-Goals

- 不实现（G4I）；不新增新高亮依赖（重用 CodeMirror 语言包）；不动 matrix。

## Scope

### In Scope

- `docs/components/markdown/design.md`：code fence 高亮能力协议 + 决策表。
- `docs/components/code-editor/design.md`：colorize 展示形态指引补注。
- improvement-analysis 登记。

### Out Of Scope

- G4I 实现面；新 type；matrix；diff-view 改动。

## Failure Paths

| 编号                    | 触发                           | 行为                                       | 可重试 | 用户可见表现 |
| ----------------------- | ------------------------------ | ------------------------------------------ | ------ | ------------ |
| fence-unknown-language  | fence 标注语言不在语言包       | 回退纯文本 pre（无高亮），不报错           | —      | 无高亮代码块 |
| fence-highlight-off     | 未声明高亮能力                 | 现状滚动容器，行为零变化                   | —      | 现状         |
| colorize-display-misuse | colorize 声明与 diffValue 并存 | diff 优先（既有分支 `:306-307`），文档写明 | —      | diff 视图    |

## Test Strategy

不适用：纯设计 plan。G4I 承担（必须自动化：fence 高亮/回退/开关均可程序化断言）。

## Execution Plan

### Phase 1 — 落点裁决与协议落稿

Status: completed
Targets: `docs/components/markdown/design.md`、`docs/components/code-editor/design.md`、improvement-analysis

- Item Types: `Decision`

- [x] 裁决（双落点，拒绝新 type）：
  - (a) **独立声明场景 → 复用 `code-editor` `colorize: true` 只读高亮模式**（E3 已落地、`ColorizeView` 已导出）：展示用途在 code-editor/design.md 补指引（lazy 编辑器包络的代价声明），零新 type、零代码。
  - (b) **markdown 内嵌场景 → `markdown` code fence 高亮能力扩展**（schema 字段 `codeHighlight?: boolean`；G4I 在 flux-renderers-content 内以 ReactMarkdown `code` 组件覆写渲染高亮 pre，底座复用 `ColorizeView`——新增 `flux-renderers-content → flux-code-editor` workspace 依赖，G4I 须过 `pnpm check` workspace-manifest-deps 硬门禁并留论证）。
  - 拒绝 (c) 独立只读 type `code-block`：matrix human gate + 与 (a) 语义完全重复（同一底座同一形态，仅名字不同）。
- [x] 协议：`codeHighlight` 字段（默认 false，行为零变化；**粒度 = markdown 渲染器级整文档开关**，审查 m3，per-fence 扩展不预留首版契约）；fence 语言标注 → CodeMirror 语言映射（**别名归一表归 G4I、落 flux-renderers-content 内新模块**，审查 m4；未知语言回退纯文本 pre）；**加载策略裁决（审查 M1）**：ColorizeView 顶层携带 CodeMirror + 语言包（colorize.tsx:1-8），markdown 属默认 bundle 9 family——G4I 须以 **lazy（React.lazy/动态 import）** 接入高亮 pre，未声明 `codeHighlight` 时零增量加载，该条为 design.md 协议显式条款；溢出沿用 `nop-markdown` 容器既有 overflow 契约；行号/复制不做（首版，Arc CodeBlock 的复制按钮由宿主 copy action 承接——与本仓 button by-design 一致）；样式 marker（`data-code-highlight="true"`）。
- [x] 命名 pass：`codeHighlight`（肯定式布尔，camelCase）；拒绝 `highlightCode`（动宾倒置）、`syntaxHighlight`（丢失 code 域限定）、`fenceHighlight`（实现细节入名）。
- [x] improvement-analysis 登记（G4 行，markdown 能力扩展归并条目）。

Exit Criteria:

- [x] 决策表（被拒方理由在案）与协议完整落稿于 markdown/design.md；code-editor/design.md 补展示指引；无"待定"占位。
- [x] 引用的 live 符号（ColorizeView 导出、colorize 分支行号、markdown 容器契约）核对相符；登记条目可检索。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-10-24）
- Verdict: `revised` → 共识达成（零 Blocker / 1 Major / 4 Minor，全部当场采纳）
- Rounds: 1
- Findings addressed: M1 ColorizeView 默认 bundle 重量 → 协议显式条款：G4I lazy 接入、未声明零增量；m1 语言包清单校准十种；m2 markdown.tsx 行号校准 :134-145；m3 codeHighlight 粒度钉死渲染器级；m4 语言别名归一表归属 G4I content 包内

## Closure Gates

> 纯文档 plan，pnpm 四项按 guide 规则删除。

- [x] design.md 裁决与协议完整、与 live repo 事实核对相符
- [x] roadmap §2/§6 G4D `todo`→`done` 回写（与 closure 证据同 commit）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- G4I 实现面（focused 单测/e2e/铁律 3/5/6/8 + 依赖门禁论证）。

## Closure

Status Note: G4D 双落点裁决（(a) 复用 colorize 展示形态 + (b) markdown `codeHighlight` 能力扩展，拒 (c) 新 type）与完整协议落地；closure audit 首轮 approved（0B/0M/3m：引用校准级 2 项 + 提交隔离提醒已遵守）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-10-24）
- Evidence: approved（零 Blocker）：markdown/design.md §2a 裁决表与协议完整（:14-32）、code-editor/design.md 指引落稿（:107）、improvement-analysis G4 行（:236）、live 符号五项复核全中（ColorizeView 导出、colorize 分支 diff 优先实证、容器契约 :138、语言包十种、content 无 code-editor 依赖）、roadmap 对照合规。
