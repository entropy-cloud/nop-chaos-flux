# [card] control:data-source

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/data-source` ｜ **载体**: lab 页（MultiScenarioLabPage，4 场景：Pre-loaded page scope / Real data-source schema（sandbox 空）/ Host data-source → list + statistics / Host failure keeps data + retry（flaky 500））
- **矩阵裁剪**: simplified（matrixReason：logic-only 渲染器，自身零 DOM、零视觉 surface，走查对象为"发布值 + 伴随渲染器"链路；裁掉的状态：glass 皮肤、loading 视觉态（fixture fetcher 即时 resolve，无延时注入，无法程序化捕获——见 A5 注记）、并发竞态矩阵（async-controller 单测覆盖域）；已覆盖 light+dark（真 data-mode）、1280+800 双视口、空/载/错误/恢复四值态、refresh 与 retry 两交互链）
- **探针**: `_tmp/r2-2b-probes/w3-datasource.mjs`（输出 `out-w3-datasource.json`）

## 1. 截图清单

| 状态                                         | light                                                                        | dark（真 data-mode）                                                                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 默认 1280（S1 预载数据 + S2 空态首屏）       | `_tmp/visual-inspection-2026-09-24/r2-2b/data-source/default-1280-light.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/data-source/default-1280-dark.png`                                                        |
| 默认 800×900                                 | `_tmp/visual-inspection-2026-09-24/r2-2b/data-source/default-800-light.png`  | —（窄视口仅 light 复跑）                                                                                                           |
| S3 宿主拉取装载（list + statistics）         | —                                                                            | `_tmp/visual-inspection-2026-09-24/r2-2b/data-source/s3-loaded-1280-dark.png`                                                      |
| S3 Refresh 后（新批次 User3-A/B）            | —                                                                            | `_tmp/visual-inspection-2026-09-24/r2-2b/data-source/s3-refreshed-1280-dark.png`                                                   |
| S4 失败态（保留 InitialUser + state:failed） | —                                                                            | `_tmp/visual-inspection-2026-09-24/r2-2b/data-source/s4-error-1280-dark.png`（视口停在 S3/S4 边界，失败态以探针 `stateText` 为准） |
| S4 Retry 后恢复（FlakyRecovered，state:ok）  | —                                                                            | `_tmp/visual-inspection-2026-09-24/r2-2b/data-source/s4-retry1-1280-dark.png` / `s4-recovered-1280-dark.png`                       |

## 2. A–H 维度勾选表

- A 交互：A1–A4 n/a（控件自身零交互面；伴随 button 的 hover/focus 归 button 卡）**A5 pass（带注记）**：empty=S2 发布空值（"Users loaded: 0"+loop 空白，lab 描述明示 sandbox 契约）；error=S4 `state:failed` + 列表保留 initialData（旧数据不丢，bug-73 契约实测成立）；loading=**无法程序化取证**（fixture fetcher 即时 resolve 无延时口，statusPath 的 `loading/isInitialLoading` 标志位存在为旁证），非缺陷，注明无法复现路径 A6/A8 n/a A7 n/a **A9 pass**（Refresh users 点击 → `__c4c3UsersProbe` 递增、列表换批 User2→User3；Retry 点击 → state:failed→ok、FlakyRecovered 上榜——反馈链全部可见非静默）
- B 颜色：B1–B4 n/a/pass（自身零渲染；S1 badge warning 档色走令牌，dark 下 alice/bob/carol 行清晰）B5 pass（dark 无白底块）B6 pass
- C 布局：C1 **warn（已知族引用）**：docOverX 0，但 S4 的 scope-debug pre 因 error.stack 长令牌产生 overX ≈19009px 并沿祖先链传播（p-6/flex 链 19033/19034）——R2-2a-C1-63 族**新极值实例**（stack trace 使溢出从 px 级放大到 19000px 级），引用不另立项 C2 pass C3 pass C4 pass（800 视口不破版）C5 pass C6 n/a
- D 间隔：D1 pass（S1 loop 行距一致）D2–D8 n/a/pass
- E 排布：E1 pass（count 文本先行，数据随后）E2 n/a E3 pass E4 pass（icon/文本/badge 左缘对齐）E5 n/a E6 **warn（watch 注记）**：S2 空发布值 → 伴随 loop 渲染纯空白，无任何空态提示（loop 无 empty 插槽；list 有——本 fixture 用 loop 承接属 fixture 取舍）
- F 一致性：F1 n/a F2–F3 pass（伴随 list/statistics 模式与 list 卡一致）F4 **warn**（i18n 族命中：statistics chrome "共 2 条" 中文 + scope-debug "调试/折叠" 中文——R2-2a-F4-11 族实例，引用）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无 P0–P2 新发现；控件契约面干净：no-own-DOM、装载/错误/恢复、refresh 增量批次全部实测成立。以下为族实例挂账。）

### [R2-2b-C1-85] scope-debug 面板 error.stack 长令牌溢出新极值实例（overX ≈19009px）——C1-63 族引用

- **页面/路由**: `#/lab/data-source`（场景 4 flaky 失败态；任何在 scope 状态中携带 error.stack 的异步场景同险）
- **主题/视口/状态**: dark / 1280 / 失败态
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/data-source/s4-error-1280-dark.png`（视口段；溢出以探针数值为准）
- **目视描述**: 失败后 scope-debug JSON 展开 error.stack，整段超长 URL 路径不换行，横向撑破场景容器。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w3-datasource.mjs`（overflowScan）
  - 输出: `p-6 overX 19009`、`flex flex-col gap-6 overX 19033`、`p-5 rounded-[16px] overX 19034`（docOverX 0——溢出被页面层吸收，但场景块内部 scrollWidth 已近 2 万 px）。对照 R2-2a-C1-63（input-text 卡，token 级 px 溢出），本实例因 stack trace 数量级放大。
- **对照基准**: 已知族 R2-2a-C1-63（scope-debug pre 长令牌不换行，溢出沿祖先链传播）
- **严重程度**: P3（lab 载体 chrome；真实宿主不渲染 scope-debug 面板）
- **用户影响**: 走查/调试时失败场景的调试面板横向爆版，与相邻场景并置时观感破碎。
- **修复方向**: 同族主条目——scope-debug pre 加 `min-w-0 overflow-x-auto`（或 `break-all`）收口；stack 类长值可折叠截断。
- **归族**: systemic → scope-debug 面板修复面（summary §4.7 已挂）
- **复核状态**: 未复核

### [R2-2b-A5-86] data-source 错误态无内建视觉呈现通道：失败仅表现为"数据不更新 + statusPath 标志位"，lab 以裸文本承接——设计一致性的 watch 注记

- **页面/路由**: `#/lab/data-source`（场景 4）
- **主题/视口/状态**: dark / 1280 / 失败态
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/data-source/s4-error-1280-dark.png`
- **目视描述**: 两次 500 失败后页面上没有任何错误提示 UI——列表保留 InitialUser、仅 schema 自带的调试文本行显示 `state:failed`；恢复同样只体现为列表换行。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w3-datasource.mjs`（s4Initial/s4AfterRetry1）
  - 输出: `s4Initial: { items: ["InitialUser"], stateText: "state:failed…" }` → `s4AfterRetry1: { items: ["FlakyRecovered"], stateText: "state:ok…" }`；`flakyStatus.hasError: true / hasData: true / stale: true`（保留旧数据契约正确）。
- **对照基准**: 检查提示词 A5（异步三态可见性）；data-source logic-only 定位（lab 页 intro 明示"Renders nothing itself"）
- **严重程度**: P3（设计定位使然：错误呈现是宿主/伴随渲染器职责；但"最小错误可见性"在控件族层面无指引，宿主漏接 statusPath 时用户无感失败）
- **用户影响**: 宿主未消费 statusPath 的页面静默失败，用户看到的是"数据没变"。
- **修复方向**: 非渲染器缺陷，建议在 flux-guide/async-data 文档层给宿主错误呈现最低契约（或提供 `<async-status name="x">` 类伴随呈现器）；本卡不立案修复。
- **归族**: watch-only → 台账（异步错误呈现契约观察）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **scope-debug 面板族**（R2-2a-C1-63）：stack trace 长令牌 overX 19009px 极值实例（R2-2b-C1-85 挂账）。
- **默认栈宽基线族**（R2-2a-E2-26）：S3 "Refresh users" 主按钮全宽拉伸（s3-refreshed-1280-dark.png 目视 + 按钮矩形占满内容宽），族实例引用。
- **i18n zh-CN 回退族**（R2-2a-F4-11）："共 2 条"（statistics chrome）、"调试/折叠"（scope-debug）中文实例。
- **lab 载体与环境基建族**：runner dark 失真声明适用——本卡 dark 证据全部为自采显式 `data-mode=dark` 后拍摄（真 data-mode）；主题切换器仍显示 "light"（环境族既有现象）。
- **计划内锚点复检通过**：data-source 自身零 DOM（`[data-slot="data-source"]` 0 命中，logic-only 契约成立）；装载→refresh→失败保留→重试恢复全链路；env IO 边界（fetcher 注入）工作正常。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-data-source` → carded（卡列填本路径）；findings 归族后 → digested。
