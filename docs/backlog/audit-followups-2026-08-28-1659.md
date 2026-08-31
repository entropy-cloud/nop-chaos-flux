# Audit Follow-ups — 2026-08-28-1659 audit（ui-review，multi-audit 双阶段）

> Last Updated: 2026-08-31
> 用途：登记 `docs/audits/2026-08-28-1659-multi-audit-ui-review.md`（mission `ui-review`）的 16 条 P2 发现 + 3 条 P2 观察，保证可追溯（每条含来源审计路径）。
> 路由规则：该审计 0 条 P0、23 条 P1 已全部路由三份 remediation plans——批次一（交互/行为 10 条）`docs/plans/2026-08-31-1941-1-ui-review-p1-interaction-behavior-remediation.md`、批次二（契约/样式漂移 4 条）`docs/plans/2026-08-31-1941-2-ui-review-p1-contract-styling-drift-remediation.md`、批次三（a11y + 测试保护 9 条）`docs/plans/2026-08-31-1941-3-ui-review-p1-a11y-and-test-protection.md`；P2 → 本 backlog。源审计 Audit Status 已按规则标记 `planned`。
> 源审计：`docs/audits/2026-08-28-1659-multi-audit-ui-review.md`（下述 ID 与该文件 §P2 findings / §P2 observations 编号一致）。

## Follow-up Backlog

> 状态标记：`[ ]` 待处理；`[x]` 已收口（附 plan/证据引用）。全部为 polish/hygiene 级，不构成 blocking。

- [ ] **[P2 05-01] batch-bar `useScopeSelector` 未传 `paths`——整 scope 通知粒度**——`packages/flux-renderers-data/src/batch-bar.tsx:39-43`、`hook-subscriptions.ts:222-230`。事实成立（sibling hooks 均传 `paths`），但 equality 函数保证零重渲染，成本为每次 scope 写一次微秒级 selector 重跑。订阅卫生对齐项。（源审计：`docs/audits/2026-08-28-1659-multi-audit-ui-review.md` §P2）
- [ ] **[P2 07-01] 新模块手写 useMemo/useCallback（React Compiler 基线）**——`use-keyboard-bindings.ts:52-90`（6）、`keyboard.tsx:29-105`（2）、`command-palette.tsx:160-205`（1）、`use-table-grouping.ts`（4）、`use-table-selection.ts`（4 useCallback + 7 useMemo）、`dirty-close-guard.tsx:39-54`（3）。Reviewer 裁定：drawer/detail-field 三文件为存量/shadcn 原样文件已剔出范围；`table-virtual-body.tsx:109` 保留（不兼容库 disable 豁免）。批量风格收敛项。
- [ ] **[P2 09-01] result `status` propContract 注册为开放 `string` 而非闭合 union**——`content-renderer-definitions.ts:113-128`。Reviewer 推翻"违反 plan-462 MUST"前提（registration 义务已满足，`check:schema-prop-coverage` 全绿）；残留为同批不一致（kanban 用 union）+ 放弃编译期 typo 捕获。对齐项。
- [ ] **[P2 09-02] result.tsx 模块级 `warnedStatuses` Set + 无条件 prod warn，偏离自身"dev warning"描述**——`result.tsx:15, 39-44`；对照 `keyboard.tsx:66-69`（isDevRuntime）。有界（Set 去重、每个坏值一次）、无功能影响；诊断卫生 + 描述漂移。
- [ ] **[P2 13-01] keyboard 匹配边界：`event.key` 匹配（shift+数字/标点静默不触发；非拉丁布局漏配）、`+` 不可绑定（fail-safe + dev warn）、chord 无 `event.repeat` 过滤**——`keyboard.ts:22-24, 88-100, 80-86`；`use-keyboard-bindings.ts:148-152`。`event.key` 比较是已文档化现行契约（`renderer-interfaces.md:609-611`）；`+` 拒绝已有 dev 诊断。剩余价值：作者侧静默不触发的诊断/文档改进项。
- [ ] **[P2 13-04] 多余的 `(column as unknown as Record<string, unknown>).editable` 双重断言**——`data-schema-validation.ts:160-176`；`schemas.ts:97, 149`；`table-schema-validation.ts:11` 接受 `unknown`。类型卫生，零运行时影响。
- [ ] **[P2 15-01] `warnOnce` 无 dev gate；editable-cell 两条 `gd-*` warn 生产可达**——`warn-once.ts:4-10`；`table-editable-cell.tsx:37-43, 50-56`（render 无条件触达）；对照 `table-body-row-rendering.tsx:432`、`use-table-grouping.ts:55-58`（有 gate）。Reviewer 注：`pivot-renderer.tsx:26-41` 本地 warnOnce 同样无 gate（全仓口径）。生产 console 噪音治理。
- [ ] **[P2 19-02] keyboard.tsx `when` 门 `catch { return false }` 吞求值错误零可观测**——`keyboard.tsx:94-102`；同文件 `warnOnce`（:79-85）与 dispatch 失败 warn（:121-131）即为标准。fail-closed 语义正确；一行 dev-warn 修复。
- [ ] **[P2 19-03] batch-bar `handleClear` 以 `void` 丢弃 capability `invoke` 结果**——`batch-bar.tsx:97, 102`；`component-handle-core.ts:38-42`。Reviewer 证实两个真实目标（`crud-renderer-state.ts:347-349`、`use-table-handle.ts:51-55`）同步且恒 `{ok:true}`，失败场景当前不可达。加 `ok:false` warn 仅为前瞻。
- [ ] **[P2 23-03] keyboard.test.ts:206 标题/断言不匹配（"keeps unrelated progress alive" vs `{status:'idle'}`）**——idle 是正确行为（`keyboard.ts:209-217` 手工 trace + 行内注释自纠）；缺正向"filter keeps gated-out binding alive"用例。标题修正 + 一条正向测试。
- [ ] **[P2 23-04] button disabled-anchor 测试的 `onClick` spy 从未接线——`not.toHaveBeenCalled()` 空真**——`button-primary-and-anchor-disabled.test.tsx:61, 74, 93, 96`；三条承重断言（href 移除 / aria-disabled / pointer-events）有效。两行死代码：接线或删除。
- [ ] **[P2 14-01] `resetWarnedKeysForTests()` 死代码（零调用方）；"warned exactly once"断言隐式依赖文件内顺序**——`warn-once.ts:12-14`；forks pool 跨文件隔离，当前无 flake。删除或 beforeEach 调用。
- [ ] **[P2 14-02] `expandableWhen` 求值异常降级路径（catch → expandable）无测试**——`table-row-leading-cells.tsx:69-77`（显式设计注释）；`table-expandable-when.test.tsx` 只覆盖 falsy/absent。良性 fail-open；约 3 行测试。
- [ ] **[P2 14-04] console.warn spy `mockRestore` 不在 `finally`；无全局 `restoreMocks`**——`batch-bar.test.tsx:125-151`、`table-group-render.test.tsx:190-207`；`vitest.shared.ts:24-36`。仅套件已红时泄漏（可诊断性，非假绿）。沿 `keyboard-bindings.test.tsx:172-178` try/finally 模式。
- [ ] **[P2 20-06] editable-cell 导航态 span 可聚焦无 role（显式文档化 tradeoff）**——`table-editable-cell.tsx:431-454`（:433 注释 + eslint-disable）；`renderer-interfaces.md:948-952` Decision 6 裁定 Enter/F2 语义已落地。键盘全可达、无错误语义播报；role 提示 polish。
- [ ] **[P2 20-09] hotkey 面板无 `aria-keyshortcuts` 锚点（advisory）**——`keyboard.tsx:149-156`（零 DOM 是文档化契约，`renderer-interfaces.md:635-636`）、`command-palette.tsx:331-365`（关闭态结构上无锚点）。无 WCAG SC 要求 hotkey 可发现性；半数诉求会违反零 DOM 设计。仅观察。

### P2 observations（审计 agent 附带观察，子 finding 级）

- [ ] `flux-react/src/defaults.ts:16-28`——默认 fetcher 的 `/api/` if 分支两侧返回值相同（死条件）+ 缩进错位（对照 :19/:25）。`status: 0` 成功语义与 `request-runtime.ts:431` 对齐系有意为之。仅清理。（源审计：`docs/audits/2026-08-28-1659-multi-audit-ui-review.md` §P2 observations）
- [ ] （watch item，未立案）`find-ui-consistency-gaps.mjs` CJK 规则的行级 `description:`/`defaultValue` 过滤是行粒度启发式；live-tree 探针当前未发现被抑制的用户可见 CJK 文案。门禁演进时保持观察。（源审计同上）
- [ ] （process note）plan→export-surface 可追溯性：分支两处 index-export 变更（`option-row` → plan 1333-2、ui `dirty-close-guard` → plan 0419-1）由 mission 枚举清单之外的 plans 覆盖。全部变更均有覆盖，但未来审计应从实际 index diff 反向映射而非手工 plan 清单。（源审计同上）
