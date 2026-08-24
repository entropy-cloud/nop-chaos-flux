# 00 基线工具证据（typecheck / lint / check / test）

- 执行日期：2026-08-20（本 check mission 启动时，master @ 0078f2a40 + 1 个未提交 docs 修改）
- 执行方式：后台串行链 `pnpm typecheck → lint → check → test`，完整日志 `/tmp/flux-check-baseline.log`
- 对照基线：2026-08-09 DV 全绿基线（`docs/context/project-context.md`：typecheck/build/lint 32/32、单测 10,703/0、`pnpm check` exit 0）

## 结果总览

| 命令             | 结果      | 说明                                                                                                     |
| ---------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` | ✅ exit 0 | 全仓类型检查通过                                                                                         |
| `pnpm lint`      | ✅ exit 0 | 全仓 lint 通过                                                                                           |
| `pnpm check`     | ❌ exit 1 | `check:oversized-code-files` 报 3 个超限文件，见下                                                       |
| `pnpm test`      | ❌ exit 1 | `@nop-chaos/flux-renderers-basic#test` 1 个用例失败，见下；turbo 因单包失败中止，其余包多数为 cache 命中 |

## 偏离 1：`check:oversized-code-files` 新红（未注册）

复跑核实（2026-08-20，`node scripts/check-oversized-code-files.mjs` 直接执行）后的**准确归因**：

```
ERROR（exit 1 的真实原因，>700 未豁免）:
  - packages/flux-renderers-layout/src/wizard-renderer.tsx: 716
豁免（[exempt]，不计失败）:
  - packages/flux-i18n/src/locales/en-US.ts: 1368
  - packages/flux-i18n/src/locales/zh-CN.ts: 1366
WARN 档（500-700，不致失败）:
  - apps/playground/src/complex-pages/shared/showcase-env.ts: 644（2026-08-19 引入）
  - apps/playground/src/complex-pages/shared/mock-backend.ts: 502（2026-08-19 引入）
  - scripts/audit/shared.mjs: 673（2026-08-09 已存在）
```

- 真实新红为 `wizard-renderer.tsx`（现 715 行，脚本计 716）：最后改动 2026-08-12（commit 4152e4840，component-audit-round2），**晚于 DV 基线（2026-08-09，当时 `pnpm check` exit 0）**，属 DV 之后引入的未注册 ERROR 级超限回归。该文件属 11 号审计范围（见 `11-flux-renderers-layout-check.md` F-04 相关 wizard 发现）。
- 本报告初版曾误把 showcase-env/mock-backend/shared.mjs 三个 WARN 档文件当成 ERROR 原因（提取日志时 grep 子串 `red` 误匹配了路径中的 "sha**red**"）；34 号审计（`34-apps-playground-check.md` F-09）对此提出正确质疑，本节已按直接复跑结果修正。两个 playground 文件是 WARN 档新增（非门禁失败项），仅作记录。

## 偏离 2：flux-renderers-basic 单测失败（DV 基线后回归）

- 用例：`src/__tests__/surface-event-ctx.test.tsx > dialog/drawer surface event dispatch ctx (CX-10 / bug-83 family) > resolves the same ${surfaceId} in dialog onConfirm and onClose action args`
- 失败信息：`TestingLibraryElementError: Unable to find an element by: [data-testid="surface-confirm-submit"]`——渲染产物里 dialog 确认按钮缺失（页面 body 只剩空 `page-body`）。
- 同文件另 2 个用例（onConfirm 单独 / drawer onClose）通过；测试文件最后提交 2026-08-07，实现侧回归发生在 DV 基线（2026-08-09，当时全绿）之后。
- 关联背景：`check:audit-event-dispatch-ctx` 门禁（2026-08-09 DG）覆盖此家族；该门禁在 `pnpm lint` 链中通过，说明静态门禁未覆盖此动态行为。
- 责任归属：**已归因**。05 号审计排除 flux-runtime，06 号审计排除 flux-react 渲染路径，12 号审计排除 flux-renderers-form；10 号报告 F-01 给出五步证据链定位 root cause 在 `packages/flux-renderers-basic/src/use-surface-renderer.ts:213-223`——受控 surface X 关闭路径无条件 `surfaceRuntime.close(id)` + `setUserClosed(true)`，对字面量 `open: true`（无表达式可翻转、userClosed 永不复位）造成 dialog 永久卸载不可重开。详见 `10-flux-renderers-basic-check.md` F-01。
- **已解决（2026-08-24 BUILD_VERIFY）**：按 10-F-01 修复方向的契约修订分支落地——采用并行 worktree commit `66476513d`（plan 460 B1 "equal-strength repair"）已裁决的测试修订版（confirm-first 单生命周期捕获 onConfirm/onClose 的同一 `${surfaceId}`，保留 plan 459/460 X-close 拆除语义），该修订此前未落到 master。master 侧 `surface-event-ctx.test.tsx` 与该版对齐后 basic 500/500 绿、全量 `pnpm test` 68/68 绿。见 `docs/logs/2026/08-24.md` BUILD_VERIFY 条目。

## 顺带捕获的运行时警告（供后续包审计入口）

- `flux-renderers-form` 测试日志出现 React 反模式警告：`Cannot update a component (NodeRendererResolved) while rendering a different component (FormRenderer)`（`src/index.test.tsx > formRendererDefinitions - valuesPath and data expressions` 用例）→ setState-in-render 嫌疑，记入 12 号审计入口。
- `flux-renderers-form` `select-remote-search` 测试出现 `Encountered two children with the same key, remote-1`（append/replace 两处）→ 列表 key 重复嫌疑，记入 12 号审计入口。

## 对本次 mission 的意义

1. 各包报告中标 `tooling-confirmed` 的问题以上表为准，不重复展开。
2. 两处偏离（oversized 新红、surface-event-ctx 回归）超出"实现代码静态审查"范围的部分，登记在此作为**跨包事实**，由对应包报告引用。
3. e2e 不在本 mission 重跑范围；已知 3 个 watch-only 终态失败（gantt-perf ×2、kanban-perf ×1）维持 project-context 记录，不视为新发现。
