# Flux 模块代码检查路线图（flux-check-roadmap）

> 创建：2026-08-20
> 性质：长期、只读的包级实现代码问题普查。**全程不修改任何产品代码**，只产出问题报告。
> 本文件是本次 check mission 的唯一状态源；「批次与状态」表是全文件唯一动态区。

## 目的

对 `packages/` 下全部 36 个包与 `apps/playground` 的实现代码做系统性问题检查，回答：**每个模块的实现代码里存在哪些正确性缺陷、契约违规、健壮性/性能/可维护性隐患**。检查结果逐包落盘到 `docs/audits/check/`，为后续修复 plan 提供输入。

## 非目标

- **不做任何修复**：不修改 `packages/`、`apps/` 下的任何文件；P0/P1 也只记录，修复走后续独立 plan。
- 不替代 `docs/backlog/component-audit-roadmap.md` 的逐组件 18 维契约审计（那是"审计+自动修复"mission）；本路线图是**包级实现问题普查**，粒度为包 → 关键文件 → 具体行。
- 不重跑全量 e2e（已有 2026-08-09 DV 基线）；单测仅作基线证据，不逐用例诊断。
- 不检查 `dist/`、测试文件本身的质量（除非测试暴露出实现问题）。

## 检查维度（8 维）

| #   | 维度          | 检查内容                                                                                                                                                                 |
| --- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | 正确性        | 边界条件、空值/undefined 处理、逻辑错误、日期/数字/字符串处理错误、竞态条件                                                                                              |
| D2  | 契约合规      | `RendererComponentProps`（props/meta/regions/events/helpers）读取方式；禁直接访问 store；禁绕过标准 hooks；禁裸 HTML（`@nop-chaos/ui` 已提供时）；`RendererEnv` 扩展规范 |
| D3  | React 19 实践 | 无谓 `useCallback`/`useMemo`；`useEffect`+`setState` 镜像（应为渲染期推导）；依赖数组错误；监听器/定时器/订阅未清理（内存泄漏）；effect 中缺竞态守卫                     |
| D4  | 样式契约      | 布局渲染器只发 marker 类（禁硬编码 `gap-4`/`flex`/`p-4`/`grid`）；widget 渲染器自完整样式；禁 BEM；`cn()` 合并；`stack-*`/`hstack-*` 别名                                |
| D5  | 错误处理      | Promise/async 未捕获、错误吞没（空 catch）、`JSON.parse` 无守卫、外部数据未校验、fallback 缺失                                                                           |
| D6  | 性能          | 不必要的重渲染（不稳定引用/缺 selector）、O(n²) 热路径、大列表无虚拟化、重复计算                                                                                         |
| D7  | i18n          | 用户可见文案硬编码中文/英文、i18n key 缺失或未使用                                                                                                                       |
| D8  | 结构          | 超 500 行文件（对照 `check:oversized-code-files` 注册红名单，不重复上报已注册项）、明显死代码、重复实现                                                                  |

## 严重级别

| 级别    | 定义                                               | 置信要求                                         |
| ------- | -------------------------------------------------- | ------------------------------------------------ |
| P0 缺陷 | 当前即会产生错误行为、崩溃、数据丢失               | 必须给出可复现的推理链（输入 → 路径 → 错误结果） |
| P1 隐患 | 特定条件下出错：竞态、边界输入、资源泄漏、并发卸载 | 条件+后果都要写清                                |
| P2 风险 | 违反项目契约（D2/D4）、性能隐患、可维护性坏味道    | 引用契约文档条目                                 |
| P3 提示 | 命名、注释、轻微重复                               | 一句话即可                                       |

## 报告规范

- 路径：`docs/audits/check/NN-<pkg>-check.md`（NN 见下表）。
- 每条 finding 必须包含：`file:line` + 代码摘录（≤10 行）+ 问题说明 + 影响 + 修复方向（文字描述，不出 patch）。
- **反误报纪律**：上报前必须核对真实调用路径；与 `docs/logs/` 注册的既有红名单（如 oversized 既有豁免）比对，已注册债务不重复上报（可引用）；拿不准的标 `suspect` 并说明不确定点。
- 报告模板：

```markdown
# <NN> <pkg> 实现代码检查报告

- 检查日期：YYYY-MM-DD
- 范围：<src 文件数 / 行数>，排除 _.test._ 与 **tests**
- 结论概览：P0 xN / P1 xN / P2 xN / P3 xN（一句话总评）

## P0 缺陷

### F-01 <标题>

- 位置：`packages/<pkg>/src/xxx.ts:L123`
- 证据：<代码摘录>
- 问题/影响/修复方向

## P1 隐患

## P2 风险

## P3 提示

## 检查过程记录（读了哪些关键文件、用什么 grep 交叉验证）
```

## 批次与状态

> 状态流转：`todo` → `checking` → `done`。一个包 = 一份报告。完成批次后更新本表。

| #   | 模块                                      | 批次               | 规模(行) | 报告                                       | 状态 |
| --- | ----------------------------------------- | ------------------ | -------- | ------------------------------------------ | ---- |
| 00  | 基线工具证据（typecheck/lint/check/test） | 基线               | -        | `00-baseline-tooling.md`                   | done |
| 01  | flux-core                                 | A 编译基础层       | 7460     | `01-flux-core-check.md`                    | done |
| 02  | flux-formula                              | A                  | 3418     | `02-flux-formula-check.md`                 | done |
| 03  | flux-compiler                             | A                  | 7734     | `03-flux-compiler-check.md`                | done |
| 04  | flux-action-core                          | A                  | 2005     | `04-flux-action-core-check.md`             | done |
| 05  | flux-runtime                              | B 运行时层         | 17460    | `05-flux-runtime-check.md`                 | done |
| 06  | flux-react                                | B                  | 8139     | `06-flux-react-check.md`                   | done |
| 07  | flux-i18n                                 | B                  | 2909     | `07-flux-i18n-check.md`                    | done |
| 08  | flux-bundle                               | B                  | 133      | `08-flux-bundle-check.md`                  | done |
| 09  | ui                                        | C 基础UI与结构渲染 | 8018     | `09-ui-check.md`                           | done |
| 10  | flux-renderers-basic                      | C                  | 4494     | `10-flux-renderers-basic-check.md`         | done |
| 11  | flux-renderers-layout                     | C                  | 3907     | `11-flux-renderers-layout-check.md`        | done |
| 12  | flux-renderers-form                       | C                  | 9792     | `12-flux-renderers-form-check.md`          | done |
| 13  | flux-renderers-form-advanced              | D 复合表单与数据   | 17393    | `13-flux-renderers-form-advanced-check.md` | done |
| 14  | flux-renderers-data                       | D                  | 16796    | `14-flux-renderers-data-check.md`          | done |
| 15  | flux-renderers-content                    | E 内容与AI渲染     | 5562     | `15-flux-renderers-content-check.md`       | done |
| 16  | flux-renderers-mobile                     | E                  | 2045     | `16-flux-renderers-mobile-check.md`        | done |
| 17  | flux-renderers-dashboard                  | E                  | 2135     | `17-flux-renderers-dashboard-check.md`     | done |
| 18  | flux-renderers-ai                         | E                  | 11016    | `18-flux-renderers-ai-check.md`            | done |
| 19  | flux-renderers-scheduling                 | F 调度与工业       | 11880    | `19-flux-renderers-scheduling-check.md`    | done |
| 20  | flux-renderers-industrial                 | F                  | 16769    | `20-flux-renderers-industrial-check.md`    | done |
| 21  | flux-renderers-map                        | G 小型领域渲染     | 1833     | `21-flux-renderers-map-check.md`           | done |
| 22  | flux-renderers-graph                      | G                  | 1397     | `22-flux-renderers-graph-check.md`         | done |
| 23  | flux-renderers-pivot                      | G                  | 1144     | `23-flux-renderers-pivot-check.md`         | done |
| 24  | editor-core                               | H 设计器核心       | 593      | `24-editor-core-check.md`                  | done |
| 25  | flux-code-editor                          | H                  | 3347     | `25-flux-code-editor-check.md`             | done |
| 26  | flow-designer-core                        | H                  | 5583     | `26-flow-designer-core-check.md`           | done |
| 27  | spreadsheet-core                          | H                  | 4015     | `27-spreadsheet-core-check.md`             | done |
| 28  | report-designer-core                      | H                  | 2303     | `28-report-designer-core-check.md`         | done |
| 29  | word-editor-core                          | H                  | 1838     | `29-word-editor-core-check.md`             | done |
| 30  | flow-designer-renderers                   | I 设计器渲染层     | 9632     | `30-flow-designer-renderers-check.md`      | done |
| 31  | spreadsheet-renderers                     | I                  | 7111     | `31-spreadsheet-renderers-check.md`        | done |
| 32  | report-designer-renderers                 | I                  | 3791     | `32-report-designer-renderers-check.md`    | done |
| 33  | word-editor-renderers                     | I                  | 4567     | `33-word-editor-renderers-check.md`        | done |
| 34  | apps/playground                           | J 应用与支撑       | -        | `34-apps-playground-check.md`              | done |
| 35  | nop-debugger                              | J                  | 7338     | `35-nop-debugger-check.md`                 | done |
| 36  | tailwind-preset + theme-tokens            | J（合并报告）      | 182      | `36-tailwind-preset-theme-tokens-check.md` | done |

## 执行纪律

1. **基线先行**：先跑 `pnpm typecheck` / `pnpm lint` / `pnpm check` / `pnpm test`，结果记入 `00-baseline-tooling.md`。工具已报出的问题在包报告中标 `tooling-confirmed`，不重复展开。
2. **独立子代理**：每个包由一个 fresh 子代理审计（只读代码；唯一写权限 = 自己的报告文件），避免主会话上下文污染。单包超过 ~17k 行时，子代理按"入口 → 核心模块 → 逐文件扫 grep 模式"分层抽样，但 P0/P1 判断必须基于完整阅读相关函数。
3. **批次推进**：按 A → J 顺序，批次内并行。依赖层靠前的包（A/B）结论可被后续批次引用（如 hooks 契约的真实行为以 06 报告为准）。
4. **收尾**：每批次完成后更新状态表；全部完成或阶段性收尾时写/更新 `SUMMARY.md`（P0/P1 交叉汇总 + 修复优先级建议）。修复动作一律另立 plan，不在本 mission 内。
5. **不修改代码**：任何情况下不得改动 `packages/`、`apps/`、测试与配置；发现想要修的问题 → 写进报告。

## 已知背景（供各包审计参考，避免误报）

- e2e 已知 3 个 watch-only 终态失败（gantt-perf ×2 + kanban-perf ×1，60Hz 阈值问题，见 `docs/context/project-context.md`）。
- `pnpm check` 中 `check:duplicates:detail` 非门禁；oversized 红名单仅 2 条既有 locale 豁免。
- 2026-08-09 DV 基线：单测 10,703 passed / 0 failed；typecheck/build/lint 全绿。
