# Bug 15: playground 路由页拿到 trimmedControllerStub 且永不恢复（flux-basic 页面永不渲染）

- 日期：2026-11-19
- 症状：`/#/flux-basic` 页 SchemaRenderer 永不挂载（decoratedEnv 恒 null，stage 空），`flux-basic-row-inspect` e2e 超时失败；无 console 报错。
- 根因（两层）：
  1. E1 的 M7 stub→real 内核交接只解决了 DevToolsHost 面板挂载竞态——模块级 `let debuggerController` 在异步 import 回调里重新赋值，但路由页在首次渲染时以 prop 捕获 stub，之后无人再触发 App 重渲染，stub 永久驻留（`decorateEnv` no-op → undefined）。
  2. React Compiler 把模块级可变 `let` 视为不可变绑定：即使组件重渲染，闭包/记忆化读到的仍是首帧 stub——任何"事后读模块变量"的修复形态都无效。
- 修复：控制器经 `devtoolsReady` promise 载荷交付（import 回调内构造、payload 返回），`RouteHost` 在内核就绪前**不渲染路由树**（state+effect 就绪后才 `renderPage`）——页面只挂载一次、直接以真控制器实例化；`renderPage` 增 controller 参数显式传链。两个被否决的形态：① React 19 `use(devtoolsReady)` 挂起——RTL/jsdom 测试环境下极简 `use(promise)` 复现都不 settle，测试面不可用；② post-mount state 重渲染——页面以 stub 挂载后再重渲染是交互竞态（页面可能已 focus/点击/构建 fixture DOM），实测曾致 14 个 dir 模式 spec 顺序性失败。trimmed bundle 下 `__FLUX_DEVTOOLS__`=false，`devtoolsReady`=null → 路由页不渲染（生产内核不可达红线不受影响，`check:devtools-tree-shake` 门禁维持）。
- 判别性回归：`tests/e2e/flux-basic-row-inspect.spec.ts`（旧实现恰红 → 新实现绿，双向验证）；另以 `/#/flux-basic` 探针（Inspect 按钮 0→3）复核。
- 复现注意：本缺陷是**冷启动竞态**——内核 chunk fetch 输给 React 首帧渲染时 stub 被捕获。dev server 热缓存下 import 先解析，新旧实现都会绿——在热 server 上复现不出不能证伪本修复；判别必须用冷启动 server（kill + 重启后立即探测）。
- 经验：模块级可变绑定对 React Compiler 不可见；异步初始化的值必须走 promise/state 通道进入渲染树，且交接期页面不得先挂载再补救。
