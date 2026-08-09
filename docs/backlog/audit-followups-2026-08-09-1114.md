# Audit Follow-ups — 2026-08-09 11:14 audits（component-audit-round2）

> Last Updated: 2026-08-09
> 用途：登记 2026-08-09 11:14 两轮审计（multi-audit + open-audit，mission component-audit-round2）的 P2/P3 发现，保证可追溯（每条含来源审计文件路径与路由去向）。
> 路由规则：P1 及以上 → remediation plans（`docs/plans/2026-08-09-1140-1-table-column-width-strategy-rework.md`、`docs/plans/2026-08-09-1140-2-close-on-submit-contract-closure.md`）；P2/P3 → 本 backlog（与 P1 同 closure surface 的 P2 已折叠进对应 plan 的 Fix/Proof 项，本表同步登记去向）。

## Follow-up Backlog

### open-audit（`docs/audits/2026-08-09-1114-open-audit-component-audit-round2.md`）

- **[P2-01] H10 comparator 注释声称已比较 `fixedColumnLayout`，实际未比较**（`table-body-row-rendering.tsx:571-616`）——功能安全、注释事实性错误。去向：**折叠进 plan `2026-08-09-1140-1` Phase 3**（Fix：比较器补 `fixedColumnLayout` 比较项或改写注释，与注释一致）。
- **[P2-02] `publishClosedSummary` owner-scope 解析与 sibling 不一致 + use-surface-renderer 两调用点回退链不同**（`surface-runtime.ts:74-89` vs `:56-72`；`use-surface-renderer.ts:340/358/380`）——潜伏契约分叉，当前调用面无实际差异。去向：**待后续批次**（统一三处 owner-scope 解析 `ownerScope ?? parent ?? self` 与两处回退链；影响面窄，不阻塞当前 supported baseline）。

### multi-audit（`docs/audits/2026-08-09-1114-multi-audit-component-audit-round2.md`）

- **[P2-02] closeOnSubmit × hook 失败语义分叉未文档化且零测试**（`surface-runtime.ts:272-285`、`form.tsx:214-226`）——去向：**折叠进 plan `2026-08-09-1140-2` Phase 1**（Fix/Decision/Proof：裁决 (a) AMIS 对齐 / (b) hook 失败不关闭，测试 + 文档钉住）。
- **[P2-03] 「hook 先跑后关闭」顺序契约只有注释声称、断言无法检测反转**（`surface-close-on-submit.test.ts:53-56`）——去向：**折叠进 plan `2026-08-09-1140-2` Phase 3**（Fix/Proof：invocationCallOrder 或等价断言）。
- **[P2-04] 渲染器失败路径测试固定 50ms 延时断言「保持打开」，假绿窗口**（`dialog-close-on-submit.test.tsx:202-205`）——去向：**折叠进 plan `2026-08-09-1140-2` Phase 3**（Fix：同步到失败链终态信号再断言）。
- **[P3-05] `form.tsx` `triggerSurfaceSubmitHook` try/catch 死代码 + triggerHook `{ok:false}` 静默丢弃**（`form.tsx:177-186`）——去向：**折叠进 plan `2026-08-09-1140-2` Phase 1**（与 P2-02 同源修复：消费 triggerHook 返回值、`!result.ok` 时 warn、删除死 catch）。
- **[P3-06] `BUILT_IN_ACTION_DEFINITIONS.openDialog/openDrawer.fieldRules` 遗漏 closeOnSubmit**（`flux-core/src/constants.ts:124-145`）——去向：**待后续批次**（补 `{ kind: 'value', valueType: 'boolean' }` ×2 + constants.test.ts 断言）。
- **[P3-07] action-adapter `as Record<string, unknown>` 恒等冗余转换 ×2**（`action-adapter.ts:249,314`）——去向：**待后续批次**（去掉 cast，可与 `isolate` 同型转换一并清理）。
- **[P3-08] schema 入口 `=== true` vs 消费点 truthy 归一化不一致**（`action-adapter.ts:249/314` vs `surface-runtime.ts:266/278`）——去向：**待后续批次**（消费点改 `=== true` 或 JSDoc 声明仅 `true` 生效）。
- **[P3-09] `surface-close-on-submit.test.ts` notifySpy 未 restore**（`:29`）——去向：**待后续批次**（补 `mockRestore()` 或文件级 `afterEach(vi.restoreAllMocks)`；可随 plan `2026-08-09-1140-2` 执行顺手收口）。
- **[P3-10] quick-reference.md action 表未反映 closeOnSubmit**（`quick-reference.md:647-648`）——去向：**待后续批次**（补 `closeOnSubmit?` 行或指引一句）。

## 备注

- 与 P1 同 closure surface 的 P2/P3 折叠进对应 plan 后，plan 的 `> Source:` 均引用来源审计文件，可追溯性保持。
- 本表零悬挂：每条发现均有来源路径 + 去向（plan 折叠 / 待后续批次）。
