# 512 Missing Components L3 — Host channels（print / clipboard / download / toast / filter↔URL）

> Plan Status: completed
> Last Reviewed: 2026-09-26
> Source: `docs/backlog/missing-components-and-designer-roadmap.md` §6（L3 全表 + §1 交付铁律）+ `docs/analysis/visual-quality/2026-09-24-page-archetype-coverage-audit.md` §2（C6 Blocked 行）/ §3.2（N2 五行）/ §3.6 规则 3（「Reuse the action vocabulary」；初稿误写 §10.2，契约评审更正）；`docs/architecture/renderer-env.md`（必读已过：§2 字段全集、§4 INV-2 流程、§6 使用规则）
> Related: `docs/discussions/2026-07-21-env-stream-and-websocket-extension.md`（env 扩充先例）；`docs/analysis/ui-review/C2-capability-gaps.md`（toast debounce / copy-link 语义模拟 / D1 池素材行）

## Purpose

收口 roadmap L3 线五个 host channel 工作项：C6 订单打印解锁（L3.1）、剪贴板真实写入（L3.2）、声明式下载 action（L3.3）、host 级常驻 toast 容器（L3.4，治理三 replica 的 debounce hack）、filter↔URL 深链（L3.5）。每项先出通道契约设计（含 capability check 与 SSR/test 降级路径）并过 INV 审计，再实现。

**单计划边界依据**：五通道共享同一 design gate（Phase 1 契约裁定）、同一 owner doc 面（`renderer-env.md` / `action-scope-and-imports.md`）与同一宿主验证面（playground host + e2e），符合 plan guide Rules 22/24/26 合并优先；roadmap §13 对 L3 为单行登记（L3.1–L3.5），先例见 plan 503（L1 三 work item 单计划收口）。roadmap §14 Rule 4「每 work item 一个 plan」在本线按 §2「每线内工作项 = 一个 execution plan 的合理范围」与 503 先例读作「每线一 plan、线内 Phase 对齐 work item」。

## Current Baseline

2026-09-26 live repo 核对（HEAD `63b371fd8` 后续随 511 推进更新）：

- **env 现状**（`packages/flux-core/src/types/renderer-api.ts:177` `RendererEnv` 接口，已实施字段）：`fetcher / stream / openSocket / notify / confirm / alert / navigate / loadPage / loadDict / hasRole / importLoader / resolveImportUrl / functions / filters / locale`。**无 print、无 clipboard**（archetype 审计实证「verified absent from renderer-api.ts」）。
- **action 词汇现状**（`packages/flux-action-core/src/action-dispatcher/built-in-actions.ts`）：built-in 集合 = setValue/setValues/ajax/openDialog/openDrawer/closeDrawer/closeDialog/closeSurface/showToast/confirm/alert/refreshTable/refreshSource/refreshNearest/pick/submit/submitForm/navigate。**无 copy、无 download、无 print**。archetype 审计 §3.6 规则 3（「Reuse the action vocabulary」；初稿误写 §10.2，契约评审更正）裁定：通道优先复用 action 词汇，禁止 per-renderer addEventListener 岛。
- **L3.1 print 现场**：AntD Pro 详情页打印按钮静态保留（`docs/analysis/ui-review/C2-capability-gaps.md:109`）；print-designer 线（flux-print-\*，web-print-roadmap P0–P4 closed）是**模板设计/打印模板渲染**轨道，与运行时页面 body 的 `window.print` 型宿主通道是两回事（archetype §2 D5 行已区分）。C6 archetype 因此 Blocked。
- **L3.2 clipboard 现场**：三处 copy-link（Cal `__shareLink` / Linear `__copyLink` / Notion `__copyLink`）均为「零副作用 get 端点 + `messages.success` 已复制」语义模拟，**实际剪贴板写入未做**（C2 :137/:172/:201）。
- **L3.3 download 现场**：`responseType: 'blob'` 已在 schema 契约（`flux-core/src/types/schema-base-types.ts:39/:57`）；`downloadBlob` 工具已存在（`flux-renderers-scheduling/src/kanban/utils/kanban-export.ts`）；用户导出链现为「后端生成 CSV dataURL → 返回 url 字段」语义模拟（showcase-env `/r/User__export`），无声明式 action。
- **L3.4 toast 现场**：`ShowcaseSchemaHost`（`apps/playground/src/complex-pages/shared/render-host.tsx:103`）**每 host 实例挂一个 `<Toaster/>`**；跳转型动作链（AntD Pro/Cal/Linear 提交-跳转；Notion 无此 hack）中 host 卸载致 toast 存活 <100ms，三 replica schema 以 `control: {debounce: 1200}` 延迟 navigate 补丁保 toast 可观察（C2 :108/:142/:181，回写③④⑤；live：antdpro-form-basic/grouped/step + cal-confirm/cal-success + linear-detail 共 6 文件 7 处）。
- **L3.5 filter↔URL 现场**：runtime 无筛选状态 ↔ URL 绑定；stripe/airtable 复刻有 P6b/P7b ad-hoc URL 物化（C2 :266 候选 1 / :269 P7b 池汇总⑤，回写⑧）；A4/C5 archetype 深链缺失。`env.navigate` 已存在但**无 URL 读取通道**（deep-link 恢复需要读 URL 的能力面，INV-2 需裁定）。
- INV-2 A/B/C 档流程与 C 档 5 条标准见 `renderer-env.md` §4；`stream/openSocket`（2026-07-23）为 C 档先例：接口进 env（optional）+ host 默认实现 + decorator hooks + capability check。
- 测试基建：playwright e2e + per-package vitest；`tests/e2e/` 有 antdpro/cal/linear/notion replica 交互 spec 在案（toast/copy-link 语义模拟断言的现役位置）。

## Goals

- 一份通道契约设计文档落盘 `docs/discussions/2026-09-26-host-channels-print-clipboard-download-toast-url.md`：五通道逐项 INV-2 裁定（A 组合 / B importLoader / C 扩 env）+ 接口形状 + capability check + SSR/test 降级路径 + 与既有词汇（showToast/navigate/ajax）的边界。过独立 review 后回写 `renderer-env.md`（含 §4.3 历史扩充记录）。
- L3.1：`env.print?`（或 action 裁定等效面）+ playground host 实现 + AntD Pro 订单详情打印按钮接线 + e2e（打印通道被调用的程序化断言）。
- L3.2：剪贴板通道（action `copy` 或 env 裁定面）+ host 实现（`navigator.clipboard` 代理 + 降级路径）+ 三处 copy-link 复刻从「语义模拟」升级为真实写入（保留 toast 反馈）+ e2e。
- L3.3：声明式 `download` action（fetcher `responseType:'blob'` + downloadBlob 组合；export 本体仍是后端职责）+ e2e。
- L3.4：playground 宿主**应用级常驻 Toaster**（route 卸载不死）+ 三 replica（AntD Pro/Cal/Linear）`control:{debounce}` navigate 延迟 hack 移除（schema 层）+ 相关 replica e2e 断言迁移 + e2e（跳转后 toast 仍可观察的程序化断言）。
- L3.5：filter↔URL 绑定契约（crud/query-filter 状态 ↔ URL query，host router 集成；URL 读取能力面按 INV-2 裁定）+ 深链恢复 e2e。
- 全量验证：typecheck/build/lint/test/check + e2e 全量零新增红 + dev log + roadmap §13 回写。

## Non-Goals

- 不做后端打印服务/静默打印（web-print 轨道已 closed，与本线分立）。
- 不建新 renderer type（五项均为通道/动作/宿主能力，无 matrix flip）。
- 不改 `showToast`/`navigate`/`ajax` 既有语义（新通道只做增量）。
- L3.5 不重写 stripe/airtable 已有 ad-hoc URL 物化为新契约（登记 follow-up，归 L4.9 协调窗口按 §12 错峰规则处理）。

## Scope

### In Scope

- `flux-core`（env 类型 + built-in action 定义，若 INV-2 裁定扩 env/action）、`flux-action-core`（新 built-in action runner）、`flux-react`/`flux-runtime`（action adapter 接线，如需）、`apps/playground`（host 实现 + demo 接线 + schema hack 清理）、`tests/e2e/`。
- 契约设计文档 + `renderer-env.md` / `action-scope-and-imports.md` / `playground-experience.md` 回写。

### Out Of Scope

- renderer 组件新增；SSR host 实现（降级路径写入契约文档即可）；mobile 包通道变体。

## Failure Paths

| 可测场景编号                 | 触发                                                                         | 行为                                                                 | 可重试 | 用户可见表现                     |
| ---------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------ | -------------------------------- |
| capability-missing-print     | host 未提供 `env.print` 即派发 print action                                  | action 返回 `ok:false` + error（i18n 文案键），不抛未捕获异常        | 是     | toast 提示「当前环境不支持打印」 |
| print-invoke-fail            | host 已提供 print 通道但调用失败（打印 iframe 被拦截 / `window.print` 异常） | 返回 `ok:false` + error（i18n 文案键）+ notify error，不抛未捕获异常 | 是     | 错误 toast                       |
| capability-missing-clipboard | host 未提供剪贴板通道 / `navigator.clipboard` 权限拒绝                       | 通道降级：execCommand 回退或返回失败 + 现行 toast 反馈保留           | 是     | 复制失败提示（非静默假成功）     |
| download-fetch-fail          | download action 的 blob 请求非 2xx                                           | 走 ajax 既有 envelope 错误模型 + notify error                        | 是     | 错误 toast                       |
| url-sync-invalid-param       | URL query 含非法/未知 filter 参数                                            | 容忍解析：忽略非法键，合法键恢复；不崩页                             | 是     | 页面以可恢复状态打开             |
| toast-container-double-mount | 宿主重复挂载常驻 Toaster                                                     | 单例约定（app shell 唯一）；per-page 移除                            | 否     | 无重复 toast                     |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——通道契约属公共 API 面（env/action 词汇），roadmap §1 铁律 4（focused 单测 + e2e 先于或随实现落地）。

执行约定：各 Phase 的 focused 单测 / e2e **先于或随实现落地**（roadmap §10 对代码线 plan 的预声明），Phase 内 bullet 顺序不构成「实现后补测」口径；先红后绿为先例姿势（plan 503/505 先例）。

## Execution Plan

### Phase 1 - 五通道契约设计 + INV-2 裁定（design gate）

Status: completed
Targets: `docs/discussions/2026-09-26-host-channels-print-clipboard-download-toast-url.md`、`docs/architecture/renderer-env.md`

- Item Types: `Decision`

- [x] 契约文档落盘：`docs/discussions/2026-09-26-host-channels-print-clipboard-download-toast-url.md`（五通道裁定：print C / clipboard C / download A / toast 宿主约定 / filter↔URL C——sync helper owner 包经评审 M1 更正为 **flux-renderers-data**；syncUrl 三语义补丁：多实例键冲突先到优先、popstate 单发语义、序列化编解码规则）
- [x] 独立 review 共识（fresh 子 agent，2026-09-26：0B/3M/5m 全部当轮落字，裁定零变更——M3 压测 location 字面 3+ 不达标但结构性依据成立不改档）；owner docs 回写完成（renderer-env.md §2 状态声明+接口块+§4.3 历史+§5 host 表、action-scope-and-imports.md built-in 枚举 +§478 段）

Exit Criteria:

- [x] 契约文档含五通道明确裁定（无「待定」残留）+ review 记录在案（文档 Review 头注）
- [x] `renderer-env.md` / `action-scope-and-imports.md` 回写与裁定一致（grep 复核：print/clipboard/location 三字段 + 2026-09-26 历史行 + host 表三行 + built-in 枚举段命中）

### Phase 2 - L3.4 toast host 容器（先做：解锁后续 e2e 断言基线）

Status: completed
Targets: `apps/playground/src/App.tsx`（或 app shell 布局点）、`render-host.tsx`、AntD Pro/Cal/Linear 共 6 个 replica schema、相关 e2e

- Item Types: `Fix`、`Proof`

- [x] 应用级单例 `<Toaster/>` 落 `App.tsx` shell（route/页面卸载不死）；**全部 30 处页面/host 级挂载清扫**（render-host + 29 demo 页——契约 §4 双 viewport 重复渲染约束要求唯一挂载点）；`playground-experience.md` Core Rules +6 宿主约定
- [x] AntD Pro（×3）/ Cal（cal-confirm ×2 + cal-success ×1）/ Linear（×1）共 7 处 `control:{debounce: 1200}` hack 移除（6 文件，文本级精准编辑保格式；grep 复核 = 0 命中）
- [x] e2e：linear 测试 18 重写为幸存语义断言（点击归档 → 先落列表页 → 再验 toast 仍在，程序化）；antdpro 测试 14 按「toast 幸存 → 悬停暂停自动消失」真实行为等待消散后点击；linear+cal 34/34、antdpro 23/23、playground 单测 391/391（3 个直接渲染页面组件的测试挂具补挂 Toaster——挂具承接 app-shell 职责）

Exit Criteria:

- [x] 6 文件 7 处 debounce hack 删除（grep `"debounce"` page-schemas = 0 命中）且相关 replica e2e 复绿（linear+cal 34/34、antdpro 23/23）
- [x] 新增 e2e 断言：navigate 后 toast 仍可观察（linear 测试 18 幸存语义 + antdpro 测试 14 跨 hash 导航存活等待）

### Phase 3 - L3.1 print 通道

Status: completed
Targets: env 类型 / host 实现 / AntD Pro 详情页 schema / e2e

- Item Types: `Fix`、`Proof`

- [x] print 通道落地：`renderer-api.ts` `print?: () => void`（评审来源注释）+ `constants.ts` 定义 + action-core runner case + runtime adapter case（缺失 → `notify('warning', flux.action.printUnsupported)` + `ok:false`；flux-runtime 新增 flux-i18n 依赖，无环）；playground host `showcase-env.ts` `window.print()` 代理
- [x] AntD Pro 订单详情打印按钮接线 `onClick: {action: 'print'}`（antdpro-detail-basic.json）+ e2e `window.print` spy 程序化断言（测试 21b，addInitScript 标志面轮询）；focused 单测缺失/命中双分支（runtime 1441/1441；core 513 / action-core 210 / react 520 全绿）

Exit Criteria:

- [x] print 通道 + host 实现落地，focused 单测在案（capability missing → warning toast + ok:false 双断言）
- [x] e2e 断言通过（`window.print` spy 轮询为 true——C6 打印链路可观察）

### Phase 4 - L3.2 clipboard 通道

Status: completed
Targets: action 词汇（或 env，随裁定）/ host 实现 / 三 replica schema / e2e

- Item Types: `Fix`、`Proof`

- [x] 剪贴板通道落地：`renderer-api.ts` `ClipboardWriter` + `clipboard?` 字段 + `copy` 内置 action（args：content 必填非空 / successMessage 可选，缺省 `flux.action.copySuccess`）+ runtime adapter（缺失 → warning `copyUnsupported` + ok:false；writeText reject → error `copyFailed` + ok:false；成功 → success toast）；playground host `navigator.clipboard.writeText` 代理（reject 传播）；focused 单测 ×4（写入+成功文案/缺省文案/缺失降级/拒绝失败，runtime 1445/1445 绿）
- [x] Cal/Linear/Notion 三族 copy-link 升级为真实写入：8 处按钮位全接线（schema 内 copy action 条目共 10 条——notion-peek-copy 同按钮在 5 个视图蒙皮各 1 条、linear-issues 3 条含 2 处 slot 菜单以同 `when` copy 兄弟项保端点调用）；ajax 端点调用保留（e2e 端点计数不变），`messages.success` 移除、toast 归 copy action 所有；e2e 剪贴板内容程序化断言 ×5（linear 03/06/16 精确值、notion 05 正则、cal 13 精确值，grantPermissions 于测试开头——headless 需页面 focus 的怪癖以 early-focus 消解）

Exit Criteria:

- [x] 三族复刻真实写入剪贴板且 e2e 断言读到写入内容（linear 精确 URL、notion 前缀正则、cal 精确 hash；replica 五 spec 68/68 绿）
- [x] 降级路径 focused 单测在案（capability missing + writeText reject 双路径）

### Phase 5 - L3.3 download action

Status: completed
Targets: `flux-action-core`（download runner）/ `flux-core`（action 定义）/ showcase 导出链 / e2e

- Item Types: `Fix`、`Proof`

- [x] `download` 内置 action 落地：`constants.ts` 定义（api/url/filename）+ action-core runner + runtime adapter 走 `executeRuntimeDownloadAction`（复用 canonical `blob-download.ts` 管线：downloadBlob/resolveDownloadFilename + 新增 `dataUrlToBlob`——data: URL 原位解码，runtime 零 fetch 直调）；三态消解按契约 §3（api blob 直取 / data: URL 直存 / 端点 envelope `url` 字段 → data: 解码或 http 二次 blob GET，响应 `filename` 字段优先）；非成功 envelope → `notify error`（`flux.action.downloadFailed` zh/en）+ ok:false
- [x] showcase 导出链接线：crud-views-export 按钮改 onClick 数组 = ajax（保留 report UI 的 then 链）+ `download` action（后端 CSV 生成职责不变）+ e2e `download-action.spec.ts`（Playwright download 事件 + `users-*.csv` 文件名断言 + report 文案断言）
- [x] focused 单测 ×4（form-3 envelope url+filename 保存 / form-2 data: URL 直存 / 非 2xx envelope notify+fail / 空 args fail 不 notify；runtime 1449/1449 绿）

Exit Criteria:

- [x] download action 落地 + focused 单测全绿（1449/1449）
- [x] e2e 下载断言通过（playwright download 事件 + suggestedFilename 断言）

### Phase 6 - L3.5 filter↔URL sync

Status: completed
Targets: crud/query-filter 契约面 / host router 集成 / e2e

- Item Types: `Fix`、`Proof`

- [x] 绑定契约落地：`renderer-api.ts` `EnvLocation`（getQuery/setQuery，值域 string、undefined 删键）+ `EnvLocation` 复用既有保留字段 **`syncLocation`**（原「Reserved—未实现」声明转为已实现注记——评审 M1 更正 owner 包为 flux-renderers-data）+ `useUrlFilterSync` 助手（data 包单一实现）：挂载恢复一次（写 committed query 态 + 表单句柄 setValues 回显，句柄未注册 50ms×5 重试）、变更恒 replace 回写（首跑仅记基线）、不订阅 popstate、保留键不读写、数组逗号 join/空值删键、多实例冲突先到优先+后到降级警告；decorator hooks 扩 print/clipboardWriteText/locationSetQuery；playground hash router 实现（showcase-env）+ standard-crud `"syncLocation": true` demo；focused 单测 ×7（编码/解码对称/保留键/挂载恢复跳保留键/replace 回写+幂等/冲突降级/无 location 失活，data 1169/1169 绿）；**route-model 修 hash query 剥离**（`#/page?key=v` 此前无法命中页面 id——L3.5 宿主侧前置）
- [x] 深链 e2e `url-filter-sync.spec.ts` ×2：①`#/complex-pages/standard-crud?keyword=顾北辰` 打开 → 表单输入回显恢复值；②搜索提交 → hash 更新含 `keyword=`（replace 语义）

Exit Criteria:

- [x] 绑定契约 + 单测在案（data 1169/1169）；深链 e2e 双向断言通过（2/2）
- [x] stripe/airtable 既有 e2e 复绿（replica 五 spec 68/68 于 Phase 4 验证；route-model query 剥离不改变无 query hash 的解析）+ home-entry/navigation e2e 13/13

### Phase 7 - 收口验证 + 登记

Status: completed
Targets: 全仓 + 登记面

- Item Types: `Proof`

- [x] `pnpm typecheck` / `build` / `lint` / `test` 全绿（40/40 + 40/40 + 40/40 + 74/74 task）；`pnpm check` 零新增红（exit 0；oversized 204w/2e/2exempt——2e 均在册豁免，crud-renderer.tsx 拆分后 691 行迁入 warn 档）；e2e 全量零新增红（**1564 passed / 43 skipped / 3 failed / 4 flaky**：3 最终失败 = kanban-perf:34 在册 watch-only + gantt-bars-and-links:131、gantt-demo:53 gantt 负载/拖拽 flake 家族（隔离复跑 2/2 全绿，511 同款消化口径）；4 flaky = gantt ×3 同族 + scada-perf:155 吞吐阈值边缘重试过）
- [x] 登记核对：`quick-reference.md`（env 三字段 print/clipboard/location 行 :242-244 命中）+ `flux-guide/04-action-system.md`（「内置宿主通道动作（plan 512 L3）」节在案）+ playground-experience.md（Core Rules 第 6 条 toast viewport ownership 在案）；顺手修复两处收口前缺陷——①`04-action-system.md` 尾部 28 个 NUL 字节损坏（bc59fea19 入库，已截断修复）；②Phase 6 follow-up 提交 b0826a8e7 在非 async 回调写入 `await waitFor` 的语法错误（use-url-filter-sync.test.ts，补 `async`，data 1169/1169 复绿）
- [x] 收口前新增红消化：Phase 6 将 crud-renderer.tsx 推至 727 行越过 700 MUST-split 阈值（check:oversized 新增 error）——拆分消化：URL-sync 接线提取 `use-crud-url-sync.ts`（useCrudUrlSync）+ 两个 scope 投影 effect 提取 `crud-renderer-projections.ts`（useCrudDataProjection/useCrudLoadRevision），crud-renderer.tsx 691 行（warn 档在案）、crud-renderer-state.ts 保持 471 行；data 包 1169/1169 复绿、oversized 门禁 exit 0（2e 均为在册豁免）
- [x] roadmap §13 L3 行回写 `done`（2026-09-26，随附裁决注记）+ dev log 记录 L3 收口

Exit Criteria:

- [x] 全量验证五项记录于本 plan Closure；登记面 grep 复核命中；roadmap/dev log 落盘

## Draft Review Record

- Reviewer / Agent: fresh-session independent review sub-agent（未参与起草，2026-09-26；live repo 逐条核对 baseline 引用）
- Verdict: `revised`（r1 发现 1 Major + 8 Minor，当轮全部修复落字；终态 0 Blocker / 0 Major，达成共识）
- Rounds: 1
- Findings addressed:
  - Major-1（toast hack 归属错误）：Goals L3.4 / Phase 2 原写「Cal/Linear/Notion 三处」，live schema 核对实际为 AntD Pro（antdpro-form-basic/grouped/step）/ Cal（cal-confirm、cal-success）/ Linear（linear-detail）共 6 文件 7 处，Notion 零命中——与本 plan 自身 baseline 引用（回写③④⑤）矛盾。已改为正确的 replica 集 + grep 复核口径（覆盖行内/展开两种排版）。
  - Minor 群（当轮顺手修复）：①`renderer-api.ts:83` 为陈旧锚点（继承自 renderer-env.md §2），live 接口在 :177，字段清单本身经核对无误；②print 按钮静态保留的 C2 引用 :137（clipboard 行）更正为 :109；③「D1 池 #9」无此编号，更正为 C2 :266 候选 1 / :269 P7b 池汇总⑤；④「禁止 addEventListener 岛」裁定出处由「C2 报告」更正为 archetype 审计 §10.2 规则 3（后续契约评审再正为 §3.6——§10.2 属 companion 文件且内容不符）；⑤Phase 2/4/5 补「按 Phase 1 裁定」依赖表述（Phase 1 design gate → 后续 Phase 依赖链显式化）；⑥P3/P4/P5 补新用户可见文案 i18n 键（zh-CN/en-US）交付项（roadmap §1 铁律 6）；⑦Test Strategy 补「单测/e2e 先于或随实现落地」执行约定；⑧Purpose 补单计划五 Phase 边界依据（§14 Rule 4 张力消解：§2 单行登记 + plan 503 先例 + guide Rules 22/24/26）；⑨Failure Paths 补 `print-invoke-fail` 运行时失败行。

## Closure Gates

- [x] 五通道全部按 Phase 1 裁定落地（无偏离裁定的实现）
- [x] L3.1–L3.5 各 Phase Exit Criteria 全勾
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs（renderer-env / action-scope-and-imports / playground-experience / quick-reference）已同步
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（verdict `approved` 0B/0M/4m，2026-09-26）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm test:e2e`（零新增红口径）

## Deferred But Adjudicated

### stripe/airtable ad-hoc URL 物化迁移到 L3.5 契约

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 现役 ad-hoc 物化是工作替代面且有其 e2e 钉住；§12 协调规则要求与 L4.9 replica retrofit 错峰，迁移归 L4.9 窗口
- Successor Required: `yes`
- Successor Path: L4.9 replica retrofit 子 plan（rebase L3.5 契约）

## Non-Blocking Follow-ups

- clipboard 直调消费方 rebase 到 `env.clipboard`（json-view.tsx:63 / variable-panel.tsx:41 / basic copyToClipboard 消费方；契约 §2 登记，optimization candidate——直调合法在先、INV-1 禁单不含 clipboard；successor = 后续 demand 或 L4 窗口）

## Closure

Status Note: 七个 Phase 全部落地并经独立 closure audit 通过（0B/0M/4m，附条件 one-shot 翻转已兑现）：五通道按 Phase 1 裁定实现（print/clipboard 扩 env C 档 + copy/print/download 三内置 action；download A 档复用 blob 管线；toast 宿主单例 + 30 处挂载清扫 + 7 处 debounce hack 移除；filter↔URL `env.location` + useUrlFilterSync 单实现 + 深链 demo）。全量验证在案：typecheck/build/lint 40/40、test 74/74 task、check exit 0（oversized 2e 均在册豁免；Phase 6 新增红已拆分消化）、e2e 1564 passed/43 skipped/3 failed/4 flaky（零新增红：watch-only ×1 + gantt flake 家族 ×2 隔离复跑全绿）。登记三面命中（quick-reference/flux-guide/playground-experience），i18n 键 zh/en 在案，roadmap §13 L3 行 done。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent（general-purpose，2026-09-26，未参与起草与执行；44 次工具调用逐 Phase live 行为抽查）
- Evidence: verdict `approved`（0 Blocker / 0 Major / 4 Minor）——Phase 1 契约文档 + renderer-env/action-scope 回写四处命中；Phase 2 App.tsx:405 单例 Toaster + debounce grep 0 残留；Phase 3-5 print/copy/download live 链路（runner/adapter/i18n/e2e + focused 单测实跑通过）；Phase 6 useUrlFilterSync 语义逐条核对 + 拆分等价性逐点比对（use-crud-url-sync vs bc59fea19 内联块）+ data 包 1169/1169 实跑复绿；Phase 7 登记三面命中 + NUL 修复验证 + oversized 拆分核对；deferred 诚实性成立（roadmap §12 错峰规则佐证）。4 Minor：①Phase 7 Status 滞后（已翻转）；②簿记计数口径（×6 实为 7 用例、copy 8 处 vs 10 条目口径——顺手改注）；③契约 §2 clipboard 直调 rebase follow-up 未登记（已补 Non-Blocking Follow-ups）；④Closure 节占位（本条填充消解）。

Follow-up:

- clipboard 直调消费方 rebase 到 env.clipboard（见 Non-Blocking Follow-ups；非本 plan 缺陷，登记移交）
- 其余无 remaining plan-owned work
