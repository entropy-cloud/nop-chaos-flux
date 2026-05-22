# Bug 诊断执行模板

## 用途

这是 `docs/skills/bug-diagnosis-prompt.md` 的短版执行模板。

适合：

1. 已经知道问题大致在哪个区域
2. 需要快速进入一次真实排障
3. 不需要先阅读完整长文版方法论

## 复制使用

```text
请按本仓库的 bug 诊断流程处理当前问题。

先做这些事，不要直接改代码：
1. 读 `docs/index.md`、`AGENTS.md` 和当前问题所在区域的 owner doc。
2. 如果涉及 E2E / 页面问题，再读 `docs/references/e2e-test-diagnostic-guide.md` 和 `docs/testing/e2e-standards.md`。
3. 建立一个可重复执行的 feedback loop；优先 failing test、focused Playwright spec、inline `node -e` script、或 debugger API 检查。
4. 确认复现的是用户报告的同一个问题，并最小化复现步骤。
5. 在打点前先列 3-5 个可证伪假设，按概率排序。
6. 用定向实验验证假设；优先程序化证据：`page.evaluate()`、`window.__NOP_DEBUGGER_API__`、测试输出、DOM/state dump。
7. 如果存在正确测试 seam，先把最小复现写成 failing regression test，再修复。
8. 修复后重跑原始 feedback loop、回归测试，以及仓库要求的验证命令。
9. 移除临时 debug instrumentation。
10. 如果 bug 非显然、跨包、或新增了回归测试，评估是否更新 `docs/bugs/` 和 `docs/logs/`。

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
