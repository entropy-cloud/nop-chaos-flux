# D3 AI/MES 两域复刻设计（K1–K3 / M1–M3 六页）

> Created: 2026-10-30
> Source: roadmap §2 M2-D3；执行 plan `docs/plans/794-business-replication-d3-ai-mes-design-plan.md`
> 契约: 章节结构强制遵循 D1 §5 六节模板（L92-101）；页面形态/mock/验收遵守 D1 §0 六项决策、§2 mock 规范、§3 验收模板、§4 axe 分支。
> 输入: R2 §1（AI 域）/§2（MES 域）逐页盘点；R4 §1 六行结论 + §2 G 缺口分级；type 名 live 核实见 §7（2026-10-30）。

## 1. 页面清单与上游引用

六页 pageId 沿用 D1 §1 表 #9-14（L29-34）；不重抄交互要素，按「上游引用」列回读 R2。优先级承 D1 §1 L43：P0 = M3 首批（K1 为 AI 域代表页、M2 为 plan 785 能力验收页）。

| pageId              | 页面              | R4 §1 结论（行号） | 优先级 | 上游引用（R2）                                         |
| ------------------- | ----------------- | ------------------ | ------ | ------------------------------------------------------ |
| ai-knowledge-chat   | K1 知识库对话     | 直接组合（L28）    | **P0** | R2 §1 K1 L18-24（形态 L21/要素 L22/映射 L23/缺口 L24） |
| ai-ticket-console   | K2 工单处理台     | 能力扩展（L29）    | P1     | R2 §1 K2 L26-32（形态 L29/要素 L30/映射 L31/缺口 L32） |
| ai-approval-trail   | K3 审批轨迹       | 直接组合（L30）    | P1     | R2 §1 K3 L34-40（形态 L37/要素 L38/映射 L39/缺口 L40） |
| mes-shopfloor-board | M1 车间大屏       | 直接组合（L31）    | P1     | R2 §2 M1 L46-52（形态 L49/要素 L50/映射 L51/缺口 L52） |
| mes-work-reporting  | M2 工序报工       | 直接组合（L32）    | **P0** | R2 §2 M2 L54-60（形态 L57/要素 L58/映射 L59/缺口 L60） |
| mes-andon-material  | M3 异常叫料移动页 | 直接组合（L33）    | P1     | R2 §2 M3 L62-68（形态 L64/要素 L66/映射 L67/缺口 L68） |

## 2. Schema 结构设计

### 2.0 通用约定

- 每页一个 JSON `page-schemas/<pageId>.json`（D1 决策① glob 自动装载）+ `COMPLEX_PAGE_ENTRIES` 增 entry（category `business-replication`，D1 决策②）。
- testid：主容器 `<pageId>-root`、关键元素 `<pageId>-<element>`（D1 §3 L76）；schema 顶层 `testid`（schema.ts L90）编译进 `props.meta.testid`。
- styling contract（D1 §5-②）：布局类 renderer（page/flex/dashboard 骨架）只发 marker 类 + 显式 `stack-*`/`hstack-*` 别名；widget 类 renderer（ai-\*、kanban、input-table、stat-tile、mobile 族）为自样式完整控件；M1 暗色底以 page 根 `className` 一次声明。
- 数据绑定：查询走 data-source/crud → `/r/ReplAi__*`、`/r/ReplMes__*`（§4），信封 `{status:0,data:{items,total}}`；业务数据不内联进 schema（D1 §2 L51）。
- 动作写法：`ajax` 的 `args` 即 ApiSchema（`{url,method,data,params}`，schema-base-types.ts L36-41；先例 standard-crud.json L12-17）；`when` 条件门（actions.ts L165）按列/状态路由；`then`/`onError` 链做刷新与错误 toast。片段为节选，`"…"` 处 M3 补全。
- **统一勘误注（2026-10-30，D5 深审，与 D2 §2.0 同款）**：全文 ajax 的 ApiSchema 一律置于 `args`（AjaxActionSchema args: ApiSchema，flux-core types/actions.ts L171-173）；data-source 取数走 `action`+`args`（DataSourceSchema 无 `api`/顶层 `url` 字段）；form 提交走 `submitAction`（FormSchema 无 `api` 字段，form/schemas.ts L104）；refreshSource 契约为顶层 `targetId`（与 D2 二轮勘误同步）——D5 深审勘误，以下各片段就地标注。

### 2.1 K1 ai-knowledge-chat（P0，直接组合，涉 G11）

```
page（xui:imports ai://）
└─ flex row
   ├─ ai-conversations #ai-knowledge-chat-conversations（events → ReplAi__conversation*）
   └─ flex col
      └─ ai-chat #ai-knowledge-chat-chat connector=${$ai.connectors.mock}
         ├─ header：标题 + 频控提示位（G11）；beforeMessages：ai-welcome + ai-prompts（chips，onSelect→ai:send）
         ├─ 内置：ai-message-list + ai-bubble（streaming buffer）+ ai-sender（停止钮 data-slot="ai-sender-cancel"，ai-sender.tsx L167-177）
         ├─ afterMessages：alert（G11）+ ai-citations + ai-feedback + ai-token-usage，绑 ${activeAnswer}
         └─ onResponseComplete：ajax messageSave → setValue activeAnswer
```

ai-citations/ai-feedback/ai-token-usage 是 message 级独立 widget（不内嵌 bubble，live 核实），落 afterMessages 绑定最近一条 assistant 消息；会话切换经 conversationController（先例 `ai-conversations-example.json`）。

片段 1（骨架，节选）：

```jsonc
{
  "type": "page",
  "testid": "ai-knowledge-chat-root",
  "xui:imports": [{ "from": "ai", "as": "ai" }],
  "body": [
    {
      "type": "flex",
      "direction": "row",
      "items": [
        {
          "type": "ai-conversations",
          "testid": "ai-knowledge-chat-conversations",
          "conversations": "${conversations}",
          "activeId": "${activeConversationId}",
          "onItemClick": {
            "action": "ajax",
            "args": {
              "url": "/r/ReplAi__messageFindPage",
              "method": "get",
              "params": { "conversationId": "${id}" },
            },
          },
          "onCreate": {
            "action": "ajax",
            "args": { "url": "/r/ReplAi__conversationSave", "method": "post" },
          },
        },
        {
          "type": "ai-chat",
          "testid": "ai-knowledge-chat-chat",
          "connector": "${$ai.connectors.mock}",
          "submitType": "enter",
          "placeholder": "向知识库提问…",
          "onResponseComplete": [
            { "action": "ajax", "args": { "url": "/r/ReplAi__messageSave", "method": "post" } },
            { "action": "setValue", "args": { "path": "activeAnswer", "value": "${result}" } },
          ],
        },
      ],
    },
  ],
}
```

片段 2（G11 护栏提示 + afterMessages 三件套）：

```jsonc
{
  "type": "ai-chat",
  "afterMessages": [
    {
      "type": "alert",
      "testid": "ai-knowledge-chat-guardrail",
      "level": "warning",
      "visible": "${activeAnswer && activeAnswer.refused}",
      "body": "本次回答触发内容护栏已被拦截，请调整提问后重试。",
    }, // D5 深审勘误（MIN-6）：补 body 文案——AlertSchema 反馈内容属性为 body（content/schemas.ts L280），缺文案会渲染空壳且断言只看可见性会掩盖空文案缺陷
    {
      "type": "ai-citations",
      "testid": "ai-knowledge-chat-citations",
      "mode": "list",
      "message": "${activeAnswer}",
      "sources": "${activeAnswer.sources}",
    },
    {
      "type": "ai-feedback",
      "testid": "ai-knowledge-chat-feedback",
      "message": "${activeAnswer}",
      "actions": ["copy", "refresh", "like", "dislike", "sources"],
      "onAction": { "…": "ajax feedbackCreate" },
    },
    {
      "type": "ai-token-usage",
      "testid": "ai-knowledge-chat-token-usage",
      "message": "${activeAnswer}",
      "contextLimit": 8192,
      "showCost": true,
    },
  ],
}
```

护栏判定：mock stream 按 §4.2 refusal 预设返回拒绝应答，`refused` 由 onResponseComplete 动作链写入；finishReason 若引擎未透出（M3 对照 `engine/types.ts` 校准），退化「内容前缀 `[REFUSED]` + formula 检测」等价口径（断言只看 alert 可见性）。

### 2.2 K2 ai-ticket-console（P1，能力扩展：G9 桌面 SLA 倒计时临时形态 + G11 置信度门 + G12 采用链路）

```
page
├─ data-source source=ReplAi__ticketFindPage name=ticketSource（initFetch）
├─ hstack stat-tile ×4（待派单/超 SLA/今日解决/平均首次响应；SLA 卡静态口径 §6.1）
├─ tabs 双视图：kanban（draggable，statusPath=status，六态 columnsConfig + columnAggregate 计数，
│    onCardMove 按 toColumnId 路由 mutation，片段 1）｜crud（query-filter + table 配色 + 分页）
└─ drawer 详情 #ai-ticket-console-detail：steps 状态轴；text SLA 静态剩余时长（formula 一次性
   求值，G9 临时 §6.1）；timeline 处理轨迹（ticketActionFind）；ai-suggestions 推荐回复
   （confidence<0.6 → alert 人工接管，G11，片段 2）；textarea replyDraft
   + button 提交 → ticketReply；button 升级 → ticketMutation{escalate}
```

片段 1（kanban 六态路由；onCardMove payload `{cardId,fromColumnId,toColumnId,fromIndex,toIndex,card}`，`kanban-board.tsx` L271）：

```jsonc
{
  "type": "kanban",
  "testid": "ai-ticket-console-kanban",
  "draggable": true,
  "statusPath": "status",
  "columnsConfig": {
    "OPEN": { "title": "待受理" },
    "…": "ASSIGNED 已派单 / PROCESSING 处理中 / RESOLVED 已解决 / CLOSED 已关闭 / REOPENED 已重开",
  },
  "onCardMove": [
    {
      "action": "ajax",
      "when": "${toColumnId === 'ASSIGNED'}",
      "args": {
        "url": "/r/ReplAi__ticketMutation",
        "method": "post",
        "data": { "id": "${cardId}", "mutation": "assign" },
      },
    },
    {
      "action": "ajax",
      "when": "${toColumnId === 'PROCESSING'}",
      "args": { "…": "mutation=start" },
    },
    {
      "action": "ajax",
      "when": "${toColumnId === 'RESOLVED'|'CLOSED'|'REOPENED'}",
      "args": { "…": "mutation=resolve|close|reopen" },
    },
    { "action": "refreshSource", "targetId": "ticketSource" }, // D5 深审勘误（D2 二轮勘误同步）：refreshSource 契约为顶层 targetId（built-in-actions L217-227 requires targetId），args.sourceName 全仓无消费方
  ],
}
```

列 id 六态对齐上游 `ErpCsTicket` status（R2 L28 ORM 佐证）；枚举字面量 M3 对照活仓 `kanban.flux.yaml` 定稿。

片段 2（G12 采用→写回 + G11 置信度门）：

```jsonc
{ "type": "ai-suggestions", "testid": "ai-ticket-console-suggestions", "items": "${suggestions}",
  "onSelect": [
    { "action": "setValue", "args": { "path": "replyDraft", "value": "${item.text}" } },
    { "action": "showToast", "args": { "level": "success", "message": "已采用 AI 推荐回复" } } ] },
{ "type": "alert", "level": "warning", "testid": "ai-ticket-console-confidence-gate",
  "visible": "${suggestions[0].confidence < 0.6}", "body": "AI 置信度低于门限，建议人工接管后回复。" }
// D5 深审勘误：AlertSchema 无 message 属性（content/schemas.ts L267-284：title/body），反馈内容改 body——原 message 被静默丢弃渲染空壳
```

### 2.3 K3 ai-approval-trail（P1，直接组合，涉 G13/G18）

```
page
├─ data-source source=ReplAi__approvalTaskFindPage name=approvalTaskSource
├─ crud 待办列表 #ai-approval-trail-todos（行点击 → openDrawer 详情）
└─ drawer 详情：steps approveStatus 状态轴（UNSUBMITTED→SUBMITTED→APPROVED/REJECTED，四值权威源
   R2 L36；映射 wait/process/finish/error）；timeline 审批轨迹（approvalTrailFind：操作人/时间/
   动作/意见；reject 节点 level=error）；ai-tool-call HITL 审批卡（片段 1）；hstack 动作区：
   approve → approvalAct；reject（openDialog 意见表单 required）；
   转办（openDialog 片段 2，G13）；wf 图形可视化不做（G18：timeline/steps 覆盖，R4 §2 L65）
```

片段 1（HITL 卡；engine 不 mutate approval、宿主持有工作流，`ai-tool-call.tsx` L24-27）：

```jsonc
{
  "type": "ai-tool-call",
  "testid": "ai-approval-trail-hitl-card",
  "toolCall": "${hitlToolCall}",
  "state": "${hitlToolCallState}",
  "onApproval": [
    {
      "action": "ajax",
      "when": "${action === 'approve'}",
      "args": {
        "url": "/r/ReplAi__hitlDecision",
        "method": "post",
        "data": { "callId": "${hitlToolCall.id}", "decision": "approve" },
      },
    },
    { "action": "ajax", "when": "${action === 'reject'}", "args": { "…": "decision=reject" } },
    { "action": "refreshSource", "targetId": "approvalTaskSource" }, // D5 深审勘误（同 §2.2 二轮勘误同步）：顶层 targetId，args.sourceName 无消费方
  ],
}
```

片段 2（转办 dialog，G13 组合）：

```jsonc
{
  "type": "dialog",
  "title": "转办",
  "testid": "ai-approval-trail-transfer-dialog",
  "body": {
    "type": "form",
    "submitAction": {
      "action": "ajax",
      "args": { "url": "/r/ReplAi__approvalTransfer", "method": "post" },
    },
    // D5 深审勘误：FormSchema 无 api 字段（form/schemas.ts L89-143，提交走 submitAction L104；先例 standard-crud.json L70-73）——原 api 被静默丢弃致 approvalTransfer 永不发出
    "body": [
      { "type": "user-select", "name": "targetUserId", "label": "转办给", "required": true },
      { "type": "textarea", "name": "reason", "label": "转办原因", "required": true },
    ],
  },
}
```

### 2.4 M1 mes-shopfloor-board（P1，直接组合，涉 G10）

```
page（暗色 className 一次声明）
├─ notice-bar（未关闭异常滚动播报，text 数组多文本轮播；桌面使用口径 R4 §0 L14 registry 共享）
├─ data-source name=kpiSource → action:'ajax' dashboardKpi，interval=15000+silent+initFetch（schema.ts L295-308）
├─ dashboard（panels 网格坐标模型，flux-renderers-dashboard/schemas.ts）：stat-tile ×4
│  （计划/完成/报废/完成率，value/delta/sparkline/status，G10 近似翻牌器 §6.2）｜echarts line
│  当日趋势（dataset=kpi.trend24h 24h×48 确定性序列；9 类事件 echarts-renderer-definition.ts L23）｜
│  table 工单四阶段进度（progress + status labelMap/levelMap 配色分级，片段 2）｜table 当前停机｜
│  scada-canvas 车间工位组态（config 单一字段符号树）
└─ echarts onClick 下钻预警明细（openDialog + table）
```

片段 1（data-source 轮询 + dashboard panels，节选；DataSourceSchema 无独立 api 变体，取数走 `action:'ajax'`，schema.ts L296-327）：

```jsonc
{ "type": "data-source", "name": "kpiSource",
  "action": "ajax", "args": { "url": "/r/ReplMes__dashboardKpi", "method": "get" },
  "interval": 15000, "silent": true, "initFetch": true },
{ "type": "dashboard", "testid": "mes-shopfloor-board-root", "cols": 12, "rowHeight": 44,
  "panels": [
    { "id": "kpi-planned", "type": "stat-tile", "x": 0, "y": 0, "w": 3, "h": 2, "title": "计划数",
      "props": { "value": "${kpi.planned}", "sparkline": "${kpi.plannedSpark}", "delta": "…" } },
    { "id": "trend", "type": "echarts", "x": 0, "y": 2, "w": 8, "h": 4, "title": "当日报工趋势",
      "props": { "option": "${trendOption}", "dataset": { "source": "${kpi.trend24h}" } } },   // D5 深审勘误：EChartsDatasetSchema 要求对象 {source,dimensions?,transform?}（echarts-schemas.ts L9-13，validator 硬校验 must be an object），原字符串数组表达式被 renderer 置 null
    { "id": "scada", "type": "scada-canvas", "x": 8, "y": 2, "w": 4, "h": 4,
      "props": { "config": "${shopfloorScadaConfig}" } } ] }
```

scada-canvas：`config` 为组态 JSON 单一字段（quick-reference.md §Industrial L976-983）；符号树取内置符号 `scada-group`/`scada-rect`/`scada-text`/`scada-device-motor`/`scada-sensor-control-indicator` 静态摆位 + 点表桥接假数据；e2e 锚点 `window.__flux_scada_<cid>`（quick-reference.md L1000-1002）。

片段 2（四阶段配色：行级 computed `progressBand` + status/mapping；规则佐证 R2 L48 ui-patterns L96-133）：

```jsonc
{
  "type": "status",
  "value": "${progressBand}",
  "labelMap": { "full": "已完成", "half": "过半", "low": "偏低", "zero": "未开工" },
  "levelMap": { "full": "success", "half": "info", "low": "warning", "zero": "default" },
  // D5 深审勘误：StatusSchema 无 mapping（属性为 labelMap/levelMap/iconMap，content/schemas.ts L314-330，status.tsx 零 mapping 消费）——四阶段配色整块静默失效；
  // 原 entry 形状 {label,className} 亦不符语义：文本拆入 labelMap，className 语义色改走 levelMap（StatusLevel 枚举，非法值 renderer 兜底 'default'）
}
```

### 2.5 M2 mes-work-reporting（P0，直接组合，无缺口——plan 785 直接受益页）

```
page                        # testid: mes-work-reporting-root（D5 深审勘误 MIN-3：补主容器 testid 注）
├─ crud 作业卡列表 #mes-work-reporting-cards
│    columns：工序/卡号/工作中心/计划数/完成数/工时比/状态（status mapping 配色）
│    行操作：报工（openDialog 报工表单）；状态按钮平铺按 status 显隐（片段 2）
└─ dialog 报工表单（form submitAction=POST /r/ReplMes__reportWork——D5 深审勘误：FormSchema 无 api，提交走 submitAction）
   ├─ input-table lines（片段 1：computed 列 + aggregate 合计行 + summaryBinding 守恒回写）
   │    行字段 completedQty/scrappedQty/reworkQty/setupMins/runMins；
   │    computed：totalMins=setup+run、hourRatio=totalMins/stdMins、qualifiedRate
   └─ 校验：行级 completed+scrapped≤planned 前置拦截＝item 区内字段 validate（行字段声明
        validate 规则）+ mock 端点守卫（GUARD_CONSERVATION/GUARD_HOUR_RATIO，§4.4）
        ——D5 深审勘误：原 validateValueAction 非 InputTableSchema 属性（该属性属
        DetailField/VariantField/DetailView），「行级守恒前置拦截」机制不存在，删除该引用
```

片段 1（input-table 报工明细；aggregate/computed 见 `composite-schemas.ts` L110-131，summaryVisible L153、summaryBinding L129-135 单对象——D5 深审勘误：原引 validateValueAction 非 InputTableSchema 属性，删除该引用）：

```jsonc
{
  "type": "input-table",
  "name": "lines",
  "testid": "mes-work-reporting-lines",
  "columns": [
    { "name": "completedQty", "label": "合格数", "aggregate": "sum" },
    { "name": "scrappedQty", "label": "报废数", "aggregate": "sum" },
    { "name": "setupMins", "label": "准备工分" },
    { "name": "runMins", "label": "加工工分" },
    {
      "name": "totalMins",
      "label": "工时",
      "computed": "${setupMins + runMins}",
      "aggregate": "sum",
    },
    {
      "name": "hourRatio",
      "label": "工时比",
      "computed": "${(setupMins + runMins) / stdMins}",
      // D5 复审轮1 R3 勘误：summaryVisible 是表级属性（InputTableSchema），列级被静默丢弃——该列无 aggregate 本就不进合计行，直接删除
    },
  ],
  "summaryBinding": { "field": "totalCompletedQty", "column": "completedQty", "agg": "sum" },
  // D5 深审勘误：InputTableSummaryBinding 为单对象（isValidSummaryBinding 要 object 且 field/column
  // 为 string，数组即守卫失败→静默不回写，input-table-renderer.tsx L227-244）。双字段回写
  // （totalCompletedQty+totalScrappedQty）契约仅支持单绑定——M3 收口时拆两处绑定（如主单
  // totalScrappedQty 由 scope formula 从 lines 派生）或先立约扩展数组语义，定稿前不写数组形状。
  "item": { "type": "form" },
}
```

工时比>1.0 标红：行内单元格条件 className 走 status/mapping + `${hourRatio > 1}`（佐证 R2 L58/ui-patterns L129）。非法状态迁移由 mock `jobCardMutation` 返回 `ILLEGAL_TRANSITION` 拦截（§4.4），onError 链 toast。

片段 2（状态按钮 visible 表达式，R2 L58 ⑤；JobCard 8 态枚举以活仓 state-machine.md L184-205 为准，R2 L56 佐证。D5 深审勘误：原写 button-group `buttons` ——prop 名为 `items` 且 ButtonGroupItemSchema 仅 key/label/variant/action/disabled、item 级无 visible/onClick（layout/schemas.ts L183-213），状态显隐语义无法声明→改为平铺 button ×N（各自 BaseSchema.visible + onClick）置于 hstack（flex row 别名），删除 button-group 承载显隐的语义）：

```jsonc
{
  "type": "flex",
  "direction": "row",
  "className": "hstack",
  "testid": "mes-work-reporting-status-actions",
  "items": [
    {
      "type": "button",
      "label": "开工",
      "testid": "mes-work-reporting-start",
      "visible": "${status === 'RELEASED'}",
      "onClick": {
        "action": "ajax",
        "args": {
          "url": "/r/ReplMes__jobCardMutation",
          "method": "post",
          "data": { "id": "${id}", "mutation": "startJob" },
        },
      },
    },
    {
      "type": "button",
      "label": "暂停",
      "visible": "${status === 'RUNNING'}",
      "onClick": { "…": "holdJob" },
    },
    {
      "type": "button",
      "label": "报工提交",
      "visible": "${status === 'RUNNING'}",
      "onClick": { "…": "submitJob" },
    },
    {
      "type": "button",
      "label": "完成",
      "visible": "${status === 'SUBMITTED'}",
      "onClick": { "…": "completeJob" },
    },
  ],
}
```

### 2.6 M3 mes-andon-material（P1，直接组合，涉 G14；axe 分支 B mobile）

```
page（移动 viewport 375×667）   # testid: mes-andon-material-root（D5 深审勘误 MIN-3：补主容器 testid 注）
├─ notice-bar（未关闭异常/叫料响应播报）
├─ pull-refresh（onRefresh → refreshSource andonSource；schemas.ts L4-32，仅 direction:'down'）
│  └─ infinite-scroll（onLoadMore → andonFindPage 翻页，L33-56）
│     └─ list 行 = swipe-cell（right：催单/关闭，L58-77）→ 任务卡 + countdown 响应计时
│          （targetTime=respondDeadline，onFinish → 超时标红，L79-93）
├─ floating-bubble（onClick → action-sheet 快捷动作，schemas.ts L213-224——D5 深审勘误 MIN-5：原引 L213-231 跨界至 ActionSheetItem）
├─ action-sheet（display:'grid'：发起异常/发起叫料/刷新，L233-250）
└─ floating-panel（anchors [220,480]，L200-211）
   └─ form submitAction=POST andonCreate（D5 深审勘误：form 无 api）：wheel-picker 异常类型；input-text 工位；textarea 描述；
        input-image accept="image/*" multiple uploadAction=uploadAndonPhoto（G14 §6.3）；
        image-viewer（photos，schemas.ts L252-265——D5 深审勘误 MIN-5：原引 L252-267 跨界）；叫料明细 input-table（物料/应领数量/库位，
        数量 tap → number-keyboard 受控 open + onKey/onConfirm 写回，L286-306）
```

片段 1（列表行 swipe-cell + countdown）：

```jsonc
{
  "type": "swipe-cell",
  "testid": "mes-andon-material-cell",
  "right": [
    {
      "type": "button",
      "label": "催单",
      "onClick": {
        "action": "ajax",
        "args": { "url": "/r/ReplMes__andonEscalate", "method": "post", "data": { "id": "${id}" } },
      },
    },
    { "type": "button", "label": "关闭", "onClick": { "…": "op=close" } },
  ],
  "body": {
    "type": "flex",
    "direction": "column",
    "items": [
      { "type": "text", "text": "${typeLabel} · ${station}" },
      {
        "type": "countdown",
        "targetTime": "${respondDeadline}",
        "format": "mm:ss",
        "suffix": " 内响应",
        "onFinish": { "action": "showToast", "args": { "level": "error", "message": "响应超时" } },
      },
    ],
  },
}
```

片段 2（半屏发起表单 + 拍照）：

```jsonc
{
  "type": "floating-panel",
  "anchors": [220, 480],
  "testid": "mes-andon-material-panel",
  "body": {
    "type": "form",
    "submitAction": {
      "action": "ajax",
      "args": { "url": "/r/ReplMes__andonCreate", "method": "post" },
    },
    // D5 深审勘误（同 §2.3）：FormSchema 无 api 字段，提交走 submitAction——原 api 被静默丢弃致 andonCreate 永不发出
    "body": [
      {
        "type": "input-image",
        "name": "photos",
        "label": "现场拍照",
        "accept": "image/*",
        "multiple": true,
        "maxFiles": 4,
        "uploadAction": {
          "action": "ajax",
          "args": { "url": "/r/ReplMes__uploadAndonPhoto", "method": "post" },
        },
      },
      { "type": "image-viewer", "images": "${photos}", "testid": "mes-andon-material-viewer" },
    ],
  },
}
```

input-table 注册于全局 registry（R4 §0 L14）；明细数量键入以 number-keyboard 辅助 input-number。

## 3. R4 对照与双向核对记录

### 3.1 逐页对照（R4 §1 → 本设计组合）

| 页  | R4 §1 结论与依据缺口        | 本设计组合（§2 节）                                                                                                             | 一致性                               |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| K1  | 直接组合；G11（L28）        | ai-chat 整页编排 + conversations/prompts/citations/feedback/token-usage + G11 alert（§2.1）                                     | 一致；G11 按 R4 §2 L58 以 alert 承接 |
| K2  | 能力扩展；G9/G12/G11（L29） | kanban 六态路由 + crud 双视图 + stat-tile + timeline/steps + ai-suggestions（G12 链）+ SLA 静态文本（G9 临时）（§2.2）          | 一致；扩展点仅 G9，口径 §6.1         |
| K3  | 直接组合；G13/G18（L30）    | timeline/steps/user-select+ajax 转办/ai-tool-call HITL（§2.3）                                                                  | 一致；G18 不做 wf 图形（R4 §2 L65）  |
| M1  | 直接组合；G10（L31）        | dashboard/stat-tile/echarts/notice-bar/scada-canvas/data-source interval（§2.4）                                                | 一致；G10 以 stat-tile 近似（§6.2）  |
| M2  | 直接组合；无缺口（L32）     | input-table computed/aggregate/summaryBinding（单对象）+ 状态按钮平铺 visible（§2.5——D5 深审勘误：删 validateValueAction 引用） | 一致                                 |
| M3  | 直接组合；G14（L33）        | mobile 族 10 type 编排（§2.6）                                                                                                  | 一致；G14 口径 §6.3                  |

### 3.2 R4 §2 ↔ §4 双向核对表

本域涉及缺口 7 项，逐条核对「分级 ↔ 登记去向 ↔ 本设计口径」一致（R4 §4 L89 纪律；开放审计 Major-1 防 G9 断链）：

| 缺口                    | R4 §2 分级（行号）       | R4 §4 登记去向                                        | 本设计承接                          | 结果 |
| ----------------------- | ------------------------ | ----------------------------------------------------- | ----------------------------------- | ---- |
| G9 桌面 countdown       | 能力扩展/跨包提升（L56） | missing-components 需求行（SLA demand，Major-1 补入） | K2 静态文本（§2.2/§6.1）            | 一致 |
| G10 翻牌器动效          | 新 type（L57）           | missing-components 需求行（demand-gated）             | M1 stat-tile 近似（§2.4/§6.2）      | 一致 |
| G11 护栏/置信度提示     | 直接组合（L58）          | 无需登记                                              | K1 alert + K2 置信度门（§2.1/§2.2） | 一致 |
| G12 推荐回复写回        | 直接组合（L59）          | 无需登记                                              | K2 onSelect→setValue→toast（§2.2）  | 一致 |
| G13 转办专用动作        | 直接组合（L60）          | 无需登记                                              | K3 user-select+ajax（§2.3/§6.4）    | 一致 |
| G14 input-image capture | 能力扩展（L61）          | improvement-analysis 新增条目（input 族）             | M3 accept 唤起相机（§2.6/§6.3）     | 一致 |
| G18 wf 图形可视化       | 直接组合（L65）          | 无需登记（timeline/steps 覆盖）                       | K3 不做图形（§2.3）                 | 一致 |

散落验证项归集：R4 §4.1-②（L94）指名的 C1 moveStage/footer 统计带/G2 拖拽绑定语义均属 ERP 域（D2），本域无同名必列项；K2 kanban 拖拽→mutation 绑定与 G2 同构，作为本域附加验证项在 §5.2 断言（`__replAiCalls` 计数 + 行迁移），不另立 G 编号。临时形态验收口径逐页标注：K2 G9 / M1 G10 / M3 G14 见 §3.2 承接列 + §6 逐页边界。

## 4. Mock backend 设计

### 4.1 模块与装配

- 新建两模块（D1 §2 L47：一域一模块独占一 fetcher 面）：`mock-backend-repl-ai.ts` → `/r/ReplAi__*`；`mock-backend-repl-mes.ts` → `/r/ReplMes__*`（数据集大拆 `-records.ts`）。
- 装配点：`showcase-env.ts` `createReplicaBranches`（L111-118）增两行分支；工厂闭包持有会话状态（跨页可观察）；复用 `mock-backend-replica-kit.ts`（createReplicaBranches L35 / paginateRows L86 / createEndpointCounter L201 / readOptInHooks L222 / withOptInHooks L227）。
- 信封契约：查询 `{status:0,data:{items,total}}`、mutation `{status:0,data:{…}}`、错误 `{status:1,msg}`（`flux-guide/03-api-config.md` L50；D1 §2 L48）。
- 数据量（D1 §2 L49）：ticket/jobCard/andon ≥25 行（分页 ≥3 页）；trend24h 为 24h×48 确定性生成函数（禁运行时随机漂移）。

### 4.2 AI 域特别节：connector mock 对接

**既有装配（复用，不重建）**：showcase-env 已为 complex-pages 环境接入 AI mock 链路（L29-30 import、L574 `stream: createMockAiStream(15, true)`、L577-583 `createMockAiConnector` + `createAiImportLoader`，暴露 `connectors.mock`/`tools`/`toolExecutor`）。K1/K2/K3 的 ai-\* schema 经 `xui:imports ai://` + `${$ai.connectors.mock}` 取连接器，无需新增宿主装配。

**streaming token 序列 fixture 化**：沿用 `apps/playground/src/ai/mock-ai-env.ts` 先例——`createMockAiStream`（L80-150：OpenAI chunk 形状、`tokenizeMarkdown` 保空白分片、逐 chunk delayMs、尾部 `finish_reason:'stop'`）与 `pickAiWidgetsFixture` 关键字分发。D3 在 `ai/` 侧新增 repl 专用 fixture 表，至少四类预设：

| 预设              | 触发关键字 | chunk 序列                                                                   | 用途                       |
| ----------------- | ---------- | ---------------------------------------------------------------------------- | -------------------------- |
| knowledge-answer  | 「引用」   | 正文含 `[1][2]` 上标 + 尾部 sources 元数据                                   | K1 引用卡断言              |
| refusal-guardrail | 「护栏」   | 拒绝话术 + `finish_reason:'content_filter'`                                  | G11 提示断言（K1/K2）      |
| tool-round-hitl   | 「审批」   | 首轮 `delta.tool_calls` + `finish_reason:'tool_calls'`，宿主决定后 follow-up | K3 HITL 卡 pending→decided |
| slow-stream       | 「长答」   | ≥8 chunk、delayMs 经 `__replAiTestHooks.streamDelayMs` 可调                  | K1 逐帧渲染/停止钮断言     |

- tool-call/HITL 场景 mock：复用 `tool-mock.ts` 的 `mockToolSchemas`/`mockToolExecutor` 两轮范式（round1 tool_calls → executor 罐头结果 → round2 内容）；HITL 叠加 `ai-tool-call` pending 态（`data-requires-approval` presence-only）→ 宿主 onApproval 持久化 → decided 断言。
- finishReason 透出校准点：refusal 预设依赖引擎把 `finish_reason` 映射进响应完成事件 payload；M3 对照 `engine/types.ts` 核实，未透出则退化「内容前缀 + formula 检测」等价口径；断言只看 G11 alert 可见性（§5.1）。
- 流错误分支：`forceStreamError` 使下一轮流 reject，验证 ai-chat `onError` + sender 恢复可输入。

### 4.3 ReplAi 端点清单

| 端点（`/r/` 前缀省略）                                              | 方法·用途（页，R2 行号）                                                     | 返回 / 错误分支                                      |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| `ReplAi__conversationFindPage` / `…messageFindPage?conversationId=` | get·会话列表 / 历史消息（K1）                                                | `{items,total}`，message 内嵌 sources/usage          |
| `ReplAi__conversationSave`/`…Rename`/`…Delete`/`…messageSave`       | post·会话管理与消息落库（K1，L22 ①）                                         | 成功 `{data:{id}}`                                   |
| `ReplAi__feedbackCreate`                                            | post·反馈埋点（K1，L22 ⑤）                                                   | **错误分支**：failNextMutation → `FEEDBACK_REJECTED` |
| `ReplAi__ticketFindPage` / `…ticketActionFind?ticketId=`            | get·工单队列（≥25 行，六态过滤）/ 处理轨迹（K2，L30 ①⑤）                     | `{items,total}` / fromStatus→toStatus 序列           |
| `ReplAi__ticketMutation`                                            | post·assign/start/resolve/close/reopen/escalate（K2 看板路由/升级，L30 ②④⑨） | **错误分支**：非法迁移 → `ILLEGAL_TRANSITION`        |
| `ReplAi__ticketReply` / `…suggestionFind?ticketId=`                 | post·回复提交（G12 写回后）/ get·推荐回复（K2，L30 ⑦）                       | 回写状态 / items 含 confidence                       |
| `ReplAi__approvalTaskFindPage` / `…approvalTrailFind?taskId=`       | get·待办（approveStatus 四值，R2 L36）/ 轨迹（K3，L38 ③⑦）                   | `{items,total}` / 操作人·时间·动作·意见              |
| `ReplAi__approvalAct`                                               | post·approve/reject（K3，L38 ①⑥；reject 意见必填由表单 required 前置）       | **错误分支**：failNextMutation → `APPROVAL_CONFLICT` |
| `ReplAi__approvalTransfer` / `…hitlDecision`                        | post·转办（G13，L38 ④）/ HITL 决定持久化（L38 ⑤）（K3）                      | 回写 trajectory / 经 \_\_replAiCalls 可观测          |

### 4.4 ReplMes 端点清单

| 端点（`/r/` 前缀省略）                               | 方法·用途（页，R2 行号）                                                                           | 返回 / 错误分支                                                                                                                                                            |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ReplMes__dashboardKpi`                              | get·KPI/趋势/异常/停机聚合（M1；getDashboardKpi 范式 L48）                                         | 单对象；**错误分支**：failNextMutation → `KPI_UNAVAILABLE`                                                                                                                 |
| `ReplMes__jobCardFindPage` / `…jobCardMutation`      | get·作业卡列表（≥25 行 8 态）/ post·startJob/holdJob/resumeJob/submitJob/completeJob（M2，L58 ①⑤） | `{items,total}` / **错误分支**：非法迁移 → `ILLEGAL_TRANSITION`                                                                                                            |
| `ReplMes__reportWork`                                | post·报工提交（M2，L58 ②④⑧）                                                                       | **错误分支 1**：completed+scrapped>planned → `GUARD_CONSERVATION`（上游 §8 L118 强制项）；**错误分支 2**：工时比超限 → `GUARD_HOUR_RATIO`；成功回写进度 + TimeLog/timeline |
| `ReplMes__andonFindPage`                             | get·异常/叫料任务（≥25 行，ANDON\|MATERIAL 过滤）（M3，L66 ①⑩）                                    | `{items,total}`                                                                                                                                                            |
| `ReplMes__andonCreate` / `…andonEscalate`            | post·发起异常/叫料（联动生成 MaterialIssue docNo 回显，L66 ②⑤）/ 催单升级（L66 ⑦）（M3）           | `{docNo}` / escalationLevel+1                                                                                                                                              |
| `ReplMes__materialIssueUpdate` / `…uploadAndonPhoto` | post·叫料明细录入/关闭（L66 ⑤）/ 拍照上传（input-image uploadAction，L66 ③）（M3）                 | 行结果 / 返回 URL（e2e 走文件注入）                                                                                                                                        |

### 4.5 数据集形状（关键字段）

- `ReplAiConversation {id,title,updatedAt,messageCount,pinned}`；`ReplAiMessage {id,conversationId,role,content,sources:[{index,title,url,snippet}],usage:{…},refused,createdAt}`
- `ReplAiTicket {id,subject,status(六态),priority,slaPolicyId,deadlineDateTime,confidence,assignee,escalationLevel}`（佐证 R2 L28 ErpCsTicket）；`ReplAiTicketAction {id,ticketId,actionType,fromStatus,toStatus,operator,comment,createdAt}`（L28 ErpCsTicketAction）
- `ReplAiApprovalTask {id,subject,approveStatus(UNSUBMITTED|SUBMITTED|APPROVED|REJECTED),submitter,currentNode,hitlToolCall?}`
- `ReplMesJobCard {id,opNo,cardNo,workCenter,plannedQty,completedQty,scrappedQty,reworkQty,stdMins,setupMins,runMins,status(8 态)}`（佐证 R2 L56 ErpMfgJobCardTimeLog/state-machine）
- `ReplMesDashboardKpi {planned,completed,scrapped,completionRate,plannedDelta,plannedSpark[],trend24h:[{ts,output}],abnormalities:[{id,type,station,level,raisedAt}],downtimes:[…]}`（trend24h 确定性生成，D1 §2 L49）
- `ReplMesAndon {id,type(ANDON|MATERIAL),typeLabel,station,description,photos[],level,raisedAt,respondDeadline,status,escalationLevel,materialIssue:{docNo,lines:[{material,requiredQty,issuedQty,location}]}}`（佐证 R2 L64）

### 4.6 测试钩子（opt-in，D1 §2 L50；生产不设置即 no-op）

- `__replAiCalls` / `__replMesCalls`：createEndpointCounter 端点计数（prefix `ReplAi__`/`ReplMes__`），spec 经 `page.addInitScript` 预置（先例 airtable-replica-interactions.spec.ts L40-53）。
- `__replAiTestHooks`：`{failNextMutation, forceStreamError, forceGuardrail, streamDelayMs}`；`__replMesTestHooks`：`{failNextMutation, forceConservationError, forceIllegalTransition}`（replica-kit L222/L227）。

## 5. 验收断言清单（三支柱，D1 §3 模板）

每页 spec：`tests/e2e/replication-<pageId>.spec.ts` + `openReplicationPage` helper（D1 决策④）；axe 在 a11y-axe-baseline.spec.ts ROUTES + 基线 JSON 扩展；focus 沿用 D1 §3 L69-73 两先例，每页 3 条（通用：首交互元素可达、首个面板焦点入/出；页面特定抽样见各页）；收尾 `assertTrackedPageErrors(page)`；动作断言带 `__repl*Calls` 计数（D1 §3 L63）。

### 5.1 ai-knowledge-chat（axe 分支 A）

- streaming 逐帧：输入「长答」→ 两次 innerText 采样单调增长 → 完成后含 fixture 终句；停止按钮：期间 `[data-slot="ai-sender-cancel"]` 可见 → 点击 → loading 解除、输入框恢复可用。
- 引用/反馈/会话：「引用」提问 → citations 含 2 条来源（mode list），点 like → `feedbackCreate === 1`；新建会话 → `conversationSave ≥1` 且列表行数 +1；G11：forceGuardrail → guardrail alert 可见。
- focus：tab 首站落入 sender 输入框；prompts chip 点击后输入框仍可输入；afterMessages 控件 tab 可达。

### 5.2 ai-ticket-console（axe 分支 A）

- 拖拽路由（G2 同构附加验证项）：卡 OPEN→ASSIGNED 拖拽 → `ticketMutation === 1`（payload mutation=assign）+ 卡片迁移 + columnAggregate 计数更新；详情：timeline items ≥1 含操作人/actionType，steps 当前值 = status 映射。
- G12 采用链路：点推荐回复 → textarea = item.text → 提交 → `ticketReply === 1`；错误分支：forceIllegalTransition → toast 含 ILLEGAL_TRANSITION；G11：confidence<0.6 → confidence-gate alert 可见。
- G9 临时口径：SLA 静态文本与 mock deadline 差值一致（字符串断言，不测实时跳动，§6.1）。
- focus：drawer 焦点入面板（surface + toBeFocused）/Esc 返回触发卡；query-filter 首控件 tab 可达。

### 5.3 ai-approval-trail（axe 分支 A）

- HITL approve：pending 态 `data-requires-approval` 存在 → 点 approve → `hitlDecision === 1` 且 decision=approve → 卡片转 decided；reject 必填：意见空提交被 required 拦截 → 填写后成功 → timeline 新增 reject 节点（level=error 配色断言）。
- 转办 G13：user-select 选人 + 原因 → 提交 → `approvalTransfer === 1` 且 timeline 增「转办」节点；状态轴：approveStatus 四值 fixture 各断言一次 steps 映射（wait/process/finish/error）。
- focus：HITL 卡 pending 焦点圈（ai-tool-call.tsx L73 focus trap）；user-select 面板焦点入/出（关闭返回触发按钮）；drawer 焦点入/出。

### 5.4 mes-shopfloor-board（axe 分支 A）

- 首屏聚合：kpiSource 首次 fetch → `dashboardKpi ≥1`；四个 stat-tile value 与 fixture 一致（formatter 千分位断言）；播报/停机：notice-bar 文本含未关闭异常条数，停机表首行设备/时长断言。
- 趋势下钻：echarts onClick（dispatchEvent）→ 预警明细 dialog 打开且行数匹配该时段异常数；scada：`window.__flux_scada_<cid>` getSymbols() ≥1 组 scada-group，setPointValues 后 getPointValue 生效。
- G10 临时口径：只断言 stat-tile 数值/delta 方向色，无 flip 动效断言（§6.2）。轮询口径：interval=15s，只断言首帧（可选 hooks 推进），不等第二帧（防 flake）。
- focus：tab 首站达第一个 stat-tile；下钻 dialog 焦点入面板/Esc 返回；notice-bar closable 关闭钮可达。

### 5.5 mes-work-reporting（axe 分支 A）

- 报工提交 + 合计断言：dialog 填 2 行 → 合计行三列 DOM 数值 = sum（合格数/报废数/totalMins）→ summaryBinding 回写主单 totalCompletedQty 断言（totalScrappedQty 回写按 §2.5 拆两处/先立约的 M3 收口结论执行，不静默）→ 提交 → `reportWork === 1`。
- 超计划拦截（D5 深审勘误：validateValueAction 非 InputTableSchema 属性，原「双拦截」前半失据——改为端点守卫拦截 + 合计断言）：行 completed+scrapped>planned → `reportWork` 端点守卫 GUARD_CONSERVATION 拦截（错误文案可见 + tfoot 合计/主单 summaryBinding 字段不回写）；工时比超限同走 GUARD_HOUR_RATIO；forceConservationError 复用同端点错误分支断言 toast；前端侧由 item 区内字段 validate 承担行级校验（提交计数 0 语义保留在字段校验路径）。
- 状态按钮显隐：8 态 fixture 抽 3 态（RELEASED 只见开工；RUNNING 见暂停/报工提交；SUBMITTED 只见完成）→ visible 断言；非法迁移拦截：对 CLOSED 行直调 startJob → ILLEGAL_TRANSITION toast + 行状态不变；附加：hourRatio>1 行单元格标红 class 断言（getComputedStyleValue）。
- focus：dialog 内首字段 autofocus；input-table 行内 tab 序连续；提交后焦点落回触发行。

### 5.6 mes-andon-material（axe 分支 B：375×667 describe 块，D1 §4 L87；基线键同 pageId、describe 名标注 mobile）

- 列表/刷新/翻页：首屏任务行 ≥5；pull-refresh onRefresh → `andonFindPage` 计数增量；infinite-scroll onLoadMore 翻页计数。
- 拍照上传：文件注入 → input-image 选 1 张 → uploadAction → `uploadAndonPhoto === 1` → 缩略渲染 + image-viewer 打开定位该图（onChange payload index 断言）。
- action-sheet + 半屏表单：floating-bubble 点击 → action-sheet（display grid）→ 选「发起叫料」→ floating-panel 展开（anchors 两档）→ 提交 → `andonCreate === 1` 且返回 docNo 渲染。
- swipe-cell 催单 → `andonEscalate === 1` 且 escalationLevel+1 回显；countdown 已过 deadline fixture 行 → onFinish → 行标红；number-keyboard：tap → 键盘 open → onConfirm 写回断言。
- G14 临时口径：只断言 accept 注入上传链路，不断言 capture 属性（§6.3）。
- focus（移动抽样 1 条，D1 §3 L72 + 2 条）：action-sheet 展开焦点落入面板首项、关闭后返回 floating-bubble；floating-panel 表单首字段可达；swipe-cell 操作钮 tab 可达。

## 6. 临时形态标注

### 6.1 K2 SLA 静态剩余时长文本（G9，能力扩展未落地前的临时形态）

- 做什么：详情 drawer 与 crud 行以 text tpl/formula 渲染一次性剩余时长字符串（deadlineDateTime - now，渲染时求值），超时行 status/mapping 标红；不做什么：桌面端逐秒倒计时（countdown 仅 mobile 包注册，R2 §0 L13 live 核实）、实时刷新/超时自动升级联动。
- 验收口径：文本与 mock deadline 差值一致（容忍 <60s），断言不依赖实时跳动（§5.2）。裁决引用：R4 §2 G9（L56，登记 missing-components 需求行，跨包提升走新 type 线）；与「button countDown prop 不采纳」的区分见 R4 §3-3（L81）。

### 6.2 M1 stat-tile 近似翻牌器（G10）

- 做什么：四个 KPI 用 stat-tile（value/delta/sparkline/status/formatter），暗色面板以 schema className 声明；不做什么：flip 翻转动效（stat-tile 无动画，R2 L52）、大屏轮播布局。
- 验收口径：仅数值/方向色/迷你趋势断言（§5.4）。裁决引用：R4 §2 G10（L57，missing-components 需求行 demand-gated 候选；flip 由后续 plan 按 Authority 裁决，human gate 在 amis-baseline-matrix）。

### 6.3 M3 拍照以 accept 唤起相机（G14）

- 做什么：input-image `accept="image/*"`（平台对 accept 的行为）+ multiple/maxFiles/uploadAction（`upload-schemas.ts` L75-107），e2e 以文件注入走完整上传链路；不做什么：不使用/不断言 `capture` 属性（input-image 无该 prop，live 核实）、相机取景器 mock，真机相机行为不进 e2e。
- 验收口径：上传端点计数 + 缩略/放大链路断言（§5.6）。裁决引用：R4 §2 G14（L61，improvement-analysis input 族扩展候选）。

### 6.4 K3 转办组合（G13，无专用 renderer）

- 做什么：转办 = openDialog 表单（user-select 选人 + textarea 原因 required）→ ReplAi\_\_approvalTransfer ajax → timeline 回显「转办」节点（user-select 为 form 包 org 组已落地能力，missing-components L90 / plan 505，R4 §2 L60）；不做什么：转办专用动作 type、批量改派语义。
- 验收口径：提交计数 + 轨迹节点断言（§5.3），选人面板焦点抽样。裁决引用：R4 §2 G13（L60「组合可覆盖、无需登记」）；R2 L40 缺口原文。

### 6.5 K3 HITL 卡（非临时形态，边界说明）

ai-tool-call 的 approval 工作流为 AI 包既有能力（P3 HITL A-14，ai-tool-call.tsx L24-27）：卡片只派发 `onApproval('approve'|'reject')`，持久化归宿主（本设计 = ReplAi\_\_hitlDecision）；与 D4 O2 HITL 收件箱的边界是本页仅单卡审批，不做收件箱批量。

## 7. 关键引用与 type 名核对

正文已随文标注 R2/R4/D1 节号与 live 行号；锚点：`packages/flux-renderers-{ai,mobile,data,layout,dashboard,industrial,basic,content,scheduling,form,form-advanced}/src` 各 definitions/schemas、`flux-core/src/types/`、`apps/playground/src/{complex-pages/shared/, ai/}`、`docs/references/quick-reference.md`。

### flux type 名核对表（全部 live 注册）

| type                                                                                                                                                                   | 归属包                                                                                                                                                                                                                                   | 用于        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| ai-chat / ai-conversations / ai-message-list / ai-bubble / ai-sender / ai-citations / ai-feedback / ai-prompts / ai-suggestions / ai-token-usage / ai-tool-call        | flux-renderers-ai（14 type 之 11）                                                                                                                                                                                                       | K1/K2/K3    |
| kanban                                                                                                                                                                 | flux-renderers-scheduling                                                                                                                                                                                                                | K2          |
| crud / table / query-filter / list / stat-tile / sparkline / echarts                                                                                                   | flux-renderers-data 等（registry 全局共享）                                                                                                                                                                                              | K1-M3       |
| steps / timeline / button-group                                                                                                                                        | flux-renderers-layout；flex 注册于 flux-renderers-basic（closure audit 勘误）                                                                                                                                                            | K2/K3/M1    |
| dialog / drawer / button / text                                                                                                                                        | flux-renderers-basic；form / textarea 注册于 flux-renderers-form（closure audit 勘误，registry 共享）                                                                                                                                    | K2/K3/M2/M3 |
| alert / status / mapping / progress / image                                                                                                                            | flux-renderers-content                                                                                                                                                                                                                   | K1/K2/M1/M2 |
| input-table / input-number / user-select / input-image / picker                                                                                                        | input-number/user-select 归 flux-renderers-form；input-table/picker/input-image 归 flux-renderers-form-advanced（D5 深审勘误 MIN-7：input-image 实归 form-advanced——upload-schemas.ts 位于该包，原写"form / form-advanced"双包归属不准） | K3/M2/M3    |
| dashboard                                                                                                                                                              | flux-renderers-dashboard                                                                                                                                                                                                                 | M1          |
| scada-canvas（+ scada-group/scada-rect/scada-text/scada-device-motor/scada-sensor-control-indicator 符号）                                                             | flux-renderers-industrial                                                                                                                                                                                                                | M1          |
| pull-refresh / infinite-scroll / swipe-cell / countdown / notice-bar / floating-bubble / floating-panel / action-sheet / image-viewer / number-keyboard / wheel-picker | flux-renderers-mobile（16 type 之 11；registry 共享故 notice-bar 可桌面用，R4 §0 L14）                                                                                                                                                   | M3/M1       |
| data-source                                                                                                                                                            | flux-core schema（Formula/Action 两变体，取数走 action:'ajax'）                                                                                                                                                                          | K2/M1/M3    |

本表与 R2 §0 L13 归属一致（ai 14 / mobile 16 / countdown 仅 mobile），经各包 definitions 抽查 ≥20 处 live 复核。
