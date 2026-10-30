# D6 M2 设计阶段开放审计（open audit，D1-D4 交付）

> Auditor: 独立 fresh sub-agent（open audit，与 D1-D4 执行者、D5 深审员均无共享上下文；未复用任何执行会话材料，输入仅四份交付 + D5 报告 + live repo + R1-R4 + roadmap）
> Date: 2026-10-30
> 审计对象:
>
> - `docs/analysis/business-replication/d1-replication-master-design.md`（D1 总体设计）
> - `docs/analysis/business-replication/d2-erp-design.md`（D2，8 页）
> - `docs/analysis/business-replication/d3-ai-mes-design.md`（D3，6 页）
> - `docs/analysis/business-replication/d4-mall-doc-iot-design.md`（D4，7 页）
>
> 审计依据:
>
> - `docs/audits/00-audit-execution-guide.md`（Pass = 零 Blocker AND 零 Major；Minors 不阻断）
> - `docs/backlog/business-page-replication-roadmap.md` L21 审计纪律（open audit：独立 fresh sub-agent 开放评审，不复用执行者上下文）
>
> 审计方式（开放评审，非逐项核对）: 三个自由评审面——① 可实施性挑战（抽设计机制做对抗性反驳："照这份设计实现，页面真的能渲染/交互/e2e 真的能过吗"）；② 方法论盲区（横切面：i18n/主题暗色/schema 校验严格模式/性能/错误边界是否被系统性忽略）；③ 下游可用性（M3 实现者视角：颗粒度/顺序/依赖/公共设施是否够开工）。所有反驳均给出 live repo 证据（文件+行号）。
> **与 D5 深审的边界（不重复声明）**: 本审计不做 schema 片段属性级静态对照（D5 §一 33 组已清零）、不做缺口登记对账（D5 §二 12 条）、不做 countDown 张力裁决（D5 §三）、不做跨文档一致性矩阵（D5 §四 8 项）。本轮全部发现位于 D5 覆盖面之外：**绑定语义层、宿主装配层、页面形态层、验收方法论层**。
> 除本报告外未修改任何文件。

---

## 结论速览

**Verdict: Fail（零 Blocker、3 Major、8 Minor；Pass 要求零 Blocker 且零 Major，未达）。**

定性：D5 清零属性层之后，本轮把反驳推进到**下一层**——"属性都对，接起来能不能跑"。结果：**结构决策与设施先例全部经得起反驳**（mock 装配点、kanban 动态列+拖拽+refreshSource 链、axe ROUTES 机制、错误边界不掩盖故障、strict validation 在 e2e 事实生效成第四道网——均实证成立，见 §1 各"反驳不成立"节）；失败集中在三处**装配/形态层缺口**，全部落在 P0 页：

1. **K1 的 `onResponseComplete` 链写 `${result}`，但该事件 payload 是 `{message}`、`result` 是动作链"上一动作返回值"语义**——照抄则 `activeAnswer` 写入 messageSave 的响应（非 AI 答案），afterMessages 三件套与 G11 护栏 alert 的断言链整条失效（§1.1，MAJ-A）。
2. **K1 的会话编排需要 host 注入的 `conversationController`/`engine`（resolved prop，非 schema 表达式可造）**，纯 JSON surface（D1-决策①"新增 JSON 即新增页面"）供给不了；D3 自引的先例恰恰运行在专用 demo host 上。会话切换在纯 JSON 页里是惰性按钮，D3 又未按 D1 §5-⑥ 模板声明收窄——P0 页静默欠交 R2 要素①（§1.2，MAJ-B）。
3. **mobile 三页（W1/M3/S1）的页面形态在 complex-pages 壳层内未做决策**：固定 240px 侧栏（无响应折叠）+ p-6/p-4 双层 padding 的桌面壳，375×667 下内容带仅约 55px；axe 分支 B 的前提"mobile 布局 DOM 与桌面不同"与实况相悖（同一 schema 同一壳层，DOM 不随 viewport 变）；F1"移动端页 viewport 适配验证"无设计落点；mobile e2e 必需的 `hasTouch` 未进 helper 约定（§1.3，MAJ-C）。

三项 Major 均为**设计决策级但低成本可修**（改一处绑定形状 / K1 走 pih-workspace 式 host override 或显式收窄 / 补一条 mobile host 形态决策），不动摇六项落地决策与 21 页方向，故零 Blocker。8 条 Minor 集中在 e2e 手段精度、mock 类型契约、验收方法论记录与 P0 实施顺序（§4）。

---

## 一、评审面一：可实施性挑战（对抗性反驳尝试）

> 方法：对任务书点名及自选的设计机制逐个尝试反驳。每个机制给出"反驳成立/不成立"判定与 live 证据；反驳成立即 finding。

### 1.1 反驳 K1（ai-knowledge-chat，P0）"onResponseComplete → setValue activeAnswer"链——**反驳成立（→ MAJ-A）**

D3 §2.1 片段 1：

```jsonc
"onResponseComplete": [
  { "action": "ajax", "args": { "url": "/r/ReplAi__messageSave", "method": "post" } },
  { "action": "setValue", "args": { "path": "activeAnswer", "value": "${result}" } },
],
```

三层 live 反证：

1. **事件 payload 无 `result`**：`ai-chat.tsx` L460-467 构造 `payload = { message: last ? cloneMessage(last) : last }`；`dispatch-ctx.ts` L16-24 `evaluationBindings: payload`——事件上下文可求值键只有 `message`。
2. **`${result}` 是动作链语义**：`action-execution.ts` L522-539——`result`/`prevResult` 指向**链内上一动作的返回值**。本链上一动作是 `messageSave` 的 ajax 响应，即 `activeAnswer` 被写成"消息落库接口的返回值"，无论如何不是 AI 答案。
3. **断言链整条依赖 activeAnswer**：D3 §2.1 片段 2 的 ai-citations/ai-feedback/ai-token-usage 均绑 `${activeAnswer}`，G11 护栏 `visible: "${activeAnswer && activeAnswer.refused}"`——activeAnswer 写错对象后 citations 渲染空（§5.1 断言"citations 含 2 条来源"必挂）、forceGuardrail 断言（alert 可见）必挂。§2.1 文末"refused 由 onResponseComplete 动作链写入"的前提随之落空；D3 预留的 finishReason 校准退路（§4.2）救不了绑定源错误。

修法建议：`value` 改 `${message.<answers 字段>}` 形状（M3 以 `engine/types.ts` 的 MessageSnapshot 字段定稿），或以显式 `setValue` 分步取 `message.sources`/`message.content`/`message.refused`；修订时顺带核对 messageSave 是否需要 `args.data` 透传 payload（现片段无 data，落库体为空——§5.1 未断言其 body，不计 finding，提示 M3 补齐）。

### 1.2 反驳 K1"纯 JSON 页可承载会话编排"（D1-决策①对该页的适用性）——**反驳成立（→ MAJ-B）**

D3 §2.1 写"会话切换经 conversationController（先例 `ai-conversations-example.json`）"，但其片段里 `ai-conversations` 仅有 `conversations/activeId` 表达式 + onItemClick/onCreate 两个 ajax。live 反证：

1. **controller/engine 是 host 对象，不是 schema 表达式可产生的值**：`flux-renderers-ai/src/schemas.ts` L11-16 明注 "connector / conversationController: these are **resolved prop values (host objects)**"；`ai-chat.tsx` L157 直接以 resolved prop 消费。纯 `SchemaPage`（schema-page.tsx，仅注入 PAGE_DATA 静态 JSON）无法提供活对象。
2. **D3 自引的先例恰好需要专用 host**：`ai-conversations-example.json` 的 `conversationController: "${controller}"`/`engine: "${activeEngine}"` 由 `apps/playground/src/pages/ai-conversations-demo.tsx`（专用 demo page）注入 scope；complex-pages 内唯一 ai-conversations 用户 pih-workspace 也是因为"needs host-owned AI conversation state"才以 **PihWorkspaceHost 覆盖通用 SchemaPage**（complex-pages-registry.tsx L18-21 注释）——即 D1-决策①自己登记的"特殊 host 覆盖先例"正是本页所需机制，但 D1 只把它标为"备用"，D3 未对 K1 启用。
3. **纯 JSON 版的实际行为**：`ai-chat` 无 engine/controller 时自建引擎（schemas.ts L13-16 "When omitted, ai-chat self-creates an engine"）——聊天可用；但 `ai-conversations` 的 onItemClick 只发 ajax，`activeConversationId` 无人回写、取回的历史消息无处进引擎 → **切换会话 = 端点计数 +1 而界面无任何变化**。R2 §1 K1 要素①"会话管理（新建/**切换**/重命名/删除）"的"切换"语义惰性；D3 §5.1 断言集恰好绕开了切换回显（只断 conversationSave 计数），e2e 能全绿——正是 roadmap §1"不接受看起来像"要挡的形态，且 D1 §5-⑥（临时形态标注为六节模板强制项）未声明此收窄。

修法建议（二选一，须回写 D1/D3）：① K1 走 pih-workspace 式 host override（决策①预留机制转正），host 持 useConversation 注入 controller/engine，SchemaPage 仅 AI 域例外；② 显式收窄：D3 §6 增补"K1 会话切换仅验收列表 CRUD 计数与选中高亮，历史消息回显登记 watch-only"，并把 onItemClick 补 `setValue activeConversationId` 使选中态至少真实。判定 Major 的依据：P0 页 + D1 六节模板的强制标注义务 + scope honesty（audit guide draft-review 第 5 条）。

### 1.3 反驳"21 页统一 complex-pages surface"对 mobile 三页（W1/M3/S1）的承载——**反驳成立（→ MAJ-C）**

D1-决策①的依据（glob 自动装载 + entry 收录）对**桌面页**完全成立（本轮复核 schema-page.tsx L10-16、complex-pages-model 均实存）。但 mobile 三页的**页面形态**在壳层内未做任何决策，三层 live 反证：

1. **壳层是纯桌面形态**：`complex-pages-showcase.tsx` L133 `flex h-screen overflow-hidden` + L133 侧栏 `w-[240px] shrink-0`（无响应折叠类）+ main `p-6 pb-20` + PageFrame `Card p-4 overflow-y-auto`（page-frame.tsx L13）。375×667 viewport 下内容带 ≈ **55px**（375−240−48−32）；默认 e2e viewport 下"PDA 页"以 ≈960px 全宽铺开。前者使 axe 分支 B 的扫描对象退化成一条窄带（基线数值无 mobile 语义），后者不是任何相关方想要的 PDA 形态。pull-refresh/swipe-cell 嵌在 Card 的 `overflow-y-auto` 滚动容器内，与触摸手势状态机的相互作用也未评估（pull-refresh.tsx L206-219 对 touchcancel/滚动接管有专门处理，但嵌套滚动容器属未测组合——complex-pages 现存 43 页**零 mobile renderer 使用**，本轮 grep 证实 W1/M3/S1 将是头三例）。
2. **axe 分支 B 的前提句失实**：D1 §4 B 行"mobile 布局 DOM 与桌面不同"——同一 schema、同一壳层、无容器查询下 DOM 不随 viewport 变。仓内已有正确先例：`mobile-components.spec.ts` L13-17 用 `test.use({ viewport: {390,844}, hasTouch: true })` 并注明 "hasTouch is required"；`mobile-gesture-lab.spec.ts` L42-44 的裁决是"该路由本身就是 mobile surface，桌面 viewport + hasTouch 测手势"。D1 helper 只约定"mobile viewport 常量 375×667"（§3 L78），**未含 hasTouch**——swipe-cell（use-touch.ts 全 TouchEvent 驱动）/pull-refresh 的交互断言在无 hasTouch 的 context 下无法触发。
3. **F1 验收无落点**：roadmap M4-F1 明列"移动端页 viewport 适配验证"。D1 作为"M3 实现的统一前置契约"未给该验证一个被设计出来的对象——若 M3 照决策①直接塞 JSON，F1 届时面对的是"桌面壳里的 mobile 组件拼盘"，验证必然回弹到设计层。

修法建议：D1 增补一条 mobile host 形态决策（推荐：仿 pih-workspace 以 registry override 提供 mobile 容器 host——375px 定宽居中/隐藏侧栏/去 Card padding，分支 B 在该 host 上扫描）；`tests/e2e/helpers/replication.ts` 的 mobile 常量升级为 `{ viewport, hasTouch: true }` 供 `test.use` 整体消费；若裁决不做 host，则须在 D1 §4/§5 显式记录"mobile 页以桌面壳承载"的收窄及其对 F1 口径的影响。判定 Major 的依据：F1 是 roadmap 明文验收项 + 分支 B 设计输入失真 + 三页全在验收主战场。

### 1.4 反驳 mock-backend 接入 showcase-env 的装配真实性——**反驳不成立（机制成立）**

`showcase-env.ts` L111-119 `createReplicaBranches([['/r/AntdPro__', …], …])` 前缀分发循环实存（L500-503 消费点，注释明言"Bodies live in mock modules (700-line gate); the [prefix, handler] dispatch loop lives in the replica kit"）；replica-kit 259 行、showcase-env 586 行，8 个新域按"一域一模块+工厂闭包"接入后 showcase-env 预计 +30 行内，离 `check-oversized-code-files.mjs` L12 的 700 行 ERROR 门仍有余量。D1-决策③的规避门禁设计成立。

### 1.5 反驳 kanban 动态列+拖拽组合（C1/W2/K2）的运行时行为——**反驳不成立（链路成立），手段引用偏航（→ MIN-4）**

- `columnsConfig: ${stagesData}` 表达式可绑定：kanban.types.ts L54 `columnsConfig?: Record<string, any>`，kanban-board.tsx L53 经 `resolved` 求值后消费。
- 拖拽→ajax→刷新闭环实存：kanban-board.tsx L146-150 onCardMove 派发；built-in-actions refreshSource requires targetId（D5 已核）；mock 工厂闭包持有会话状态使刷新后卡片真迁移。
- e2e 可行性有仓内背书：`kanban-demo.spec.ts` L101-111（真实指针拖拽，mouse steps 12）、`linear-replica-interactions.spec.ts` L449（`locator.dragTo`）——注意 L452 注释"kanban 拖拽源注册在 React Compiler dev 双挂载下可能滞后一拍"，C1 spec 需继承该等待经验。
- **偏航点（MIN-4）**：D1 §3 与 D2 §3.3-① 把拖拽手段写为"dispatchEvent 或专用 dnd helper"——仓内两条已验证先例均为**真实指针/pointer 拖拽**，synthetic dispatchEvent 对 pointer 驱动的 dnd 管线未必生效；设计引用了不存在的手段而非已验证先例，M3 照写会先撞墙再返工。修法：D1 §3/D2 §3.3 措辞改为"沿用 kanban-demo.spec.ts L101-111 / linear dragTo 先例，封装进 replication.ts dnd helper"。

### 1.6 反驳 O1（wizard + detail-view/input-table 组合）——**部分成立（→ MIN-1、MIN-2）**

- wizard 步进门禁主链成立：`wizard-renderer.tsx` L251-254 beforeLeave 派发、L383-399 ok:false/throw 阻断导航——O1 的 ocrValidate 门禁可落地（D5 亦核）。
- **MIN-1（formId 死配置）**：D4 §2.3 片段②步骤"字段确认"声明 `formId: "ocrFieldPanel"`。live：wizard-renderer.tsx L375-384 要求该 id 在 componentRegistry 可 resolve 且目标暴露 `validate` 方法——全仓组件 handle 暴露 `validate` 的只有 form（`form-definition.ts` L118 `handle: 'validate'`；`form-component-handle.ts` L23 方法表含 validate）；**detail-view 无任何 component handle 注册**（detail-view.tsx 零 hasMethod/imperative handle），且片段亦未在任何节点声明 `id: "ocrFieldPanel"`。该 formId 在 M3 是静默 no-op（hasMethod 不命中即跳过），字段级门禁实际 100% 由 beforeLeave 承担。修法：删 formId 行并注明单点门禁；或把字段面板改为真 form 承载（不推荐，G20 已裁决 detail-view 承担）。
- **MIN-2（明细行 input-table 缺 form 宿主）**：InputTableSchema extends BoundFieldSchemaBase（composite-schemas.ts），input-table-renderer.tsx L228 注明合计回写"parent form field"——是绑定 form 状态的字段。D2 W2（`form → input-table`）与 D3 M2（dialog 内 form 包裹）同属性用法均包 form，唯 D4 O1 步骤 3 树上无 form。§5 O1 交互④断言其增改+校验——照抄有绑定落空面。修法：步骤 3 补 form 包裹（对齐 D2/D3 同款）；若 M3 实证可脱 form 绑定 scopePath，则回写本条。

### 1.7 反驳 P0 批次与实现顺序——**方向成立，颗粒度不足（→ MIN-7）**

P0="先行以最快暴露模板/设施问题"的意图正确且六页选点合理（每域代表+最高风险）。但 P0 六页**全是**新机制页，没有一个低风险页先行验证管线，且设施项全部隐含在首 Paging0 页内：`helpers/replication.ts`（openReplicationPage/dnd/swipe/viewport）、axe spec 两处失效 id 修正（D1 §4 自认"M3 扩展时一并修正"）、8 个 mock 模块+showcase-env 装配、`business-replication` 分类常量——这些没有独立切片与顺序，M3 第一个 P0 页要同时背"设施搭建+最高风险页"双职。另外 M2 页是 P0 且外挂 plan 785 依赖（roadmap §3 注"未落地前以现状验收并在页内标注"），D1 §1 M2 行临时形态标"无"，未声明 785 未落地时的验收口径由谁在何时定。修法：M3 kickoff 增设显式"设施切片"（helpers+mock kit+axe id 修正+分类常量，可与最简 P0 页 M2 合并），并给出 P0 内建议序（M2→C1→K1→W1→O1→V3——把 axe 分支 C 不确定性最高的 V3 垫后）+ M2 的 785 依赖口径一行裁决。计入 MIN-7。

### 1.8 面一小结

| 反驳点                                   | 判定                                                    |
| ---------------------------------------- | ------------------------------------------------------- |
| K1 onResponseComplete `${result}` 绑定   | **成立 → MAJ-A**                                        |
| K1 纯 JSON 页承载会话编排（决策①适用性） | **成立 → MAJ-B**                                        |
| mobile 三页 surface 形态（决策①适用性）  | **成立 → MAJ-C**                                        |
| mock-backend 装配真实性                  | 不成立                                                  |
| kanban 动态列+拖拽运行时                 | 不成立（手段引用偏航 → MIN-4）                          |
| O1 wizard 门禁主链                       | 不成立（formId/input-table 宿主两处精度 → MIN-1/MIN-2） |
| P0 批次方向                              | 方向成立（顺序颗粒度 → MIN-7）                          |

结构性反驳全部失败这一点本身是重要结论：**六项落地决策在"接起来能不能跑"层面依然站得住**；三个 Major 都是单页/单族形态层的决策缺项，不推翻 D1 骨架。

---

## 二、评审面二：方法论盲区扫描

> 逐横切面核验"21 页设计是否系统性忽略"。结论分四档：实害（记 finding）/ 需补记录 / 已被既有机制兜底 / 确认无虞。

### 2.1 schema 校验严格模式——**存在一条未记录的"第四支柱"与 warn 级盲区（→ MIN-5）**

live 实况：`playwright.config.ts` L94-96 webServer 以 `__FLUX_STRICT_VALIDATION__=true __FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__=true PLAYWRIGHT=true` 启动 playground dev server；浏览器侧 `SchemaRenderer` 以 `isStrictValidationEnabled()` 解析（schema-renderer.tsx L468），dev 下 DEV=true 即 strictMode=true（strict-mode.ts L50-58 readDevMode）；error 级诊断经 fallback reporter 走 **console.error**（schema-renderer.tsx L62-64 注释"L1-MA4.5-002: error -> console.error, warning/info -> console.warn"）→ `fixtures.ts` L63/79 的 console.error 跟踪使其**直接挂掉该页 spec**。也就是说：D5 属性矩阵之外还存在一条**事实生效的 schema 诊断门禁**，任何 error 级诊断（如 echarts dataset 非对象、pivot dimensionKey 缺失这类 validator 硬校验）都会让 21 页 spec 失败——它默默救场却不见于 D1 §3 三支柱。同时 **warn 级诊断无人观测**：console.warn 不进 assertTrackedPageErrors，`check:console-baseline` 只扫源码 console.log/debug 不覆盖运行时 warn——21 个新页面可能静默积累 warn 级诊断债且无棘轮。修法：D1 §3 补记该门禁一句（"e2e 下 error 级 schema 诊断=页面失败"）；可选增强：spec 骨架加 warn 计数采集并在 JSON/日志登记（对齐 PH-17 棘轮语义），或 M3 一次性 sweep 登记存量。

### 2.2 i18n——确认无冲突，建议 Non-Goals 一句话声明

`check-i18n-keys.mjs` L12-18 只解析 zh-CN/en-US locale 并扫描 `.ts/.tsx` 的 `t('flux.*')`——**JSON page-schemas 豁免**，schema 内硬编码中文不触任何门禁；playground 既有 demo 亦为硬编码中文（上游惯例）。复刻页目标是 UX 能力验证非生产 i18n，无需设计动作；建议 D1 §0 补一句 Non-Goal 声明防后续误读。不计 finding。

### 2.3 主题/暗色——已被既有机制兜底

M1 暗色底以 page 根 `className` 一次声明（D3 §2.0）符合 theme-compatibility 的 CSS 变量契约；壳层 theme-switcher 与 M1 局部暗色的叠加若产生对比度问题，由 axe 分支 A 基线棘轮兜底（违规红/登记）。无盲区，不需设计动作。

### 2.4 性能/大表格虚拟滚动——按设计数据量确认无虞

设计数据量上限（列表 ≥25 行/实体、trend24h 24h×48 点、pivot 25 行级原始行集）远低于虚拟滚动阈值；`kanban-perf.spec.ts` 先例表明 kanban 有性能观测位，可按需复用。唯一性能相邻发现是轮询断言策略不一致（→ MIN-6）：D3 §5.4 M1 明智地"只断首帧（防 flake）"，D4 §5 V1 却要求"tickTelemetry→≤6s 内文本变化"（interval 5000 + 6s 窗口，余量仅 1s，双 webServer/workers 2 下 flake 面偏大）。修法：V1 对齐 M1 口径——断言"tickTelemetry 后在 interval+余量窗口内变化"并显式给足 waitFor timeout，或改为计数钩子推进后直接断言数据面。

### 2.5 错误边界——确认不构成盲区（正面结论）

node 级渲染错误被 `node-error-boundary.tsx` 捕获后**显式 console.error**（L104/L142），而 fixtures 的 KNOWN_NOISE_PATTERNS 白名单极窄（L61：favicon/DevTools/两类 net 错误）——边界不掩盖故障，"页面半挂但 e2e 全绿"的通路不存在。三支柱的错误网是健全的。

### 2.6 其余横切面

- **并发/资源**：21 个新 spec × workers 2 × 双 webServer；axe 仅在基线 spec 集中执行；V1/M1 轮询页 `silent: true` 不刷 console。无门禁冲突。
- **D4 repl-\* 自定义 CSS 的落点未指名（并入 MIN-8 记录）**：`repl-price/repl-sticky-footer/repl-low-confidence` 等类与 `--repl-low-confidence-bg` 变量是 §5 断言对象（getComputedStyleValue），机制先例存在（styles.css L22/L27 @import sundial/airtable 各自 css），但 D1/D4 未指名文件与 @import 位置——"页面级样式"表述不足以开工即对。并入 MIN-8 的公共设施清单。
- **验收三支柱是否够**：三支柱+error 网在"交互/a11y/focus/健壮性"四维是闭合的（2.1/2.5）；缺的不是支柱而是 2.1 的记录与 warn 观测、以及 2.6 的 CSS 落点指名。

---

## 三、评审面三：下游可用性走查（M3 实现者视角）

1. **颗粒度**：够开工。逐页组件树+片段+端点表+断言清单三件套齐备，D2-D4 六节模板同构，实现者无需回读上游 roadmap 之外的材料；片段节选处（`"…"`）M3 补全的口径已在 D3 §2.0 声明。
2. **依赖可见性**：缺口分级/登记去向/验证项归集闭环（D5 已核 12 条）；D2 §3.3/D4 §3.3 的"验证方法+降级路径+不静默"义务写法是同类文档的亮点，M3 可直接照单执行。缺口在**设施依赖**：公共 helper 清单不全（→ MIN-8）与 P0 内顺序/设施切片（→ MIN-7）。
3. **P0→P1→P2 批次合理性**：批次划分（6/12/3）与风险分布合理；P2 三页（I2/S2/V2）确为低风险直接组合，作为收尾批次成立。唯一结构性建议已并入 MIN-7（P0 内部排序与设施先行），不改动批次本身。
4. **mock 类型契约精度（→ MIN-3）**：countdown `targetTime` 契约为 **number**（countdown.tsx L31/L53-57：非 number 不进入 targetTime 分支，ISO 字符串静默不触发 onFinish/不走算），而 D3 §4.5 `respondDeadline`、D4 §4.1 `promo.seckillEndAt` 均未声明类型——mock 按上游 ORM 习惯生成 ISO 字符串即静默失效（S1 场次切态断言、M3 超时标红断言同挂）。同类：D4 `advanceFlashSaleClock(deltaMs)` 钩子"推进倒计时基线"的**传播路径未声明**——钩子改 mock 闭包值不会自动重解析 scope 绑定，需要显式 refreshSource（或钩子约定"改写后由 spec 触发 goodsDetail 刷新"）。修法：D3 §4.5/D4 §4.1 为时间戳字段统一标注 epoch-ms 数值；D4 §4.1 钩子表补传播路径一句。

---

## 四、Issue 清单

> 严重度口径（沿 D5）：Blocker=方向性/不可收口；Major=照设计实现必致对应验收断言失败或验收语义落空（含静默欠交与设计决策缺项）；Minor=不改变行为结论的精度/记录/手段问题（均给处置建议）。

### Blocker（0）

无。三个 Major 均有单点低成本修法，不动摇六项落地决策与 21 页方向。

### Major（3）

| #     | 位置                                            | 问题                                                                                                                                                                                                                                                                                                                                               | 证据（live）                                                                                                                                                                                                                                   | 修法建议                                                                                                                                                                                                                          |
| ----- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MAJ-A | D3 §2.1 K1 片段 1 `onResponseComplete` 第二动作 | `value: "${result}"` 绑定源错误：事件 payload 为 `{message}`（evaluationBindings=payload），`result` 在动作链中指"上一动作（messageSave）返回值"——`activeAnswer` 永远不是 AI 答案 → afterMessages 三件套渲染空、G11 护栏 `visible:${activeAnswer && activeAnswer.refused}` 永不可见 → §5.1 citations/guardrail 断言必挂                            | ai-chat.tsx L460-467；dispatch-ctx.ts L20-24；action-execution.ts L522-539                                                                                                                                                                     | 改 `${message.<字段>}` 形状（M3 对照 engine/types.ts 定稿）或分步 setValue 取 message.sources/content/refused；顺带补 messageSave 的 args.data 透传                                                                               |
| MAJ-B | D3 §2.1 K1 会话编排 × D1-决策①                  | `conversationController`/`engine` 是 host 注入 resolved prop（非 schema 表达式可造）；纯 SchemaPage 下 K1 的会话切换为惰性动作（activeId 无人回写、历史消息无处进引擎），R2 要素①"切换"语义静默欠交，且 D3 §6 未按 D1 §5-⑥ 模板声明收窄——P0 页"看起来像"风险                                                                                       | schemas.ts L11-16（host objects 注释）；ai-conversations-example.json + pages/ai-conversations-demo.tsx（先例本身是专用 host）；complex-pages-registry.tsx L18-21（pih-workspace 因 host-owned state 而覆盖）                                  | 二选一并回写文档：① K1 走 pih-workspace 式 host override（决策①"备用"机制转正，host 持 useConversation）；② 显式收窄入 D3 §6（切换仅验列表 CRUD+选中高亮，历史回显登记 watch-only）+ onItemClick 补 setValue activeConversationId |
| MAJ-C | D1-决策①/§4 分支 B × W1/M3/S1 页面形态          | mobile 三页在 complex-pages 桌面壳内无形态决策：固定 240px 侧栏无响应折叠，375×667 下内容带 ≈55px（axe 分支 B 扫描对象退化），桌面下 ≈960px 全宽"远非 PDA 形态"；分支 B 前提"mobile 布局 DOM 与桌面不同"与实况相悖（同 schema 同壳层 DOM 不随 viewport 变）；F1"移动端页 viewport 适配验证"无设计落点；mobile e2e 必需的 hasTouch 未进 helper 约定 | complex-pages-showcase.tsx L133（w-[240px] shrink-0）/L171（p-6）；page-frame.tsx L13（Card p-4 overflow-y-auto）；mobile-components.spec.ts L13-17（hasTouch 必需先例）；mobile-gesture-lab.spec.ts L42-44（桌面 viewport+hasTouch 裁决先例） | D1 增补 mobile host 形态决策（推荐 registry override 提供 375px 移动容器，仿 pih-workspace）；helper 的 mobile 常量升级为 `{viewport:375×667, hasTouch:true}`；若不做 host 则在 D1 §4/§5 显式记录收窄及 F1 口径影响               |

### Minor（8）

| #     | 位置                                                        | 问题                                                                                                                                                                                                                                                                                         | 证据                                                                                                                                 | 处置建议                                                                                                                                |
| ----- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| MIN-1 | D4 §2.3 片段② wizard `formId:"ocrFieldPanel"`               | 死配置：id 未在任何节点声明；detail-view 无 component handle、不暴露 validate（全仓仅 form 暴露）——wizard formId 校验静默跳过，字段级门禁实际全靠 beforeLeave                                                                                                                                | wizard-renderer.tsx L375-384（hasMethod 才生效）；form-definition.ts L118；detail-view.tsx 零 handle                                 | 删 formId 行并注明单点门禁=beforeLeave；或注明"如改 form 承载才启用"                                                                    |
| MIN-2 | D4 §2.3 O1 步骤 3 明细行                                    | input-table（BoundFieldSchemaBase，绑定 form 状态）未包 form——D2 W2/D3 M2 同属性用法均包 form，唯此页裸放；§5 交互④断言有绑定落空面                                                                                                                                                          | composite-schemas.ts（extends BoundFieldSchemaBase）；input-table-renderer.tsx L228（"parent form field"联动）；D2 §2.2/D3 §2.5 对照 | 步骤 3 补 form 包裹（对齐 D2/D3）；M3 若实证可脱 form 绑定则回写本条                                                                    |
| MIN-3 | D3 §4.5 / D4 §4.1 mock 时间戳字段 + `advanceFlashSaleClock` | countdown `targetTime` 契约 number（epoch ms），ISO 字符串静默不触发；respondDeadline/seckillEndAt 未声明类型；"推进倒计时基线"钩子的 scope 传播路径未声明（改闭包值≠重解析绑定）                                                                                                            | countdown.tsx L31/L53-57（typeof number 分支）；D4 §5 S1 交互③依赖该钩子                                                             | 时间戳字段统一标注 epoch-ms；钩子表补"改写后由 spec 触发对应 data-source 刷新"路径                                                      |
| MIN-4 | D1 §3 / D2 §3.3-① 拖拽手段                                  | "dispatchEvent 或专用 dnd helper"与仓内两条已验证先例（真实指针 mouse steps / dragTo）不符，synthetic dispatch 对 pointer 驱动 dnd 未必生效——M3 照写先撞墙                                                                                                                                   | kanban-demo.spec.ts L101-111；linear-replica-interactions.spec.ts L449（含 L452 双挂载滞后注）                                       | 措辞改"封装 kanban-demo/linear dragTo 先例进 replication.ts dnd helper"                                                                 |
| MIN-5 | D1 §3 验收模板（方法论记录）                                | e2e 下 strict schema 诊断门禁事实生效（error 级→console.error→spec 挂）却未记录为支柱；warn 级诊断零观测（console.warn 不跟踪、console-baseline 不覆盖运行时），21 页可能静默积累 warn 债                                                                                                    | playwright.config.ts L94-96；strict-mode.ts L50-58；schema-renderer.tsx L62-64/L468；fixtures.ts L61 白名单极窄                      | D1 §3 补记一句；可选：spec 骨架采集 warn 计数登记（PH-17 棘轮语义）或 M3 一次性 sweep                                                   |
| MIN-6 | D4 §5 V1 轮询断言                                           | "tickTelemetry→≤6s 内文本变化"：interval 5000+6s 窗余量 1s，比 D3 §5.4 M1"只断首帧（防 flake）"策略明显更 flake——同族页面两套口径                                                                                                                                                            | D4 §5 V1 ① vs D3 §5.4 轮询口径                                                                                                       | 对齐 M1：断言窗口 ≥interval+余量并显式 waitFor，或改为钩子推进后直接断数据面                                                            |
| MIN-7 | D1 §1 P0 批次（实施顺序）                                   | P0 六页全是新机制页，无设施先行切片（helpers/axe 失效 id 修正/mock 装配/分类常量均隐含在首页）；M2 外挂 plan 785 依赖而 D1 标"无"临时形态、未声明未落地时口径                                                                                                                                | D1 §1 M2 行 vs roadmap §3 785 联动行                                                                                                 | M3 kickoff 增设设施切片（可与 M2 合并）；给出 P0 内建议序（M2→C1→K1→W1→O1→V3）；M2 补 785 口径一行                                      |
| MIN-8 | D1 §3 公共 helper 清单 + D4 repl-\* CSS 落点                | helper 仅列 openReplicationPage/swipe/drag/viewport；"dialog 焦点入面板+Esc 返回"模式在 D2-D4 重复 ~15 次、`__repl*Calls` 计数断言每页都有——不进 helper 则 21 spec 各写各的；repl-\* 类与 `--repl-low-confidence-bg` 是 §5 断言对象但 CSS 文件/@import 位置未指名（先例 styles.css L22/L27） | D2-D4 各页 focus 第②③条高频同款；D4 §2.3/§2.1                                                                                        | replication.ts 增 assertDialogFocusRoundTrip/expectEndpointCall；指名 `apps/playground/src/…/replication.css` + styles.css @import 约定 |

---

## 五、最终 Verdict 与修复要求

**Verdict: Fail（0 Blocker / 3 Major / 8 Minor；Pass = 0B && 0M 未达）。**

- 失败面与 D5 首轮同构而层次不同：D5 清的是属性层笔误，本轮清的是**绑定语义层（MAJ-A）、宿主装配层（MAJ-B）、页面形态层（MAJ-C）**——三者全部集中在 P0 页，恰证"P0 先行暴露问题"的批次策略有效，问题在设计阶段被开放审计截住而非 M3 返工。
- 修复要求：
  1. MAJ-A/D3、MAJ-B/D1+D3、MAJ-C/D1（+helper 约定）按 §四修法逐条落实；三处均为文档级修订 + 少量设计决策（mobile host 形态、K1 host-or-收窄须给出裁决而非两可）。
  2. MIN-1~4/6/7/8 建议随修订轮顺带处理（均为一两句话/一行的机械修订）；MIN-5 至少落"补记录"半句，warn 观测可作为可选项交给 M3 验收计划。
  3. 修订后按审计纪律由**独立 fresh session** 复审（建议复审焦点：三 Major 修法落地 + K1/mobile 两个 host 裁决是否单点明确 + 本报告 §1 各"不成立"结论未被修订波及）。
- 本报告未修改除自身外的任何文件。

---

## 附录 A：修复与复审轨迹（独立复审员会话补记）

- **修复轮 1**（执行会话按 §四/§五修法落实，修改文件 d1/d2/d3/d4）：MAJ-A~C、MIN-1~8 全部落地（diff 复核：d1 决策①例外注+P0 设施切片+第四道网+helper 清单+分支 B 勘误；d2 W1 形态注+MIN-4 拖拽勘误；d3 K1 host override 裁决块+MAJ-A 绑定链；d4 S1 形态注+MIN-1/2/3/6/8）。`roadmap.md` 的 D6 状态行改动（todo→planned，plan 797）系首轮审计开始前已存在的未提交变更，非本修复轮产物。
- **复审轮 1（独立复审员，1/2 最终轮）**：Verdict **`Pass`（0 Blocker / 0 Major / 0 新增 Minor）**——
  - 3/3 Major 落地核验通过：MAJ-A（`${message}` 整快照绑定 + payload 勘误注 + messageSave `data:{message}` 透传 + citations/feedback/token-usage 绑定成立条件以「MAJ-A 同步检查」段落同步，finishReason 透出路径补 `payload.message.metadata.finishReason`）；MAJ-B（K1 host override 裁决块三层依据 + onItemClick 改 `replAi:setActive`→`switchConversation` + 切换全语义可验收不收窄；D1 决策①例外注「K1+W1/M3/S1 host override，其余 17 页纯 JSON」与四文档形态注/分支 A 17 页计数交叉一致）；MAJ-C（mobile host override 移动画布 375×667 + 分支 B 前提勘误 + hasTouch context + F1 落点 + D2 W1/D3 M3/D4 S1 形态注 + axe「画布内断言」）。
  - 8/8 Minor 处置核验通过（MIN-1 formId 删除留勘误注 / MIN-2 步骤 3 form 包裹 / MIN-3 epoch-ms 三处+advanceFlashSaleClock 传播路径 / MIN-4 真实指针先例两处 / MIN-5 第四道网补记录+warn 零观测说明与 M3 可选增强 / MIN-6 V1 对齐 M1 口径 timeout ≥7s / MIN-7 设施切片+P0 内序 M2→C1→K1→W1→O1→V3+785 口径声明 / MIN-8 helper 五件套+replication.css+styles.css @import 指名）。
  - 修复新引入声明全部 live 命中（防修复自身 drift）：`ChatMessage.id/role/content` + `ChatMessageMetadata.finishReason`（engine/types.ts L39-44/L86-105）；`AiCitationsSchema.message` "[N] parsing"（schemas.ts L370-374）；`AiTokenUsageSchema.message` "metadata.usage is read"（L407-416）；plan 633 UR-4 注释逐字命中（ai-conversations-demo.tsx L74「activeId 所有权归 host store」）；`switchConversation(id)` 实存于 controller 契约（ai-conversation-controller.ts L21、use-conversation-contracts.ts L61/L79、ai-action-provider.ts L150）；demo host 经 page-data 注入 `controller`/`activeEngine` 且 P1-MA5.6-001（plan 745）注解逐字命中（ai-conversations-demo.tsx L49-71）；`conversationsDemo:setActive` namespace action 先例实存（L83-105）——`replAi:setActive` 为同构换名。sources/refused/usage 非 ChatMessage 一等字段这一点已被修复文本显式披露为 M3 对照 cloneMessage 快照的定稿义务（ChatMessageMetadata 具索引签名 `[key: string]: unknown`，类型可容），无静默 overclaim。
  - D5 已落勘误注（统一勘误注/就地勘误行）未被本轮 diff 波及；§1 各「不成立」结论（mock 装配/kanban 链路/错误边界/strict 网）未受修订影响。
  - 非阻断备忘（不记 finding，供 M3 参考）：host override 后三 mobile 页的分支 A（桌面 viewport）与分支 B（移动 viewport+hasTouch）扫描的是同一份画布 DOM，基线数值将高度相近——M3 建 axe 基线时按「画布内 DOM」一元口径登记即可，避免两键同值造成的维护困惑；K1 host 组件名（AiKnowledgeChatHost）为示例名，M3 定名。
- 本审计达到关闭条件（Pass 判定：零 Blocker、零 Major；Minor 无新增）。
