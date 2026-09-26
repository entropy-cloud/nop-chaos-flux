# Host Channels 契约设计——print / clipboard / download / toast / filter↔URL（missing-components L3）

> Status: active（契约设计文档，plan 512 Phase 1 design gate，2026-09-26）
> 裁定对象：roadmap §6 L3.1–L3.5 五通道的 API 归属（INV-2 A 组合 / B importLoader / C 扩 env）、接口形状、capability check、SSR/test 降级路径
> 关联：`docs/architecture/renderer-env.md`（§4 INV-2 流程；stream/openSocket 先例）、`docs/analysis/visual-quality/2026-09-24-page-archetype-coverage-audit.md` §3.2 N2、§3.6 规则 3（复用 action 词汇）、`docs/analysis/ui-review/C2-capability-gaps.md`（素材行）、`docs/architecture/action-scope-and-imports.md`
>
> Review record（2026-09-26，fresh-session 独立评审）：Verdict `pass`。0 Blocker / 3 Major / 5 Minor，全部当轮落字：①L3.5 sync helper owner 包更正（basic → data）；②L3.5 syncUrl 语义补全（多实例键冲突 / popstate 单发 / 序列化）；③三通道 C 档论证按 live 消费方诚实重写（裁定不变）；Minor：§3.6 引用更正、downloadBlob canonical 位置、decorator hooks 要求、copy 成功反馈缺省、Phase 2 挂载计数措辞、renderer-api 评审来源注释要求。

## 0. 总裁定一览

| 通道            | 裁定                                        | env 面                            | action 词汇面               | 宿主面                                       |
| --------------- | ------------------------------------------- | --------------------------------- | --------------------------- | -------------------------------------------- |
| L3.1 print      | **C 档**：env 通道 + action 词汇双落        | `env.print?: () => void`          | `print`（新增 built-in）    | playground `window.print()` 代理             |
| L3.2 clipboard  | **C 档**：env 通道 + action 词汇双落        | `env.clipboard?: ClipboardWriter` | `copy`（新增 built-in）     | playground `navigator.clipboard` 代理 + 降级 |
| L3.3 download   | **A 档**：纯 action 组合，不扩 env          | —                                 | `download`（新增 built-in） | `downloadBlob` 触发保存                      |
| L3.4 toast      | **宿主约定**：零 API 变更                   | —                                 | —                           | app-shell 单例 `<Toaster/>`                  |
| L3.5 filter↔URL | **C 档**：env 通道 + 渲染器共享 sync helper | `env.location?: EnvLocation`      | —                           | hash router 读写实现                         |

## 1. L3.1 print——C 档

**场景**：C6 订单/单据打印（archetype 唯一 Blocked 行）；AntD Pro 详情页打印按钮现静态保留。语义为「把当前页面/视图送入宿主打印管线」（`window.print` 型），与 web-print 设计器轨道（模板级打印，已 closed）分立。

**INV-2 裁定（C 档 5 条）**：host transport boundary ✅（打印是宿主系统能力，不是业务连接器）；importLoader 不能优雅覆盖 ✅（B 档适合业务 SDK，打印是系统调用）；跨 host 可统一抽象 ✅（web=window.print / SSR=不支持 / test=spy 桩）；与现有 env 同族 ✅（与 navigate/notify/confirm 同属页面级系统能力族——第 5 条按「能力族归属」读，非 fetcher/stream 式「同一抽象两个 mode」）。**通用性（诚实计数）**：live 消费方 1（AntD Pro 详情按钮，C6 唯一 Blocked 行）；预期消费面 detail/invoice/crud 导出页 2+。单看第 1 条不足 3+ live，C 档成立的**主依据**是结构面：built-in `print` action 需要规范 env 通道才能跨 host 可移植地绑定（B 档 import namespace 会使 built-in action 依赖 host 私有 import 名，schema 失去可移植性），且打印与 navigate/notify 同族。

**接口**（`flux-core/src/types/renderer-api.ts`，optional，向后兼容）：

```ts
/** 把当前视图送入宿主打印管线。可选；使用前必须 capability check。 */
print?: () => void;
```

**action 词汇**：built-in `print`（无 args；archetype §3.6 规则 3——通道经既有 `xui:actions` 程序模型派发，禁止 per-renderer 直调）。执行语义：`env.print` 缺失 → `ok:false` + i18n 错误文案（`flux.action.printUnsupported`，zh/en），不抛未捕获异常；`control` 与其他 action 一致可用。

**SSR/test 降级**：SSR host 不提供 `env.print` → action 返回失败文案（用户可见 toast，同上）；test host 提供 spy 桩以便断言「被调用」。

## 2. L3.2 clipboard——C 档

**场景**：share/copy-link（Cal/Linear/Notion 三处现为「零副作用 get 端点 + 假成功 toast」语义模拟，C2 :137/:172/:201）。

**INV-2 裁定**：同 print——剪贴板写入是宿主系统能力；web/SSR/test 三 host 形态各异；importLoader 覆盖不了系统调用。**通用性是五通道中最强的（live 计数 ≥4 个不相关组件）**：复刻 copy-link ×3（Cal/Linear/Notion）、`flux-renderers-content` json-view 复制钮（`json-view.tsx:63` 现直调 `navigator.clipboard`）、`flux-code-editor` variable-panel 复制（`variable-panel.tsx:41` 现直调）、`flux-renderers-data` table 单元格复制（经 basic `copyToClipboard` util）。**既有直调面迁移动**：上述直调/util 消费方后续 rebase 到 `env.clipboard`（不阻塞本线，登记 follow-up；clipboard 不在 INV-1 禁单内，属「从未裁定」而非违规）。C 档成立。

**接口**：

```ts
export interface ClipboardWriter {
  /** 写入文本到系统剪贴板。失败 reject（调用方转 toast 错误）。 */
  writeText(text: string): Promise<void>;
}
// RendererEnv 增：
clipboard?: ClipboardWriter;
```

**action 词汇**：built-in `copy`，args `{ content: string; successMessage?: string }`（content 支持表达式模板；`successMessage` 缺省发 `flux.action.copySuccess` 默认成功文案——保 C2 语义模拟的成对反馈，但以真实写入为前提；与既有 `showToast` 边界：showToast 是裸通知词汇，copy = 写入 + 成对反馈，二者不互替）。执行语义：`env.clipboard` 缺失 → `ok:false` + `flux.action.copyUnsupported`；`writeText` reject → `ok:false` + 错误 toast（**不静默假成功**——C2 素材行的反面即契约）。

**SSR/test 降级**：SSR 无剪贴板 → action 失败文案；test/playground e2e 用 Chromium `clipboard-read/write` 权限 + `navigator.clipboard.readText` 断言真实写入。

## 3. L3.3 download——A 档

**场景**：D2 报表导出 UI；导出文件本体是后端职责（showcase `/r/User__export` 先例：后端产 CSV → 客户端触发保存）。现状无声明式 action，导出确认载荷靠语义模拟。

**INV-2 裁定（A 档组合）**：`fetcher` 已支持 `responseType: 'blob'`（schema-base-types :39/:57），下载管线已存在于 **`flux-runtime/src/async-data/blob-download.ts`**（flux-runtime index 已导出 `downloadBlob`，并配套 `normalizeBlobResponse` / `resolveDownloadFilename` / content-disposition 解析 / JSON-in-blob 错误恢复——Phase 5 runner 复用此 canonical 管线；`flux-renderers-scheduling/kanban/utils/kanban-export.ts:52` 另有一份本地早期拷贝，不作组合面）——**既有 env 能力组合即可覆盖，不扩 env**。新增 built-in `download` action 把两者接成声明式词汇。

**action 词汇**：built-in `download`，args 三态（2026-09-26 按实施回写，QA.1-L3 Minor-2——不提供裸 http(s) 文件 URL 的 GET 直存形态）：① `{ api: ExecutableApiRequest 形状（url/dataType/responseType='blob'/data…） }` 直取 blob；② `{ url: 'data:…', filename? }` data: URL 原位解码直存（`dataUrlToBlob`，零 fetch）；③ `{ url: 端点 }` 响应含 `url` 字段（后端返回下载地址，可为 `data:` URL 或 http[s] 地址）——先取回响应解析出 `url` 字段，再复用同一 blob 管线保存（`data:` 直接转 Blob，http[s] 二次 GET `responseType:'blob'`），响应 `filename` 字段优先。单一生成保存路径，不开放 `<a href>` 直跳旁路。`filename` 缺省取响应 header（content-disposition）/最终 URL 推断（复用 `resolveDownloadFilename`）。与既有 `ajax` 边界：ajax 只取数不触发保存；download 只做「取 blob → 触发保存」。执行语义：非 2xx 走 ajax envelope 错误模型 + notify error。

**SSR/test 降级**：blob 保存是纯浏览器行为；SSR 下 action 返回失败；test 以 Playwright `download` 事件断言。

## 4. L3.4 toast——宿主约定（零 API 变更）

**场景**：C2 回写③④⑤——复杂页每 host 各挂 `<Toaster/>`，跳转型动作链 host 卸载致 toast 存活 <100ms，三 replica 以 `control:{debounce:1200}` 延迟 navigate 打补丁。

**裁定**：根因是**宿主挂载拓扑**，不是 API 缺口——`env.notify` → `toast()` 本就是全局单例存储（sonner），宿主只要保证**app shell 级唯一常驻 `<Toaster/>`**（路由内容卸载不死）即可。渲染器/runtime 零改动。

**宿主约定**（落 `docs/architecture/playground-experience.md`）：①`<Toaster/>` 只在 app shell 挂载一次；页面/host 组件禁止自带（showcase-render-host 现挂载点移除，29 个 demo 页内联挂载一并清扫防双 viewport 重复渲染）；②跳转型动作链的 `control:{debounce}` 延迟 navigate hack 全部移除（AntD Pro ×3 / Cal ×3 / Linear ×1，Notion 本就没有）；③该约定进 host 责任清单（renderer-env.md §5 宿主表注记）。

**SSR/test 降级**：不适用（无 API 面）。

## 5. L3.5 filter↔URL——C 档（env.location）+ 共享 sync helper

**场景**：A4/C5 深链（筛选状态 ↔ URL 双向）；D1 池 #9（C2 :266/:269 池⑤）；stripe/airtable 现有 ad-hoc URL 物化各自为政。

**INV-2 裁定（C 档）**：URL 读取/查询串改写是宿主 router 的系统能力，runtime 现无任何读取通道（`navigate` 只写不读——env 路由族的读写不对称是本通道的结构性依据）。SSR（静态 location 桩）/web（hash/history router）/test（内存 router）可统一抽象 ✅；importLoader 不适用（router 是 host 基座不是业务连接器）✅。**通用性（诚实计数）**：live 消费方 2（crud、query-filter——同属筛选域，相关组件）；预期消费面 tabs 深链 / wizard 步骤态 / table 列筛选 2+。单看第 1 条（3+ **不相关**组件）live 不足。C 档成立的**主依据**是结构面：①共享 sync helper 与 `syncUrl` prop 是框架自有代码，不能依赖 host 私有 import namespace（B 档会使渲染器包耦合 host 约定名，契约不可成立）；②A 档不可行（env 无任何 URL 读取通道可组合）；③宿主侧自理即 C2 回写⑧认定的「stripe/airtable ad-hoc 各自为政」现状，正是本通道要治理的对象。

**接口**：

```ts
export interface EnvLocation {
  /** 当前 URL 的查询参数（host router 视角，hash 路由取 hash 内 query）。 */
  getQuery(): Record<string, string>;
  /** Merge-patch 查询参数；值为 undefined 的键删除。缺省 replace。 */
  setQuery(patch: Record<string, string | undefined>, options?: { replace?: boolean }): void;
}
// RendererEnv 增：
location?: EnvLocation;
```

**渲染器面**：共享 sync helper 落 `flux-renderers-data`（crud/query-filter 的 owner 包，live 核对：`crud-schema.ts` / `query-filter.tsx` 均在 data 包；包依赖方向 data → basic，helper 先落 owner 包单一实现，第三消费方出现再评估上提）单一实现：schema prop `syncUrl?: boolean`（默认 false）。开启时：①初始加载从 `env.location.getQuery()` 恢复筛选键（未知/非法键忽略——Failure Paths 容忍语义）；②筛选变更 → `setQuery(patch, { replace: true })`（不产生 history 记录）。`env.location` 缺失 → `syncUrl` 静默关闭 + dev 一次性警告。

**syncUrl 语义补全（review 补丁，三者均可测）**：

1. **多实例键归属**：查询参数袋是页面级的，同页多个 `syncUrl` 实例共用。默认键 = 筛选字段名原样（`filterStatePath` 切片键）；约定**同页多实例不得声明同名键**，helper 挂载时检测碰撞（同页第二实例声明已占用键）→ dev 警告 + 后到实例 `syncUrl` 降级关闭（先到优先，确定性优于 last-write-wins）；host router 自留键（路由 param 等）不读不写。
2. **popstate/back 语义（单发同步）**：URL → 状态同步**仅在挂载时发生一次**；写入恒为 replace，本 helper 不订阅 popstate、不回放筛选状态（浏览器 back 离开本页后返回 = 重新挂载 = 重新恢复，语义自洽）。若未来 host 需要页内 back 即时回放筛选，扩 `EnvLocation.onChange` 再走 INV-2，不在本契约内。
3. **值序列化**：`EnvLocation` 值域是 `string`，非 string 筛选值（多选数组等）由 helper 定义确定性编码（数组 = 逗号 join，其余 `String(value)`；空数组/空串写删除键），单测锁定编解码对称。

**边界**：stripe/airtable 既有 ad-hoc 物化不迁移（roadmap §12 错峰规则，归 L4.9 窗口 rebase）。

**SSR/test 降级**：SSR host 提供静态 stub（getQuery 返回空、setQuery no-op）；test host 提供内存实现。

## 6. 实现清单（Phase 2–6 的依据面）

| Phase | 落点                                                                                                                                                                    |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2     | App shell 单例 Toaster + 内联挂载清扫（29 个 demo 页 + render-host 共 30 处）+ 7 处 debounce hack 移除 + replica e2e 断言迁移                                           |
| 3     | `renderer-api.ts` print 字段 + `constants.ts` print 定义 + action-core runner case + runtime adapter case + playground env.print + AntD Pro 详情按钮接线 + e2e spy 断言 |
| 4     | ClipboardWriter + copy 定义/runner/adapter + playground clipboard 实现（权限降级）+ 三 replica 接线 + e2e clipboard 断言                                                |
| 5     | download 定义/runner/adapter（fetcher blob + `flux-runtime/async-data/blob-download.ts` canonical 管线组合）+ showcase 导出链接线 + e2e download 事件断言               |
| 6     | EnvLocation + playground hash 实现 + data 包 sync helper（含多实例键归属 / popstate 单发 / 序列化三补丁单测）+ crud/query-filter `syncUrl` prop + 深链 e2e              |

新 action 三词汇统一要求：`constants.ts` fieldRules 声明（evaluable args 面）、action-core invocation、runtime adapter 执行、flux-i18n 错误键（zh/en）、`action-scope-and-imports.md` 登记、focused 单测（成功/降级/错误三路径）。

env 三字段统一要求（对齐 stream/openSocket 先例）：`renderer-api.ts` 字段注释携带评审来源指向本文（先例：stream/openSocket 的 `// 评审来源：` 块注释，renderer-api.ts:55-58 同款）；`RendererEnvDecoratorHooks`（`flux-core/src/utils/renderer-env.ts:12`）同步扩 `print` / `clipboard` / `location` hook（保持 debugger/审计拦截无盲区——stream/openSocket 于 2026-07-23 同步扩 hook 的先例）；回写 `renderer-env.md` §2 全集 / §5 host 责任表 / §4.3 历史扩充记录。
