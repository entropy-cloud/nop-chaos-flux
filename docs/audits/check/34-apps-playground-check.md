# 34 apps/playground 实现代码检查报告

- 检查日期：2026-08-20
- 检查对象：`apps/playground/src/`（开发用 playground 宿主：组件 demo、complex-pages 演示页、mock 后端、env/stream/socket 实现、AI mock 连接器）
- 方法约束：只读审计（Read/Grep/有限 Bash），未运行任何 pnpm 命令；结论基于源码精读 + 跨文件契约核对（含 `packages/flux-runtime` 请求层只读核对）。
- 对照文档：`docs/architecture/playground-experience.md`、`docs/audits/check/00-baseline-tooling.md`

## 范围与结构统计

| 项                                     | 数值                                                                                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 文件总数                               | 344（232 tsx / 69 ts / 39 json / 4 css）                                                                                                             |
| ts/tsx 总行数                          | 44,684                                                                                                                                               |
| json 总行数（demo schema）             | 14,550                                                                                                                                               |
| 目录分布                               | component-lab 144、pages 99、complex-pages 34、ai 14、flow-designer 12、taskflow-designer-lib 8、schemas 7、env 4、sundial-replica 1、根级散文件若干 |
| 超 500 行 ts/tsx 文件（playground 内） | 7（见 F-10）                                                                                                                                         |

抽样覆盖：complex-pages 全部共享层精读（mock-backend / showcase-env / confirm-bridge / render-host / page-frame）+ 19 个 page-schemas 全量端点/方法核对 + 3 个 schema 精读；pages 抽样 6 个（flux-basic、performance-table、report-designer-demo、ai-chat、spreadsheet-demo、scada-demo）+ 大文件头部扫描；component-lab 抽样 4 个（component-lab-page、crud-lab、dialog-lab、button-lab）+ multi-scenario-lab-page；env/ 与 ai/ 全精读；route-model / use-route / App.tsx / home-page / route-matrix.test 精读。

## 结论概览

**P0 x0 / P1 x4 / P2 x5 / P3 x7**

总评：playground 整体工程质量高于典型 demo 宿主——路由有 round-trip 测试与清单对账测试、window 挂载与定时器均有清理、无硬编码密钥、AI 连接器走 env 变量 + mock 回退。主要问题集中在三处：**mock 后端把所有未匹配路由静默当成"成功"**（已实际造成一个假成功演示，见 F-01/F-02）；**两处导航清单腐化**（scheduling 类目被导航丢弃、dingtalk-flow-demo 死路由，见 F-03/F-05）；**懒加载无错误边界**（chunk 失败即白屏，见 F-04）。另有一项工具治理发现：基线报告的 oversized "ERROR" 证据与现行脚本逻辑不可复现（F-09）。

## P0 缺陷

无。未发现"演示不存在的 renderer 能力并让开发者误判"或"demo 完全无法工作"级别的问题。

## P1 隐患

### F-01 mock 后端 catch-all 把所有未匹配路由静默当成成功（D5 错误处理）

- 位置：`apps/playground/src/complex-pages/shared/showcase-env.ts:612`
- 摘录：

```ts
    // ...所有具名端点 if 链之后...
    return { status: 0, data: null as T };
  };
```

- 问题：fetcher 对任何未匹配的 URL/方法组合返回 `status: 0`（nop 约定的成功态）+ `data: null`。schema 中 URL 拼写错误、method 不匹配、mock 未实现的端点，全部表现为"请求成功但数据为空"，无任何告警。
- 影响：直接掩盖 schema 与 mock 的漂移（F-02 即被它掩盖的实际案例）；开发者在 complex-pages 里调试取数问题时得不到任何错误信号，表格空白与"成功"不可区分。
- 修复方向：兜底分支改为显式失败——至少 `console.warn('[showcase-env] unmatched mock url', method, url)`，更进一步返回 `status: 1` + `{error: 'unmatched mock endpoint'}` 让 demo 页面可见报错。mock 是 dev 宿主，"快失败"比"静默空数据"价值高得多。

### F-02 business-document 演示页提交端点无 mock 实现，"提交采购单"是假成功（D1 正确性 / D2 契约）

- 位置：`apps/playground/src/complex-pages/page-schemas/business-document.json`（submitAction）；对照 `showcase-env.ts` 全文无该 handler
- 摘录（business-document.json submitAction）：

```json
"submitAction": {
  "action": "ajax",
  "args": {
    "url": "/r/PurchaseOrder__save",
    "method": "post",
    "includeScope": "*"
  },
  "messages": { "success": "采购单已提交" },
  "then": [ { "action": "setValue", "args": { "path": "orderSaved", "value": true } } ]
}
```

- 问题：全量核对 19 个 page-schemas 引用的 44 个 `/r/*` 端点后，`/r/PurchaseOrder__save` 是唯一未被 mock 处理的端点。提交后命中 F-01 兜底，页面弹"采购单已提交"成功提示并置 `orderSaved=true`，但没有任何数据被保存。
- 影响：该页主题是"业务单据提交"，演示行为与声明不符；开发者按此 demo 理解 submit→success→then 链路时，看到的是一条从未落库的假成功路径。
- 修复方向：在 showcase-env 补 `PurchaseOrder__save` handler（可直接 `return {status:0, data:{success:true, savedAt: nowStamp()}}`），或复用 `User__save` 风格落入内存库；配合 F-01 修复后此类漂移将被自动暴露。

### F-03 Component Lab 导航丢弃 scheduling 类目，3 个 lab 页在 UI 中不可达（D1 正确性 / D2 契约）

- 位置：`apps/playground/src/component-lab/component-lab-page.tsx:11-19`；对照 `route-model.ts`（ALL_SHARED_RENDERER_ROUTES 含 `SCHEDULING_RENDERER_ROUTES`）、`scheduling-renderer-routes.ts`（kanban/calendar/barcode-input 为 `category: 'scheduling'`）
- 摘录：

```ts
const CATEGORY_ORDER: RendererCategory[] = [
  'layout',
  'content',
  'actions',
  'logic',
  'advanced',
  'form',
  'data',
]; // ← 缺 'scheduling'
```

- 问题：`groupByCategory()` 先按真实 category 分组，再用 `CATEGORY_ORDER.filter(...)` 输出——`scheduling` 组被整体丢弃。而 `CATEGORY_LABELS`（同文件 21-31 行）和 `RendererCategory` 类型都包含 `scheduling`，说明是清单漏项而非有意裁剪。`RENDERER_LAB_REGISTRY` 中 KanbanLabPage / CalendarLabPage / BarcodeInputLabPage 均已注册（registry 238-241 行），仅导航不可见（`#/lab/kanban` 等深链仍可达）。
- 影响：侧栏标题声称 "118 renderers"，实际列表少 3 项；scheduling 组件 lab 只能靠手打 URL 进入，`route-matrix.test.ts` 的 registry 覆盖测试测不到导航分组这一层。
- 修复方向：`CATEGORY_ORDER` 加入 `'scheduling'`（放在 'data' 后即可）；可顺带加一条"导航分组并集 === 全量路由分类"的单测防回归。

### F-04 全应用无 ErrorBoundary，7 个懒加载 chunk 失败即整页白屏（D5 错误处理）

- 位置：`apps/playground/src/App.tsx:378-383`（唯一的 Suspense 包裹）；全 src grep `ErrorBoundary|componentDidCatch|getDerivedStateFromError` 零命中
- 摘录：

```tsx
export function App() {
  const [route, navigate] = useRoute();

  return (
    <div className="nop-theme-root">
      <Suspense fallback={<PageFallback />}>{renderPage(route, navigate)}</Suspense>
      <NopDebuggerPanel controller={debuggerController} />
    </div>
  );
}
```

- 问题：App 对 report-designer / report-designer-host / spreadsheet / debugger-lab / condition-builder×2 / word-editor / ai-rich-text / leafer-examples 共 8 个 `lazy()` 页面只有 Suspense、没有错误边界。Vite dev 下 dev-server 重启或 HMR 失效后点击这些路由，动态 import reject 会向上抛且无边界捕获 → 整树卸载、白屏，仅剩 console 报错。
- 影响：开发场景高频踩雷（改代码后 server 重启、网络抖动），表现是"整个 playground 消失"而非"该页加载失败"，排查成本高。
- 修复方向：在 Suspense 外（或每个 lazy 处）加一个极简 ErrorBoundary，渲染"页面加载失败 + 重试（reload / 回首页）"；这是宿主应用的标准配置。

## P2 风险

### F-05 `dingtalk-flow-demo` 注册了路由但无页面组件，命中后静默降级为首页（D1 / D2）

- 位置：`apps/playground/src/domain-route-entries.ts:444-449`（注册）；`App.tsx:216-371`（switch 无该 case）+ `App.tsx:369-370`（default 分支）
- 摘录：

```ts
  {
    id: 'dingtalk-flow-demo',
    title: 'DingTalk Flow Demo',
    eyebrow: 'Style Prototype',
    description: 'Static DingTalk approval flow visual reference with interactive node insertion.',
  },
```

- 问题：全 src 检索 `dingtalk-flow-demo` 仅此一处。`#/dingtalk-flow-demo` 会被 `parseRoute` 解析为合法 domain 路由（在 DOMAIN_RENDERER_ROUTES 内），但 App switch 无 case，落入 default：渲染 `<HomePage onNavigate={() => navigate({kind:'home'})}/>`——不仅页面不对，这张 HomePage 的所有卡片点击都只会回 `#/`。结构性缺口在于：route-matrix.test 校验"清单里的 id 都能 parse"，但没有任何测试校验"清单里每个 id 在 App switch 有对应 case"（lab 侧是数据驱动 registry，无此问题）。
- 影响：违反 playground-experience.md Core Rule 3（URL 稳定标识当前页）；访问者看到 URL 与内容不符且导航行为错乱。
- 修复方向：删除该过期清单项（或补回页面组件）；同时给 App.tsx 的 domain switch 加一条与 DOMAIN_RENDERER_ROUTES 的对账测试（渲染非 home 内容即可）。

### F-06 stream-impl 正常完成/提前停止时不清除 abort 监听器（D3 泄漏）

- 位置：`apps/playground/src/env/stream-impl.ts:280-304`
- 摘录：

```ts
    const abortListener = () => {
      reader.cancel().catch(() => {});
    };
    if (ctx.signal) {
      ...
      ctx.signal.addEventListener('abort', abortListener, { once: true });
    }
    ...
    const chunks = createChunkGenerator<T>({
      ...
      onAbort: () => {
        if (ctx.signal) ctx.signal.removeEventListener('abort', abortListener);
      },
    });
```

- 问题：`onAbort` 只在 generator 下一轮循环顶部检测到 `signal.aborted` 时才执行。流正常读完（`readChunk` 返回 undefined → return）或消费方提前 break（generator `.return()`，无 finally 钩子）时，监听器永不移除，闭包持有 `reader`。`socket-impl.ts:114-121` 是同构模式。
- 影响：若 ctx.signal 是长生命周期（页面级 AbortController），每条完成的流都在 signal 上留一个僵尸监听器；长会话 + 高频流式 demo（ai-chat 系列）下累积。
- 修复方向：generator 内用 `try/finally` 保证结束时（无论正常、异常、提前 return）都 `removeEventListener`；或封装成 AbortController 局部转发。

### F-07 playground-experience.md 路由表缺 `showcase` / `showcase-page` 两种 RouteSpec（D2 契约漂移）

- 位置：`docs/architecture/playground-experience.md:77-83`（表仅列 home/lab/lab-renderer/domain 四种）；对照 `apps/playground/src/route-model.ts:58-64`（RouteSpec 共 6 种）、`route-matrix.test.ts:47-56,91-116`（showcase 路由已有测试）
- 摘录（route-model.ts）：

```ts
export type RouteSpec =
  | { kind: 'home' }
  | { kind: 'lab' }
  | { kind: 'lab-renderer'; rendererId: string }
  | { kind: 'domain'; domainId: string }
  | { kind: 'showcase' }
  | { kind: 'showcase-page'; pageId: string };
```

- 问题：文档声称该表是 RouteSpec 的规范描述，但 complex-pages（19 个业务页）对应的 `#/complex-pages[/<id>]` 两种路由未入表。文档其余部分（Automation Coverage 等）也未提 showcase。
- 影响：按文档理解路由模型的开发者会漏掉整个 complex-pages 域；文档"canonical"声明与代码漂移。
- 修复方向：路由表补两行（`#/complex-pages` → showcase、`#/complex-pages/<id>` → showcase-page），顺带在 Component Lab 小节确认 scheduling 类目问题修复后更新。

### F-08 flux-basic-page 在 setState updater 内嵌套 setState 与副作用捕获（D1 / React 反模式）

- 位置：`apps/playground/src/pages/flux-basic-page.tsx:124-144`
- 摘录：

```ts
        let createdUser = { ... };
        let totalUsers = directoryUsersRef.current.length;

        setDirectoryUsers((current) => {
          createdUser = { ...createdUser, id: current.reduce(...) + 1 };
          const nextUsers = [...current, createdUser];
          ...
          setSearchResults(nextResults);      // ← updater 内再 setState
          return nextUsers;
        });

        return { ok: true, status: 200, data: { user: createdUser, total: totalUsers, ... } };
```

- 问题：updater 必须是纯函数；这里在 `setDirectoryUsers` 的 updater 里调用 `setSearchResults`，并通过外层闭包变量依赖"updater 同步执行过一次"来拿返回值。StrictMode 下 updater 双调用，副作用被执行两次（此处恰好幂等所以未爆）。
- 影响：当前行为正确但脆弱——未来任何非幂等改动（如计数、发请求）都会在 dev 下出现双执行诡异 bug；也可能触发"Cannot update a component while rendering"类警告。
- 修复方向：先在外层算好 `nextUsers`（基于 `directoryUsersRef.current`），再依次 `setDirectoryUsers(nextUsers)` / `setSearchResults(...)`；返回值直接用局部变量。

### F-09 基线"oversized 新红 exit 1"证据与现行检查脚本不可复现（工具治理 / D8）

- 位置：`docs/audits/check/00-baseline-tooling.md:18-25`；对照 `scripts/check-oversized-code-files.mjs:10-11`（`WARN_LINES=500; ERROR_LINES=700`，错误条件 `lineCount > ERROR_LINES`，自 2026-04-18 起未变）
- 摘录（脚本）：

```js
const WARN_LINES = 500;
const ERROR_LINES = 700;
...
if (lineCount > ERROR_LINES) {
  errorFiles.push({ filePath, lineCount });
```

- 问题：基线引用的输出称"ERROR: 3 files exceed 700 lines"并列出 644 / 502 / 673 行的文件——三个数均 ≤ 700，按现行脚本逻辑只可能进 WARN 段，不可能进 ERROR 段、更不可能使 `pnpm check` exit 1。已按脚本同款计数法（`content.split('\n').length`）核对基线提交 `0078f2a40` 与当前 HEAD 两处文件，计数一致（644/502/673）。**结论：该引用输出无法由仓库内任何历史版本脚本产生（阈值 500/700 自 4 月未动），基线偏离 1 的证据存疑**，需要工具治理侧复核（是否误引了其它分支/伪造输出）。
- 影响：若据此把两个 playground 文件当作"未注册 ERROR 新红"去注册豁免或发起紧急拆分，决策依据不成立；同时 8-09 全绿基线与 8-20 "exit 1" 之间的矛盾解释（"阈值被收紧"）已被证伪。
- 修复方向：重跑 `pnpm check:oversized-code-files` 留存原始输出并修订 00 号基线；豁免/拆分决策以待复核的输出为准。注意：这不改变"两文件超 500 行 WARN 档、应当评估拆分"的结论（见 F-10）。

## P3 提示

### F-10 超限文件现状与拆分建议（D8）

- 现状（WARN 档 500-700 行，共 7 个 playground 文件；无 >700 ERROR 档文件）：
  - `pages/report-designer-demo.tsx` 649
  - `complex-pages/shared/showcase-env.ts` 644（基线关注文件之一，7-12 引入、8-17/8-19 Sundial 系列增长越线）
  - `pages/performance-table-page.tsx` 631
  - `pages/m5-mobile-showcase-schemas.ts` 617
  - `component-lab/renderers/crud-lab-page.tsx` 606
  - `pages/performance-table/schema.ts` 549
  - `complex-pages/shared/mock-backend.ts` 502（基线关注文件之二，同上历史）
- 拆分建议：
  - `showcase-env.ts`：if 链按端点域拆为 `handlers/user.ts`、`handlers/order.ts`、`handlers/sundial.ts`、`handlers/dashboard.ts` 等，每模块导出 `(db, api) => handled?` 的匹配器，`createShowcaseEnv` 组合即可（当前 460+ 行全是单函数内 if 链，天然可分）。
  - `mock-backend.ts`：数据种子（DEPARTMENT_NAMES/USER_NAMES/订单生成循环）与类型/工具（filterSundialTasks、buildDeptTreeOptions、MOCK_DICTS）分文件；两者合计约 1,145 行，拆后各 <400。
- 注意：无需注册 ERROR 豁免（不满足 700 门槛，见 F-09）。

### F-11 standard-crud 说明文案宣称不存在的 `relatedRoleList{roleName}`（D2）

- 位置：`apps/playground/src/complex-pages/page-schemas/standard-crud.json:12`
- 摘录：`"…列表列直接显示 status_label；角色字段为 relatedRoleList{roleName}。"`
- 问题：该页 columns 无 role 列，mock `toUserListRecord` 返回的是 `role: {value, label}`（mock-backend.ts:161），全仓无 `relatedRoleList`。
- 影响：文案演示了一个并不存在的取数形态，误导读者以为该页覆盖了关联对象字段。
- 修复方向：改文案为实际形态（`role.label` / `role:{value,label}`），或真加一列演示。

### F-12 showcase-env navigate 的死三元与 replace 全页刷新（D1 代码异味）

- 位置：`apps/playground/src/complex-pages/shared/showcase-env.ts:630-636`
- 摘录：

```ts
const url = String(input);
if (options?.replace) {
  window.location.replace(url);
} else {
  window.location.hash = url.startsWith('#') ? url : url; // 两支相同
}
```

- 问题：`url.startsWith('#') ? url : url` 显然是未完成的归一化意图（应类似 `'#' + url`）；当前行为碰巧可用（hash 赋值自动补 #）。`replace` 分支用 `window.location.replace` 会整页刷新，对 hash 路由宿主过重。
- 修复方向：删三元或实现真正归一化；replace 用 `window.location.replace(`${pathname}${search}#${bare}`)`（对齐 use-route.ts 的 applyRoute）。

### F-13 Sundial mock 静态与动态数据混杂，部分端点无 UI 消费（D1 / D6）

- 位置：`apps/playground/src/complex-pages/shared/showcase-env.ts:479-610`、`mock-backend.ts:391-433`
- 问题：
  - `Sundial__summary/trend/energy/pressure/outputStructure` 返回硬编码数字（如 pressure `total: 14`、summary `todayCompleted: 6`），与 `Sundial__todos` 读的 `db.sundialTasks`（10 条）来源脱节，用户勾选任务后 summary 永不变；
  - `Sundial__todos / updateTodoItem / subtasks / todayTasks` 四个端点没有任何 page-schema 引用（仅 `__tests__/sundial-mock-backend.test.ts` 使用）——sundial-workbench/detail 走 PAGE_DATA 作用域状态，不碰 mock。
- 影响：演示数据口径不一致（分析页与工作台数字对不上）；一段"只服务测试"的 handler 撑大了 showcase-env 体量。
- 修复方向：静态数字改为从 db 派生或注明 fixed-fixture；无 UI 消费的端点随 F-10 拆分移入 sundial handler 模块并考虑删除。

### F-14 已付款订单的支付记录 status 为 `pending`（suspect）（D1）

- 位置：`apps/playground/src/complex-pages/shared/mock-backend.ts:345-352`
- 摘录：

```ts
      payments.push({
        ...
        status: status === 'paid' ? 'pending' : 'success' as const,
```

- 问题：语义倒置——`paid` 订单的 payment 是"处理中"，`shipped/done` 反而是"成功"。可能是为演示 method_label/status_label 才故意造出 pending 样本，但按业务直觉更像笔误。
- 影响：仅 mock 展示数据；若开发者照抄该生成规则会得到误导性样例。
- 修复方向：确认意图；若为造样本，加一行注释，或改为独立构造一条 pending 样本。

### F-15 demo 页类型逃逸与 console 出口的系统性模式（D6 开发体验）

- 统计：非测试源码 `as any` 30 处 + `as never` 42 处（集中在 w1-w4/m5/barcode/table-\* 等 pages 的内联 schema 对象，如 `pages/barcode-demo.tsx:77-93`、`pages/table-popover-demo.tsx:121,179`）；`console.log/info` 作为 env.notify 出口约 30 处（`pages/graph-demo.tsx:25`、`pages/gantt-demo.tsx:19-22` 等）。
- 问题：内联 schema 不标注 `SchemaInput`/`BaseSchema`，renderer prop 改名时 demo 无编译期防护；console notify 是有意设计（demo 页可见反馈），但无统一开关。
- 影响：demo 与 renderer 能力漂移只能靠 e2e 发现；console 噪音在调其它问题时干扰有限。
- 修复方向：新页面沿用 `complex-pages/shared/render-host.tsx` 与 `button-lab-page.tsx` 的做法（schema 标 `BaseSchema`、props 走类型化包装）；console notify 可保留，不必整改。
- 反误报说明：complex-pages 的 JSON schema 经 `SCHEMA_CACHE` 以 `SchemaInput` 类型加载（schema-page.tsx:12-16），该路径已有类型约束，不在本条范围。

### F-16 mock 取数无延迟模拟；demo 图片依赖外链（D6）

- 位置：`showcase-env.ts`（fetcher 全同步返回，对比 `flux-basic-page.tsx:38-58` 有 delay+abort 实现）；`pages/m5-mobile-showcase-schemas.ts:2-7` 等（`https://picsum.photos/...`）。
- 问题/影响：complex-pages 全部页面无法演示 loading/骨架态（对验证 loading UI 是盲区）；picsum 外链在离线开发时全部裂图。
- 修复方向：fetcher 顶部加可配置 `delayMs`（URL 参数或常量开关）；图片可换本地占位或注明需联网。

### F-17 全局注入与可发现性杂项（D3 / D7）

- `styles.css:18` 全局 `@import './sundial-replica/sundial-replica.css'`（699 行单一 demo 家族样式全站加载；文档允许 example-shell 样式入 styles.css，属低风险耦合）。
- DOMAIN_RENDERER_ROUTES 共 74 条，home 卡片仅 23 条——53 个页面只能靠深链/互链到达（含本次新发现的 scheduling lab 3 个，见 F-03）；导航发现性是 playground-experience.md "home 是导航枢纽" 的已知裁剪，非缺陷，但清单增长后建议加"全路由索引页"。
- D7 i18n：demo 文案中英文混排（如 Complex Pages 侧栏 "Back to Home" + 中文正文），playground 不接 flux-i18n（仅 main.tsx 初始化），按演示代码标准不视为问题；无 `check:i18n-keys` 违规面。

## 检查过程记录

1. **结构与基线**：读 playground-experience.md → package.json → 全目录统计（344 文件/44,684 行 ts）。核实基线偏离 1：两文件 644/502 行（脚本计数法），处于 WARN 档而非 ERROR 档；进一步用 git 历史证伪"阈值收紧"假说（500/700 自 2026-04-18 未变），基线引用输出不可复现（F-09）。
2. **mock 后端精读**：mock-backend.ts + showcase-env.ts 全文；对照 `packages/flux-runtime/src/async-data/request-runtime.ts`（params→URL 序列化）与 `runtime-action-helpers.ts:120-133`（**autoPagination 注入 params）核实分页链路——`User**findPage`返回全量行配合 schema`loadAllData: true` 是**有意的客户端分页**（反误报，非缺陷）；`Department\_\_findPage` 的 URL query 分页解析与请求层一致。
3. **schema 契约核对**：JSON 遍历 19 个 page-schemas 提取全部 (url, method) 对，与 mock handler 的 URL+method 门逐条比对 → 仅 `PurchaseOrder__save` 失配（F-02）；其余 43 个端点全部匹配（含 `OrderItem__findPage` 要求 POST、schema 也确实声明 POST）。
4. **路由核对**：route-model/use-route/App.tsx 精读；脚本化比对 home 卡片(23) ⊆ domain 清单(74)（无失配）、domain 清单 ⊆ App switch case → 发现 `dingtalk-flow-demo` 唯一失配（F-05）；component-lab CATEGORY_ORDER 与实际 category 并集比对 → 发现 scheduling 丢失（F-03）。
5. **全局副作用**：window 写入 5 处（**NOP_DEBUGGER** 常驻有意；**SPREADSHEET_DEMO** / **REPORT_DESIGNER_HOST** / **NOP_PERF_DIAGNOSTICS** 均有清理）；setInterval/setTimeout 抽查均有 cleanup；无 `document.write`/裸 `innerHTML`；XSS 样本字符串为 markdown 安全测试 fixture（有意）。
6. **grep 扫描**：密钥/token 零命中（openai-connector 走 `VITE_*` env + mock 回退，正确）；空 catch 零命中；`as any` 30 / `as never` 42（F-15）；console 出口约 30 处（有意设计，F-15）；TODO/FIXME 零。
7. **正向确认清单**（未列入 findings）：route-matrix.test.ts 覆盖全部 6 种 RouteSpec round-trip + registry 对账；complex-pages.test.tsx 渲染覆盖 19 页且含"无孤儿 registry 项"测试；performance-table 页面文案与 playground-experience.md 的"诚实基线"条款一致；ai-conversations-demo 的真实/mock 连接器回退正确；confirm-bridge 单实例假设在当前页面结构下成立。
8. **未覆盖**：e2e（按任务说明不重跑，3 个 watch-only 终态失败与 2 个 scada 残留不重复上报）；component-lab 144 个 lab 页未逐页精读（抽样 4 个 + registry/分类核对）；`flow-designer/`、`taskflow-designer-lib/` 仅做行数与 grep 级检查，未发现上述模式外的问题。
