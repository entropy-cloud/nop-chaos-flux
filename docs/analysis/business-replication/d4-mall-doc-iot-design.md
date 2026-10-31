# D4 商城 / 智能单据 / IoT 三域 7 页复刻设计（business-page-replication M2-D4）

> Created: 2026-10-30
> Source: roadmap §2 M2-D4；执行 plan `docs/plans/795-business-replication-d4-mall-doc-iot-design-plan.md`
> 输入: D1（§0 决策/§2 mock/§3 验收/§4 axe/§5 模板）；R2 §3 商城；R3 §1 智能单据+§2 IoT；R4 §1/§2/§4.1
> 用途: M3 域级前置契约。schema 片段为 type/属性级指导，不产出完整可运行 JSON。type 名全部 live 核对（附录 A）。
> 容量注（plan 798 Phase 1.5 裁决）：本文件越 50KB 线为复刻系列设计有意保留——拆分将破坏 R/D 系审计节号引用链，引用链完整性优先；F2 复评。

## 1. 页面清单与上游引用

| pageId                 | 页面（R4 §1）           | R4 §1 结论       | 优先级 | 上游引用（不重抄）                                                                                     |
| ---------------------- | ----------------------- | ---------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| mall-sku-picker        | S1 商品 SKU 选择 #15    | 能力扩展         | P1     | R2 §3 S1 L76-80（出处/形态/交互①-⑫/映射/缺口）；R4 §1 L34、§2 L62-63                                   |
| mall-distribution      | S2 分销后台 #16         | 直接组合         | P2     | R2 §3 S2 L84-88（佐证/形态/交互①-⑩/映射/缺口）；R4 §1 L35、§2 L53/L64                                  |
| doc-ocr-workbench      | O1 OCR 校正工作台 #17   | 新 type 临时形态 | P0     | R3 §1 O1 L19-23（出处/形态/交互①-⑩/映射/缺口）；R4 §1 L36、§2 L66-67                                   |
| doc-hitl-inbox         | O2 HITL 审批收件箱 #18  | 能力扩展         | P1     | R3 §1 O2 L27-31（出处含 maker-checker 04 契约/形态/交互①-⑫/映射/缺口）；R4 §1 L37、§2 L68-69、§4.1 L95 |
| iot-telemetry-device   | V1 遥测详情 #19         | 直接组合         | P1     | R3 §2 V1 L39-43（佐证/形态/交互①-⑥/映射/缺口）；R4 §1 L38、§2 L70                                      |
| iot-ota-rollout        | V2 OTA 灰度管理 #20     | 直接组合         | P2     | R3 §2 V2 L47-51（出处/形态/交互①-⑦/映射/缺口）；R4 §1 L39                                              |
| iot-geofence-videowall | V3 围栏地图与视频墙 #21 | 新 type 临时形态 | P0     | R3 §2 V3 L55-59（出处/形态/交互①-⑦/映射/缺口）；R4 §1 L40、§2 L71-73、§3 结论 2                        |

优先级沿 D1 §1 L43：P0=首批（本域 O1/V3），P1=S1/O2/V1，P2=S2/V2。页面统一 complex-pages surface + 新分类 `business-replication`（D1 §0 决策①②；`COMPLEX_PAGE_ENTRIES` 现 6 分类，M3 增分类常量）。

## 2. Schema 结构设计

通用约定（全节生效）：页面 JSON 放 `page-schemas/<pageId>.json`（glob 自动装载，D1 决策①；**例外**：S1 为 mobile host override 页，D6 开放审计 MAJ-C，见 §2.1）；`testid` meta 传 `data-testid`（flux-core schema.ts L90），命名 `<pageId>-<element>`，主容器 `<pageId>-root`（D1 §3 L76）；布局用 `stack-*`/`hstack-*` + marker 类，自有视觉（价格大小字/低置信高亮/吸底 sticky/状态色）以 `repl-` 前缀类 + CSS 变量定义在**指定落点 `apps/playground/src/complex-pages/shared/replication.css`（新建），经 `apps/playground/src/styles.css` `@import` 接入（先例 L22 sundial / L27 airtable 各自 replica css @import）**——D6 开放审计勘误（MIN-8，2026-10-30）：原「页面级样式」未指名文件与 @import 位置，`repl-price`/`repl-sticky-footer`/`repl-low-confidence` 类与 `--repl-low-confidence-bg` 变量是 §5 断言对象（getComputedStyleValue），不足以开工即对；禁 BEM（Renderer Styling Contract）；业务数据走 mock fetcher 不内联，仅默认筛选/静态选项走 `PAGE_DATA['<pageId>']`（D1 §2 L51）。

**统一勘误注（2026-10-30，D5 深审，与 D2 §2.0/D3 §2.0 同款）**：全文 ajax 的 ApiSchema 一律置于 `args`（AjaxActionSchema args: ApiSchema）；data-source 取数走 `action`+`args`（DataSourceSchema 无顶层 `url`/`api` 字段，flux-core schema.ts L296-327）；form 提交走 `submitAction`；字符串 URL 不可作 crud/pivot/table 的 `source`（crud 服务端取数走 `loadAction`，先例 standard-crud.json L10-18；pivot/table 的 source 是内存数据入口，use-source-value 仅对 `{type:'source'}` 对象取数）——D5 深审勘误，以下各片段就地标注。

### 2.1 mall-sku-picker（S1，mobile，axe 分支 B）

> 实现形态（D6 开放审计 MAJ-C 裁决，2026-10-30）：**mobile host override 移动画布 375×667**——registry 特例 host 以居中手机框形态承载（桌面壳内固定宽度画布，D1 §0 决策①例外注 + §4 分支 B），非桌面壳全宽铺开；schema JSON 由该 host 直接 import（同 D3 K1 装配形态）。

组件树（R2 L78 交互①-⑫ → L79 映射 + G15 近似）：

```
page(mobile)   # testid: mall-sku-picker-root（D5 深审勘误 MIN-3：补主容器 testid 注）
├─ pull-refresh ─ infinite-scroll (loadmore → goodsFeed 分页)
│   ├─ carousel 画廊 (goods.images, onChange) └ image-viewer 放大
│   ├─ card 促销横幅: text tpl 大小字价格(repl-price≈G15) + countdown(onFinish 切态) + progress(抢购进度)
│   ├─ button-group-select 场次三态切换(≈G15 场次分段)
│   └─ cards 商品卡瀑布流(card 内 text 拼 price/seckillPrice)
├─ floating-panel SKU 半屏面板(anchors=[200,480])
│   ├─ picker-view×2 规格列(颜色/尺寸, 缺货项 disabled) + status/mapping 缺货标识
│   └─ input-number 数量步进(min=1, max=min(stock,purchaseLimit)) + text 求交结果(testid mall-sku-picker-price/库存)
└─ grid 吸底双按钮(repl-sticky-footer≈G15 吸底栏): 加入购物车 / 立即抢购
```

片段① SKU 求交定位（G16，formula/action 层；skuMatrix 由 data-source 预载）：

```jsonc
{ "type": "data-source", "name": "skuMatrix", "action": "ajax",
  "args": { "url": "/r/ReplMall__goodsDetail", "responseAdaptor": "return payload.data.goods.skuMatrix" } },
// D5 深审勘误（MAJ-10）：DataSourceSchema 无顶层 url/responseAdaptor（schema.ts L296-327），responseAdaptor 是 ApiSchema 字段须入 args——原写法永不取数，S1 求交全链失效
{ "type": "picker-view", "testid": "mall-sku-picker-spec-color",
  "columns": "${skuMatrix | ...规格列展开为 WheelPickerOption[][]}" }  // PickerViewSchema 属性为 columns 非 options（closure audit Major-1 勘误）；onChange → 求交表达式编排（见下）
```

求交口径：已选规格值集合对 skuMatrix 行交集匹配唯一 SKU，价格/库存/图片写回 scope `currentSku`。主实现 flux-formula 表达式；若 tpl 过滤器子集不可表达 → M3 降级二选一（action 链前端 helper / ajax `skuLocate` 兜底），决定记入 M3 验收计划（验证方法 §3.3）。

片段② 秒杀倒计时+进度（countdown 仅 mobile 包注册，本页为 mobile 页故合法，R2 §0 L13）：

```jsonc
{ "type": "countdown", "testid": "mall-sku-picker-countdown", "targetTime": "${promo.seckillEndAt}",  // CountdownSchema 仅 time/targetTime/format/millisecond/paused/autoStart/prefix/suffix/onFinish（closure audit Major-1 勘误）
  "onFinish": { "action": "ajax", "args": { "url": "/r/ReplMall__flashSaleSession" } } },  // 截断切态文案由场次状态数据驱动，非 finishedText prop
{ "type": "progress", "testid": "mall-sku-picker-seckill-progress", "value": "${session.progressPercent}" }
```

片段③ 吸底栏（G15 近似）：

```jsonc
{
  "type": "grid",
  "columns": "1fr 1fr",
  "className": "repl-sticky-footer",
  "items": [
    {
      "type": "button",
      "testid": "mall-sku-picker-add-cart",
      "label": "加入购物车",
      "onClick": {
        "action": "ajax",
        "args": { "url": "/r/ReplMall__addToCart", "method": "post" },
      },
    },
    { "type": "button", "testid": "mall-sku-picker-buy-now", "label": "立即抢购" },
  ],
}
```

**G15 四项近似口径**（R4 §2 L62 逐项落位）：价格文本=text/card tpl 大小字+划线价（`repl-price` 类+CSS 变量）；吸底栏=grid 双列+`repl-sticky-footer`（sticky bottom）；加购动效=不做动效，`showToast` 反馈+`__replMallCalls` 计数过验收；场次切换=form 包 `button-group-select` 三值分段。

#### S1 实现勘误（M3 落地实证 2026-10-31，plan 812；以 live 为准）

1. **cards 卡区域槽约定**：cards 单卡模板 region 内字段经 `$slot.item.xxx` 访问（cards-renderer itemScope merge {item,index}）——原「card 内 text 拼 price」未指名槽前缀。
2. **picker-view columns 静态域值**：规格列展开表达式（ARRAYMAP→{label,value} 对象字面量）在箭头体不可达（formula 无对象字面量）→ 规格列固定域值（颜色/尺寸为静态枚举），缺货置灰不可行（WheelPickerOption 无 disabled）→ 求交结果缺货标识 + 吸底按钮 disabled 表达式承担。
3. **refreshSource targetId 顶层键**（D5 深审勘误同款同步）：`refreshSource requires targetId`——targetId 置 action 顶层非 args。
4. **countdown 基线与推进钩子**：模块闭包基线在 spec reload 时随模块图重建复位 → 推进量改 sessionStorage 累积（`__replMallClockAdvance`，生产空值零影响），goodsDetail 服务 `baseline - 累积偏移`（推进=拉近截止）；基线 now+1h（计数恒走，确定性由推进钩子承担——M1 相位窗口同款）。
5. **image-viewer images 投影**：goods.images 为 {image} 对象数组（CarouselItemSchema 形状）——image-viewer images 需字符串数组 → ARRAYMAP 投影 `i?.image`。
6. **includeScope 载荷含 data-source 名值**：页级 form 包裹下 data-source 名（goodsDetail/flashSaleSource/goodsFeed\*）入 form scope → 载荷为域值全量（mock 择字段消费，多余键容忍——plan 812 Major-1 契约的实测形态）。
7. **floating-panel 手势仲裁 vs 轮盘**：非顶锚时面板拥有全部纵向手势 → panel 内 picker-view 旋动被劫持——spec 以先拖顶锚再旋轮承担（产品面无影响：真实用户顶锚交互）。
8. **axe 分支 B 基线**：color-contrast 11（壳头部 badge 族全量）+ aria-progressbar-name 1（content Progress 无可访问名 prop——组件 owner 债务）。

### 2.2 mall-distribution（S2，桌面，直接组合）

组件树（R2 L86 交互①-⑩ → L87 映射；主容器 # testid: mall-distribution-root——D5 深审勘误 MIN-3）：`dashboard`（stat-tile×4 GMV/佣金/人数/待结算 + sparkline；echarts line 趋势）→ `crud` 佣金明细（query-filter+batch-bar+pagination ≥25 行，operation 列 审核）→ 导出按钮（download action，G6）→ `pivot-table` 层级透视（pivot:cell-click 下钻）→ `tree` 关系树（三级）+ `qrcode` 邀请码 → `dialog` 提现审核/打回（form+input-number+textarea 原因）→ batch-bar 结算批次入口（≈G17 调度 action 模拟）→ `input-table` 佣金规则配置（品类/金额区间→三级比例）→ page 权限层两视图裁剪（≈G17 SAAS-15）。

片段① 导出（G6 登记冲突，走服务端；flux-guide/04 内置 `download` 动作）：

```jsonc
{
  "type": "button",
  "testid": "mall-distribution-export-btn",
  "label": "导出佣金明细",
  "onClick": {
    "action": "ajax",
    "args": { "url": "/r/ReplMall__commissionExport", "method": "post" },
    "then": { "action": "download", "args": { "url": "${result.data.downloadUrl}" } },
  },
}
```

片段② 透视下钻（`pivot:cell-click`，pivot 包 pivot-events.ts L11）：

```jsonc
{ "type": "data-source", "name": "distPivotRows", "action": "ajax",
  "args": { "url": "/r/ReplMall__distPivot" } },
// D5 深审勘误（MAJ-11）：字符串 URL 作 PivotTableSchema.source 按字面值透传（use-source-value.ts L8-17 仅 {type:'source'} 对象触发取数）→ 取数下沉 data-source，source 改表达式绑定
{
  "type": "pivot-table",
  "testid": "mall-distribution-pivot",
  "source": "${distPivotRows}",
  "rowDimensions": ["level", "distributorName"],   // D5 深审勘误（MAJ-14）：对象形式须 {dimensionKey}（PivotDimensionSchema.dimensionKey 必填，validator 明确拒绝 {field}），改字符串形式（D2 全文同款）
  "indicators": [
    { "field": "commissionAmount", "aggregationType": "SUM" },
    { "field": "orderCount", "aggregationType": "COUNT" },
  ], // 词表大写（pivot-vocabulary.ts L10，小写静默降级 NONE——复审勘误）  // PivotIndicatorSchema 属性为 aggregationType（closure audit Major-1 勘误）
  "totals": { "row": { "showGrandTotals": true } }, // PivotTotalsSchema.row 为对象非 boolean（closure audit Major-1 勘误）
  "onCellClick": {
    "action": "openDialog",
    "args": { "title": "下钻", "url": "/r/ReplMall__commissionPage?distributor=${event.value}" },
  },
}
```

权限层口径（G17）：裁剪非 renderer 机制——区块 `visible: "${tenantRole === 'merchant'}"`（R2 L88），`tenantRole` 由 `PAGE_DATA['mall-distribution']` 注入。

#### S2 实现勘误（M3 落地实证 2026-10-31，plan 813；以 live 为准）

1. **片段② 下钻键 event.value → cellHeaderPaths**：`pivot:cell-click` payload 的 value 是聚合数非维度键；live 已证面（W3 交互②）为 `cellHeaderPaths.rowHeaderPaths[i].value`——下钻写回 `drillDistributor=${cellHeaderPaths?.rowHeaderPaths?.[1]?.value}`（distributorName 为叶维）。
2. **片段② 顶层 totals → dataConfig.totals**：PivotTableSchema 无顶层 `totals` 键（schemas.ts 仅 `dataConfig?`）——行总计置 `dataConfig.totals.row`（W3 已证路径）。
3. **片段② openDialog url → body table**：openDialog 不按 `url` 取数渲染——dialog body 内 `table`，source 以 `ARRAYFILTER(commissionAll?.items, r => r?.distributorName == drillDistributor)` 客户端过滤（佣金全集由 `commissionAll` data-source 预取，同时供 KPI 聚合）。
4. **§5 ⑤ 空原因拦截口径**：空原因由 textarea `required` 在前端拦截（payoutAudit 计数不变 + dialog 停留，K3 已证口径）；`REPL_MALL_PAYOUT_REJECTED_REQUIRED` 保留为服务端兜底，经 whitespace-only 输入绕过 required 命中。
5. **query-filter → crud 通道**：query-filter 内嵌 form 提交管线里的 `setValue` 写入 form 自身作用域（scope.update 写本层 store），到不了页面作用域——live 正确通道为 crud 外部提交 `component:querySubmit` + `args.values`（crud-renderer-state.ts querySubmit「external target-submission values (AMIS form.target)」），crud loadAction 读 `${query.xxx}`。本页为 query-filter 首个 JSON 用法。
6. **form 初始 data 为快照**：form `data: { rules: "${rulesSource?.items}" }` 在 form 初始化时求值、不随 data-source 到达而更新（规则表首帧空）→ 改 form `loadAction`（GET commissionRules，`{items}` 直入 form 值，input-table `name: items`，提交映射 `{rules: "${items}"}`）。
7. **导出与筛选解耦 + 空集钩子**：crud 查询状态私有于 `$_crud.<id>.query`，页面级导出按钮无公开读取面 → commissionExport 导出全量（G6 服务端报表）；`REPL_MALL_EXPORT_EMPTY` 分支由 consume-once 钩子 `forceExportEmpty` 触发（mock 端点仍接受 level/status/distributor 过滤参数，空集同样命中）。
8. **pivot 无列维的表头层级**：无 columnDimensions 时 `colHeaderPaths` 只有指标一层（`[0].indicatorKey`），表头仅 1 行——spec 定位按「路径任一层含 indicatorKey」匹配、扫描上界取 `rowCount`（W3 `[1]` 口径为有月列维时的形态）。
9. **KPI 无专用端点**：§4.1 S2 六端点不含 KPI 聚合端点——stat-tile×4 值以表达式聚合页面 data-source（GMV=Σ ROUND(commissionAmount/rate)、佣金=Σ commissionAmount、分销员数=COUNT(distPivot 行)、待结算=COUNT(ARRAYFILTER status=pending)），趋势月序列为 PAGE_DATA 确定性静态值。
10. **axe 分支 A 基线**：aria-required-attr 7（crud 列宽 separator，table owner 债）+ aria-required-children 1（tree role=tree 容器，tree owner 债）+ color-contrast 11（壳头部 badge 族，同 S1）。

### 2.3 doc-ocr-workbench（O1，桌面，新 type 临时形态）

组件树（R3 L21 交互①-⑩ → L22 映射；主容器 # testid: doc-ocr-workbench-root——D5 深审勘误 MIN-3）：`grid` 两栏 2fr/3fr——左 `image` 原件（preview 放大）+ `image-compare`（before=原件/after=识别参考整图，≈要素② 非 bbox）；右 `wizard` 四步（原件对照→字段确认→明细行→回流提交），步骤 2 内嵌 `detail-view` 逐字段确认（草稿+逐字段提交+再校验≈G20）+ `detail-field`（labelRemark 原值悬浮≈要素⑤、inputClassName 低置信高亮≈要素④）+ `badge` 置信度分档（≥0.9 高/0.7-0.9 中/<0.7 低）；步骤 3 明细行以 **`form` 包裹 `input-table`**（要素⑧——D6 开放审计勘误 MIN-2，2026-10-30：InputTableSchema extends BoundFieldSchemaBase（composite-schemas.ts），input-table 是绑定 form 状态的字段，合计回写 "parent form field"（input-table-renderer.tsx L228 注释），裸放有绑定落空面；D2 W2（§2.2 form→input-table）与 D3 M2（§2.5 dialog 内 form 包裹）同属性用法均包 form，唯本页原树裸放——补 form 包裹对齐同款；§5 交互④的增改+校验断言在该 form 宿主内进行）；步骤 4 `ocrCommit`（要素⑨）。

片段① 逐字段确认（labelRemark+inputClassName，flux-core schema.ts L154/L158）：

```jsonc
// D5 深审勘误（MAJ-12）：DetailViewSchema 无 fields/source（区域是 content（必填），数据走
// data/scopePath，composite-schemas.ts L280-295）；逐字段用 detail-field（L70-84）；
// labelRemark 须 FieldRemarkSchema 对象 {content}（flux-core schema.ts L137-142，
// 字符串使 field-frame 读 .content 落空→原值悬浮失效）——原值取数下沉 data-source ocrCase。
{
  "type": "detail-view",
  "testid": "doc-ocr-workbench-field-panel",
  "data": "${ocrCase}", // data-source ReplDoc__ocrCase?id=${caseId} 预载（或改 scopePath 绑定）
  "content": [
    {
      "type": "detail-field",
      "name": "invoiceNo",
      "label": "发票号码",
      "labelRemark": {
        "content": "原值: ${fields.invoiceNo.originalValue}（置信度 ${fields.invoiceNo.confidence}）",
      },
      "inputClassName": "${fields.invoiceNo.confidence < 0.7 ? 'repl-low-confidence' : ''}",
      "required": true,
    },
  ],
}
```

`repl-low-confidence` 类由 CSS 变量 `--repl-low-confidence-bg` 驱动（getComputedStyle 可断言）。badge 分档：text 三元表达式 + `repl-conf-high/mid/low` 类。要素⑩"跳到下一低置信字段"以"低置信优先排序+高亮锚点"近似，不做专用跳转编排（归 G19 族 watch-only）。

片段② wizard 分步门禁（step 级；字段级门禁由 detail-view 承担，G20）：

```jsonc
{
  "type": "wizard",
  "testid": "doc-ocr-workbench-wizard",
  "steps": [
    { "key": "source", "title": "原件对照" },
    {
      "key": "fields",
      "title": "字段确认",
      // D6 开放审计勘误（MIN-1，2026-10-30）：删除原 formId:"ocrFieldPanel"——死配置：该 id 未在任何节点声明，
      // 且 wizard formId 校验要求目标在 componentRegistry 可 resolve 且暴露 validate 方法
      //（wizard-renderer.tsx L375-384：hasMethod('validate') 不命中即静默跳过），全仓组件 handle 暴露
      // validate 的只有 form（form-definition.ts L118），detail-view 零 component handle——该 formId 在
      // detail-view 承载（G20 裁决）下是静默 no-op。字段级门禁单点 = beforeLeave（ocrValidate）；
      // 如后续改 form 承载字段面板才启用 formId。
      "beforeLeave": {
        "action": "ajax",
        "args": { "url": "/r/ReplDoc__ocrValidate", "method": "post" },
      },
    },
    { "key": "rows", "title": "明细行" }, // D6 开放审计勘误（MIN-2）：本步 body = form 包裹 input-table（见组件树勘误注），对齐 D2 W2/D3 M2 同款
    {
      "key": "commit",
      "title": "回流提交",
      "actions": [
        {
          "type": "button",
          "testid": "doc-ocr-workbench-commit",
          "label": "提交并回流样本",
          "onClick": {
            "action": "ajax",
            "args": { "url": "/r/ReplDoc__ocrCommit", "method": "post" },
          },
        },
      ],
    },
  ],
}
```

#### O1 实现勘误（M3 落地实证 2026-11-01，plan 814；以 live 为准）

1. **逐字段确认承载 detail-view → form 宿主 + detail-field**：无 content 的 detail-field 仅能只读展示（`crm-customer-360.json` 先例）；逐字段**可编辑**确认须 form 宿主 + `content`（surface 草稿编辑体）。落地：步骤 2 form（`loadAction` ocrCase，`valuesPath: ocrFieldDraft`）内 6 个 detail-field，name=按字段名键控的字段对象（mock 同时返回契约 `fields` 数组 + 键控对象），`content` = input-text `value` required，viewer = 值文本 + 置信度 badge，triggerLabel「校正」——surface 草稿确认写回即 G20「草稿+逐字段提交」近似。
2. **片段① inputClassName → className**：flux-core `BoundFieldSchemaBase.inputClassName`（types/schema.ts L158）只存在于类型声明——仓内零运行时消费者、无字段 renderer 声明（strict 报 unknown-property），设了即静默 no-op（已登记 improvement-analysis §4 #9）。低置信高亮改 detail-field `className`（落控件根 `.nop-detail-field`），背景读 `--repl-low-confidence-bg`（replication.css）。
3. **labelRemark 呈现面**：`[data-slot="field-label-remark"]` 的 `title` 属性承载 content（原生悬浮提示），断言读 title。
4. **片段② beforeLeave 载荷**：wizard beforeLeave 在 wizard 作用域派发、读不到步骤 form 的本地值 → 经 form `valuesPath` 发布草稿（`ocrFieldDraft`），ajax data 映射 `{caseId, fields: "${ocrFieldDraft}"}`；失败经 onError toast 后仍为 `ok:false`（failureHandled）→ 阻断导航。
5. **明细行 input-table 不设 itemKey**：可增行时新行无 `rowNo`，以 `rowNo` 为 itemKey 会令新行无身份键 → 改索引身份；步骤 3 `formId` 指向包裹 form（form 暴露 validate）。
6. **live 缺陷修复（docs/bugs/171）**：input-table 必填单元格一次校验失败后修正、再提交仍被阻断——`validateForm` 把数组模板展开的错误记在模板路径（`rows.sku`）键下，该路径无人重新提交 → 陈旧错误永久保留。修复：`assignValidatedPathErrors` 按错误自身实例路径记账（flux-runtime，判别性回归测试修复前 2/2 挂、修复后 2/2 过）。
7. **§4.2 静态资产 PNG → SVG**：直出确定性 SVG（`apps/playground/public/repl-assets/ocr-invoice-{original,annotated}.svg`，各 <3KB），免光栅化工具链，`<img>` 渲染等价；image 渲染器 testid 落在 `<img>` 元素本身。
8. **步骤 4 回流结果**：commit 成功链 `setValue ocrCommitResult = ${result.data}` → 结果文本回显 docId；载荷 `{caseId, fields: ${ocrFieldDraft}, detailRows: ${ocrRowsDraft.detailRows}}`。
9. **axe 分支 A 基线**：仅 color-contrast 10（壳头部 badge 族，同 S1/S2）。

### 2.4 doc-hitl-inbox（O2，桌面，能力扩展）

组件树（R3 L29 交互①-⑫ → L30 映射；八列契约=maker-checker 04，R3 L27；主容器 # testid: doc-hitl-inbox-root——D5 深审勘误 MIN-3）：`query-filter`（业务对象/动作/高危）→ `crud` 待办八列（时限升序，selection multiple + keepOnPageChange ←R4 §4.1 强制，onRowClick→dialog）+ `batch-bar` 批量通过（countTemplate 影响行数）→ `dialog`：`alert` staleness 横幅（过期禁用批准）+ `alert` 高危横幅 + `ai-suggestions` AI 预审建议 + `ai-tool-call` HITL 交接卡 + `tabs` 变更对比三视图（Mode A=labelRemark+inputClassName≈G22 / Mode B=tree 承载 diffTree≈G21 / Mode C=json-view rawRequest）+ form 意见（reject 必填）+ 批准/驳回按钮（reaction 联动）。

片段① 批量通过（跨页保留选中+影响行数；`$crud.selectionCount` 见 crud-renderer.tsx L216/L225）：

```jsonc
{ "type": "crud", "testid": "doc-hitl-inbox-inbox-crud",
  "loadAction": { "action": "ajax", "args": { "url": "/r/ReplDoc__inboxPage" } },   // D5 深审勘误（MAJ-11）：CrudSchema.source 是内存数组入参（crud-schema.ts L215），服务端取数走 loadAction（先例 standard-crud.json L10-18）——原字符串 URL 按字面值透传不取数
  "selection": { "type": "checkbox", "keepOnPageChange": true } },  // 时限升序由 mock 端点排序保证（04 契约，R3 L27）
{ "type": "batch-bar", "testid": "doc-hitl-inbox-batch-approve",
  "selectionPath": "$crud.selectedRowKeys",   // D5 复审轮1 R1 勘误：definition 级必填（batch-bar-definition.ts L18-31），缺省 selection 恒 []；crud 宿主平铺绑定（先例 antdpro-list.json L290）
  "countTemplate": "批量通过：影响 ${count} 行",   // D5 深审勘误（MAJ-13）：BatchBarSchema 无 label（语义并入 countTemplate 文案）；countTemplate 在子作用域 {count,selectedRowKeys} 求值（batch-bar.tsx L103），${selectionCount} 不在该作用域
  "actions": [ { "type": "button", "label": "批量通过",
    "onClick": { "action": "ajax", "args": { "url": "/r/ReplDoc__batchApprove", "method": "post" } } } ] }   // D5 深审勘误（MAJ-13）：BatchBarSchema 无 onClick，批量动作放 actions
```

片段② staleness 禁用批准（契约对齐 maker-checker 04，R3 L27；服务端兜底）：

```jsonc
{ "type": "alert", "testid": "doc-hitl-inbox-staleness-alert", "level": "error",
  "visible": "${review.remainingSeconds <= 0}", "body": "审批已过期（staleness），禁止批准" },
{ "type": "button", "testid": "doc-hitl-inbox-approve-btn", "label": "批准",
  "disabled": "${review.remainingSeconds <= 0}",
  "onClick": { "action": "ajax", "args": { "url": "/r/ReplDoc__approve", "method": "post" } } }
```

片段③ 对比三视图：`tabs` 内 Mode B `{ "type": "tree", "testid": "doc-hitl-inbox-diff-tree", "data": "${review.diffTree}" }`（D5 深审勘误 MAJ-11c：TreeSchema 无 `source`，数据属性是 `data`——data/schemas.ts L267-279）、Mode C `{ "type": "json-view", "testid": "doc-hitl-inbox-diff-json", "value": "${review.rawRequest}" }`（Mode A 见 §2.3 同款 labelRemark/inputClassName）。

HITL 卡复用口径（R3 L30）：`ai-tool-call` 为 AI 会话语境卡，inbox 复用由页面 schema 构造 toolCall/state 输入并接管持久化；`onApproval` → ajax 写回；engine 不自改 `state.approval`（ai-tool-call.tsx L24-41）。

#### O2 实现勘误（M3 落地实证 2026-11-01，plan 815；以 live 为准）

1. **「八列」→ 9 字段表头**：04 契约字段清单为 9 项（审批单号/业务对象/业务键/动作/制单人/提交时间/剩余时限/变更摘要/高危），原「八列」命名与清单不符——表头按 9 字段钉死。
2. **query-filter → crud 通道**：同 §2.2 S2 勘误 5，onSubmit `component:querySubmit` + `args.values`，crud loadAction 读 `${query.*}`；loadAction 显式携带 `page/perPage = ${pagination.currentPage/pageSize}`。
3. **片段① batch-bar 载荷**：actions 渲染于 crud toolbar 作用域（非 countTemplate 子作用域），批量载荷读 `${$crud.selectedRowKeys}`；`keepOnPageChange` 在服务端分页下跨页保留键（页 1 勾 2 + 页 2 勾 1 → data-count=3，载荷恰 3 键实证）。
4. **片段③ Mode A 字段对照 → table**：原「labelRemark+inputClassName」承载不成立（inputClassName 为类型死字段，improvement §4 #9；变更路径是动态集合，静态字段树无法表达）→ 改 `table`（source `review.fieldDiffs`，path/before/after 三列）。
5. **§4.2 reviewDetail 契约形状增补**：`fieldDiffs[{path,before,after}]`（字段对照数据面）、`aiSuggestionItems`（ai-suggestions items 投影）、`hitlToolCall`/`hitlToolCallState`（ai-tool-call 输入投影，K3 ChatToolCall 形状）——与原 `hitl:{toolName,args,state}` 并存。
6. **片段② 批准读意见 + 兜底直调**：批准按钮在意见 form 外，经 form `valuesPath: opinionDraft` 读意见草稿（§2.3 O1 勘误 4 同款）；驳回走 form 提交（textarea required 前端拦截，`REPL_DOC_OPINION_REQUIRED` 为服务端兜底）；staleness 下批准 disabled，服务端 `REPL_DOC_STALE_DECISION` 兜底由「越权直调批准（兜底演练）」ghost 按钮承载（W3「非法格式演练」先例）。
7. **dialog 内刷新外部 crud**：dialog 片段运行期编译，`component:refresh` 跨片段 componentId 报 `unvalidated-component-target`（console.error）→ 改 `refreshNearest {targetType:'crud'}`（approval-tasks/S2 先例）。
8. **HITL 卡 focus 口径**：`ai-tool-call` pending 态按组件设计在审批按钮内循环 Tab（`docs/components/flux-renderers-ai/improvement-analysis.md` §7 无障碍评估 + §5.2 [P3] HITL 审批页��焦点陷阱；`ai-tool-call.tsx` 文件头注释「P3 HITL … focus trap」，Esc 释放）——staleness 焦点断言改为「焦点落入 dialog 且非禁用批准；自卡片之后的控件起 Tab 链跳过禁用批准、可达驳回」；HITL 卡 onApproval approve → `ReplDoc__approve`（source=hitl），reject 仅写回卡片状态。
9. **axe 分支 A 基线**：aria-required-attr 9（crud 列宽 separator，table owner 债）+ color-contrast 10（壳头部 badge 族）。

### 2.5 iot-telemetry-device（V1，桌面，直接组合）

组件树（R3 L41 交互①-⑥ → L42；主容器 # testid: iot-telemetry-device-root——D5 深审勘误 MIN-3）：`form`+`query-filter`（deviceKey/metric/时间窗）→ `data-source` interval 轮询 → `stat-tile`×3+`sparkline` 最新值概览 + `echarts` line 实时曲线 → `status`+`mapping` 质量位（GOOD/UNCERTAIN/BAD，要素⑤ flux 侧预期）→ `crud` 告警联动（severity mapping 色，onRowClick→`dialog` ack/开始处理/关闭，AlarmLifecycleService 语义，R3 L39）。

片段：

```jsonc
{ "type": "data-source", "name": "telemetry", "action": "ajax",
  "args": { "url": "/r/ReplIot__telemetryQuery" },
  "interval": 5000 },  // D5 深审勘误（MAJ-10，同 §2.1）：DataSourceSchema 无顶层 url——取数走 action+args（schema.ts L302-327，对齐 D3 M1）；trackExpression 已删：runtime 未实现（improvement-detail 登记为 DESIGN-GAP，closure audit Major-1 勘误）；轮询 scope 依赖由 interval+stopWhen+刷新参数承担，验证方案见 §3.3
{ "type": "stat-tile", "testid": "iot-telemetry-device-latest-tile-temperature", "title": "温度最新值",
  "value": "${telemetry.latest.temperature}", "sparkline": "${telemetry.series.temperature}" },  // sparkline 字段收 number[] 表达式（stat-tile-renderer-definition.ts L63）
{ "type": "echarts", "testid": "iot-telemetry-device-trend-chart", "option": "${telemetry.chartOption}" }
```

`interval: 5000`：上游既有页实证 30000（R3 L39），复刻页取小值适配 e2e 时限；数据由 mock 确定性序列驱动（§4.3）。

### 2.6 iot-ota-rollout（V2，桌面，直接组合）

组件树（R3 L49 交互①-⑦ → L50；主容器 # testid: iot-ota-rollout-root——D5 深审勘误 MIN-3）：`crud` 固件列表（input-file 上传/verifySignature/废弃）→ `wizard` 灰度指派三步（选设备→分批→确认下发，onStepCommit 门禁，内嵌 table 多选）→ `steps` 八态（QUEUED→INITIATED→DOWNLOADING→DOWNLOADED→VERIFIED→UPDATING→UPDATED，FAILED=error 分叉）→ `timeline` statusTime（items.time=statusTime）→ `table` 进度矩阵（设备×批次×状态+lastError，mapping 状态色）→ `button-group` 门控（推进/暂停→dialog）→ `dialog` 回滚确认（alert ROLLED_BACK+textarea 原因）。断点续传（要素⑦）不呈现（D1 §1 #20）。

片段：

```jsonc
{ "type": "steps", "testid": "iot-ota-rollout-batch-steps",
  "items": [ { "value": "QUEUED", "title": "排队" }, { "value": "INITIATED", "title": "已下发" },
    { "value": "DOWNLOADING", "title": "下载中" }, { "value": "DOWNLOADED", "title": "已下载" },
    { "value": "VERIFIED", "title": "已校验" }, { "value": "UPDATING", "title": "升级中" },
    { "value": "UPDATED", "title": "已完成" }, { "value": "FAILED", "title": "失败" } ],
  "value": "${selectedAssignment.status}", "valueOwnership": "scope", "valueStatePath": "otaStatus" },
{ "type": "timeline", "testid": "iot-ota-rollout-assign-timeline", "items": "${selectedAssignment.history}" }
```

### 2.7 iot-geofence-videowall（V3，桌面，新 type 临时形态，axe 分支 C）

组件树（R3 L57 交互①-⑦ → L58，收窄见 §6；主容器 # testid: iot-geofence-videowall-root——D5 深审勘误 MIN-3）：`grid` 左图右墙（3fr/2fr）——左 `map`（mapType pin、pinData、cluster、geojsonSource 围栏圆回显非交互、onClick 联动）+ 左下 `table` 事件列表（interval 轮询增量）+`timeline` 事件流；右 `grid` 视频墙（`video`×4 mp4 样例，controls/muted，`card` 包裹通道名+status）+ `drawer` 通道树（tree，点播控制仅 UI 摆放）。

片段① map 围栏回显+pin 联动（事件 key `onClick`，payload `map:feature-click`，map-renderer-definitions.ts L223-249；R3 L58"feature-click payload"同一事物）：

```jsonc
{
  "type": "map",
  "testid": "iot-geofence-videowall-map",
  "mapType": "pin",
  "pinData": "${devicePins}",
  "cluster": true,
  "height": 420,
  "geojsonSource": "${fenceGeojson}",
  "onClick": {
    "action": "ajax",
    "args": {
      "url": "/r/ReplIot__checkFence",
      "method": "post",
      "data": { "deviceId": "${event.value}" },
    },
  },
}
```

片段② 视频墙（video 仅 http/mp4 直链，无 iframe——R4 §3 结论 2 keep-out）：

```jsonc
{
  "type": "grid",
  "testid": "iot-geofence-videowall-video-grid",
  "columns": 2,
  "items": [
    {
      "type": "card",
      "body": [
        {
          "type": "video",
          "testid": "iot-geofence-videowall-video-1",
          "src": "/repl-assets/sample-clip-1.mp4",
          "controls": true,
          "muted": true,
          "poster": "/repl-assets/sample-poster-1.png",
        },
      ],
    },
  ],
}
```

## 3. R4 对照与双向核对

### 3.1 R4 §1 → 本设计组合对照

| 页  | R4 §1 结论（行）        | 缺口          | 本设计组合（§2）                                                                                                                                                                                            |
| --- | ----------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | 能力扩展（L34）         | G15、G16      | mobile 族（pull-refresh/infinite-scroll/countdown/floating-panel/picker-view/image-viewer）+ content（carousel/card/cards/progress）+ form（input-number/button-group-select）+ G15 四项近似 + formula 求交 |
| S2  | 直接组合（L35）         | G6、G17       | data（crud/table/batch-bar/stat-tile/sparkline/echarts/tree/query-filter）+ pivot-table + content（qrcode/alert）+ form-advanced（input-table）+ download action + page 权限层                              |
| O1  | 新 type 临时形态（L36） | G19、G20      | content（image/image-compare/badge）+ form-advanced（detail-view/input-table）+ layout（wizard）+ labelRemark/inputClassName                                                                                |
| O2  | 能力扩展（L37）         | G21、G22      | data（crud/batch-bar/query-filter）+ content（alert/json-view/tabs）+ ai（ai-suggestions/ai-tool-call）+ labelRemark/inputClassName + tree 承载 diffTree                                                    |
| V1  | 直接组合（L38）         | G23           | data（echarts/data-source interval/stat-tile/sparkline/crud/query-filter）+ content（status/mapping）                                                                                                       |
| V2  | 直接组合（L39）         | —             | layout（wizard/steps/timeline/button-group/grid）+ data（crud/table/mapping/query-filter）+ form-advanced（input-file）+ content（alert）                                                                   |
| V3  | 新 type 临时形态（L40） | G24、G25、G26 | map（pinData/cluster/geojsonSource/onClick）+ content（video/card）+ layout（grid/drawer）+ data（table 轮询）                                                                                              |

### 3.2 R4 §2 ↔ §4 双向核对（本域 12 条 G）

| G   | §2 分级（行）                                  | §4 登记去向                                                    | 本设计落位                                      | 一致 |
| --- | ---------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------- | ---- |
| G6  | 登记冲突（L53）                                | 不登记，引 improvement L23/L182（§3 结论 1 L79）               | S2 导出=download action+服务端 commissionExport | ✓    |
| G15 | 新 type 族（L62）                              | missing-components 需求行 demand-gated（§4 L87）               | S1 四项近似口径（§2.1）                         | ✓    |
| G16 | 直接组合（L63）                                | 不登记（§4 L88）                                               | S1 formula 求交+§3.3 验证方案                   | ✓    |
| G17 | 直接组合（L64）                                | 不登记（§4 L88）                                               | S2 page 权限层+batch-bar action 模拟            | ✓    |
| G19 | 新 type（L66）                                 | missing-components 需求行 demand-gated                         | O1 不做 bbox（§6.1）                            | ✓    |
| G20 | 直接组合（L67）                                | 不登记                                                         | O1 detail-view 门禁覆盖（§2.3）                 | ✓    |
| G21 | 新 type（L68）                                 | missing-components 需求行 demand-gated                         | O2 diffTree 以 tree 承载（§2.4）                | ✓    |
| G22 | 能力扩展（L69）                                | improvement-analysis 新增条目（§4 L86）                        | O2 Mode A labelRemark 近似，不做删除线变体      | ✓    |
| G23 | 新 type（L70）                                 | missing-components 需求行 watch-only                           | V1 interval 轮询模拟（§2.5）                    | ✓    |
| G24 | 能力扩展（L71）                                | improvement-analysis map 族（§4 L86）                          | V3 无绘制，仅 geojsonSource 回显（§6.2）        | ✓    |
| G25 | 新 type（L72）                                 | missing-components 需求行 demand-gated                         | V3 不做轨迹（§6.2）                             | ✓    |
| G26 | 登记冲突 iframe 半条/新 type 播放器半条（L73） | iframe 不登记（keep-out L183，§3 结论 2）；播放器 demand-gated | V3 video(mp4)+grid，无 iframe 无 HLS/RTSP       | ✓    |

### 3.3 散落验证项归集（R4 §4.1 L94）

| 验证项                          | 底账状态                                                              | 验证方法（M3 执行）                                                                                                                                                                                           |
| ------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G16 规格求交 formula 编排（S1） | R4 §2 L63 定性 formula/action 层，无 renderer 项可查                  | ① vitest 求交表达式确定性单测（3 规格列×缺货边界）；② e2e 选满规格后价格/库存文本变化且 `__replMallCalls.skuLocate`=0（证明前端求交）；③ 不可表达 → 降级 ajax skuLocate，决定记入 M3 验收计划，不静默         |
| O2 keepOnPageChange 当期复核    | R4 §4.1 L95：契约漂移登记表底账部分滞后                               | 编码期以 live 复核：crud-schema.ts L172/L230 selection 契约 + use-table-selection.ts L45 实现；e2e：页 1 选 2 行→翻页→再选 1 行→batch-bar 计数=3→payload 恰 3 键；live 与 improvement §4 登记不符则回写登记表 |
| V2 timeline items 表达式绑定    | items 为纯 value prop（layout schemas.ts L344），数组表达式绑定未确认 | e2e 前置验证 `items:"${selectedAssignment.history}"` 渲染行数=history 长度；不支持则降级为 crud 行点击写 scope+静态 items，记入 M3 验收计划                                                                   |
| V3 圆形围栏 GeoJSON 自转        | geojsonSource 契约已核实（L136），圆→多边形生成无现成实现             | mock `toCircleGeojson(lat,lng,r,segments=64)` 确定性生成；vitest 断言首末点闭合、顶点距圆心偏差 < r×5%；e2e 断言图层 feature 计数=围栏数                                                                      |

### 3.4 V3 axe 对策与收窄裁决落位（分支 C，D1 §4 L88）

1. **先纳入实测**：M3 将 `complex-pages/iot-geofence-videowall` 加入 axe spec ROUTES + JSON 从 0 起棘轮（同分支 A）。
2. **切换条件**：实测 >30s 或超时 → 排除裁决：ROUTES 移除+注释（map-demo 同款措辞，spec L25 先例）+JSON `_header.excludedRoutes` 登记；耗时证据记入 M3 验收计划。
3. **排除≠功能验收排除**：交互/focus 断言（§5）照常执行。本条即开放审计 Minor-④ 的 D4 侧显式裁决落位（R4 §1 L40"不接受静默收窄"）。
4. 红线（D1 §4 L90）：禁止为 axe 通过删功能；存量违规不修复必须 JSON 登记。
5. 配套义务：roadmap §2 M3 表 V3 行说明列加注本裁决引用（R6 Minor-4 双路径，plan 795 In Scope）。

## 4. Mock backend 设计

沿 D1 §2：模块 `shared/mock-backend-repl-{mall,doc,iot}.ts`，导出 `createRepl<Domain>MockBackend()`，showcase-env 装配 `/r/Repl<Domain>__` 前缀分发（闭包持有会话状态，先例 mock-backend-airtable.ts）；查询 `{ status:0, data:{ items,total } }`（flux-guide/03 L50 items/total 形状、L133-136 status 信封，closure audit Minor-1 补引），mutation `{ status:0, data }`，错误 `{ status:1, msg }`，每模块 ≥1 错误分支；`window.__repl<Domain>Calls` 计数 + `__repl<Domain>TestHooks`（addInitScript 预置，生产 no-op）。

### 4.1 mall 模块（S1/S2）

| 端点（method）                         | 页  | 数据形状                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 错误分支                                      |
| -------------------------------------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| ReplMall\_\_goodsDetail (get)          | S1  | `{ goods:{ goodsId,title,images[],price,seckillPrice,stock,purchaseLimit }, skuMatrix:[{ skuId,specs:{color,size},price,stock,image }], promo:{ seckillEndAt } }`（**`seckillEndAt` 为 epoch-ms number**——D6 开放审计勘误 MIN-3，2026-10-30：countdown `targetTime` 契约 number（countdown.tsx L31/L53-57：非 number 不进 targetTime 分支），按上游 ORM 习惯生成 ISO 字符串会静默不触发 onFinish，§5 S1 交互③「倒计时切态」断言同挂；D3 §4.5 respondDeadline 同口径） | —                                             |
| ReplMall\_\_flashSaleSession (get)     | S1  | `{ sessions:[{ sessionId,name,state:'ended'\|'active'\|'upcoming',startAt,endAt,progressPercent }] }`                                                                                                                                                                                                                                                                                                                                                                 | —                                             |
| ReplMall\_\_goodsFeed (get 分页)       | S1  | `{ items ≥25 商品卡, total }`（≥3 页）                                                                                                                                                                                                                                                                                                                                                                                                                                | —                                             |
| ReplMall\_\_addToCart (post)           | S1  | `{ cartItemId }`                                                                                                                                                                                                                                                                                                                                                                                                                                                      | REPL_MALL_SOLD_OUT                            |
| ReplMall\_\_placeOrder (post)          | S1  | `{ orderId }`（秒杀直购：地址+数量，禁优惠券语义由 payload 承载）                                                                                                                                                                                                                                                                                                                                                                                                     | REPL_MALL_SOLD_OUT / REPL_MALL_LIMIT_EXCEEDED |
| ReplMall\_\_skuLocate (post)           | S1  | `{ sku }`（仅 formula 降级备胎，§3.3）                                                                                                                                                                                                                                                                                                                                                                                                                                | —                                             |
| ReplMall\_\_commissionPage (get)       | S2  | `{ items ≥25:{ orderNo,distributorName,level 1-3,rate,commissionAmount,status }, total }`                                                                                                                                                                                                                                                                                                                                                                             | —                                             |
| ReplMall\_\_commissionExport (post)    | S2  | `{ downloadUrl, filename }`（G6 服务端报表）                                                                                                                                                                                                                                                                                                                                                                                                                          | REPL_MALL_EXPORT_EMPTY                        |
| ReplMall\_\_distPivot (get)            | S2  | `{ items:{ level,distributorName,commissionAmount,orderCount } }`                                                                                                                                                                                                                                                                                                                                                                                                     | —                                             |
| ReplMall\_\_distTree (get)             | S2  | `{ tree 三级:{ id,name,level,children[] } }`                                                                                                                                                                                                                                                                                                                                                                                                                          | —                                             |
| ReplMall\_\_commissionRules (get/post) | S2  | `{ items:{ category,minAmount,L1Rate,L2Rate,L3Rate } }`                                                                                                                                                                                                                                                                                                                                                                                                               | post: REPL_MALL_RULE_INVALID（合计≠100%）     |
| ReplMall\_\_payoutAudit (post)         | S2  | `{ payoutId,auditResult }`（打回走余额语义）                                                                                                                                                                                                                                                                                                                                                                                                                          | REPL_MALL_PAYOUT_REJECTED_REQUIRED            |

会话状态：goods.stock 扣减、payout 状态闭包持有。钩子：`forcePlaceOrderError(msg)`、`advanceFlashSaleClock(deltaMs)`（推进 mock 闭包中的秒杀倒计时基线使 onFinish 可触发；**传播路径**——D6 开放审计勘误 MIN-3，2026-10-30：改闭包值不会自动重解析 scope 绑定，spec 须在钩子调用后触发 `goodsDetail` data-source 刷新（refreshSource 或重进页）使 `${promo.seckillEndAt}` 重新求值，countdown 才读到新基线）。

### 4.2 doc 模块（O1/O2）

| 端点（method）                    | 页  | 数据形状                                                                                                                                                                                                              | 错误分支                                                                     |
| --------------------------------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| ReplDoc\_\_ocrCase (get)          | O1  | `{ caseId,imageUrl(原件),annotatedUrl(识别参考整图),fields:[{ name,label,value,originalValue,confidence,valueType }],detailRows:[{ rowNo,description,quantity,amount }],targetEntity }`（对齐上游 §3.1/§3.3，R3 L19） | id miss → placeholder                                                        |
| ReplDoc\_\_ocrValidate (post)     | O1  | `{ valid,unconfirmedFields[] }`（wizard beforeLeave 门禁）                                                                                                                                                            | REPL_DOC_FIELD_UNCONFIRMED                                                   |
| ReplDoc\_\_ocrCommit (post)       | O1  | `{ docId,sampleReflowed:true }`                                                                                                                                                                                       | REPL_DOC_COMMIT_VALIDATION_FAILED                                            |
| ReplDoc\_\_inboxPage (get)        | O2  | `{ items ≥25 八列:{ approvalNo,bizObject,bizKey,action,maker,submittedAt,remainingSeconds,changeSummary,riskFlag }, total }`（04 契约+时限升序，R3 L27）                                                              | —                                                                            |
| ReplDoc\_\_reviewDetail (get?id=) | O2  | `{ beforeData,expectedAfter,changedPaths,diffTree,rawRequest,remainingSeconds,riskFlag,aiSuggestion:{ verdict,confidence,risks[] },hitl:{ toolName,args,state } }`（04 getReviewDetail 形状）                         | id miss → placeholder                                                        |
| ReplDoc\_\_approve (post)         | O2  | `{ approvalNo,result:'APPROVED' }`                                                                                                                                                                                    | REPL_DOC_STALE_DECISION（过期兜底）/ REPL_DOC_SOD_VIOLATION（checker=maker） |
| ReplDoc\_\_reject (post)          | O2  | `{ approvalNo,result:'REJECTED' }`                                                                                                                                                                                    | REPL_DOC_OPINION_REQUIRED                                                    |
| ReplDoc\_\_batchApprove (post)    | O2  | `{ approved,skipped,affectedRows }`                                                                                                                                                                                   | REPL_DOC_BATCH_STALE（含 stale 项整批拒绝）                                  |

钩子：`forceApproveStale()`（当前 review remainingSeconds 置 0）、`setInboxOrder('remainingSeconds asc')`。（plan 815 勘误：reviewDetail 契约形状增补 `fieldDiffs`/`aiSuggestionItems`/`hitlToolCall`/`hitlToolCallState`，见 §2.4 O2 勘误 5；`forceApproveStale(approvalNo)` 带参落地、`setInboxOrder` 不实现——时限升序由端点固定保证）（plan 814 勘误：静态资产落地为 SVG `public/repl-assets/ocr-invoice-*.svg`，见 §2.3 O1 勘误 7）静态资产：`public/repl-assets/ocr-invoice-original.png`（原件）+`ocr-invoice-annotated.png`（识别参考），程序化生成（SVG 光栅化）各 <50KB 入库（功能 asset，非视觉回归产物，不受 tests/e2e/artifacts 纪律约束）。

### 4.3 iot 模块（V1/V2/V3）

| 端点（method）                          | 页  | 数据形状                                                                                                                                                            | 错误分支                          |
| --------------------------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| ReplIot\_\_telemetryQuery (get)         | V1  | `{ series:{ <metric>:[{ ts,valueDouble,quality }] }, latest:{ <metric>:v }, chartOption }`；确定性函数 `f(deviceKey,metric,ts)` 24h×5min 预生成（D1 §2 禁随机漂移） | —                                 |
| ReplIot\_\_telemetryLatest (get)        | V1  | `{ latest:{ <metric>:{ value,ts } } }`                                                                                                                              | —                                 |
| ReplIot\_\_alarmPage (get)              | V1  | `{ items:{ alarmId,deviceId,severity,status,triggerValue,thresholdValue,ackAt,escalationTier }, total }`（`_IotAlarm`，R3 L39）                                     | —                                 |
| ReplIot**alarmAck / **alarmClose (post) | V1  | `{ alarmId,status }`（AlarmLifecycleService 语义）                                                                                                                  | REPL_IOT_ALARM_ALREADY_CLOSED     |
| ReplIot\_\_firmwarePage (get)           | V2  | `{ items:{ packageId,title,versionNo,checksum,fileUrl,deprecated }, total }`（`_IotOtaPackage`，R3 L47）                                                            | —                                 |
| ReplIot\_\_assignBatched (post)         | V2  | `{ rolloutId,batches:[{ batchNo,deviceIds[] }] }`                                                                                                                   | REPL_IOT_BATCH_EMPTY              |
| ReplIot\_\_assignmentMatrix (get)       | V2  | `{ items:{ deviceId,batchNo,status,statusTime,lastError,history:[{ status,statusTime }] } }`（八态，R3 L47）                                                        | —                                 |
| ReplIot\_\_activateNextBatch (post)     | V2  | `{ batchNo,gate:{ completionRate,failRate,passed } }`                                                                                                               | REPL_IOT_GATE_NOT_PASSED          |
| ReplIot\_\_rollbackPackage (post)       | V2  | `{ rolloutId,status:'ROLLED_BACK' }`                                                                                                                                | REPL_IOT_ROLLBACK_REASON_REQUIRED |
| ReplIot\_\_devicePins (get)             | V3  | `{ pins:{ deviceId,name,latitude,longitude,fenceId } }`（`_IotDevice` L148-154）                                                                                    | —                                 |
| ReplIot\_\_fenceList (get)              | V3  | `{ fences:{ fenceId,fenceName,centerLat,centerLng,radiusMeters }, fenceGeojson:FeatureCollection }`（`_IotDeviceGeoFence` 三要素+toCircleGeojson 产物）             | —                                 |
| ReplIot\_\_fenceEvents (get)            | V3  | `{ items:{ eventId,deviceId,eventType:'enter'\|'exit'\|'dwell',ts,distanceMeters } }`（interval 增量）                                                              | —                                 |
| ReplIot\_\_checkFence (post)            | V3  | `{ deviceId,inside,distanceMeters }`（DeviceGeoService 语义，R3 L55）                                                                                               | REPL_IOT_DEVICE_NOT_FOUND         |
| ReplIot\_\_videoChannels (get)          | V3  | `{ channels:{ channelId,name,status:'online',streamUrl } }`                                                                                                         | —                                 |

钩子：`tickTelemetry(metric?)`（推进序列相位，V1 轮询断言）、`appendFenceEvent(event)`（V3 轮询增量）、`forceAlarmAckError()`、`setAssignmentStatus(deviceId,status)`（V2 推态）、`setVideoAsset(channelId,url)`（CI 替换 src，正常不用）。

**V3 mp4 样例流资产来源**（G26 收窄后验收载体，R4 §2 L73）：

- 主方案（推荐）：`public/repl-assets/sample-clip-{1..4}.mp4`——ffmpeg testsrc 程序化生成一次入库（2s、320×180、H.264、静音，单个 <100KB 合计 <400KB），4 路不同 testsrc 参数（色条/计数/棋盘）便于区分；`video.src` 写 dev-server 相对路径 `/repl-assets/sample-clip-1.mp4`，Playwright 双 webServer 天然服务，离线确定性；poster 同目录生成。
- 备选（不进 e2e）：公共样例视频 URL（gtv-videos-bucket 等）仅本地手动调试，避免外网依赖。
- 不做：HLS/HTTP-FLV/RTSP/GB28181（video 仅 mp4 直链，R3 L58）、iframe（keep-out，R4 §3 结论 2）。

## 5. 验收断言清单（三支柱，按 D1 §3）

通则（不逐页重复）：`tests/e2e/replication-<pageId>.spec.ts` 平铺 + `openReplicationPage` helper；交互全程序化 + `__repl<Domain>Calls` 计数证动作发生；收尾 `assertTrackedPageErrors`；高亮/配色用 `getComputedStyleValue`（visual-assert.ts）；axe 在 a11y-axe-baseline.spec.ts 扩展不进页面 spec；focus 用 `toBeFocused()`/`activeElement` 比对（D1 决策⑥）；dialog focus 模式：打开落 `[data-slot="dialog-surface"]`、Esc 返回触发元素。

**S1 mall-sku-picker**（axe 分支 B：mobile host override 移动画布内 describe——context 选项 `{ viewport 375×667, hasTouch: true }`，基线键同 pageId、describe 标注 mobile；交互断言均在 mobile 画布 DOM 内——D6 开放审计 MAJ-C 同步）

- 交互：① 求交：选规格→`mall-sku-picker-price`/库存文本变化且 `__replMallCalls.skuLocate`=0；② 步进：超 purchaseLimit 拦截；③ 倒计时切态：`advanceFlashSaleClock`→onFinish→`flashSaleSession` 计数+1+场次态文本；④ 直购：buy-now→placeOrder 计数+1，钩子强制 SOLD_OUT→错误 toast；⑤ 无限滚动：商品卡增长 ≥2 页。
- focus：sku-panel 展开后焦点落面板首控件（移动页抽样）；buy-now tab 可达；image-viewer Esc 关闭返回。

**S2 mall-distribution**（axe 分支 A）

- 交互：① 筛选/分页：query-filter→行数+首行字段+commissionPage 计数；② 导出：export-btn→commissionExport 计数+1+download 触发断言；③ 下钻：pivot cell click→dialog 数据按 event.value 过滤；④ 规则提交：改比例→payload 断言，合计≠100%→RULE_INVALID toast；⑤ 打回：空原因→PAYOUT_REJECTED_REQUIRED。
  - plan 813 落地勘误（2026-10-31，详见 §2.2「S2 实现勘误」）：③ 过滤键为 `cellHeaderPaths.rowHeaderPaths[1].value` 非 event.value（勘误 1/3）；⑤ 空原因由前端 required 拦截（计数不变），PAYOUT_REJECTED_REQUIRED 为服务端兜底、经 whitespace-only 输入命中（勘误 4）；① query-filter 经 `component:querySubmit` 外部提交驱动 crud（勘误 5）；导出空集分支经 `forceExportEmpty` 钩子触发（勘误 7）；focus「导出按钮 tab 首站」落地为「focus()+Enter 键盘可达并触发导出」（W3 focus ③ 同款口径——页内 dashboard/query-filter/crud 控件均先于导出按钮，tab 首站不成立）。
- focus：审批 dialog 焦点落入+Esc 返回；导出按钮 tab 首站。

**O1 doc-ocr-workbench**（axe 分支 A）

- 交互：① 逐字段确认流：改 invoiceNo→草稿提交→wizard 步骤 2→3；② 低置信高亮：confidence<0.7 字段 wrapper `getComputedStyleValue(background-color)`=`--repl-low-confidence-bg` 解析值+类存在；③ 分档 badge 高/中/低文本断言；④ 明细行 input-table 增改+校验；⑤ ocrCommit 计数+1；未确认字段 beforeLeave 拦截（wizard 停留步骤断言）。
  - plan 814 落地勘误（2026-11-01，详见 §2.3「O1 实现勘误」）：② 高亮落 detail-field `className`（inputClassName 为类型死字段，勘误 2）；① 草稿提交 = detail-field surface 确认写回、门禁读 valuesPath 草稿（勘误 1/4）；④ 增改+校验在 form 宿主内经 step formId 阻断，并实证修复 input-table 修正后仍阻断缺陷（勘误 6）。
- focus：wizard 步进后焦点落当前步首控件；image preview Esc 返回；detail-field 编辑焦点。

**O2 doc-hitl-inbox**（axe 分支 A）

- 交互：① 批量通过计数（跨页 keepOnPageChange）：页 1 选 2 行→翻页选 1 行→batch-bar"影响 3 行"→payload 恰 3 键；② staleness 禁用：`forceApproveStale`→staleness-alert 可见+approve-btn disabled+直调 approve 走 STALE_DECISION 兜底；③ reject 意见必填：空拦/填后成；④ 三视图：Mode B tree 行数=diffTree 节点数、Mode C 含 rawRequest 键；⑤ HITL：pending 呈现 `data-requires-approval`→approve→计数+1。
  - plan 815 落地勘误（2026-11-01，详见 §2.4「O2 实现勘误」）：① 载荷读 `${$crud.selectedRowKeys}`（勘误 3）；② 直调兜底由 ghost 演练按钮承载（勘误 6）；④ Mode A 改 table 字段对照（勘误 4）；focus staleness 场景按 HITL 卡 Tab 循环设计调整口径（勘误 8）。
- focus：dialog 焦点落入（staleness 场景落驳回按钮而非禁用批准按钮，对齐 ai-tool-call pending 焦点先例）；Esc 返回行。

**V1 iot-telemetry-device**（axe 分支 A）

- 交互：① 轮询刷新（D6 开放审计勘误 MIN-6，2026-10-30，对齐 D3 §5.4 M1 防flake口径）：`tickTelemetry` 钩子推进序列相位后**直接断数据面**——latest-tile 文本 = 推进后相位值，`expect(...).toHaveText(...)` 显式 waitFor timeout 给足 interval+余量（interval=5000，timeout ≥7s）；不采用原「≤6s 内文本变化」窄窗口口径（interval 5000 + 6s 窗余量仅 1s，双 webServer/workers 2 下 flake 面偏大，与 D3 M1「只断首帧/钩子推进后断数据面」同族页面两套口径）；② 告警 ack：行点击→dialog→ack-btn→alarmAck 计数+1+status mapping 变化；③ 错误分支：`forceAlarmAckError`→toast；④ 查询：换 deviceKey→telemetryQuery 计数+1+tile 更新。
- focus：查询表单首字段 tab 首站；告警 dialog 焦点落入+Esc 返回。

**V2 iot-ota-rollout**（axe 分支 A）

- 交互：① 向导推进：未选设备 next 被拦→选 3 台→assignBatched payload batches 断言；② steps 八态：`setAssignmentStatus('DEV-1','FAILED')`→当前项 error 分叉（value=FAILED）；③ 回滚确认：空原因拦→填原因→rollbackPackage 计数+1+ROLLED_BACK alert；④ 矩阵 mapping 状态文本（UPDATED/FAILED）；⑤ 门控：activateNextBatch 返回 GATE_NOT_PASSED→呈现 gate 数据且不推进。
- focus：wizard 步进按钮 tab 可达；回滚 dialog 焦点落入+Esc 返回。

**V3 iot-geofence-videowall**（axe 分支 C：先纳入实测→>30s 切排除→排除≠功能验收排除，§3.4）

- 交互：① pin 点击联动：pin feature click→checkFence 计数+1+事件列表按 deviceKey 过滤/详情更新；② 视频墙存在性：video-grid 内 `<video>` 计数=4+src 含 `/repl-assets/sample-clip-`+无 iframe 元素断言；③ 事件轮询增量：`appendFenceEvent`→下一轮询行数+1+timeline 增长；④ 围栏回显：map geojson 图层 feature 计数=fenceGeojson features 数。
- 义务：axe 耗时证据与决定记入 M3 验收计划（§3.4）。
- focus：map 画布容器 tab 可达抽样；video controls focus 1 条；通道 drawer 焦点落 tree 首项+Esc 返回。

## 6. 临时形态标注（实现边界）

### 6.1 O1 doc-ocr-workbench（R4 §1 L36 / D1 §1 #17）

| 项                  | 做什么（验收内）                                                                                     | 不做什么                                                              | 裁决出处                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| bbox overlay（G19） | 整图对照近似：image(preview)+image-compare(before/after 滑块)；mock 识别参考整图承载"识别区域"信息   | bbox 高亮框/zoom/字段→图上区域联动（字段联动仅 labelRemark 行内原值） | R4 §2 L66 demand-gated；R3 §3 L67；D1 §1 #17"bbox overlay（G19）不实现" |
| 字段确认门禁（G20） | detail-view 草稿+逐字段提交+再校验承担字段级门禁；wizard 承担 step 级推进（beforeLeave→ocrValidate） | 不自研字段粒度门禁编排组件                                            | R4 §2 L67"无需登记——detail-view 已具备"；R3 §3 L68                      |
| 低置信高亮          | inputClassName 条件类+页面级 CSS 变量（可断言）                                                      | 置信度热力图/阈值策略配置界面                                         | R3 §1 L22（labelRemark/inputClassName）                                 |

### 6.2 V3 iot-geofence-videowall（R4 §1 L40 / D1 §1 #21）

| 项              | 做什么（验收内）                                                                                             | 不做什么                                                         | 裁决出处                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 围栏绘制（G24） | 围栏回显：geojsonSource 消费 mock 预生成圆形 GeoJSON（非交互）；checkFence 判定展示（inside/distanceMeters） | 多边形/圆形绘制、draw/modify 顶点编辑、围栏叠加编辑              | R4 §2 L71 improvement map 族候选；R3 §3 L72；上游 WI38 多边形亦缺（R3 L55，demand 双侧印证）           |
| 轨迹回放（G25） | 不做（事件列表+timeline 呈现历史事件序列，不冒充轨迹）                                                       | line/track 轨迹线、时间动画                                      | R4 §2 L72 demand-gated；R3 §3 L73；D1 §1 #21                                                           |
| 流媒体（G26）   | video mp4 本地样例流+grid/card 阵列+通道树 drawer（点播控制仅 UI 摆放，无流交互验收）                        | iframe renderer（keep-out）、HLS/FLV/RTSP/GB28181、真实起流/停流 | R4 §2 L73+§3 结论 2（L183 keep-out；播放器半条 demand-gated）；R3 §3 L74；R3 L58（video 纯 HTML5 mp4） |

**收窄显式裁决**：R4 §1 L40"绘制/轨迹/流媒体不做交互验收——该收窄须在 D4 设计与 M3 验收计划显式裁决，不接受静默收窄（开放审计 Minor ④）"。本节即 D4 侧落位；配套义务：roadmap §2 M3 表 V3 行说明列加注本裁决引用（R6 Minor-4 双路径）；M3 验收计划引用 §3.4+本表。红线同 D1 §4：禁止删功能后宣称全绿。

## 附录 A. flux type 名 live 核对表（全量，2026-10-30）

| 包                           | 本设计引用 type（live 出处）                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| mobile                       | pull-refresh/infinite-scroll/countdown（schemas.ts L82 targetTime、L90 onFinish——L44 finishedText 属 InfiniteScrollSchema，closure audit 勘误）/floating-panel（L203 anchors）/picker-view/wheel-cascader/image-viewer/swipe-cell/notice-bar                                                                                                                                                                   |
| content                      | carousel（L614 items/onChange）/image（L232 preview）/image-compare（L205 before/after/defaultPosition/orientation）/card（L158）/cards（L297）/progress（L95）/qrcode（L653 value/size/level）/status（L495）/mapping（L445）/alert（L381 level: info\|success\|warning\|error）/json-view（L261）/video（L596 src/poster/controls/muted/loop）                                                               |
| data                         | crud（CrudSelectionConfig L172 keepOnPageChange；onRowClick L297；$crud.selectionCount crud-renderer.tsx L216/L225）/table/batch-bar（countTemplate batch-bar.tsx L99）/stat-tile/sparkline/echarts（9 事件 onClick/onDblClick/onMouseOver/onMouseOut/onMouseDown/onMouseUp/onContextMenu/onDataZoom/onLegendSelectChanged，echarts-renderer-definition.ts L23-71）/tree/query-filter/data-source/list/mapping |
| pivot                        | pivot-table（schemas.ts L62 totals/L75 rowDimensions/L76 columnDimensions/L77 indicators；`pivot:cell-click` pivot-events.ts L11）                                                                                                                                                                                                                                                                             |
| layout                       | wizard（steps/formId/beforeEnter/beforeLeave/statusPath/linear/onStepCommit/onStepError，schemas.ts L13-71——D5 深审勘误 MIN-5：原引 L29-70，实为 WizardStepSchema L13-33 + WizardSchema L36-71）/steps（items value/title/status wait\|process\|finish\|error，L280-317）/timeline（items value/time/title/detail/icon/level，L326-360）/grid（items colSpan/columns）/page/button-group（selectionMode）      |
| basic                        | badge/tabs/dialog/drawer/text/flex/container                                                                                                                                                                                                                                                                                                                                                                   |
| form                         | input-number/input-text/textarea/select/button-group-select/date-range/user-select                                                                                                                                                                                                                                                                                                                             |
| form-advanced                | detail-view（detail-view/ 目录 detail-draft-controller.ts 草稿+再校验）/input-table/input-file/input-image/combo/picker                                                                                                                                                                                                                                                                                        |
| map                          | map（唯一 type：mapType pin\|region、basemap、regionData、geojsonName、geojsonSource、pinData、cluster、visualMap、center、zoom、height、loading；onClick→payload map:feature-click，definitions L80-249）                                                                                                                                                                                                     |
| ai                           | ai-tool-call（renderers/ai-tool-call.tsx L24-41 state.approval pending→onApproval approve\|reject、data-requires-approval）/ai-suggestions/ai-bubble                                                                                                                                                                                                                                                           |
| flux-core schema             | testid（L90）/labelRemark（L154）/inputClassName（L158）/interval、stopWhen（L305-306）                                                                                                                                                                                                                                                                                                                        |
| action 词汇（flux-guide/04） | ajax/showToast/download/copy/print/closeSurface/refreshNearest/refreshSource/navigate/openDialog/openDrawer                                                                                                                                                                                                                                                                                                    |

覆盖 EC"抽查 ≥8（含 map/video/image-compare/ai-tool-call 归属）"：map 包仅 `map` 一个 type（R3 §0 一致）；video/image-compare 归 content（R3 §0 一致）；ai-tool-call 归 ai 且 engine 不自改状态（R3 §0 一致）。
