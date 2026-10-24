# 732 审计修复 R2·R2.10：契约补测—platform 族（P1-MA4.4-007/008/009）

> Plan Status: active
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R2.10（MR2.0/plan 713 展开）；`docs/audits/2026-10-21-2001-arm2-MA4.4-designer-office-tests.md` §P1-MA4.4-007/008/009（各含最小补强规格）；owner doc `docs/architecture/styling-system.md`（007 tokens↔preset 闭合承诺）
> Related: bug 19 家族（008 已复发一次 d5ae387）/ bug 118 姊妹例（009 diff-view 有回归测试 code-editor 无）；先例 plan 723-731（同构契约补测链）
> 编号 runway：731 为 R2.9（本线）；732 本 plan；ARC 线从 733 起避开

## Purpose

三条 platform 族契约补测：007 theme-tokens↔tailwind-preset **跨包变量集闭合**（preset 消费的每个 `var(--x)` 在 tokens 中存在——两侧各有测试但闭合命题无任何一方守护，删 token 全宿主静默透明/无影零红灯）；008 code-editor label 转发家族（bug 19 家族已复发一次——toolbar-button `render={<span/>}` + `nativeButton={false}` 单防线，wrap:true 内禁 button 契约零断言）；009 code-editor 受控值「模型→编辑器」方向（回声闩与选区保持零哨兵——闩失效光标跳文末不会红）。三 finding 回填 `closed`。

## Current Baseline（2026-10-24 live，HEAD `40b1f0170` 实测）

- **007**：`packages/tailwind-preset/src/index.ts`（backgroundColor/borderRadius/boxShadow 映射消费 `var(--surface-ghost/highlight/secondary)`、`var(--radius-xl/lg/md/sm)`、`var(--shadow-xs..xl)`、`var(--shadow-primary-sm/md)`）；tokens 定义主源 `packages/theme-tokens/src/styles.css`（5 主题块，--surface-ghost :81/:194/:263/:327/:394 等；apps/playground/src/styles.css 仅 @import + 稀疏覆写——review R1 B1 勘正）；theme-tokens 测试对 preset 消费变量 0 pin；scripts/ 无交叉校验。
- **008**：`packages/flux-code-editor/src/code-editor-renderer/toolbar-button.tsx`（`render={<span/>}` + `nativeButton={false}` 单防线）；`code-editor-renderer.tsx` 定义 `wrap: true`（:539）+ label slot（:54/:298）+ aria-labelledby→contentAttributes（:267-278）。测试中 labelable/按钮标签断言 0 命中。
- **009**：`packages/flux-code-editor/src/use-code-mirror.ts:103-114`（外部 value→editor 同步 effect，`currentDoc !== incoming` 比较为回声闩）；全套件仅 1 处 rerender 不换 value；`state.selection` 断言 0 命中；bug 118 在 diff-view 有回归测试、code-editor 侧无。
- roadmap R2.10 行 `todo`（:107）；arm2-index :161/:162/:163（007/008/009）状态 `open`、修复列 R2.10。

## Goals

- 三条契约测试落地（跨包闭合 unit 1 + code-editor unit 2），各带红证。
- 三 finding 回填 `closed`；roadmap R2.10 翻转。

## Non-Goals

- 不改任何实现代码（补测行纪律——008/009 现实现守约）；不补 owner doc 契约记载缺口（可另行登记）；不处理 MA4.4 其余 finding；并发线隔离。

## Scope（必填节）

### In Scope

- `packages/tailwind-preset/src/closure.test.ts`（新建，007——preset 消费变量 ↔ styles.css 定义闭合）
- `packages/flux-code-editor/src/code-editor-renderer/toolbar-button.test.tsx`（新建，008）
- `packages/flux-code-editor/src/use-code-mirror-controlled.test.tsx`（新建，009）
- `docs/audits/arm2-index.md` 回填 + daily log + roadmap R2.10 翻转（激活/收口两提交）

### Out Of Scope

- 实现代码变更；R2.11-R2.15 与 R3.x；并发线（ARC WIP）。

## Failure Paths

| 可测场景编号  | 触发                                                          | 行为                                                 | 可重试 | 用户可见表现 |
| ------------- | ------------------------------------------------------------- | ---------------------------------------------------- | ------ | ------------ |
| api-shape     | 测试 API 形状与规格不符（CodeMirror harness/renderHook 装配） | 以既有同类测试先例校正规格，plan 补记                | 是     | 不适用       |
| closure-scope | 007 解析出非 `var(--x)` 形态映射（字面量/函数）               | 跳过非变量映射仅断言变量形态映射，plan 补记口径      | 是     | 不适用       |
| flake         | 009 CodeMirror 在 jsdom 下测量依赖                            | 沿既有 code-editor 测试的 CodeMirror stub/装配惯用法 | 是     | 不适用       |

## Test Strategy

本档选择：**必须自动化**——红证 = 临时变异：007 删 styles.css 的 `--surface-ghost` 定义 → 闭合断言红（审计判别原文「删 token 必挂」）；008 toolbar-button `render={<span/>}` 改回 `render={<button/>}`（d5ae387 回归体）→ label 内无 button 断言红；009 删 use-code-mirror 同步 effect（:104-115 含回声闩——闩单独删不判别，整体删除为选定变异面，非逐字审计变异）→ 内容更新断言红。判别机制（Rule 13）：各变异即审计点名的缺陷/回归面本体。

## Execution Plan

### Phase 1 - 三测试落地（各先红后绿）

Status: planned
Targets: 三测试文件

- Item Types: `Proof`

- [ ] T1（007，closure.test.ts，跨包 import + fs 读 tokens 主源）：经 `nopTailwindPreset.theme!.extend!` 访问 backgroundColor/borderRadius/boxShadow 映射（review R1 M1：baseThemeExtension 模块内私有，无直接导出；惯用法 index.test.ts 先例）→ 收集全部 `var(--x)` 名 → fs 读 `packages/theme-tokens/src/styles.css`（`new URL('../../theme-tokens/src/styles.css', import.meta.url)`，styles.test.ts:5 fs 惯用法先例）断言每名有定义（≥1 出现即满足，review R1 m3）。红证：**M-A** 删 `--surface-ghost` 全部主题块定义（5 处全删，或按 m3 口径断言 ≥1 语义下任一残留即不红——取全删口径）→ 红。
- [ ] T2（008，toolbar-button.test.tsx）：渲染 ToolbarButton 于包裹 label 内 → 断言 label 内无 `<button>` 后代（span 渲染）+ ToolbarButton aria/onClick 透传；再经 CodeEditorRenderer 集成断言 label 关联面（`<label>` 为 FieldFrame 根标签 field-frame.tsx:201——toolbar 按钮 :463/:478 为其后代；harness 先例 code-editor.integration.test.tsx——review R1 m2）。红证：**M-B** toolbar-button `render={<span/>}` 改 `render={<button/>}` → 红。
- [ ] T3（009，use-code-mirror-controlled.test.tsx，**真实 EditorView** happy-dom 惯用法（review R1 M2：`__tests__/base-extensions.test.tsx:9-18` 先例——use-code-mirror.test.tsx 的 @codemirror mock 无 selection 不可选）；环境= happy-dom 非 jsdom）：装配 useCodeMirror（containerRef 挂载）→ 初始 'A' → rerender 换 'B' → editorView 内容 'B'；置光标 head=1 → rerender 换同长 'C' → 内容 'C' 且 `state.selection.main.head` 保持 1（选区保持语义）。红证：**M-C** 删 :104-115 同步 effect（含 :110 回声闩——review R1 m1：闩单独删除不翻红〔同长替换 head 保持〕，整体删除为选定变异面）→ 内容 stale 红。

Exit Criteria:

- [ ] 三测试绿证 + 三红证留痕（实测计数填入；变异复员，实现文件 diff 空）
- [ ] tailwind-preset + flux-code-editor + ui（如涉）套件全绿（pnpm --filter 正确 cwd 口径，计数实测）

### Phase 2 - 索引回填与收口

Status: planned
Targets: arm2-index、roadmap、daily log

- Item Types: `Proof`

- [ ] arm2-index 三行回填：:161（007）/:162（008）/:163（009）→ `closed` + 注记；Last Updated 滚动
- [ ] roadmap R2.10 `planned`→`done` 翻转（IN closure commit；激活提交先行 `todo`→`planned`）

Exit Criteria:

- [ ] arm2-index 三行状态与注记实测一致（open 39→36）；roadmap R2.10 行 `done`（收口提交内）
- [ ] daily log R2.10 条目在场

## Closure Gates

- [ ] 全量门禁：typecheck / build / lint + test（任务数以实测为准，review R1 m4：以 turbo 输出 Tasks: N successful 计）
- [ ] `pnpm check` 零新增红
- [ ] 三红证全部复员（实现文件 `git diff HEAD` 空）
- [ ] 独立 closure audit（fresh sub-agent，输入=plan+diff summary+验证输出）：三 finding 闭环判定、红证判别力复核（auditor 独立重演至少 2 个变异）
- [ ] 收口提交（flip `done` IN commit；记录复核结论）

## Deferred But Adjudicated

- **007 闭合面口径**（review R1 B1 勘正）：token 定义主源 = `packages/theme-tokens/src/styles.css`（5 主题块；apps/playground/styles.css 为 @import 消费面）；flux-renderers-basic/src/styles.css 等不在闭合断言面（按需扩展）。Classification: watch-only residual。Why Not Blocking Closure: 审计最小补强即单一 tokens 主源闭合。Successor Required: 否。
- **008 owner doc 契约记载缺口**（「机制无文档」）：styling-system.md 契约记载补录属文档行工作，不在补测行。Classification: out-of-scope improvement。Why Not Blocking Closure: 测试防线已落地。Successor Required: 否。

## Draft Review Record

- R1（fresh sub-agent agent_38e5462b，2026-10-24）：**FAIL** 0B/1B/2M/4m——**B1 T1 token 文件错置**（apps/playground styles.css 仅 @import+覆写，非主源；主源 packages/theme-tokens/src/styles.css 5 主题块——原样首跑即红、M-A 无处删）；M1 preset 无映射直接导出（经 nopTailwindPreset.theme!.extend! 访问，index.test.ts 先例）；M2 T3 harness 错引（env=happy-dom、mock 无 selection 不可选——真 EditorView 先例 base-extensions.test.tsx:9-18）；m1 同步 effect :104-115+闩单独删不判别（整体删除为选定面）、m2 label 为 FieldFrame 根标签+integration 先例、m3 ≥1 出现语义、m4 门禁计数实测。可行性全核验（17 值纯 var(--x)、vitest infra 具备、M-A/M-B/M-C 判别成立）。随激活落。

## Non-Blocking Follow-ups

- 无（007/008/009 最小补强即全量规格）。

## Closure

- [x] R1 共识路径（reviewer 列明 B1/M1/M2/m1-m4 修复清单）后激活提交（Status→`active` + roadmap R2.10 `todo`→`planned` IN commit）
- [ ] 执行 Phase 1/2 → Closure Gates 全过 → closure audit PASS → 收口提交（Status→`completed`、flip `done` IN commit、记录复核结论于本节）
