# 33 Flux Basic Lazy Route Suspense Hang Fix

## Problem

- 打开 `/#/flux-basic` 时，页面一直停留在应用级 `Suspense` loading spinner，`Renderer Playground` 页面内容始终不出现。
- 调试器 launcher 仍然可见，而且事件数很快顶到 `400`，容易误判成页面内部 render loop。
- `tests/e2e/debugger.spec.ts` 中依赖 `/#/flux-basic` 的两个用例因此超时失败。

## Diagnostic Method

- 先按页面内部 runtime 问题排查：检查 `flux-basic-page.tsx`、`fluxBasicPageSchema.json`、高级表单 renderer 的 `registerField` / `modelGeneration` 交互，因为表面现象很像表单注册抖动。
- 用 Playwright 和浏览器内诊断直接读取 DOM、console、requestfailed、4xx/5xx 响应；证据显示页面始终只有 app 级 fallback spinner，没有 pageerror，也没有明显网络失败。
- 直接请求 `http://127.0.0.1:4175/src/pages/flux-basic-page.tsx` 并在浏览器里执行 `import('/src/pages/flux-basic-page.tsx')`；模块本身可以正常解析，因此不是语法错误或 chunk 加载失败。
- 决定性证据：把 `FluxBasicPage` 从 `React.lazy(...)` 改成直接导入后，`/#/flux-basic` 立刻正常渲染，失败从“页面永远不出现”变成普通的 Playwright strict-locator 冲突。这说明真正卡住的是路由级 lazy/Suspense 边界，而不是页面提交后的常规 renderer 逻辑。

## Root Cause

- `apps/playground/src/app.tsx` 对 `FluxBasicPage` 使用了 `React.lazy(...)`，而实际运行路径中该路由会停在顶层 `Suspense` fallback，导致页面 JSX 连首次提交都没有发生。
- `FluxBasicPage` 模块文件本身可以被浏览器直接 `import(...)`，所以问题不是简单的模块语法错误；真正失效的是该页面在路由级 lazy/Suspense 边界下的解析/挂载路径。
- 由于页面从未提交，调试器里只剩编译相关事件和 launcher，误导诊断朝“页面内部 render/compile loop”方向偏移。

## Fix

- 在 `apps/playground/src/app.tsx` 中移除 `flux-basic` 路由的 `React.lazy(...)`，改为直接导入 `FluxBasicPage`。
- 保留其他页面的 lazy 结构不变，只对这个已知不稳定路由做最小范围绕开。
- 在 `apps/playground/src/pages/flux-basic-page.tsx` 中把 debugger env 装饰保持在 effect 驱动路径，避免为修复路由问题又引入 React refs-in-render lint 回归。
- 在 `tests/e2e/debugger.spec.ts` 中把 `Renderer Playground` heading 定位收窄到 `level: 1`，因为页面恢复渲染后同时存在外层页面标题和 schema 内标题。

## Tests

- `tests/e2e/debugger.spec.ts` - 验证 `/#/flux-basic` 能正常显示 debugger launcher。
- `tests/e2e/debugger.spec.ts` - 验证跨 home / flux-basic / debugger-lab 的控制台错误检查重新通过。

## Affected Files

- `apps/playground/src/app.tsx`
- `apps/playground/src/pages/flux-basic-page.tsx`
- `tests/e2e/debugger.spec.ts`

## Notes For Future Refactors

- 如果未来要把 `FluxBasicPage` 恢复成 lazy route，先单独重现并解释这个 Suspense 卡死，再重新引入 code splitting，不要直接把 eager import 改回去。
- 当路由一直停在应用级 spinner 时，先确认“页面是否已经提交过一次 DOM”，不要只根据调试器 compile 事件数量判断为页面内部 loop。
- Playwright 失败如果只显示 fallback spinner，优先区分三层问题：模块 import 失败、route-level Suspense 卡死、页面提交后的 runtime/render 问题。
