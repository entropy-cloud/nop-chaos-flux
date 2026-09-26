# QA.1 线出口审计 #3 — missing-components L3（host channels：print / clipboard / download / toast / filter↔URL）

> Auditor / Agent: 独立 fresh 子 agent（QA 线出口审计员，2026-09-26，未参与 plan 512 起草、执行与 closure audit）
> 审计对象: commits `1d8cbb2f3..b0826a8e7`（plan 512 八提交）+ 收口工作区改动（plan 状态翻转、roadmap §13 回写、flux-guide NUL 修复、url-sync 测试 async 补丁、crud-renderer 拆分 `use-crud-url-sync.ts` / `crud-renderer-projections.ts`）
> 审计输入: plan 512 文件（completed）+ 上述 commit 范围 diff + 本审计 live 实跑验证输出（Fresh Context 三件套，未读执行会话历史）
> 依据: `docs/audits/00-audit-execution-guide.md`（severity 词汇 Blocker/Major/Minor；Pass = 0 Blocker 且 0 Major）；格式先例 `docs/audits/missing-components/QA.1-L1-line-exit-audit.md`
> 审计对象裁度说明: L3 是 **host channel 线**而非新 renderer type 线——交付铁律 8 项中的 design.md / example / matrix flip 项按 plan 512 Non-Goals（「不建新 renderer type，无 matrix flip」）裁定不适用，交付面按 plan 自身 done 定义（五通道契约裁定落实 + 宿主验证面 + 登记面 + 全量验证）逐项核对；每项缺位均有裁定依据，见 §1 表。
> 范围归因验真: `63b371fd8..b0826a8e7` 全 diff 含 plan 511 QA.2 消化提交 `ae8196778`（org/gantt/user-select 等 scheduling 面）；逐 commit `git log 1d8cbb2f3..b0826a8e7 -- <path>` 验真 plan 512 窗口**不含** `packages/flux-renderers-scheduling/` 与 org/user-select 文件，L3 线 diff 面干净（本审计代码抽查全部限于 512 窗口 + 收口工作区）。

## 1. 交付面逐行核对（五通道契约裁定 vs live 实现）

对照 `docs/discussions/2026-09-26-host-channels-print-clipboard-download-toast-url.md`（§0 总裁定一览）逐通道核对：

| 通道            | 裁定                                 | 结论 | 证据（live repo 核对）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | ------------------------------------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L3.1 print      | C 档扩 env + built-in action         | ✅   | `renderer-api.ts:211` `print?: () => void`（optional + capability check 注释 + 评审来源指向契约文档，满足契约 §6 对 stream/openSocket 先例的统一要求）；`constants.ts:52/:166` 定义（无 args）；`built-in-actions.ts:345-353` runner；`action-adapter.ts:455-468` adapter——缺失 → `notify('warning', flux.action.printUnsupported)` + `ok:false`（不抛未捕获），命中 → `env.print()` + ok:true，与契约 §1 执行语义逐字一致；playground `showcase-env.ts:518` `window.print()` 代理；AntD Pro 详情按钮 `antdpro-detail-basic.json:94-95`（testid + `onClick: {action:'print'}`，archetype §3.6 规则 3——经 action 程序模型派发，零 per-renderer 直调）；focused 单测双分支（`action-adapter.builtins.test.ts:289` warn+fail / invoke 双断言）+ e2e 测试 21b `window.print` spy 轮询（`antdpro-replica-interactions.spec.ts:481-500`，addInitScript 标志面程序化断言）。i18n `printUnsupported` zh（zh-CN.ts:244）/ en（en-US.ts:244）双份                                                                                                                                                                                                                                                                                                                                                                                 |
| L3.2 clipboard  | C 档扩 env + built-in action         | ✅   | `renderer-api.ts:189-191` `ClipboardWriter` + `:217` `clipboard?` 字段（评审来源注释在案）；`constants.ts:53/:169-175`（content required+nonEmpty / successMessage 可选——与契约 §2 args 形状一致）；`built-in-actions.ts:328-344`；`action-adapter.ts:429-453`——缺失 → warning `copyUnsupported` + ok:false；`writeText` reject → error `copyFailed` + ok:false（**不静默假成功**，契约 §2 反面即契约）；成功 → success toast（显式 successMessage 或缺省 `copySuccess`）；playground `showcase-env.ts:522-526` `navigator.clipboard.writeText` 代理（reject 传播）；Cal/Linear/Notion copy-link 升级真实写入：schema 内 copy 条目实测 **10 条**（notion-database ×5 + linear-issues ×3 + linear-detail ×1 + cal-success ×1 = 8 处按钮位，与 plan Phase 4 收口更正口径一致），`messages.success` 残留 **0**（grep 实证）；e2e 剪贴板内容程序化断言 ×5（linear 03/06/16 精确值 + notion 05 正则 + cal 13 精确 hash，`grantPermissions` + early-focus 注释在案）；focused 单测 ×4（写入+自定义文案/缺省文案/缺失降级/拒绝失败）。i18n copySuccess/copyFailed/copyUnsupported zh/en 双份                                                                                                                                                                                                                                   |
| L3.3 download   | A 档纯 action 组合                   | ✅   | **零 env 扩展**（renderer-api.ts 无 download 相关字段——A 档裁定落实）；`constants.ts:54/:176-183`（api/url/filename fieldRules + argsRequired）；`built-in-actions.ts:311-327`；adapter 走 `executeRuntimeDownloadAction`（`runtime-action-helpers.ts:334-418`）复用 canonical `blob-download.ts` 管线（downloadBlob/resolveDownloadFilename + 新增 `dataUrlToBlob` :65）；**零 fetch 直调**（grep 实证——全部经 `executeApiRequest` envelope 管线，INV-1 合规）；非成功 envelope / 无 url 字段 / 空 args → `fail()` = notify error（`downloadFailed`）+ ok:false，**无假成功路径**；i18n downloadFailed zh/en 双份。三态消解一处措辞漂移见 Minor-2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| L3.4 toast      | 宿主约定零 API 变更                  | ✅   | `App.tsx:405` app-shell 单例 `<Toaster/>`（route 卸载不死）；挂载清扫实测 **30 处** `<Toaster` 删除（render-host + 29 demo 页，`git diff -U0 \| grep -c '^-\.*<Toaster'` = 30，与契约 §4 双 viewport 约束一致）；7 处 `control:{debounce:1200}` hack 零残留（page-schemas grep = 0 命中）；e2e 幸存语义断言：linear 测试 18（先落列表页 → 再验「问题已归档」toast 仍在，:572-596）+ antdpro 测试 14（跨 hash 导航 toast 幸存 + hover 暂停自动消失等待，:300-325）；playground 单测挂具 3 处补挂 Toaster（sundial-replica / sundial-detail-replica / v12f-p4-behavior 测试文件，挂具承接 app-shell 职责）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| L3.5 filter↔URL | C 档 env.location + 共享 sync helper | ✅   | `renderer-api.ts:181-186` `EnvLocation`（getQuery/setQuery 值域 string、undefined 删键，与契约 §5 接口形状逐字一致）+ `:223` `location?` 字段；owner 包裁定落实：`use-url-filter-sync.ts` 落 `flux-renderers-data` 单一实现（评审 M1 更正 owner 包的执行）；**syncUrl 五条语义逐条落实**：①挂载恢复一次（restoredRef 一次性 + 表单句柄 setValues 回显，未注册 50ms×5 重试 :109-119）；②变更恒 replace 回写（:139 `setQuery(values, {replace:true})`，首跑仅记基线 :136-143）；③不订阅 popstate（全文件零 addEventListener/popstate）；④保留键不读写（RESERVED_URL_KEYS :18 + restore/投影双侧过滤）；⑤序列化数组逗号 join/空值删键（encodeFilterValue :27-36）+ 多实例先到优先/后到降级警告（claimedInstances + console.warn :83-91）；decorator hooks 三字段扩齐（`renderer-env.ts:40-48` print/clipboardWriteText/locationSetQuery，包装语义保 capability check——字段缺席时原样透传 :108-119）；`crud-schema.ts:48/:276/:351` syncLocation 归一化；playground hash router 实现（showcase-env.ts:529-557）+ standard-crud `"syncLocation": true` demo + route-model hash query 剥离前置（route-model.ts:73-77）；focused 单测 ×7（编码/解码对称/保留键/挂载恢复跳保留键/replace 回写+幂等/冲突降级/无 location 失活——实测 7 条全在）+ 深链 e2e ×2（恢复回显 + replace 写回）。一处文档声称的诊断警告未实现，见 Minor-1 |

**横切面核对**：

| 项                 | 结论 | 证据                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------ | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INV-1/INV-2 合规   | ✅   | 三 env 字段均 optional + 消费方 capability check（adapter `if (!env.print)` / `if (!env.clipboard)`；useUrlFilterSync location 失活分支）；renderers/runtime 层零浏览器直调（use-url-filter-sync 零 window 访问、runtime-action-helpers 零 fetch/XHR）；showcase-env/route-model 属宿主层，window 访问合法；降级路径逐通道核对全部 ok:false + 用户可见 toast，无静默假成功（Failure Paths 六场景与实现一一对应） |
| i18n 键 zh/en      | ✅   | `printUnsupported`/`copyUnsupported`/`copyFailed`/`copySuccess`/`downloadFailed` 五键 zh-CN（:244-248）+ en-US（:244-248）双份；`check-i18n-keys` 实跑通过                                                                                                                                                                                                                                                       |
| 登记面             | ✅   | `quick-reference.md:242-244` env 三字段行 + `flux-guide/04-action-system.md:26-41`「内置宿主通道动作」节（按实况登记 copy/download 行为）+ `playground-experience.md:39` Core Rule 6 toast viewport ownership + `action-scope-and-imports.md:478` built-in 枚举段 + `renderer-env.md` §2 接口块（:28-30）/§4.3 历史行（:259）/§5 host 表（:274-276）                                                             |
| focused 单测 + e2e | ✅   | print ×1（双分支）+ copy ×4 + download ×4 + url-sync ×7 = 16 条 focused；e2e：print spy ×1 + clipboard 内容 ×5 + download 事件 ×1 + url-filter-sync ×2 + toast 幸存 ×2（linear 18 / antdpro 14）——全部程序化断言（`__printInvoked` 轮询 / `readText` / download 事件 / hash poll / toast visible），无 screenshot 充证                                                                                           |

**本项结论：五通道裁定全部按 Phase 1 design gate 落地，无偏离裁定的实现；L3 非 renderer 线的裁度下交付面完整。**

## 2. 本线 diff 代码质量抽查（1d8cbb2f3..b0826a8e7 + 收口工作区）

| 检查项                                                       | 结论 | 证据                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------ | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RendererComponentProps / hooks 契约                          | ✅   | 本线无新 renderer type；渲染器侧改动全走标准 hooks——`use-crud-url-sync.ts` 用 `useRenderScope`/`useCurrentComponentRegistry`/`useRendererEnv`，crud-renderer 经 `useCrudUrlSync` 接线；**零 store 直连、零 ad-hoc context、零 prop 钻孔**                                                                                                                                          |
| 禁裸 HTML                                                    | ✅   | 本线 JSX 新增仅 App.tsx 单例 `<Toaster/>`（`@nop-chaos/ui` 组件）；其余改动为 hooks/runner/adapter/schema JSON 层                                                                                                                                                                                                                                                                  |
| 无 per-renderer addEventListener 岛（archetype §3.6 规则 3） | ✅   | 本线 diff `grep addEventListener` = 0 命中；print/clipboard 全部经 built-in action 词汇派发；URL 写回经 `env.location.setQuery`（宿主 router 面），非渲染器直调 history                                                                                                                                                                                                            |
| oversized 纪律                                               | ✅   | Phase 6 曾推 crud-renderer.tsx 至 727 行越 700 阈值——**拆分消化在案**：`use-crud-url-sync.ts`（62 行）+ `crud-renderer-projections.ts`（42 行）提取，crud-renderer.tsx 691 行（warn 档）、crud-renderer-state.ts 471 行；其余 touched 文件均 <660 行（action-adapter.ts 659 为存量 warn 在册）；`check-oversized-code-files` 实跑 204w/2e/2exempt，2e 均在册豁免——与 plan 声称一致 |
| 错误路径不假成功                                             | ✅   | print/copy/download 三 adapter 降级/失败路径全部 `ok:false` + 对应 i18n toast（warning/error 分级正确）；download 的 AbortError 正确 rethrow 不吞（action-adapter.ts:423）；url-sync 无 location 失活返回 false 不写 URL；测试 async 语法错误的收口修复在案（见 Observation-2）                                                                                                    |
| React 19 纪律                                                | ✅   | use-crud-url-sync 的 `useCallback` 系 applyToForm 作为 effect 依赖的稳定性所需（具体问题具体解，合规）；use-url-filter-sync 降级 setState 用 `setTimeout(0)` 延迟规避 effect 内同步 setState 级联（注释在案）；无 useEffect+setState 镜像反模式                                                                                                                                    |
| 杂项                                                         | ✅   | flux-runtime 新增 flux-i18n workspace 依赖无环（flux-i18n 不反向依赖）；`b0826a8e7` 顺手删除误入 apps/playground 的 probe-url.mjs 探针脚本（临时产物归位）；crud-renderer 拆分后无残留死 import（useRendererEnv/createCrudQueryFormId/useCallback 在文件其余处仍使用）                                                                                                             |

## 3. docs↔live 一致性

| 文档声称                                                    | live 核对                                                                                                                                                                              | 结论 |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| renderer-env.md §2 接口块（:28-30 三字段）                  | renderer-api.ts `:211 print?` / `:217 clipboard?` / `:223 location?` + EnvLocation/ClipboardWriter 接口形状逐字一致；字段注释评审来源指向契约文档（契约 §6 统一要求）                  | ✅   |
| renderer-env.md §4.3 历史行（:259）+ §5 host 表（:274-276） | 三行/三注记命中；但 §4.3 状态字样「已裁定（plan 512 实施中）」在 plan 完成后已过时（Observation-1）；契约 §4-③ 要求的 toast 宿主约定未进 §5 host 表注记（Minor-3）                     | ⚠️   |
| action-scope-and-imports.md:478 built-in 枚举               | built-in-actions.ts 实含 print/copy/download 三 case + 既有枚举面一致；host-channel 归属注释（env.print/env.clipboard/fetcher blob）与实现一致                                         | ✅   |
| 契约 §5 syncUrl 五语义 vs use-url-filter-sync.ts            | ①恢复一次/②replace 回写/③不订阅 popstate/④保留键/⑤序列化+多实例降级——逐条落实且有单测钉住；唯「env.location 缺失 → dev 一次性警告」未实现（Minor-1）                                   | ⚠️   |
| 契约 §3 download 三态 vs runtime-action-helpers.ts          | 「轻量形态（GET）直存」第 2 态未按契约字面实现（实况三态 = api blob / data: URL 直存 / envelope url 字段二段消解）——plan Phase 5 与 flux-guide 已按实况复述，契约文档未回写（Minor-2） | ⚠️   |
| renderer-env.md:16 状态声明锚点                             | 仍写 `renderer-api.ts:83`，live RendererEnv 接口现位于 :193（本线新增三接口后进一步下移）——plan draft review Minor-① 已识别的继承性陈旧，本线回写 §2 时未顺手刷新（Minor-4）           | ⚠️   |

**本项结论：接口面/枚举面/syncUrl 语义面无契约级 drift；4 处文档级偏差（均为 Minor，见 §6），无 Blocker/Major。**

## 4. roadmap §13 回写准确性

| 声称                                                                                                                                                | 复核                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L3.1–L3.5 `done`（2026-09-26）/ plan 512                                                                                                            | ✅ closure audit（独立 fresh 子 agent，0B/0M/4m）先于回写，顺序合规；工作区回写 diff 在案                                                                                                 |
| 「print/clipboard C 档扩 env + 三内置 action、download A 档复用 blob 管线、filter↔URL C 档 env.location + useUrlFilterSync 单实现、toast 宿主单例」 | ✅ 与 §1 逐通道核对结论一致                                                                                                                                                               |
| 「30 处页面/host 挂载清扫 + 7 处 debounce hack 移除」                                                                                               | ✅ 精确计数实证（30 处 `<Toaster` 删除 / grep 0 残留）                                                                                                                                    |
| 「copy-link 升级真实写入 ×8」                                                                                                                       | ✅ 8 按钮位 / 10 schema 条目（plan Phase 4 已更正口径，roadmap 行按按钮位计，两处自洽）                                                                                                   |
| 「收口拆分消化：691 行 warn 档 + use-crud-url-sync/crud-renderer-projections 提取」                                                                 | ✅ wc -l 实证 691/62/42；两文件在案                                                                                                                                                       |
| 「unit full-green 74/74 task + check 零新增红」                                                                                                     | ✅ 本审计实跑抽验 typecheck 40/40（缓存绿）+ data 1169/1169 + runtime 1449/1449 + playground 391/391 + oversized 204w/2e/2exempt + i18n-keys 通过 + ui-consistency 零新增——全部与声称吻合 |
| 「e2e 全量零新增红（1564/43/3/4——3 失败 = watch-only + gantt flake 家族 ×2 隔离复跑全绿）」                                                         | 台账结构与 511 消化口径一致；按审计纪律不重跑 27min 全量（QA.4 集成审计按 pass 标准将重跑）                                                                                               |
| QA.1 行（:240）当前状态                                                                                                                             | 「L0/L1/L2 已过并放行…L3–L7 出口审计绑定各线完成时点」——本审计 pass 后应由执行 session 回写「L3 已过」（回写动作属审计后簿记，非本审计职责）                                              |

**本项结论：L3 行 done 回写与 live 事实一致，无虚记。**

## 5. 验证输出复核（本审计实跑部分）

| 命令                                                       | 结果                                                                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                           | ✅ 40/40（缓存全命中，当前工作区树绿）                                                                                        |
| `pnpm --filter @nop-chaos/flux-renderers-data test`        | ✅ 166 files / **1169 passed**（= plan 声称，含 url-sync 7 条）                                                               |
| `pnpm --filter @nop-chaos/flux-runtime test`               | ✅ 132 passed + 1 skipped / **1449 passed**（= plan 声称，含 print/copy/download focused）                                    |
| `pnpm --filter @nop-chaos/flux-playground test`            | ✅ 37 files / **391 passed**（= Phase 2 声称，含 3 个补挂 Toaster 挂具）                                                      |
| `node scripts/check-oversized-code-files.mjs`              | ✅ 204 warnings / 2 errors / 2 exempt（= plan 声称，2e 在册豁免，crud-renderer 691 迁入 warn）                                |
| `node scripts/check-i18n-keys.mjs`                         | ✅ passed                                                                                                                     |
| `node scripts/audit/find-ui-consistency-gaps.mjs`          | ✅ No new unregistered（5 规则零新增）                                                                                        |
| plan 声称的 build / lint / 全仓 test 74/74 / e2e 全量 1564 | 记录在案（plan Phase 7 + Closure + roadmap 注记），本审计未全量重跑（四包实跑抽验 + typecheck 实跑已覆盖本线全部 touched 包） |

## 6. Findings

**Blocker：无。Major：无。**

### Minor-1 「env.location 缺失 → dev 一次性警告」两处文档声称未实现

- 位置：契约文档 §5 渲染器面（「`env.location` 缺失 → `syncUrl` 静默关闭 + dev 一次性警告」）+ `renderer-api.ts:219-220` 字段注释（「静默关闭并提示一次」）
- 实况：`use-crud-url-sync.ts:36` 纯静默失活（`schemaSyncLocation && Boolean(urlEnv.location)`）；`use-url-filter-sync.ts` 全文件无该警告（仅多实例冲突路径有 console.warn）；单测只断言失活返回值。
- 影响：诊断辅助缺失 + 两处文档描述不存在的行为；功能契约（失活、不崩页）成立且有测试。修复二选一：helper 补一次性 `console.warn`（对齐冲突警告先例），或两处文档改「静默关闭」。建议 QA.4（env 通道 INV 复核 gate）前消化。

### Minor-2 契约 §3 download「第 2 态轻量形态（GET）」与实现三态不一致

- 位置：契约文档 §3（「`{ url: string; filename?: string }` 轻量形态（GET）」）vs `runtime-action-helpers.ts:388-415`（一切 url 形态统一走 envelope 解析：`data:` 直存 / 端点 `url` 字段二段消解；直指 http(s) 文件 URL 的 GET 直存路径不存在——无 url 字段即 `fail`）
- 实况：plan Phase 5 已把三态复述为「api blob 直取 / data: URL 直存 / 端点 envelope url 字段」，flux-guide :41 按实况登记——plan↔实现↔登记面自洽，唯契约文档 §3 未回写。live 消费方（crud-views-export）走 envelope 形态不受影响；直存形态误用时为响亮报错（downloadFailed toast），非静默假成功。
- 影响：契约文档与实现在一个公开 action 的 arg 形态上措辞漂移，schema 作者按契约写第 2 态会失败。修复二选一：契约 §3 回写实况三态（推荐——登记面已按实况），或补实现。建议 QA.4 前消化。

### Minor-3 契约 §4-③ toast 宿主约定未进 renderer-env.md §5 host 责任表

- 位置：契约文档 §4（「该约定进 host 责任清单（renderer-env.md §5 宿主表注记）」）vs `renderer-env.md` §5（notify 行 :270 无 Toaster 单例注记，全文零 Toaster/单例命中）
- 实况：约定实际只落 `playground-experience.md:39` Core Rule 6（内容完整：唯一挂载点 + 双 viewport 后果 + 禁 reintroduce debounce hack）。
- 影响：宿主责任清单（面向未来 SSR/test host 作者）缺该约定，跨 host 一致性约束少一处权威落点。修复：§5 notify 行补「toast 渲染层须 app-shell 单例常驻（见 playground-experience Core Rule 6）」一类注记。纯文档一行。

### Minor-4 renderer-env.md:16 陈旧锚点 `renderer-api.ts:83` 未顺手刷新

- 位置：`renderer-env.md:16` 状态声明（「已实施字段…`renderer-api.ts:83`」）；live RendererEnv 接口现位于 `renderer-api.ts:193`（本线新增 EnvLocation/ClipboardWriter 接口后自 :177 进一步下移）
- 实况：plan 512 draft review Minor-① 已识别为继承自 renderer-env.md §2 的陈旧锚点；本线 Phase 1 对同一文件 §2 节做了回写（新增 :18/:20 注 + 接口块）但未刷新该锚点。
- 影响：纯文档锚点漂移，字段清单本身经核对无误。建议随 Minor-3 同批一行修复。

### Observation-1 §4.3 历史行状态字样滞后

- `renderer-env.md:259` 状态「已裁定（plan 512 实施中）」——plan 512 已 completed，宜更新为「已实施」。随 Minor-3/4 同批顺手校准，不单列 gate 要求。

### Observation-2 收口工作区改动的构成与提交状态

- 工作区改动 = plan 状态/Phase 5/7 翻转与簿记更正（8 处 vs 10 条目、×6→×7）、roadmap §13 L3 行回写、dev log、flux-guide 尾部 NUL 字段修复（`b0826a8e7` 入库损坏的截断）、use-url-filter-sync.test.ts 修复（`b0826a8e7` 在非 async 回调写入 `await waitFor` 的语法错误——工作区补 `async` + formatting，data 1169/1169 实跑复绿）、crud-renderer 拆分两新文件。全部与 plan Phase 7 声明一一对应，无暗改。**注意**：async 修复与拆分文件、roadmap 回写目前均未提交——须随本审计回写一并入库，避免「plan 声称已修复而树未落盘」状态外泄。

### Observation-3 diff 范围归因

- `63b371fd8..b0826a8e7` 全 diff 含 plan 511 QA.2 消化提交 `ae8196778`（org 分页/gantt/e2e 消化等，与 L3 无关）；逐 commit 验真 plan 512 窗口（`1d8cbb2f3..b0826a8e7`）不含 scheduling/org/user-select 文件。本审计代码抽查口径 = 512 窗口 + 收口工作区，与 L1 先例的 Observation-2 处理方式一致。

### Observation-4 实现层微瑕（不构成 finding）

- `use-crud-url-sync.ts:46` `{} as never` 类型逃逸；`use-url-filter-sync.ts:20` module 级 `claimedInstances`（跨页残留由 effect cleanup 兜底，SPA 单页内语义正确）；对象型筛选值编码为丢弃而非 `String(value)`（契约 §5-③「其余 String(value)」的字面宽读——丢弃优于序列化 `[object Object]`，且筛选值域实际为 string/number/boolean/array）。随后续重构顺手收紧即可。

## 7. Verdict

**pass**（0 Blocker / 0 Major / 4 Minor）

- 依据 `docs/audits/00-audit-execution-guide.md`：Pass = zero Blockers AND zero Majors。Minors 不阻断线出口。
- 按 roadmap §11 纪律：4 项 Minor 登记 QA.7 ⑥ 残余债登记册，**在下一 gate（QA.4，gate = L3+L4）前修复并复审**——Minor-1/2 各为二选一小改（警告补齐或文档改口；契约 §3 回写或补实现），Minor-3/4 为纯文档一两行修复，建议与 QA.4 前消化窗口同批处理。
- L3 线出口放行：roadmap §13 L3 行 `done` 回写经本审计逐项复核成立；五通道契约裁定（print/clipboard C 档、download A 档、toast 宿主约定、filter↔URL C 档五条 syncUrl 语义）全部按 design gate 落地，INV-1/INV-2 合规，降级路径零假成功，i18n/登记面/focused 测试在案，docs↔live 除上述 Minor 外无 drift。
- 审计后簿记：①本报告落盘 + roadmap QA.1 行由执行 session 回写「L3 已过」；②Observation-2 所列收口工作区改动（含 async 修复与拆分文件）须随本次回写一并提交。
