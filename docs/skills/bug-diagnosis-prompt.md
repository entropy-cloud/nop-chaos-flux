# Bug 诊断提示词

## 目标

用于在 `nop-chaos-flux` 中执行一次**可收敛、可复现、可回归保护**的 bug 诊断。

这份提示词不是让 agent 一边猜一边改，而是要求先建立可靠反馈回路，再通过最小复现、假设排序、定向打点和回归测试收敛根因。

优先适用于：

1. 运行时错误、静默失败、错误传播失真。
2. Playwright E2E 失败、页面加载异常、交互后状态不一致。
3. debugger / host diagnostics / async owner 状态与真实行为不一致。
4. 跨包 bug、非显然根因 bug、容易被 future refactor 重新引入的 bug。

## 开始前必须读

1. `docs/index.md`
2. `AGENTS.md`
3. 对应区域 owner doc
4. `docs/references/e2e-test-diagnostic-guide.md`（若问题涉及 E2E / 页面行为）
5. `templates/age-app-template/docs/references/playwright-e2e-guide.md`（若问题涉及 Playwright 诊断方法）
6. `docs/testing/e2e-standards.md`（若问题涉及 supported E2E）
7. `docs/bugs/00-bug-fix-note-writing-guide.md`（若 bug 非显然或需记录历史）

如果问题涉及特定子系统，还必须补读对应 owner doc，例如：

1. form / validation：`docs/architecture/form-validation.md`
2. runtime / owner / async data：`docs/architecture/flux-runtime-module-boundaries.md`
3. renderer / hooks / fragment：`docs/architecture/renderer-runtime.md`
4. debugger / diagnostics：`docs/architecture/debugger-runtime.md`
5. performance / locality / perf diagnostics：`docs/architecture/performance-diagnostics-and-e2e-design.md`

## 核心原则

1. **没有反馈回路，就不要开始猜根因。**
2. **先复现用户报告的问题，再修。** 不要修“附近另一个看起来也不对的问题”。
3. **优先程序化证据，不靠截图猜。** 用 `page.evaluate()`、debugger API、测试输出、DOM / state dump。
4. **先列假设，再验证假设。** 避免锚定在第一个看起来合理的解释上。
5. **每次只改变一个变量。** 打点和实验必须能区分假设。
6. **修复必须带回归保护。** 如果缺少正确测试 seam，这本身就是结论。
7. **复杂 bug 要留下可复用记忆。** 非显然根因、跨包问题、回归测试新增，都应考虑写 `docs/bugs/`。

## Phase 1: 建立反馈回路

这是整个流程里最重要的一步。目标是得到一个 agent 可重复执行的 pass/fail 信号。

按优先级尝试：

1. failing unit / integration test
2. failing Playwright spec 或单行定点运行
3. 项目内联 `node -e` Playwright 诊断脚本
4. 直接调用 `window.__NOP_DEBUGGER_API__` 的页面诊断
5. 最小复现 harness / fixture

优先选择最小但真实的 seam：

1. renderer 层问题：优先已有 renderer test 或 component-lab / focused e2e
2. runtime / action / validation 问题：优先包内 unit / integration test
3. 页面集成问题：优先 Playwright
4. debugger / diagnostics 问题：优先 Playwright + `__NOP_DEBUGGER_API__`

### 针对本项目的反馈回路建议

#### E2E / 页面问题

1. 先使用 `tests/e2e/fixtures.ts` 的 shared page-error tracking，而不是每个 spec 自己发明一套。
2. 若是一次性诊断，优先使用 `docs/references/e2e-test-diagnostic-guide.md` 的 inline script。
3. 若问题出现在 playground / component-lab：
   - 检查 `console.error` / `pageerror`
   - 检查 `window.__NOP_DEBUGGER_API__`
   - 在 Lab 页面可辅以 `scope-debug-json`
4. 不要依赖截图判断原因。
5. 不要盲目 retry 同一 failing spec 两次以上而没有新证据。

#### Runtime / compiler / action / validation 问题

1. 优先找最靠近真实 contract 的现有测试入口。
2. 不要只给 helper 补一个过浅的测试，然后宣称 bug 被锁住。
3. 如果 bug 横跨 compile -> runtime -> react -> renderer，多半需要 integration seam，而不是只测单层 helper。

### 反馈回路质量标准

在进入下一阶段前，确认：

1. 循环能稳定复现报告中的问题，或至少把复现率提升到可调试水平。
2. 断言的是**具体症状**，而不是宽泛的“没崩”。
3. 运行速度足够快，能支持多轮实验。

如果到这里仍然没有可靠 loop，就停止继续猜测，并明确列出已经尝试过的办法。

## Phase 2: 复现并最小化

1. 先确认当前 loop 复现的是用户报告的同一个问题。
2. 记录最小触发步骤、最小输入、最小场景。
3. 去掉无关变量，缩小到单一路径。

对于非稳定问题：

1. 提高复现率，而不是等运气。
2. 尝试缩小等待窗口、增加连续点击、加速切页、重复 mount/unmount、重复 refresh。
3. 把“1% 偶发”提升成“可调试的高频失败”。

## Phase 3: 先列 3-5 个可证伪假设

在打点前，先列 3-5 个按概率排序的假设。每个假设都必须写成可证伪形式：

`如果 X 是根因，那么改变 Y 后应该看到 Z。`

示例：

1. 如果是 renderer registration 缺失，那么 DOM 会出现 `<!-- unregistered: ... -->` 或 load path 永远停在 loading。
2. 如果是 async owner 没有 failed settlement，那么 debugger snapshot 会显示 `running/fetching`，而不是 failed。
3. 如果是测试 race，而不是产品 bug，那么替换 `waitForTimeout()` 为明确等待后应稳定转绿。

不要直接从“可能是 XXX”跳到改代码。

## Phase 4: 定向打点与实验

每次实验只服务于一个假设，并且只改一个变量。

优先顺序：

1. debugger / REPL / 浏览器内 `page.evaluate()` 直接观测
2. 定向日志
3. 临时 instrumentation

规则：

1. 临时日志必须带唯一前缀，例如 `[DEBUG-bugdiag-xxxx]`。
2. 不要“什么都 log 一遍再 grep”。
3. perf 问题先测量，再修复。
4. 如果是页面问题，优先检查：
   - DOM 是否存在
   - 样式是否生效
   - 网络 / async data 是否完成
   - debugger errors / failures 是否出现

本项目常见观测手段：

1. `page.evaluate(() => window.__NOP_DEBUGGER_API__?.getState?.())`
2. `page.evaluate(() => window.__NOP_DEBUGGER_API__?.queryEvents?.({ kind: 'error' }))`
3. `page.evaluate(() => window.__NOP_DEBUGGER_API__?.getRecentFailures?.())`
4. `getComputedStyle()`、`locator.innerHTML()`、`textContent()`
5. 相关包已有 unit / integration test 输出

## Phase 5: 回归测试先于修复

如果存在正确 seam，先把最小复现转成 failing regression test，再修。

正确 seam 的标准：

1. 测试走真实问题发生的调用链。
2. 测试断言的是正确结果，而不是只断言没有抛错。
3. 测试不会因为纯内部重构而无意义地失败。

如果没有正确 seam：

1. 明确说明当前架构为什么无法锁住这个 bug。
2. 选择最接近真实路径的临时保护方式。
3. 在最终结论或 bug note 里把“缺少正确 seam”作为显式发现。

## Phase 6: 修复

修复时遵循：

1. 先做最小正确修复，不顺手夹带 unrelated refactor。
2. 直接针对已验证根因，不对假设中未证实的部分一并改写。
3. 保留或新增回归测试。

如果 bug 属于非 trivial defect family，按仓库规则评估是否需要：

1. 新增 `docs/bugs/*.md`
2. 更新相关 architecture doc
3. 更新 `docs/logs/{year}/{month}-{day}.md`

## Phase 7: 验证、清理、沉淀

完成修复后必须做：

1. 重跑最初的反馈回路，确认原始问题消失。
2. 重跑新增 regression test。
3. 移除所有 `[DEBUG-...]` 临时日志和 throwaway instrumentation。
4. 若是代码变更，按仓库规则运行 `pnpm typecheck`、`pnpm build`、`pnpm lint`，并在相关时运行 `pnpm test` / E2E。
5. 若是 supported E2E，继续满足 `docs/testing/e2e-standards.md` 的零错误 gate。

## 本项目特殊提醒

1. 不要用 screenshot 作为主要诊断证据。
2. debugger / host diagnostics / runtime snapshot 是一等证据面，不是次要附加信息。
3. 很多高价值 bug 属于“跨层诊断失真”：真实失败发生了，但 error / status / async owner / debugger surface 被压扁或吞掉。诊断时必须检查 truth-surface 是否失真，而不只看最终 UI。
4. 如果 bug 涉及 cancellation、stale-result、async owner settlement、ActionResult 扁平化、host diagnostics fidelity，要同时检查 runtime 行为和 debugger/monitor surface 是否一致。
5. 对 flaky E2E，优先怀疑 race、等待条件错误、server stale cache、Tailwind source scan、renderer registration、loadAction / compilation key mismatch 等项目已知问题族。

## 输出要求

先给结论，再给证据。至少包含：

1. **Bug**
   - 复现的最小现象
2. **Feedback Loop**
   - 用了哪条可重复执行的 loop
3. **Hypotheses**
   - 排序后的 3-5 个假设
4. **Evidence**
   - 哪些实验排除了什么
   - 哪个证据锁定了真实根因
5. **Root Cause**
   - 真正原因是什么
6. **Fix**
   - 修了什么，为什么有效
7. **Regression Protection**
   - 哪个测试保护它，或为什么当前没有正确 seam
8. **Follow-up Docs**
   - 是否需要 `docs/bugs/`、architecture doc、daily log

## 可直接复用的提示词正文

```text
请按本仓库的 bug 诊断流程处理当前问题，不要直接猜测并修改代码。

要求：
1. 先读 `docs/index.md`、`AGENTS.md`、相关 owner docs，以及 `docs/references/e2e-test-diagnostic-guide.md` / `docs/testing/e2e-standards.md`（若问题涉及 E2E）。
2. 先建立一个可靠、可重复执行的 feedback loop；没有 feedback loop 不要继续猜根因。
3. 先确认复现的是用户报告的同一个问题，并尽量最小化复现。
4. 在打点前先列 3-5 个可证伪假设，并按概率排序。
5. 使用定向实验和程序化证据验证假设；优先用 `page.evaluate()`、`window.__NOP_DEBUGGER_API__`、测试输出、DOM/state dump，不要靠截图推断。
6. 若存在正确测试 seam，先把最小复现转成 failing regression test，再修复。
7. 修复后重跑原始 loop、回归测试，以及仓库要求的验证命令。
8. 清理所有临时 debug instrumentation。
9. 如果 bug 非显然、跨包、或增加了回归测试，评估是否写入 `docs/bugs/`。

输出格式：
1. Bug
2. Feedback Loop
3. Hypotheses
4. Evidence
5. Root Cause
6. Fix
7. Regression Protection
8. Follow-up Docs
```
