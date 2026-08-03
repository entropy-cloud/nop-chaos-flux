# Debugging：三层定位法与调试工具

> 页面问题可能出在三个不同层。调试第一步永远是**确定问题在哪一层**，再选对应的工具。本文件是 flux 侧（前端渲染层）的调试手册，并给出跨层定位的完整方法。

---

## 三层定位法（先定位，再调试）

一个 Nop 页面从配置到屏幕要经过三层，任何一层出错都会表现为「页面不对」：

| 层        | 代码位置                                               | 产物             | 怎么验证                                            |
| --------- | ------------------------------------------------------ | ---------------- | --------------------------------------------------- |
| 1. 配置层 | `*.view.xml` / `*.orm.xml` / `*.page.yaml`（ERP 仓库） | 页面意图         | 直接读 XML，对照业务需求                            |
| 2. 生成层 | nop-entropy `nop-web`：`flux-web.xlib`（xpl 模板）     | 页面 JSON schema | `POST /r/PageProvider__getPage` 抓最终 JSON（见下） |
| 3. 渲染层 | nop-chaos-flux 渲染器 + nop-chaos-next 宿主            | 浏览器 DOM       | `window.__FLUX_DEBUG__` / monitor / Playwright 探针 |

**判定规则（顺序执行）：**

1. **先抓生成层 JSON**（一行 curl 或 evaluate），与 view.xml 对照：
   - JSON 缺东西 → 问题在**配置层或生成层**（对照 `web.xlib` 语义，见 nop-entropy 侧文档）
   - JSON 有东西但 DOM 没有 → 问题在**渲染层**（本文件）
2. 渲染层问题再细分：用 `__fluxDebug` 看运行时事件；仍不明 → 在 nop-chaos-flux 写渲染测试复现（见下）。

## 渲染层调试工具

### 1. `__fluxDebug` 环形缓冲（首选）

宿主（nop-chaos-next `apps/main/src/flux/fluxDebug.ts`）内置调试记录器：

- 开关：`window.__FLUX_DEBUG__ = true`（运行时）或 `VITE_FLUX_DEBUG=true`（构建期）
- 记录：flux env 的所有 ajax 请求/响应、错误、notify 消息，追加到 `window.__fluxDebug`（环形缓冲，最多 200 条）
- 读取：浏览器控制台 `window.__fluxDebug`，或 e2e 里用 e2e-shared 的 `enableFluxDebug(page)` / `dumpFluxDebug(page)` / `formatFluxDebug()`

**注意**：必须在页面加载前开启（flux env 在首次渲染时创建）。e2e-shared 的 `test` fixture 已默认开启；用 Playwright 原生 `test` 时需在 `beforeEach` 里 `enableFluxDebug(page)`。

**局限**：只记录 ajax/error/notify 事件，**不记录渲染过程**（某组件没渲染、按钮缺失这类问题没有对应事件）。

### 2. monitor 遥测（事件式，可扩展）

`<SchemaRenderer monitor={onEvent}>` 独立 prop，事件类型与 E2E 用法详见 `16-monitor.md`。宿主如需 APM 或细粒度事件可在此接入。注意：monitor 是 React 层的 prop；flux-runtime 内部 `env.monitor` 字段已移除（`flux-core/src/utils/runtime-host-reporting.ts` 注明），表达式错误监控走 `ExpressionExecutionEnv.monitor.onError`。

### 3. Playwright 直读 schema

浏览器里直接拿渲染用的最终 JSON（不依赖抓包工具）：

```ts
// 1. 从站点地图取菜单项的 pagePath（schemaPath）
const sm = await page.evaluate(() =>
  fetch('/r/SiteMapApi__getSiteMap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId: 'main' }),
  }).then((r) => r.json()),
);
// 菜单项字段：url = "/erp/md/pages/ErpMdPartner/main.page.yaml"（即 schemaPath）

// 2. 抓页面 schema
const schema = await page.evaluate(
  (path) =>
    fetch('/r/PageProvider__getPage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    }).then((r) => r.json()),
  '/erp/md/pages/ErpMdPartner/main.page.yaml',
);
```

`PageProvider__getPage` 的参数名是 **`path`**（page.yaml 的 VFS 路径），不是 bizObjName/pageId。返回的 `data.page` 即前端实际渲染的 JSON schema。

## 怀疑渲染器本身有问题 → 补测试（强制）

渲染器代码在 nop-chaos-flux。**不要只靠浏览器观察下结论**：先写一个最小渲染测试复现，再修代码。测试先例（Vitest + React Testing Library）：

- `packages/flux-renderers-data/src/__tests__/data-crud-rendering.test.tsx`（CRUD 渲染）
- `packages/flux-renderers-data/src/__tests__/crud-selection-and-features.test.tsx`（CRUD 交互）
- `packages/flux-runtime/src/__tests__/runtime-actions-monitor.test.ts`（运行时动作/重试）

标准做法见 `13-testing.md`。复现步骤：构造最小 schema → 渲染 → 断言 DOM。schema 从真实后端 JSON 里裁剪（保持最小），避免凭记忆构造。

## 实战案例：CRUD 工具栏缺少「新增」按钮

现象：flux 渲染的 CRUD 页面有批量按钮（批量启用/停用），但工具栏没有「新增」按钮；AMIS 渲染同页面正常。

三层定位过程：

1. **生成层 JSON 抓取**（`PageProvider__getPage`）→ **add-button 完整存在**：
   ```json
   "toolbar":[{"type":"button","id":"add-button","icon":"fa fa-plus pull-left","label":"新增","level":"primary","onClick":{"action":"openDialog","args":{...}}},
              {"type":"button","id":"batch-active-button","batch":true,...,"label":"批量启用"}]
   ```
   → 排除配置层/生成层，问题在**渲染层**。
2. 渲染层：后端只生成 `toolbar` 数组；渲染端 slot 契约是 `toolbar` + `listActions` 两个独立槽（`crud-renderer-delegate.ts` 的 `resolveCrudSlotContent`）。批量按钮（`batch:true`）从 toolbar 槽渲染出来，非 batch 的 add-button 走 `listActions` 槽（`data-slot="crud-list-actions"`），而 schema 没有 `listActions` 字段 → add-button 无处渲染。
3. **下一步（按本文件规范）**：在 `flux-renderers-data` 写最小渲染测试复现（schema 仅含 toolbar 数组 + 非 batch add-button → 断言按钮可见），确认后修渲染器或补后端 `listActions` 字段。

教训：**DOM 缺东西 ≠ 配置缺东西**。先抓生成层 JSON 定层，再动手。
