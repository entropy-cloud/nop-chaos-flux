# D2 ERP 线复刻设计（WMS/CRM/ITAM 8 页）

> Created: 2026-10-30
> Source: roadmap §2 M2-D2；plan `docs/plans/793-business-replication-d2-erp-design-plan.md`
> 输入契约: D1（§0/§2/§3/§5 六节模板强制）；R1（引节名+行号，不重抄）；R4（§1/§2/§4.1）
> 落地面: complex-pages surface + pageId 命名（D1-决策①②）；§4/§5 对齐 D1-决策③④⑤⑥
> type 名核对: 附录 A，live 实证
> 容量注（plan 798 Phase 1.5 裁决）：本文件越 50KB 线为复刻系列设计有意保留——拆分将破坏 R/D 系审计节号引用链，引用链完整性优先；F2 复评。

## 1. 页面清单与上游引用

| #   | pageId                      | R4 §1 结论                                                   | 优先级 | 上游引用（R1 节 / 行号）                                                        |
| --- | --------------------------- | ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------- |
| 1   | wms-pda-receiving           | 直接组合（扫码/刷新/滑动/滚轮/数字键盘全齐）                 | P0     | R1 §1「W1 WMS PDA 收货/上架作业页」L17-23（要素 L21/映射 L22/缺口 L23）         |
| 2   | wms-wave-picking            | 直接组合（kanban/gantt/input-table 合计行）                  | P1     | R1 §1「W2 WMS 拣货路径看板与波次管理页」L25-31（要素 L29/映射 L30/缺口 L31）    |
| 3   | wms-stock-ledger            | 直接组合（pivot-table/stat-tile/dialog drill）               | P1     | R1 §1「W3 WMS 库存台账页」L33-39（要素 L37/映射 L38/缺口 L39）                  |
| 4   | crm-opportunity-kanban      | 直接组合（kanban dnd+quick-edit；漏斗图近似）                | P0     | R1 §2「C1 CRM 商机漏斗看板页」L45-51（实页佐证 L47/要素 L49/映射 L50/缺口 L51） |
| 5   | crm-customer-360            | 直接组合（tabs/timeline/detail-view/calendar）               | P1     | R1 §2「C2 CRM 客户 360 详情页」L53-58（佐证 L55/要素 L57/映射 L58）             |
| 6   | crm-sales-dashboard         | 直接组合（dashboard/stat-tile/echarts/filter）               | P1     | R1 §2「C3 CRM 销售驾驶舱页」L60-66（佐证 L62/要素 L64/映射 L65/缺口 L66）       |
| 7   | itam-asset-inventory        | 直接组合（crud/batch-bar/barcode-input batchMode/diff-view） | P1     | R1 §3「I1 ITAM 资产台账与盘点页」L72-78（要素 L76/映射 L77/缺口 L78）           |
| 8   | itam-depreciation-dashboard | 直接组合（stat-tile/chart/pivot-table/crud）                 | P2     | R1 §3「I2 ITAM 折旧仪表盘页」L80-86（要素 L84/映射 L85/缺口 L86）               |

优先级沿用 D1 §1。M3 编码按上表回读 R1 对应节，本文不重抄交互要素。

## 2. Schema 结构设计

### 2.0 styling contract 约定（全 8 页）

- 布局类 renderer（page/container/flex/grid/tabs）只出 marker 类与 `data-slot`，不写视觉类；视觉走 schema `className`（styling-system.md Renderer Styling Contract）。
- 间距一律 `stack-*`/`hstack-*` 别名，使用点显式声明。
- widget 类（table/crud/kanban/gantt/pivot-table/barcode-input/mobile 族）为自样式控件，内部布局不经页面 schema 干预。
- schema `className` 为静态字符串；动态选中态用 `visible: "${expr}"` 双渲染；配色走 CSS 变量；不引 ThemeProvider。
- testid（D1 §3）：主容器 `<pageId>-root`、关键元素 `<pageId>-<element>`（经 `props.meta.testid` 呈现）。
- **统一勘误注（2026-10-30，D5 深审）**：全文 ajax 的 ApiSchema 一律置于 `args`（AjaxActionSchema args: ApiSchema，flux-core types/actions.ts L171-173）；data-source 取数走 `action`+`args`（DataSourceSchema 无 `api`/顶层 `url` 字段，schema.ts L296-327）；form 提交走 `submitAction`（FormSchema 无 `api` 字段）——D5 深审勘误，以下各片段就地标注。

### 2.1 wms-pda-receiving（W1，P0，mobile 族整页）

> 实现形态（D6 开放审计 MAJ-C 裁决，2026-10-30）：**mobile host override 移动画布 375×667**——registry 特例 host 以居中手机框形态承载（桌面壳内固定宽度画布，D1 §0 决策①例外注 + §4 分支 B），非桌面壳全宽铺开。

```
page
└─ flex stack-column          # testid: wms-pda-receiving-root
   ├─ notice-bar              # 离线条〔flux 侧预期〕variant:error + visible:${offlineMode}
   ├─ pull-refresh            # onRefresh → refreshSource(taskRecords)
   │  └─ form                 # 扫码作业面（收货/上架双链路）
   │     ├─ wheel-picker      # 链路选择
   │     ├─ wheel-cascader    # 仓库→库区→库位
   │     ├─ barcode-input ×2  # ASN 码（validate 提交时原子校验）+ SKU 码（onScan 校验回填，G3）
   │     ├─ input-number + number-keyboard  # 数量录入
   │     ├─ button → openDialog 确认 → submitForm → ajax asnReceive（幂等键）
   │     └─ dialog            # 提交确认
   ├─ infinite-scroll         # 作业记录（onLoadMore 翻页）
   │  └─ loop + swipe-cell    # 行级左/右滑快捷操作
   └─ floating-bubble         # 单手流入口〔G4〕onClick → action-sheet
```

片段 1 —— 扫码即校验回填（G3 编排；R1 §1 W1 L23 / R4 §2 G3）：

```yaml
type: barcode-input
testid: wms-pda-receiving-sku-scan
name: skuBarcode
formats: [code_128, qr_code]
continuousScan: true
validate:                        # 提交时原子校验（上游明示形态，兜底）
  action: { action: ajax, args: { url: /r/ReplWms__asnGet?barcode=${skuBarcode} } }   # D5 深审勘误：ajax 的 ApiSchema 置于 args（原误写 api:，dispatch 即报 "ajax requires args payload"）
  message: 条码未在 ASN 明细中登记
onScan:                          # 扫码即远程校验回填（G3：纯编排，非新 type）
  - { action: ajax, args: { url: /r/ReplWms__asnGet, params: { barcode: ${skuBarcode} }, responseAdaptor: "return payload.data" } }   # D5 深审勘误：api:→args:；adaptor:→responseAdaptor（ApiSchema 属性名）
  - { action: setValues, args: { path: ./, values: { skuName: ${skuName}, expectedQty: ${expectedQty} } } }
  - { action: showToast, args: { level: success, message: 校验通过，请录入数量 } }
onScanError:
  - { action: showToast, args: { level: error, message: ${msg} } }
```

片段 2 —— 单手流近似（G4）与离线条：

```yaml
- type: floating-bubble           # 磁吸吸边入口＝单手流近似（G4）
  testid: wms-pda-receiving-quick-entry
  magnetic: true
  onClick:
    - action: openDialog
      args:
        title: 快捷操作
        body:
          - type: action-sheet    # 底部动作面板
            testid: wms-pda-receiving-quick-sheet
            items:
              - { label: 清空续扫, value: clear }
              - { label: 切换链路, value: switch-mode }
              - { label: 模拟离线（e2e）, value: toggle-offline }
            onSelect: [{ action: setValue, args: { path: quickAction, value: ${value} } }]
- type: notice-bar
  testid: wms-pda-receiving-offline-bar
  text: 网络不可用，扫码已进入离线队列，恢复后自动补传
  variant: error
  visible: ${offlineMode}         # 钩子 forceOffline 驱动（§4.4）
```

#### W1 实现勘误（M3 落地实证 2026-10-30，plan 798；以 live 为准）

1. **提交链编排**：openDialog→submitForm→ajax 不可行（submitForm 跨 surface 无 form handle，useSurfaceComponentHandle 零消费方）——live 等价编排 = dialog 内 form `submitScope:'surface'` + submitAction ajax + closeOnSubmit + onSubmitSuccess refreshSource（airtable search-dialog 先例）。
2. **dialog 子 scope 写隔离**（runtime-factory L346）：action-sheet onSelect `setValue` 写不进页作用域——离线演练改页内开关按钮；bubble→dialog 内 sheet 保留（focus 职责），sheet items 降级 toast。
3. **onScanError payload 为 `{error:{message}}`**：`${msg}` 不解析，改 `${error.message}`。
4. **floating-bubble 定位界基于 window.innerWidth**：画布内须显式 `initialX/initialY`，否则溢出画布被裁。
5. **onScan 相机事件 headless 不可达**：G3 编排以"模拟扫码"按钮走同一 ajax→setValues→toast 动作链验收；触摸手势经 CDP Input.dispatchTouchEvent 合成（已封装 replication.ts helper）。
6. **"作业记录行数 +1"在窗口化分页（pageSize 8）下不可观测**：断言口径改首行命中（RECEIVE/PUTAWAY + asnNo）。
7. **focus 口径（D5 复审后第 7 条，plan 798 收口审计）**：focus① "sku-scan 获焦"不成立——barcode-input 组合在画布内不可 Tab 直达，退守"tab 必达画布内容且驻留"；focus③ "action-sheet 焦点入首条目"不成立——首项不自动获焦，退守"焦点落入 sheet panel 内"。两者登记 a11y 后续观察（barcode-input 可达性/sheet 首项 autofocus）。
8. **infinite-scroll onLoadMore（plan 798 收口审计 Minor-1）**：§2.1 树中"onLoadMore 翻页"未实现（schema 仅 hasMore 表达式、无翻页动作路径）——作业记录由 mock 全量返回承载，真分页加载登记后续观察。

### 2.2 wms-wave-picking（W2，P1）

```
page
└─ flex stack-column          # testid: wms-wave-picking-root
   ├─ query-filter            # 分区/状态过滤
   ├─ tabs
   │  ├─ tab 波次分组看板 → kanban   # columnAggregate 金额合计 + columnFooter；onCardMove → waveMove
   │  ├─ tab 拣货路径时间轴 → gantt  # tasks 按 sequence 排序 + zoomLevels
   │  └─ tab 波次明细 → form → input-table  # aggregate 合计行 + summaryBinding
   ├─ hstack 释放操作带：button 波次释放 + condition-builder（释放规则）
   └─ table                   # 只读分组汇总（grouping/expanded-row）
```

片段 —— kanban 波次分组 + input-table 明细合计：

```yaml
type: kanban
testid: wms-wave-picking-board
data: ${waveBoard}               # data-source ReplWms__waveBoard 返回 flat BoardData
columnAggregate: { fn: sum, field: totalQty, label: 件数 }
draggable: true
keyboardReorder: { enabled: true }  # 键盘重排与拖拽解耦（focus 路径）
onCardMove:                       # G2 绑定语义（C1/W2 共用，§3.3）
  - { action: ajax, args: { method: post, url: /r/ReplWms__waveMove,
      data: { waveId: ${card.id}, fromStatus: ${fromColumnId}, toStatus: ${toColumnId} } } }   # D5 深审勘误：api:→args:
  - { action: refreshSource, targetId: waveBoard }  # refreshSource 契约为顶层 targetId（built-in-actions L217-227，args.sourceName 无消费方——二轮复审勘误）
---
type: input-table
testid: wms-wave-picking-lines
name: waveLines
columns:
  - { name: lineNo, label: 行号 }
  - { name: skuName, label: 商品 }
  - { name: locationCode, label: 库位(sequence) }
  - { name: qty, label: 应拣, aggregate: sum }
  - { name: pickedQty, label: 实拣, aggregate: sum }
  - { name: amount, label: 金额, aggregate: sum, computed: ${qty * unitPrice} }
summaryVisible: true              # 强制渲染 tfoot 合计行
summaryBinding: { field: totalAmount, column: amount, agg: sum }
onRowChange: [ { action: component:refresh, componentId: wave-summary-tiles } ]
```

#### W2 实现勘误（M3 落地实证 2026-10-30，plan 799；以 live 为准）

1. **onCardMove 请求体变量**：live 先例（linear-board）为 `${cardId}/${fromColumnId}/${toColumnId}`；`${card.id}` 虽可解析（payload 含 card）但建议统一先例形态。
2. **ajax→refreshSource 顺序**：并列 list 两项不保证顺序，live 以 `then` 链（linear-board 同款）实现。
3. **input-table computed**：live 为裸表达式（`"qty * unitPrice"`，渲染器自行包 `${}`）；`${qty * unitPrice}` 带包裹形态不成立。
4. **onRowChange→component:refresh 落点**：文本节点无 refresh capability handle 不支持；改指向 data-source id（兼作触发证据通道，summaryBinding 本身 reactive 回写）。
5. **query-filter 分区过滤**：query-filter 内嵌表单 scope 不向页面 scope 发布值，dependsOn 联动不可达；live 通道为 form+valuesPath 载体（detail-subtables 先例）。
6. **释放操作带**：condition-builder 是 form 字段需 form 上下文；hstack 形态收进 form（notion-database 先例）。
7. **kanban columnFooter（plan 799 收口审计 Minor-1）**：树注释/§3.1 提及 columnFooter，live schema 未实现该属性（kanban 支持但 W2 用列头 columnAggregate 承载合计）——合计展示落 columnAggregate，无行为缺口。

### 2.3 wms-stock-ledger（W3，P1）

```
page
└─ flex stack-column          # testid: wms-stock-ledger-root
   ├─ hstack：query-filter + button 导出（ajax ledgerReport，G6）
   ├─ hstack：stat-tile ×4    # KPI（getDashboardKpi 范式）
   ├─ status / card           # 对账一致性提示（reconCheck 驱动，G7）
   ├─ pivot-table             # 仓库×库位×物料×批次收发存透视；onCellClick → dialog
   └─ dialog                  # 批次追溯明细（table）
```

片段 —— 透视 + 单元格钻取：

```yaml
type: pivot-table
testid: wms-stock-ledger-pivot
source: ${ledgerRows}            # data-source ReplWms__stockLedgerRows 原始行集
rowDimensions: [warehouse, locationCode, materialName]
columnDimensions: [month]
indicators:
  - { field: qtyIn, title: 收入, aggregationType: SUM }
  - { field: qtyOut, title: 发出, aggregationType: SUM }
  - { field: qtyBalance, title: 结存, aggregationType: SUM }
dataConfig:
  totals:                        # PivotTotalsConfigSchema { row?: PivotTotalsSchema }（pivot/schemas.ts L56-62，showGrandTotals 在 PivotTotalsSchema——closure audit Major-2 勘误：须嵌套）
    row:
      showGrandTotals: true
      subTotalsDimensions: [warehouse]
  filterRules: [{ field: batchNo, operator: LIKE, value: ${batchNo} }]
onCellClick:                     # pivot:cell-click（pivot-events.ts L11）
  - action: openDialog
    args:
      title: 批次追溯 ${dimension.value}
      testid: wms-stock-ledger-trace-dialog
      body:
        - type: table
          testid: wms-stock-ledger-trace-table
          source: ${batchTrace}   # data-source ReplWms__batchTrace?batchNo=
          columns: [ { name: moveNo, label: 移动单号 }, { name: direction, label: 收/发 }, { name: qty, label: 数量 }, { name: occurredAt, label: 时间 } ]
```

#### W3 实现勘误（M3 落地实证 2026-10-30，plan 800；以 live 为准）

1. **rowDimensions 须含 batchNo**：批次须为行维叶子，cell-click 才能从 rowHeaderPaths 取到——原片段漏列。
2. **onCellClick 非 openDialog 单步**：live 需 setValue→refreshSource→openDialog then 链（先写页作用域再开弹窗）。
3. **`${dimension.value}` 不存在**：live payload 为 `cellHeaderPaths.rowHeaderPaths[n].value`，经 setValue 中转页作用域。
4. **pivot 族未入 showcase registry**：complex-pages 渲染路径需 render-host.tsx 补注册 registerPivotRenderers（type 存在属实，渲染通道缺注册——live 缺口已在本计划修复）。
5. **stat-tile formatter**：live 契约 decimals 为 optional（缺省 0，schemas.ts L447/definition L81 无 required——收口审计 Minor-1 勘误：原"必填"陈述不成立）。
6. **过滤载体 form+valuesPath**（W2 勘误⑤⑥ 同因：query-filter scope 不发布值）。
7. **ledgerReport 返回 `{url, filename}`** 而非 `{downloadUrl}`（runtime 读 data.url——built-in-actions download case 实况）。
8. **totals.row 需显式 showSubTotals:true**。
9. **stockKpi 返回 `{kpis:{...}}` 平铺 map**（Kpi[] 数组无表达式消费先例）。
10. **pivot filterRules 上移 data-source params**（plan 800 收口审计 Minor-2——R-3 溯源勘误：原错标 799）：片段 dataConfig.filterRules 形态 live 支持但 W3 实现改由 data-source 参数承载过滤——行为等价由过滤联动断言实证，登记实现偏差。
11. **focus ② Esc 回腿退守**（plan 800 收口审计 Minor-4 同族——R-3 溯源勘误）：canvas 点击的钻取触发非可焦 trigger，Esc 回腿退守"焦点回文档内"——W1 同类退守曾以 §2.1 勘误 7/8 落档，口径对齐。

### 2.4 crm-opportunity-kanban（C1，P0）

```
page
└─ flex stack-column          # testid: crm-opportunity-kanban-root
   ├─ hstack：button 手工刷新（refreshSource 双 source，L49-⑤）+ query-filter（可选薄过滤）
   ├─ kanban                  # 阶段动态列（stageFindPage）+ onCardMove → moveStage
   │  ├─ cardTemplate         # 客户名/金额/概率徽章（status+mapping 三色）
   │  └─ columnAggregate      # 单聚合 sum(expectedRevenue)（KanbanColumnAggregateConfig 单对象，勘误）
   ├─ hstack footer 统计带：stat-tile ×3 ← data-source funnelSummary（D2 验证项落点）
   ├─ table                   # 同数据只读视图：quick-edit 金额 + affixRow 统计带
   └─ chart                   # 漏斗近似：type:'bar' 水平条（G1，§6）
```

片段 1 —— 动态阶段列 + 拖拽 moveStage（G2 主战场）：

```yaml
type: kanban
testid: crm-opportunity-kanban-board
data: ${oppBoard}                # data-source ReplCrm__opportunityBoard（flat BoardData）
columnsConfig: ${stagesData}     # data-source ReplCrm__stageFindPage（orderBy sequence）
columnAggregate: { fn: sum, field: expectedRevenue, label: 金额 }  # KanbanColumnAggregateConfig 单对象（kanban.types.ts L67，运行时直接读 .fn 无数组归一——closure audit Major-2 勘误）；家数展示改列头模板，义务②断言只用金额差值
cardTemplate:
  type: flex stack-column
  body:
    - { type: text, text: ${card.data.customerName} }
    - { type: text, text: ￥${card.data.expectedRevenue} }
    - type: status               # 概率徽章三色（上游实存，L49-⑥）
      value: ${card.data.probability}
      labelMap: { high: 概率高, mid: 概率中等, low: 概率低 }   # StatusSchema 属性为 labelMap/levelMap（closure audit Major-1 勘误：mapping 非其属性）
      levelMap: { high: success, mid: warning, low: neutral }
draggable: true                  # 拖拽为 flux 侧增强复刻；上游 dialog 流转保留为备径
onCardMove:
  - action: ajax
    args:                         # D5 深审勘误：api:→args:（与 §2.4 片段 2 quickSaveAction args 形态对齐）
      method: post
      url: /r/ReplCrm__moveStage
      data: { leadId: ${card.id}, toStageId: ${toColumnId} }
    onError: [ { action: showToast, args: { level: error, message: ${msg} } } ]
  - { action: refreshSource, targetId: oppBoard }
  - { action: refreshSource, targetId: funnelSummary }
```

片段 2 —— quick-edit 金额 + footer 统计带双落位：

```yaml
type: table
testid: crm-opportunity-kanban-list
source: ${oppBoard}
columns:
  - { name: customerName, label: 客户 }
  - { name: stageName, label: 阶段 }
  - name: expectedRevenue
    label: 预期金额（万元）
    quickEdit: true              # table quick-edit（table-quick-edit-cell.tsx）
    quickSaveAction: { action: ajax, args: { method: post, url: /r/ReplCrm__updateRevenue } }
                                 # table 级 quickSaveAction（data/schemas.ts L248；无 quickSaveApi 属性——closure audit Major-1 勘误）
affixRow:                        # TableSummaryRow 统计带（R1 §2 C1 L51 待核项落点）
  cells:                         # TableSummaryCell { column(必填), value }（data/schemas.ts L115-119，无 label——closure audit Major-2 勘误）
    - { column: expectedRevenue, value: ${funnelSummary.totalAmount} }
    - { column: stageName, value: ${funnelSummary.wonAmount} }
---
type: stat-tile                  # 页面级 footer 统计带（与 affixRow 双形态，M3 实测收口，§3.3）
testid: crm-opportunity-kanban-kpi-total
label: 商机总金额
value: ${funnelSummary.totalAmount}
prefix: ￥
formatter: { thousands: true }
```

#### C1 实现勘误（M3 落地实证 2026-10-30，plan 801；以 live 为准）

1. **columnsConfig 不驱动动态列**：live 仅 controlled-collapse 消费——阶段列由 opportunityBoard flat BoardData 承载，stageFindPage 经 board source dependsOn 链承载"阶段先行取数"。
2. **opportunityBoard 返回 `{board, leads}` 双投影**（table 需行数组）。
3. **kanban 列 CSS min-width 280 钳制**：columnWidth<280 不可达。
4. **onCardMove 请求体变量与字段集**：`${cardId}/${fromColumnId}/${toColumnId}` 先例变量；业务字段集 `{leadId, fromStageId, toStageId}`（非片段 `${card.id}`/`toStageId` 单字段——G2 逐字段断言以此为准）。
5. **cardTemplate 绑定为 `${$slot.card.data.*}`**。
6. **table 级 quickSaveAction 使行进 row-draft 模式**（行尾 table-row-save-bar 提交）；row-draft scope 下 then 链 refreshSource 报 `Source not found`——改 `component:refresh`（W2 先例）。
7. **stat-tile formatter.decimals 在渲染器声明契约下必填**（与 W3 勘误⑤ schemas 层 optional 口径并存：schemas 层 optional、渲染器声明链要求显式——两处口径以 live 声明链为准）。
8. **kanban 键盘层 live 缺口**：async 数据看板上 board-effects 键盘层不挂载（空首渲 boardRef=null、effect deps 稳定不重跑；静态 demo 正常，R3.4/5.2-002 同族）——focus③ 键盘可达以 test.fail 棘轮如实登记，修复归 kanban owner 面。
9. **levelMap low→neutral** 映射 Badge secondary。
10. **漏斗 bar X 轴刻度文本为空**（bars 渲染正常，chart owner 观察项）。
11. **focus② "提交后返回"退守**（plan 801 收口审计 Minor-1a）：inline quick-edit live 形态无 dialog 面，退守"焦点回落 body、单元格可再聚焦"。
12. **onCardMove 业务字段集 {leadId, fromStageId, toStageId}**（plan 801 收口审计 Minor-1b，§3.3 ③b 原文 toStageId/toStatus/fromStatus 就地勘误）：live 实况字段集如左，G2 逐字段断言以此为准。

### 2.5 crm-customer-360（C2，P1）

```
page
└─ flex stack-column          # testid: crm-customer-360-root
   ├─ hstack：detail-view（头部基本信息，partnerGet）+ picker（客户搜索，party-search 范式）
   ├─ tabs
   │  ├─ tab 跟进时间线：timeline + button 新增跟进 → drawer(form)
   │  ├─ tab 关联线索/商机：table（行点击 → refreshSource 主从联动）
   │  ├─ tab 联系人/地址：cards
   │  └─ tab 活动日历：calendar（上游降级项回归）
   └─ drawer                   # 新增跟进表单
```

片段 —— 主从联动 + timeline + calendar：

```yaml
type: table
testid: crm-customer-360-lead-table
source: ${leadByPartner}
onRowClick:
  - { action: setValue, args: { path: selectedLeadId, value: ${id} } }
  - { action: refreshSource, targetId: leadDetail }   # 联动编排〔flux 侧预期〕；顶层 targetId 契约（二轮复审勘误）
---
type: timeline                   # layout 包（R1 §0 归属表 L12）
testid: crm-customer-360-timeline
items: ${activityTimeline}
reverse: true                    # activityDate DESC 口径
---
type: calendar
testid: crm-customer-360-calendar
view: month
events: ${activityCalendar}
onEventClick:
  - action: openDialog
    args: { title: ${title}, body: [{ type: detail-view, data: ${event} }] }
```

#### C2 实现勘误（M3 落地实证 2026-10-30，plan 802；以 live 为准——C2 为复刻面首个 detail-view 消费页）

1. **timeline/calendar 形状**：live 消费 TimelineItemSchema `value/time/title/detail/level`（level 驱动着色）与 CalendarEvent `id/title/start/end`；§4.2 裸 Activity/`{id,date,title,type}` 不成立，mock 投影层落地。
2. **主从联动编排**：table 行事件 scope 为 isolate——行内 refreshSource 报 Source not found、setValue 写入行隔离 scope 页面不可见；改 component:refresh componentId + rowSelection + selectionStatePath（W2 勘误 6 同款）。
3. **onEventClick→dialog**：openDialog body 为 schema 保留面，`${event.*}` 在 body 内不解析；改 setValue→openDialog 读 scope（W3 参数链先例）。
4. **args.params/data 禁带字符串 `type` 键**：isSchema 启发式误判为 schema 节点→整对象 literal 保留；wire 参数改名 activityType。
5. **GET params 走 URL query**：fetcher 分支读参走 createUrlParamReader（直读 input.params 恒空）。
6. **refreshSource 对 mountOnEnter 未激活 tab 的 source 报 Source not found**：查询按钮只 refresh 已激活源，未激活源在 tab 激活时带当前过滤参数取数（行为等价）。
7. **tabs 选中态在 aria-selected**；timeline onChange 载荷绑定为 `${value}`；detail-view 头部 inline 可见面是 viewer（display-only 以 disabled:true 收起 trigger）。

### 2.6 crm-sales-dashboard（C3，P1）

```
page
└─ flex stack-column          # testid: crm-sales-dashboard-root
   ├─ query-filter            # periodId/territoryId/teamId；onSubmit 级联（refreshSource 顶层 targetId ×4，勘误后口径）
   └─ dashboard               # cols:12 网格
      ├─ panel stat-tile ×4   # KPI 阵列（漏斗总额/转化率/预测达成/配额完成）——D5 深审勘误：原误写 panel value（type:'value' 全仓未注册，registry.has 不命中被跳过、面板不渲染）
      ├─ panel echarts        # 月度趋势 line + onClick 钻取（G8）
      ├─ panel chart          # 漏斗近似 bar（G1）
      ├─ panel echarts        # 类别分布 pie
      └─ panel table          # 报表区块 + 下载按钮（G6）
```

片段 —— dashboard 网格 + echarts 钻取 + 级联刷新：

```yaml
type: dashboard
testid: crm-sales-dashboard-grid
cols: 12
rowHeight: 48
panels:
  - { id: kpi-total, type: stat-tile, x: 0, y: 0, w: 3, h: 2, title: 漏斗总额,
      props: { value: ${dashboardKpi.funnelAmount}, prefix: ￥ } }   # D5 深审勘误：type:'value'→'stat-tile'（已注册 renderer，props 形状不变；×4 同改）
  - { id: trend, type: echarts, x: 0, y: 2, w: 8, h: 5, title: 月度趋势,
      props:
        option:
          xAxis: { type: category, data: ${dashboardTrend.months} }
          series: [{ type: line, data: ${dashboardTrend.amounts} }]
        events:                    # events 必须置于 props 内（buildDashboardPanelFragment 仅消费 type/props/source，panel 级 events 被静默丢弃——closure audit Major-1 勘误）；echarts 9 类事件之一（G8 指定落点）
          onClick:
          - action: openDialog
            args:
              title: ${name} 明细
              testid: crm-sales-dashboard-drill-dialog
              body: [{ type: table, source: ${drillRows} }]   # 以 ${params.name} 传参
  - { id: funnel-bar, type: chart, x: 8, y: 2, w: 4, h: 5, title: 漏斗分布（bar 近似）,
      props: { chartType: bar, source: ${dashboardTrend.funnelStages} } }  # ChartSchema 属性 chartType/source（chart-schemas.ts L3/L53-75，closure audit Major-2 勘误：props.type 会经 buildDashboardPanelFragment 展开覆写面板 type 致整 panel 被跳过）
---
type: query-filter
testid: crm-sales-dashboard-filter
body:
  - { type: select, name: periodId, source: ${periodOptions} }
  - { type: select, name: territoryId, source: ${territoryOptions} }
  - { type: select, name: teamId, source: ${teamOptions} }
onSubmit: [ { action: refreshSource, targetId: dashboardKpi }, { action: refreshSource, targetId: dashboardTrend } ]  # QueryFilterSchema 无 submitOnChange（勘误）；refreshSource 契约为顶层 targetId（args.sourceName 无消费方——二轮复审勘误）；四个已声明 source 落地时逐一列出，此处示意两条
```

#### C3 实现勘误（M3 落地实证 2026-10-30，plan 803；以 live 为准）

1. **panels 表达式绑定**：内联 panels 片段在 strict 校验下不可达（注册类型面板每块固定产出 conflicting-field-definition warning，编译器 pinned 语义）——panels 落 PAGE_DATA，schema 侧 `'${crmSalesDashboardPanels}'`，语义等价（fragment 渲染期编译）。
2. **echarts 事件桥缺口（live 修复）**：echarts-renderer 派发 `{event, scope}` 无 evaluationBindings，`${event.name}` 全链静默失败（IS-5 同族，map-renderer 同款已修）——已补 `evaluationBindings: {...payload, event}` + 新增 echarts-events-bridge 单测（flux-renderers-data 包内产品修复，随本计划提交）。
3. **6 series line 点击 hit-test 局限**（chart owner 观察项）：polyline 无 per-point ecData（LineView.js L644）→ 像素级真实点击不可达，e2e 以 `chart.trigger('click', 真实 option 参数)` 实例级 seam 驱动同一动作链（W1 勘误 5 先例）；`__flux_echarts_<componentId>` 观察锚点首建。
4. **reportDownload `{downloadUrl}` → live `{url, filename}`**（W3 勘误 7 同款）；**dashboardKpi `{kpis:[…]}` → 平铺 map**（W3 勘误 9 同款）。
5. **类别分布 pie panel 未纳入 plan 803 已批准枚举**（计划起草遗漏，评审未标）——裁决：移出 C3 1.0 范围登记 D5/P1 审计裁决（补实现或从树移除）；C3 e2e 断言清单本不含 pie 断言，验收面不受影响。

### 2.7 itam-asset-inventory（I1，P1）

```
page
└─ flex stack-column          # testid: itam-asset-inventory-root
   ├─ tabs
   │  ├─ tab 资产台账：crud（query-filter 字段面）+ selection + batch-bar〔flux 侧预期〕
   │  └─ tab 盘点作业
   │     ├─ hstack 盘点单头：status 三阶段 + startTake / completeTake（二次确认 dialog）
   │     ├─ barcode-input      # batchMode 连续扫码队列（扫资产标签码）
   │     ├─ table 盘点差异     # differenceQuantity + status/mapping 标色
   │     └─ diff-view          # 账面 vs 实盘 split 对照〔flux 侧预期〕
   └─ drawer                   # 盘点中报修入口（button+form）
```

片段 1 —— batchMode 扫码盘点流：

```yaml
type: barcode-input
testid: itam-asset-inventory-scan
name: assetBarcode
formats: [qr_code, code_128]
batchMode: true                  # 连续扫码进队列、批量提交（R4 §1 I1「直接对口」）
scanButton: true
onScan:
  - { action: ajax, args: { method: post, url: /r/ReplItam__stockTakeScan,
      data: { takeId: ${takeId}, assetBarcode: ${assetBarcode} } } }   # D5 深审勘误：api:→args:
  - { action: setValue, args: { path: scannedCount, value: ${scannedCount} } }
onScanError: [ { action: showToast, args: { level: error, message: ${msg} } } ]  # miss/duplicate
---
type: batch-bar
testid: itam-asset-inventory-batch-bar
selectionPath: $crud.selectedRowKeys   # D5 复审轮1 R2 勘误：crud 绑定为平铺 $crud（crud-renderer.tsx L225，无 id 嵌套机制；全仓 4 先例均平铺）
countTemplate: 已选 ${count} 台设备
clearTarget: asset-crud
actions: [ { type: button, label: 批量打印标签, onClick: { action: showToast, args: { level: info, message: 打印任务已生成 } } } ]
```

片段 2 —— 差异表标色 + diff-view：

```yaml
type: table
testid: itam-asset-inventory-diff-table
source: ${stockTakeDiff}
columns:
  - { name: assetCode, label: 资产编码 }
  - { name: bookQty, label: 账面数 }
  - { name: actualQty, label: 实盘数 }
  - name: differenceQuantity
    label: 差异（+盘盈/-盘亏）
    cell:
      type: status               # status 标色（R1 §3 I1 L77）
      value: ${differenceQuantity > 0 ? 'surplus' : differenceQuantity < 0 ? 'loss' : 'even'}
      labelMap: { surplus: 盘盈, loss: 盘亏, even: 平 }        # StatusSchema.labelMap（closure audit Major-1 勘误）
      levelMap: { surplus: success, loss: error, even: neutral }
---
type: diff-view
testid: itam-asset-inventory-diff-view
viewType: split
oldContent: ${stockTakeDiff.textDiff.oldText}
newContent: ${stockTakeDiff.textDiff.newText}
```

#### I1 实现勘误（M3 落地实证 2026-10-30，plan 804；以 live 为准）

1. **repairCreate 端点缺口补登**（§4.3 原六名外）：D2 §2.7 drawer 仅 button+form 未定义提交端点——已按 drillRows 先例显式裁决补充 repairCreate（D2 §4.3 缺口落地勘误，drillRows/W3 先例同款）。
2. **§5 ②「队列项 status=duplicate」相机面 headless 不可达**：batchMode 队列渲染在相机 scanner-overlay 内（checkCameraAvailability 门控）——按 §2.1 勘误 5（barcode-headless）口径以模拟扫码走同一动作链验收 toast+计数，队列项 face 登记 a11y/e2e 后续观察。
3. **levelMap `even: neutral`**：不在 StatusLevel 联合但 status renderer STATUS_LEVEL_VARIANT 实证映射 secondary——按 live 保留。
4. **未扫行结算为盘亏**为 mock 裁决口径（§4.3 未规定差异生成规则），保证三态差异确定性复现。
5. **stockTakeGet 逐请求克隆**：返回同引用行对象会让 table 行 memo 跳过重渲染——mock 改逐请求克隆（模块注释留证）。
6. **lastRepairBody 钩子增补（plan 804 收口审计 Minor-2）**：§4.4 itam 钩子表补登 lastRepairBody（drawer 报修提交镜像）——W2 lastWaveMoveBody 表内登记先例同款。
7. **stockTakeScan 响应新增 `name` 字段**（plan 804 收口审计 Minor-3a）：§4.3 形状 `{assetCode, scannedCount}` 之外新增 name 供 scanFeedback 模板消费。
8. **onScan 回写通道替换**（plan 804 收口审计 Minor-3b，W1 勘误 2 同因）：片段 onScan setValue path: scannedCount 替换为 setValues scanFeedback + refreshSource stockTakeGet——逐请求克隆（第 5 条）为使能措施。

### 2.8 itam-depreciation-dashboard（I2，P2）

```
page
└─ flex stack-column          # testid: itam-depreciation-dashboard-root
   ├─ hstack：query-filter（期间）+ button 一键刷新（refreshSource ×5）+ button 导出（G6）
   ├─ hstack：stat-tile ×5     # 原值/累计折旧/净值/本期折旧/在建工程
   ├─ hstack：chart pie + chart line   # 类别分布 + 近 12 月趋势
   ├─ pivot-table              # 年度折旧透视〔flux 侧预期〕
   └─ crud                     # 折旧未计提预警（IN_SERVICE 无 EXECUTED）
```

片段 —— 期间过滤刷新链 + 年度透视：

```yaml
type: query-filter
testid: itam-depreciation-dashboard-filter
body: [ { type: select, name: period, options: [{ label: '2026-09', value: '2026-09' }] } ]
onSubmit: [ { action: refreshSource, targetId: depreciationKpi } ]  # 顶层 targetId 契约（二轮复审勘误）；五源逐一列出此处示意一条；如需逐键刷新改 inline form（R1 §3 I2 form submitOnChange 范式）
---
type: data-source                # 五个 data-source 以 sendOn 绑定同过滤变量（示意两条）
name: depreciationKpi
action: ajax
args: { url: /r/ReplItam__depreciationKpi, params: { period: ${period} } }   # D5 深审勘误：data-source 无 api/顶层 url 字段，取数走 action+args（ActionDataSourceSchema，对齐 D3 §2.4 写法）
sendOn: period != null           # raw 布尔表达式，无 ${} 包装（编译器自行再包 ${...}，二次包装即非法表达式）——D5 深审勘误
initFetch: true
---
type: pivot-table
testid: itam-depreciation-dashboard-pivot
source: ${depreciationPivot}
rowDimensions: [category]
columnDimensions: [quarter]
indicators:
  - { field: originalValue, title: 原值, aggregationType: SUM }
  - { field: periodDepreciation, title: 本期折旧, aggregationType: SUM }
  - { field: netBookValue, title: 净值, aggregationType: SUM }
```

## 3. R4 对照与双向核对

### 3.1 R4 §1 结论 ↔ 本设计组合对照

| 页  | R4 §1 结论（依据缺口） | 本设计 renderer 组合                                                                                                                                               | 缺口引用（§6） |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| W1  | 直接组合；G3、G4       | barcode-input×2 + pull-refresh + infinite-scroll + swipe-cell + wheel-picker/wheel-cascader + number-keyboard + dialog + notice-bar + floating-bubble/action-sheet | G3/G4          |
| W2  | 直接组合；G5、G2、G7   | kanban（columnAggregate/columnFooter）+ gantt（zoomLevels/sequence）+ input-table（aggregate/summaryBinding）+ condition-builder + table                           | G5/G2/G7       |
| W3  | 直接组合；G6、G7       | pivot-table + stat-tile + query-filter + dialog/table + status/card + button 导出                                                                                  | G6/G7          |
| C1  | 直接组合；G1、G2       | kanban（columnsConfig/onCardMove/columnAggregate）+ table quick-edit + affixRow + stat-tile + chart bar 近似 + status/mapping                                      | G1/G2          |
| C2  | 直接组合；—            | tabs + detail-view + timeline + table/cards + picker + calendar + drawer                                                                                           | —              |
| C3  | 直接组合；G1、G8       | dashboard（stat-tile/echarts/chart/table panels——D5 深审勘误：panel value→stat-tile，同 §2.6）+ query-filter 级联                                                  | G1/G8          |
| I1  | 直接组合；—            | crud + query-filter + batch-bar + barcode-input batchMode + table（status/mapping）+ diff-view + drawer                                                            | —              |
| I2  | 直接组合；G6           | stat-tile ×5 + chart pie/line + pivot-table + crud + query-filter + button 导出                                                                                    | G6             |

八页组合均落在 R4 §1 授权内；与 D1 §1 临时形态列逐行一致。

### 3.2 R4 §2 ↔ §4 双向核对表（本域 G1-G8）

| 缺口 | R4 §2 分级         | R4 §2 登记去向                                       | R4 §4 归属桶               | 一致 | 本设计落点                                                |
| ---- | ------------------ | ---------------------------------------------------- | -------------------------- | ---- | --------------------------------------------------------- |
| G1   | 能力扩展           | improvement-analysis（chart P3 族）                  | 第一桶（improvement 候选） | 一致 | §2.4/§2.6 bar 近似（§6）                                  |
| G2   | 直接组合（验证项） | 无需登记（D2 设计验证项）                            | 第三桶（不登记）           | 一致 | §3.3 归集表 + §2.2/§2.4 onCardMove 编排                   |
| G3   | 直接组合           | 无需登记                                             | 第三桶                     | 一致 | §2.1 片段 1 编排                                          |
| G4   | 直接组合           | 无需登记                                             | 第三桶                     | 一致 | §2.1 片段 2 近似（§6）                                    |
| G5   | 新 type            | missing-components 需求行（demand-gated watch-only） | 第二桶（missing 候选）     | 一致 | W2 gantt 形态验收；不实现（§6）                           |
| G6   | 登记冲突（不登记） | 不登记（improvement L23/L182 裁定）                  | 第三桶                     | 一致 | W3/I2 服务端报表下载（§6）                                |
| G7   | 直接组合           | 无需登记                                             | 第三桶                     | 一致 | W3 status/card；W2 condition-builder                      |
| G8   | 直接组合           | 无需登记                                             | 第三桶                     | 一致 | §2.6 echarts onClick 钻取（9 类事件，含 R4 就地勘误口径） |

结论：分级列与登记去向列与 R4 §2 一致（G2/G3/G4/G6/G7/G8 六行逐字命中；G1「chart P3 族」为「chart P3 增强族」的收缩转写、G5 合并转写 demand-gated+watch-only——语义忠实）、与 §4 归属桶一致，无登记断链（开放审计 Major-1 纪律）；本设计不新增/合并 G 编号。

### 3.3 散落验证项归集表（R4 §4.1 三项义务落位）

**① C1 kanban moveStage 绑定验证**（R4 §1 C1 行；R1 §2 C1 L50）——落位 §2.4 片段 1。
验证：M3 e2e 以 replication.ts dnd helper（封装真实指针拖拽先例：kanban-demo.spec.ts L101-111 page.mouse steps 12 / linear-replica-interactions.spec.ts L449 locator.dragTo，继承 L452 双挂载滞后等待注）拖卡片至目标列——**D6 开放审计勘误（MIN-4，2026-10-30）**：原写「dnd helper `dispatchEvent`」手段引用偏航，synthetic dispatchEvent 对 pointer 驱动的 dnd 管线未必生效。
断言点：a) `__replCrmCalls.moveStage` 计数 +1；b) 目标列 children 含该 card id；c) 非法回退走 mock 守卫 `status:1` → 卡片不迁移 + 错误 toast 可见。

**② C1 footer 统计带绑定验证**（R1 §2 C1 L51「待核（有 table-summary-row）」，R4 未单列 G 编号）——落位 §2.4 片段 2 双落位。
验证：kanban `columnAggregate`（列头带）+ footer `stat-tile`×3 ← data-source funnelSummary + table `affixRow`（TableSummaryRow cells）三处各断言；moveStage 成功后 refreshSource 级联。
断言点：a) 初始数值＝mock funnelSummary 返回值（locator 文本）；b) 移动卡片后差值更新（差＝该卡 expectedRevenue）；c) affixRow 求值无 console error（assertTrackedPageErrors 兜底）。若某形态绑定失败，M3 以实测可用形态收口并回写本表，不留静默降级。

**③ G2 拖拽绑定语义**（R4 §2 G2；涉及 C1/W2）——落位 §2.2/§2.4 onCardMove 编排。
验证（双层）：契约层——M3 补单测固化 onCardMove payload 形状（card + from/to 列 id）；编排层——e2e 经 `lastMoveStageBody` 钩子断言请求体逐字段。
断言点：a) payload 契约测试通过；b) mock 收到 `toStageId/toStatus`＝目标列 id、`fromStatus`＝源列 id；c) C1/W2 共用同一语义模板，两页各跑 b)。

> 2026-10-30 就地勘误（plan 801 收口审计 Minor-1b）：C1 侧 live 字段集为 `{leadId, fromStageId, toStageId}`（§2.4 勘误 12）——b) 的 toStatus/fromStatus 字段名为 W2 侧实况，两页字段集以各自实现实况为准。

三项义务全部落位。

## 4. Mock backend 设计

三模块按 D1 §2 落位 `apps/playground/src/complex-pages/shared/`（mock-backend-repl-{wms,crm,itam}.ts），各独占 `/r/Repl<Wms|Crm|Itam>__*` fetcher 面，经 showcase-env.ts `createReplicaBranches([...])` 装配（先例 L110-118）。信封：查询 `{ status:0, data:{ items, total } }`、mutation `{ status:0, data:{...} }`、错误 `{ status:1, msg }`（flux-guide/03-api-config.md L50）；会话状态由工厂闭包持有；列表实体 ≥25 行。

### 4.1 wms 模块（W1/W2/W3）

| 方法 | URL                           | 返回形状（data）                                  | 错误分支                                       | 页  |
| ---- | ----------------------------- | ------------------------------------------------- | ---------------------------------------------- | --- |
| get  | /r/ReplWms\_\_asnFindPage     | {items:Asn[], total}                              | keyword=`REPL-E-ASN` → status:1                | W1  |
| get  | /r/ReplWms\_\_asnGet          | {asnNo, supplierName, expectedQty, lines[]}       | barcode 未登记 → status:1 `barcode not in asn` | W1  |
| post | /r/ReplWms\_\_asnReceive      | {receiptId, receivedQty}（幂等键）                | 重复幂等键 → `duplicate idempotency key`       | W1  |
| post | /r/ReplWms\_\_putawaySubmit   | {taskId, putawayQty}                              | 库位不在建议集 → `invalid location`            | W1  |
| get  | /r/ReplWms\_\_taskRecords     | {items:WmsTaskRecord[], total, hasMore}           | —                                              | W1  |
| get  | /r/ReplWms\_\_waveFindPage    | {items:Wave[], total}（zone 过滤）                | —                                              | W2  |
| get  | /r/ReplWms\_\_waveBoard       | flat BoardData map（root/column-_/wave-_）        | 未知列拖放 → `unknown column`                  | W2  |
| post | /r/ReplWms\_\_waveMove        | {waveId, status}                                  | 目标列 DONE → `terminal status`                | W2  |
| post | /r/ReplWms\_\_waveRelease     | {releasedCount}                                   | 非 PLANNED → `wave not in PLANNED`             | W2  |
| get  | /r/ReplWms\_\_waveLines       | {lines:WaveLine[], summary{totalQty,totalAmount}} | waveId miss → 空集+face                        | W2  |
| get  | /r/ReplWms\_\_pickingTasks    | {tasks:GanttTask[], links[], zones[]}             | —                                              | W2  |
| get  | /r/ReplWms\_\_stockLedgerRows | {items:StockLedgerRow[], total}                   | —                                              | W3  |
| get  | /r/ReplWms\_\_stockKpi        | {kpis:Kpi[]}（getDashboardKpi 范式）              | —                                              | W3  |
| get  | /r/ReplWms\_\_batchTrace      | {items:MoveRecord[], total}                       | batchNo miss → 空集                            | W3  |
| get  | /r/ReplWms\_\_ledgerReport    | {downloadUrl}（format=xlsx/pdf）                  | format 非法 → `unsupported format`（G6）       | W3  |
| get  | /r/ReplWms\_\_reconCheck      | {consistent, driftCount, message}                 | 钩子 forceReconDrift 驱动不一致态              | W3  |

实体字段：`Asn{asnNo, supplierName, expectedQty, receivedQty, status, lines:[{skuBarcode, skuName, expectedQty, suggestedLocation}]}`；`WmsTaskRecord{id, time, type, asnNo, skuName, qty, locationCode, result}`；`Wave{id:wave-*, code, status:PLANNED|RELEASED|PICKING|DONE, orderCount, totalQty, zone, priority}`；`WaveLine{lineNo, skuBarcode, skuName, locationCode, qty, pickedQty, unitPrice, amount}`；`GanttTask{id, text, start, end, zone, progress}`（text 必填、无 name 字段；gantt 无 sequence 字段，排序由 mock 侧按 sequence 预排后返回有序数组——D5 深审勘误；zone 为 mock 侧附加过滤字段）；`StockLedgerRow{warehouse, locationCode, materialCode, materialName, batchNo, month, qtyIn, qtyOut, qtyBalance}`；`MoveRecord{moveNo, direction, qty, occurredAt}`。

### 4.2 crm 模块（C1/C2/C3）

| 方法 | URL                            | 返回形状（data）                                                                                                 | 错误分支                                                         | 页    |
| ---- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----- |
| get  | /r/ReplCrm\_\_stageFindPage    | {items:Stage[], total}（orderBy sequence）                                                                       | —                                                                | C1    |
| get  | /r/ReplCrm\_\_opportunityBoard | flat BoardData（列=stage，卡=lead）                                                                              | —                                                                | C1    |
| post | /r/ReplCrm\_\_moveStage        | {leadId, stageId}（单向递增守卫）                                                                                | 回退 → `stage rollback rejected`；赢单列 → `won stage read-only` | C1    |
| post | /r/ReplCrm\_\_updateRevenue    | {leadId, expectedRevenue}                                                                                        | 金额<0 → `invalid amount`                                        | C1    |
| get  | /r/ReplCrm\_\_funnelSummary    | {totalLeads, totalAmount, wonAmount, stages:[{stageId,label,leadCount,amount,conversion}]}                       | forceKpiError 钩子 → status:1                                    | C1/C3 |
| get  | /r/ReplCrm\_\_partnerFindPage  | {items:Partner[], total}                                                                                         | —                                                                | C2    |
| get  | /r/ReplCrm\_\_partnerGet       | {partner, addresses[], contacts[]}                                                                               | id miss → `partner not found`                                    | C2    |
| get  | /r/ReplCrm\_\_activityTimeline | {items:Activity[]}（DESC+着色）                                                                                  | —                                                                | C2    |
| get  | /r/ReplCrm\_\_leadByPartner    | {items:Lead[], total}（外键过滤）                                                                                | —                                                                | C2    |
| get  | /r/ReplCrm\_\_activityCalendar | {events:[{id,date,title,type}]}                                                                                  | —                                                                | C2    |
| post | /r/ReplCrm\_\_activityCreate   | {id, activityDate}                                                                                               | content 缺失 → `content required`                                | C2    |
| get  | /r/ReplCrm\_\_dashboardKpi     | {kpis:[funnelAmount/conversion/forecastRate/quotaRate]}                                                          | periodId 非法 → `invalid period`                                 | C3    |
| get  | /r/ReplCrm\_\_dashboardTrend   | {months[], amounts[], funnelStages:[{name,value}]}                                                               | —                                                                | C3    |
| get  | /r/ReplCrm\_\_drillRows        | {items, total}（echarts onClick 钻取，按 ${params.name} 过滤——D5 深审勘误：补登记，原漏登致 §5 断言②无端点落点） | name miss → 空集（batchTrace 同款）                              | C3    |
| get  | /r/ReplCrm\_\_forecastAccuracy | {forecast, actual, accuracy}                                                                                     | —                                                                | C3    |
| get  | /r/ReplCrm\_\_reportDownload   | {downloadUrl}（report/format）                                                                                   | 未知 report → `unknown report`（G6）                             | C3    |

实体字段：`Stage{id:stage-*, name, sequence, probabilityBand}`；`Lead 卡 data{id:lead-*, customerName, expectedRevenue, probability:high|mid|low, stageId, ownerName}`；`Partner{id, code, name, level, ownerName, industry, address}`；`Activity{id, partnerId, activityDate, type:VISIT|CALL|NOTE|DEMO, title, content}`；`关联 Lead{leadId, name, stageName, amount, closeDate}`。

### 4.3 itam 模块（I1/I2）

| 方法 | URL                                 | 返回形状（data）                                                                          | 错误分支                                                     | 页                           |
| ---- | ----------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------- | -------------------------------- | --- |
| get  | /r/ReplItam\_\_assetFindPage        | {items:Asset[], total}                                                                    | —                                                            | I1                           |
| get  | /r/ReplItam\_\_stockTakeGet         | {id, status:DRAFT                                                                         | CONFIRMED                                                    | DONE, lines[], scannedCount} | id miss → `stock take not found` | I1  |
| post | /r/ReplItam\_\_stockTakeStart       | {status:'CONFIRMED'}                                                                      | 非 DRAFT → `invalid state transition`                        | I1                           |
| post | /r/ReplItam\_\_stockTakeScan        | {assetCode, scannedCount}                                                                 | 码 miss → `asset barcode not found`；重复 → `duplicate scan` | I1                           |
| post | /r/ReplItam\_\_stockTakeComplete    | {status:'DONE', diffMoveOrderId, differences[]}                                           | CONFIRMED 未二次确认 → `secondary confirmation required`     | I1                           |
| get  | /r/ReplItam\_\_stockTakeDiff        | {rows:DiffRow[], textDiff{oldText,newText}}                                               | —                                                            | I1                           |
| get  | /r/ReplItam\_\_depreciationKpi      | {kpis:[originalValue/accumulatedDepreciation/netBookValue/periodDepreciation/cipBalance]} | period 非法 → `invalid period`                               | I2                           |
| get  | /r/ReplItam\_\_categoryDistribution | {items:[{category, value}]}                                                               | —                                                            | I2                           |
| get  | /r/ReplItam\_\_depreciationTrend    | {months[], periodDepreciation[], accumulated[]}                                           | —                                                            | I2                           |
| get  | /r/ReplItam\_\_depreciationPivot    | {records:PivotRecord[]}                                                                   | year 非法 → `invalid year`                                   | I2                           |
| get  | /r/ReplItam\_\_depreciationAlerts   | {items:AlertRow[], total}                                                                 | —                                                            | I2                           |
| get  | /r/ReplItam\_\_depreciationReport   | {downloadUrl}                                                                             | format 非法 → `unsupported format`（G6）                     | I2                           |

实体字段：`Asset{assetCode, name, model, serialNo, ownerName, location, leaseEndDate, status, category}`（字段面＝R1 §3 I1 L74 引 I2.1）；`StockTakeLine{assetCode, bookQty, actualQty, scannedAt}`；`DiffRow{assetCode, name, bookQty, actualQty, differenceQuantity, direction:surplus|loss|even}`；`PivotRecord{year, quarter, category, originalValue, accumulatedDepreciation, netBookValue, periodDepreciation}`；`AlertRow{assetCode, name, status:IN_SERVICE, lastDepreciationPeriod}`。

### 4.4 测试钩子（D1 §2 opt-in 模式）

| 钩子（window，addInitScript 预置）        | 用途                                                                                                                                                                                                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `__replWmsCalls` / `__replWmsTestHooks`   | 端点计数（prefix `ReplWms__`）；hooks：asnMiss、duplicateIdempotencyKey、forceReconDrift、forceOffline（W1 离线条）、forcePutawayInvalid、lastAsnReceiveBody/lastPutawayBody（W1 落地增补，plan 798）、lastWaveMoveBody/lastWaveReleaseBody（plan 799 W2 增补登记——G2 义务②请求体逐字段断言载体） |
| `__replCrmCalls` / `__replCrmTestHooks`   | 计数（prefix `ReplCrm__`）；hooks：moveStageReject('rollback'/'won')、forceKpiError、lastMoveStageBody（G2 断言）                                                                                                                                                                                 |
| `__replItamCalls` / `__replItamTestHooks` | 计数（prefix `ReplItam__`）；hooks：scanMiss、duplicateScan、forceCompleteGuard、lastScanBody                                                                                                                                                                                                     |

生产不设置即 no-op（先例 `__airtableEndpointCalls`，mock-backend-airtable.ts L25-27）；计数器复用 replica-kit `createEndpointCounter`。静态下拉走 `PAGE_DATA['<pageId>']`（D1 §2），业务数据一律走端点。

## 5. 验收断言清单（三支柱）

公共骨架按 D1 §3：`openReplicationPage`（goto → title 断言 → 主 testid 可见）+ 收尾 `assertTrackedPageErrors`；axe 全走 a11y-axe-baseline.spec.ts；focus 用 `toBeFocused()`（component-handles.spec.ts L34-42）或 activeElement 比对（form-sync-validation-focus.spec.ts L30-41）。**axe 总口径**：8 页全入分支 A（ROUTES + JSON 从 0 起棘轮）；W1 另入分支 B（375×667 mobile describe）。

**wms-pda-receiving** —— 交互：① 手输 ASN → asnGet 校验 → 信息区字段值 + `asnGet` 计数；② number-keyboard 录数量 → 确认 dialog → `asnReceive` 计数 +1 → 作业记录行数 +1 且首行命中；③ swipe-cell 左滑 → onAction toast；④ pull-refresh → `taskRecords` 计数 +1；⑤ forceOffline 后 offline-bar 可见且 variant=error（getComputedStyleValue）。axe：A+B。focus：① sku-scan 获焦；② 提交 dialog 焦点入 dialog-surface、Esc 返回；③ action-sheet 焦点入首条目（移动页抽样）。

**wms-wave-picking** —— 交互：① 拖波次卡至 RELEASED → `waveMove` 计数 +1 + 列迁移（G2 之一）；② 波次释放 → `waveRelease` 计数 +1 + toast；③ input-table 改 pickedQty → tfoot 合计按差值更新；④ gantt 缩放 → onZoomChange 触发；⑤ zone 过滤 → kanban 卡片计数变化。axe：A。focus：① kanban 板 tab 首站；② input-table 编辑焦点入控件、Esc 返回；③ 释放 dialog 焦点入 + Esc 返回。

**wms-stock-ledger** —— 交互：① 批次过滤 → pivot 首行值变化 + `stockLedgerRows` 计数 +1；② pivot:cell-click → 追溯 dialog 可见 + `batchTrace` 计数 +1 + 行数 ≥1；③ 导出 → `ledgerReport` 计数 +1 + downloadUrl 形状（G6）；④ KPI 四 tile 文本＝stockKpi 值。axe：A。focus：① filter 首控件；② 追溯 dialog 焦点入 + Esc 返回；③ 导出按钮 Enter 触发。

**crm-opportunity-kanban** —— 交互：① 拖卡至高 sequence 列 → `moveStage` 计数 +1 + 列迁移 + 统计带差值更新（义务①②）；② 回退拖拽（moveStageReject）→ toast 拒绝文案 + 不迁移；③ quick-edit 金额 → `updateRevenue` 计数 +1 + 单元格新值；④ 概率徽章三色 getComputedStyleValue；⑤ columnAggregate 列头值＝金额和（单聚合配置，勘误口径）。axe：A。focus：① 首卡片可达；② quick-edit 焦点入输入框、提交后返回；③ 拖拽把手 focus 后 keyboardReorder Space+Arrow 移动成功。

**crm-customer-360** —— 交互：① partner 行点击 → `leadByPartner` 计数 +1 + 关联列表行数/首行值变化；② 切日历 tab → calendar 渲染（回归：console/pageerror 零命中 + 网格 DOM）+ `activityCalendar` 计数 +1；③ 新增跟进 drawer 提交 → `activityCreate` 计数 +1 → timeline 行数 +1 且置顶；④ timeline seek → 高亮切换。axe：A。focus：① 首 tab 可达且选中态正确；② drawer 焦点入首控件、Esc 返回；③ seek 后 activeElement 保持文档内。

**crm-sales-dashboard** —— 交互：① 切 periodId → 四 data-source 计数各 +1 + KPI 文本更新；② echarts 点击序列点 → 钻取 dialog 可见 + `drillRows` 参数命中（G8）；定位用「实例求命中点再真实点击」：`echarts.getInstanceByDom(el).convertToPixel` → mouse.click（模式先例为 map 域 getFeaturesAtPixel 命中循环，data-viz-interaction-state.spec.ts L30-49；echarts API 级无既有 e2e 先例，M3 首建）；③ 漏斗 bar panel 渲染断言；④ 下载 → `reportDownload` 计数 +1。axe：A。focus：① filter 首控件；② KPI tab 抽 1 可达；③ 钻取 dialog 焦点入 + Esc 返回。

**itam-asset-inventory** —— 交互：① 手输资产码 → `stockTakeScan` 计数 +1 + scannedCount 更新；② duplicateScan 钩子 → toast + 队列项 status=duplicate；③ startTake → 状态徽章 DRAFT→CONFIRMED；completeTake 经二次确认 dialog → `stockTakeComplete` 计数 +1 + 差异行数＝differences.length；④ 差异列三态标色 getComputedStyleValue；⑤ batch-bar 选 2 行 → countTemplate 文本 + 清空生效。axe：A。focus：① barcode-input 首站；② batch-bar 首按钮可达；③ 二次确认 dialog 焦点入 + Esc 返回。

**itam-depreciation-dashboard** —— 交互：① 期间变更 → 5 端点计数各 +1 + KPI 文本更新；② 透视首单元格＝mock 聚合值；③ 预警 crud 行数 ≥1 + 首行 status=`IN_SERVICE`；④ 导出 → `depreciationReport` 计数 +1。axe：A。focus：① 期间 select 可达；② 刷新后 activeElement 不逃逸；③ 预警行操作 + dialog 焦点入 + Esc 返回。

## 6. 临时形态标注

本域 8 页 R4 §1 分级全为直接组合，**无新 type 页**（「新 type」缺口仅 G5，watch-only 不实现）：

| 项                | 页    | 做 / 不做                                                                                                                                                                   | 裁决引用                                                                         |
| ----------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| G5 库位 2D 平面图 | W2    | 做：gantt 时间轴形态验收（sequence + zone 列 + zoomLevels + onZoomChange）；不做 2D 平面/动线绘制                                                                           | R4 §1 W2 行；R4 §2 G5 watch-only 需求行，不实现不登记                            |
| G6 导出内建       | W3/I2 | 做：button → ajax → {downloadUrl} 服务端报表下载 + §4 端点；不做内建 export 字段                                                                                            | R4 §3-1（improvement L23/L182）；L3.3 declarative download（proposed）落地后替换 |
| G1 funnel/gauge   | C1/C3 | 做：漏斗以 chart `'bar'` 水平条近似（阶段降序+conversion 标签）；gauge 指标以 stat-tile 承载（D5 复审轮1 R4 勘误：value panel 为 MAJ-3 旧措辞残留）；不做 funnel/gauge 图型 | R4 §2 G1 → improvement chart P3 族；echarts 透传不受 L183 约束                   |
| G4 单手操作流     | W1    | 做：floating-bubble + action-sheet 近似；不做专用单手布局/手势族                                                                                                            | R4 §1 W1 / §2 G4                                                                 |
| G3 扫码即校验回填 | W1    | 做：onScan → ajax → setValues 编排 + validate.action 兜底；不做专用 type                                                                                                    | R4 §2 G3；R1 §1 W1 L23                                                           |
| W1 离线条         | W1    | 做：notice-bar 横幅〔flux 侧预期〕+ barcode-input 自带队列提示；不做真离线引擎（钩子仅切 UI 态）                                                                            | R1 §1 W1 L21-⑩（上游仅明示 L89 调研项）                                          |
| C1 拖拽增强       | C1    | 做：kanban 拖拽 moveStage 为增强验收路径；上游 dialog 流转+赢单列只读保留为备径                                                                                             | R1 §2 C1 L47/L49-③；R4 §2 G2                                                     |
| I1 diff-view      | I1    | 做：差异表（status/mapping）为主验收面；diff-view split 为 flux 侧预期增强，二者并存                                                                                        | R1 §3 I1 L76-⑥/L78；D1 §1 临时形态列                                             |
| C2 calendar 回归  | C2    | 做：月/周渲染与 onEventClick 回归验证；拖拽建活动不作断言门槛                                                                                                               | R4 §1 C2 行；R1 §2 C2 L55/L57-⑦                                                  |

## 附录 A. flux type 名核对清单（live，2026-10-30）

basic：page/container/flex/text/button/badge/icon/dialog/drawer/tabs；form：form/input-text/input-number/textarea/select/switch/radio-group/checkbox-group/input-date/fieldset（+checkbox 等）；form-advanced：input-table/detail-view/condition-builder/picker/combo；data：table/crud/list/chart（bar|line|pie|scatter|area|heatmap）/echarts/stat-tile/query-filter/data-source/batch-bar/pagination/statistics/tree；pivot：pivot-table；dashboard：dashboard（panel `stat-tile`——D5 深审勘误：原 `value` 全仓未注册）；scheduling：kanban/gantt/calendar/barcode-input；mobile：pull-refresh/infinite-scroll/swipe-cell/notice-bar/wheel-picker/wheel-cascader/number-keyboard/action-sheet/floating-bubble/floating-panel/countdown（+picker-view）；layout：timeline/grid/steps/responsive（+collapse/button-group/dropdown-button/wizard/resizable 可用未引用）；content：alert/status/mapping/card/cards/html/link/diff-view/qrcode/image；action：ajax/submitForm/openDialog/openDrawer/closeSurface/refreshTable/refreshSource/setValue/setValues/showToast/navigate/component:method/ns:method。属性契约出处：kanban.types.ts L50-102、gantt.types.ts L166-223、barcode-input.types.ts L8-55、pivot-events.ts L11-15、echarts-renderer-definition.ts L23-69、form-advanced/src/composite-field/composite-schemas.ts L116-158、diff-view-definition.ts L15-50、mobile/schemas.ts、layout/schemas.ts L341-361。

引用自查：R1/R4/D1 节号按 2026-10-30 版本引用；§2 片段端点（args.url / source 表达式对应 data-source）与 §4 端点逐条一致（wms 16 / crm 16 / itam 12——D5 深审勘误：crm 补登 drillRows 后 15→16）。
