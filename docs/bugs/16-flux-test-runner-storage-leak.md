# Bug 16: flux-test runner 单浏览器 profile 下 localStorage 跨 spec 泄漏

- 日期：2026-11-19
- 症状：dir 模式全量跑时 14 个 spec 顺序性失败（demo-capabilities 键盘输入不生效、w1b toHaveCount(0) 得 1 等），单 spec 跑全绿。
- 根因：runner 复用同一浏览器 profile，页面间共享 localStorage/sessionStorage。debugger-ai spec 打开浮动调试面板 → `persistPanelOpen` 写 localStorage → 后续任何 tab 挂载时面板自动展开 → 固定悬浮层遮挡后续 spec 的真实 CDP 点击坐标（点击落在面板上，目标不聚焦/不触发）。Playwright 时代每 spec 独立 context（空 storage），迁移后隔离语义缺失。
- 修复：launcher `newPage` 注册 `Page.addScriptToEvaluateOnNewDocument`（每文档加载前 `localStorage.clear(); sessionStorage.clear()`）——与 Playwright fresh context 等价，且不引入重载（hash 路由反弹不触发新文档，spec 内持久化依赖不受影响，ai-persistence 实证）。
- 判别性验证：14 失败集合 → 修复后全量 dir 65/65 绿；mock `pageHandlers` 增 methodLog，launcher 单测断言 init script 注册先于 Page.navigate。
- 经验：自研 runner 复刻 Playwright 语义时，"每 spec 独立 context"是隔离契约的一部分，不只是 API 便利性。
