# Audit Follow-ups — 2026-08-09 11:14 audits（component-audit-round2）

> Last Updated: 2026-08-09
> 用途：登记 2026-08-09 11:14 两轮审计（multi-audit + open-audit，mission component-audit-round2）的 P2/P3 发现，保证可追溯（每条含来源审计文件路径与路由去向）。
> 路由规则：P1 及以上 → remediation plans（`docs/plans/2026-08-09-1140-1-table-column-width-strategy-rework.md`、`docs/plans/2026-08-09-1140-2-close-on-submit-contract-closure.md`）；P2/P3 → 本 backlog（与 P1 同 closure surface 的 P2 已折叠进对应 plan 的 Fix/Proof 项，本表同步登记去向）。

## Follow-up Backlog

### open-audit（`docs/audits/2026-08-09-1114-open-audit-component-audit-round2.md`）

- **[P2-01] H10 comparator 注释声称已比较 `fixedColumnLayout`，实际未比较**（`table-body-row-rendering.tsx:571-616`）——功能安全、注释事实性错误。去向：**折叠进 plan `2026-08-09-1140-1` Phase 3**（Fix：比较器补 `fixedColumnLayout` 比较项或改写注释，与注释一致）。
- **[P2-02] `publishClosedSummary` owner-scope 解析与 sibling 不一致 + use-surface-renderer 两调用点回退链不同**（`surface-runtime.ts:74-89` vs `:56-72`；`use-surface-renderer.ts:340/358/380`）——潜伏契约分叉，当前调用面无实际差异。去向：**已收口（plan `2026-08-09-1447-1` Phase 3，landed 2026-08-09）**（`publishClosed` 输入加可选 `ownerScope?: ScopeRef`（向后兼容），三处状态发布解析统一 `ownerScope ?? scope.parent ?? scope`（提取 `resolveStatusOwnerScope` 复用）；use-surface-renderer 三个调用点回退链统一 `declarativeScope ?? node.scope`（cleanup ref 字段 `ownerScope` 更名 `nodeScope` 对齐语义）；focused 测试 `surface-status-publish.test.ts` 4 用例钉住 owner/fallback-parent/fallback-self/声明式统一链 + 既有 surface 测试零回归；`surface-lifecycle-callbacks.md` 新增「Status Path Publication」节）。

### multi-audit（`docs/audits/2026-08-09-1114-multi-audit-component-audit-round2.md`）

- **[P2-02] closeOnSubmit × hook 失败语义分叉未文档化且零测试**（`surface-runtime.ts:272-285`、`form.tsx:214-226`）——去向：**折叠进 plan `2026-08-09-1140-2` Phase 1**（Fix/Decision/Proof：裁决 (a) AMIS 对齐 / (b) hook 失败不关闭，测试 + 文档钉住）。
- **[P2-03] 「hook 先跑后关闭」顺序契约只有注释声称、断言无法检测反转**（`surface-close-on-submit.test.ts:53-56`）——去向：**折叠进 plan `2026-08-09-1140-2` Phase 3**（Fix/Proof：invocationCallOrder 或等价断言）。
- **[P2-04] 渲染器失败路径测试固定 50ms 延时断言「保持打开」，假绿窗口**（`dialog-close-on-submit.test.tsx:202-205`）——去向：**折叠进 plan `2026-08-09-1140-2` Phase 3**（Fix：同步到失败链终态信号再断言）。
- **[P3-05] `form.tsx` `triggerSurfaceSubmitHook` try/catch 死代码 + triggerHook `{ok:false}` 静默丢弃**（`form.tsx:177-186`）——去向：**折叠进 plan `2026-08-09-1140-2` Phase 1**（与 P2-02 同源修复：消费 triggerHook 返回值、`!result.ok` 时 warn、删除死 catch）。
- **[P3-06] `BUILT_IN_ACTION_DEFINITIONS.openDialog/openDrawer.fieldRules` 遗漏 closeOnSubmit**（`flux-core/src/constants.ts:124-145`）——去向：**已收口（plan `2026-08-09-1447-1` Phase 1，landed 2026-08-09）**（补 `{ kind: 'value', valueType: 'boolean' }` ×2 + constants.test.ts 断言块；flux-compiler compile 回归：布尔 `true` 编译零警告、`"true"` 字符串经 `invalid-action-shape` 编译期拒绝 fail-closed）。
- **[P3-07] action-adapter `as Record<string, unknown>` 恒等冗余转换 ×2**（`action-adapter.ts:249,314`）——去向：**已收口（plan `2026-08-09-1447-1` Phase 2，landed 2026-08-09）**（`action-adapter.ts:234/249/298/314` 四处恒等 cast 全数移除，`isolate` 同型转换一并清理，直接读类型化 `invocation.args`）。
- **[P3-08] schema 入口 `=== true` vs 消费点 truthy 归一化不一致**（`action-adapter.ts:249/314` vs `surface-runtime.ts:266/278`）——去向：**已收口（plan `2026-08-09-1447-1` Phase 2，landed 2026-08-09；Decision：保持 adapter 入口 `=== true` 为唯一布尔归一化点）**（消费点 `surface-runtime.ts` ×2 改 `=== true`；`OwnedSurfaceStateBase.closeOnSubmit` JSDoc 声明「仅布尔 `true` 生效」fail-closed；归一化输入矩阵测试 `true`/`"true"`/`undefined` 直接构造 invocation 钉住仅 `true` 触发自动关闭）。
- **[P3-09] `surface-close-on-submit.test.ts` notifySpy 未 restore**（`:29`）——去向：**已随 plan `2026-08-09-1140-2` Phase 3 顺手收口**（`notifySpy.mockRestore()` + `removeSpy.mockRestore()` 已落地，2026-08-09）。
- **[P3-10] quick-reference.md action 表未反映 closeOnSubmit**（`quick-reference.md:647-648`）——去向：**已收口（plan `2026-08-09-1447-1` Phase 1，landed 2026-08-09）**（action 表 openDialog/openDrawer 两行补 `closeOnSubmit?` + 脚注指引 `surface-lifecycle-callbacks.md` §「closeOnSubmit × hook 失败交互（契约）」）。

## 备注

- 与 P1 同 closure surface 的 P2/P3 折叠进对应 plan 后，plan 的 `> Source:` 均引用来源审计文件，可追溯性保持。
- **本表零悬挂终态**：5 条「待后续批次」条目（open-audit P2-02 + multi-audit P3-06/07/08/10）已全部由 plan `2026-08-09-1447-1` 收口（2026-08-09，全量验证 typecheck/build/lint 32/32 + test 59/59 + check exit 0）。
