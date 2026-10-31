# 812 M3-S1 商城商品 SKU 选择页复刻（business-page-replication roadmap M3-S1）

> Plan Status: completed
> Last Reviewed: 2026-10-31
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-S1（依赖 M2 done；前置 M3 done——mobile host override/翻页链/观察哨首载等 M3 先例直接复用）
> Related: D1 总体设计；D4 §2.1/§4.1/§5 S1（S1 页设计+端点+断言）；§3.3 G16 求交验证方案；R2 §3 S1；R4 §1 L34、§2 L62-63（G15/G16）；plan 811（M3 实现勘误 9 条——本计划起点基线）

## Purpose

落地 M3-S1「商城商品 SKU 选择页」：mobile 族 + content 族组合（pull-refresh/infinite-scroll 商品卡瀑布流 + carousel 画廊 + image-viewer 放大 + 秒杀 countdown/progress + 场次三态 + floating-panel SKU 面板 picker-view×2 规格求交 + 数量步进 + 吸底双按钮），mall mock 域新建（ReplMall 分支）+ G16 求交 vitest 单测 + focused e2e + axe 分支 B 登记。收口为 roadmap §2 S1 状态 `todo → planned → done`。

## Current Baseline

- 设施就绪：replication 六件套（含 811 新增 dragTouchReplication）、mobile host override 先例（W1/M3 两页）、axe 分支 B describe、`.repl-*` CSS 落点（replication.css）、M3 实现勘误 9 条（D3 §2.6 末）为本计划起点基线：onMount 非 page 合法属性（首载=观察哨初始回调）、面板/dialog 承载域 action args.data 模板不求值（includeScope '\*' 为已证提交链）、wheel-picker confirm 写值数组、viewer 受控点火+mask 聚焦关闭、formula 无 NOW()（expired/targetTime 用固定 epoch-ms fixture）、drag-click 抑制（M6a）需牺牲点击。
- D4 §2.1 S1 设计（D5 核对 + D6 MAJ-C mobile host override 裁决 + MAJ-10 勘误：DataSourceSchema 取数走 action+args）：pull-refresh→infinite-scroll 商品卡瀑布流/carousel 画廊+image-viewer/card 促销横幅（repl-price 大小字+countdown+progress）/场次三态/floating-panel SKU 面板（picker-view×2+input-number+求交结果）/grid 吸底双按钮（repl-sticky-footer）。
- D4 §4.1 mall 端点（**全新 ReplMall 域**——showcase-env 需新接线）：goodsDetail（goods+skuMatrix+promo，seckillEndAt epoch-ms）/flashSaleSession（三态 sessions+progressPercent）/goodsFeed（≥25 卡 ≥3 页）/addToCart（REPL_MALL_SOLD_OUT）/placeOrder（SOLD_OUT/LIMIT_EXCEEDED）/skuLocate（仅降级备胎，求交成功须计数 0）；钩子 forcePlaceOrderError(msg)/advanceFlashSaleClock(deltaMs)（传播路径：钩子后须 refreshSource goodsDetail 重求 ${promo.seckillEndAt}——D6 MIN-3）。
- live 能力盘点（2026-10-31 起草核对）：grid {items:[{body}],columns}（layout）；carousel {items:[{image,title,caption}],autoPlay,interval,onChange}（content）；progress {value,max,showValue}（content）；picker-view {columns:WheelPickerOption[][],value,onChange payload {column,index,value,label}}——**WheelPickerOption 无 disabled**（缺货置灰不可行，改求交结果缺货标识+吸底按钮 disabled 表达式，勘误预登记）；ARRAYFILTER/CONCAT 内建在、数组下标访问在（W1 `${...lines[0]}` 先例）→ G16 求交可纯表达式表达（§3.3 ③降级备胎不触发）。

## Goals

- mall mock 域新建（`mock-backend-repl-mall.ts` + showcase-env `createReplicaBranches` 接线）+ `page-schemas/mall-sku-picker.json` + mobile host override（registry 特例）+ entry + G16 求交 vitest 单测 + e2e `tests/e2e/replication-mall-sku-picker.spec.ts` + axe 分支 B 登记。
- e2e 断言按 D4 §5 S1 清单（①求交：选规格→价格/库存文本变化且 skuLocate=0；②步进超 purchaseLimit 拦截；③倒计时切态：advanceFlashSaleClock→onFinish→flashSaleSession 计数+1+场次态文本；④直购：buy-now→placeOrder+1，钩子强制 SOLD_OUT→错误 toast；⑤无限滚动 ≥2 页；focus：面板首控件/buy-now tab 可达/image-viewer Esc 关闭）+ G15 四项近似面（repl-price 大小字划线价、repl-sticky-footer、加购 toast+计数、场次分段）。

## Non-Goals

- 不实现 S2 及后续页；不做加购飞行动效（G15 裁决 showToast+计数过验收）；不做 skuLocate ajax 备胎实现（mock 端点在、计数断言 0 证前端求交，降级不触发）；不做地址簿选择（直购 payload 以 channel:'seckill'+收货城市字段承载）。

## Scope

### In Scope

- mall mock 域 + S1 页 schema + host override + entry + G16 求交单测 + e2e + axe 分支 B 登记；roadmap §2 S1 回写；D4 §2.1/§5 实现勘误就地落档。

### Out Of Scope

- 其余 7 页；商城渲染器族新 type（G15 缺口只按既定近似口径落地，retention 归 amis-baseline-matrix）；加购动效；skuLocate 降级实现。

## Failure Paths

| 编号            | 触发                          | 行为                                                                                        | 可重试 | 用户可见表现 |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------------------- | ------ | ------------ |
| e2e-fail        | focused e2e 失败              | 定位修复→重跑至绿（显式 --retries=0）；设计与 live 不符以 live 为准并勘误 D4                | 是     | e2e 全绿     |
| intersect-expr  | 求交表达式不可表达            | §3.3 ③降级 ajax skuLocate，决定记入本 plan Deferred + M3 验收计划，不静默                   | 是     | 求交面正常   |
| payload-literal | 页级表单 args.data 模板字面量 | 按 M3 勘误 2 已证口径改 includeScope '\*'（**本计划直接采用 includeScope 起步**，不走弯路） | 是     | 载荷解析     |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱），显式 `--retries=0` 全绿；G16 求交另加 vitest 确定性单测（§3.3 ①义务：3 规格列×缺货边界）。

## Execution Plan

### Phase 1 - S1 页全链实现

Status: completed
Targets: `mock-backend-repl-mall.ts`（新建）、`showcase-env.ts`（接线）、`replication/mall-sku-picker-host.tsx`（新建）、`complex-pages-registry.tsx`、`page-schemas/mall-sku-picker.json`、`complex-pages-entries.ts`、`__tests__/mall-sku-intersect.test.ts`、`tests/e2e/replication-mall-sku-picker.spec.ts`、axe spec MOBILE_ROUTES/JSON

- Item Types: `Fix | Proof`

- [x] mock 域新建：`mock-backend-repl-mall.ts`（`createReplMallFetcherBranches()`——对齐既有五域复数命名，端点逐名对齐 D4 §4.1）——`goodsDetail`（get，确定性 goods{title/images:[{image:url}×4]〔CarouselItemSchema 形状——string[] 会静默空帧〕/price/seckillPrice/stock/purchaseLimit}+skuMatrix 3 色×3 码含 1 缺货行+promo{seckillEndAt 固定未来 epoch-ms 闭包基线}）/`flashSaleSession`（3 sessions ended|active|upcoming+progressPercent，seckillEndAt 基线可被钩子推进）/`goodsFeed`（27 卡 ≥3 页 page/pageSize）/`addToCart`（post，缺货 SKU→REPL_MALL_SOLD_OUT；正常→cartItemId+session 扣减）/`placeOrder`（post，SOLD_OUT/LIMIT_EXCEEDED 分支+钩子 forcePlaceOrderError(msg)/`skuLocate`（post 计数面）；钩子 advanceFlashSaleClock(deltaMs)+forcePlaceOrderError(msg)+写镜像 lastAddToCartBody/lastPlaceOrderBody；showcase-env `createReplicaBranches` 接线（`/r/ReplMall__` 前缀）
- [x] mobile host override：`replication/mall-sku-picker-host.tsx`（W1/M3 同构 + data 种子 selectedColor/selectedSize/quantity/panelAnchor/viewerOpen/viewerIndex/activeSession + goodsFeed 翻页累加器四 face（goodsFeedItems/goodsFeedPage/goodsFeedHasMore/goodsFeedLoading——M3 勘误 3 首载链前提））+ registry 特例 + entry
- [x] G16 求交单测：`__tests__/mall-sku-intersect.test.ts`——机制：测试 import `mall-sku-picker.json` walk 提取求交表达式串（sundial-v12f-p4-schema-dataflow.test.ts walk 先例），flux-formula 对 fixture skuMatrix（〔§3.3 ①『3 规格列』按 D4 §2.1 两列（颜色/尺寸）×各 3 值落实，含 1 缺货行〕）求值与 schema 同文的交集表达式（ARRAYFILTER+下标取 sku），断言：满配唯一命中/缺货组合命中行 stock=0/未选全边界；§3.3 ①义务
- [x] schema JSON（D4 §2.1 组件树 + 实现勘误就地落档〔执行期新增勘误面见 D4 §2.1 末补记：cards 卡区域 $slot.item 约定 / picker-view columns 静态域值（箭头体对象字面量不可达）/refreshSource targetId 顶层键（D5 勘误同款）/countdown 基线=now+1h+sessionStorage 累积时钟偏移（模块闭包跨 reload 复位）/image-viewer images 需 ARRAYMAP 投影字符串 /includeScope 载荷含 data-source 名值（域值全量入体，mock 择字段消费）〕——**预登记**：WheelPickerOption 无 disabled→缺货项不可禁选，改求交结果区缺货标识文本（stock≤0 条件 className）+吸底按钮 disabled 表达式；页面整体 W1 式 form 包裹（pull-refresh 外层），吸底 ajax 用 `includeScope: '*'`——载荷契约：includeScope 取**页级 form scope 的表单值集合**（form.tsx ScopeContext.Provider + form-runtime readOwn；M3 勘误 2 证明的是 form submitAction 链，本处为同机制在裸 button onClick 的复用）——root 种子（goods/viewerOpen 等 face）不入载荷；进载荷键（skuId/quantity/channel/城市等）一律经 setValues/表单字段落页 form scope；mock 容忍全部表单值入体的多余键，e2e 镜像逐字段断言（M3 交互⑨ 同口径）；首载=观察哨初始回调+immediateCheck:false+`.repl-mall-scroll` 滚动容器；countdown targetTime 固定 epoch-ms+onFinish→ajax flashSaleSession 计数+refreshSource goodsDetail；场次三态=form 包 button-group-select 三值〔进行中/即将开始/已结束〕驱动横幅文案；carousel items 绑 goods.images（CarouselItemSchema 形状）+onChange 计数、查看图片按钮点火 image-viewer〔M3 勘误 4 同款〕；card/cards 商品卡瀑布流 cards 内 tpl 价格；grid repl-sticky-footer 双按钮〔加入购物车/立即抢购，disabled 表达式〕+repl-price 大小字划线价 CSS；testid `<pageId>-<element>`；strict 零 error）
- [x] e2e spec（D4 §5 S1 清单：前置〔canvas 375×667+画廊〔carousel-item img 计数=4 硬断言〕+促销横幅+商品卡首屏+goodsDetail/goodsFeed/flashSaleSession 计数〕/交互① 求交：面板 picker-view 选色选码→价格/库存文本变化+缺货组合缺货标识+`skuLocate`=0/交互② 步进超 purchaseLimit 拦截（钳制到 max）/交互③ advanceFlashSaleClock+refreshSource→countdown onFinish→flashSaleSession 计数+1+场次态文本/交互④ 加购→addToCart 计数+1+toast+镜像逐字段（skuId/quantity/channel 显式列断言+容忍多余表单键）；缺货 SKU→SOLD_OUT toast/交互⑤ 直购 buy-now→placeOrder 计数+1+镜像逐字段（同④口径）；钩子强制 SOLD_OUT→错误 toast/交互⑥ 无限滚动商品卡 ≥2 页/交互⑦ carousel onChange 计数+查看图片 viewer 点火+mask 聚焦 Esc 关/交互⑧ 场次三态切换→横幅文案跟随/focus ① 面板展开焦点入面板首控件（D2 勘误 7 口径）/focus ② buy-now tab 可达/focus ③ image-viewer Esc 关闭；显式 --retries=0）
- [x] axe 分支 B 登记：MOBILE_ROUTES + `complex-pages/mall-sku-picker` JSON 键（首跑实测回填+\_notes）
- [x] 验证：focused e2e `--retries=0` 全绿 + axe spec 绿 + W1/M3 回归 + playground unit（含求交单测）+ strict 校验——focused 12/12 + axe 22/22（21 桌面+1 新增移动面）+ 四页回归 47/47（M1 8+M2 12+M3 14+W1 13）+ playground unit 561/561（含 G16 求交 5 用例）+ strict 59/59 + typecheck/build/lint/check 全仓 exit 0（test 触达面零新增红：layout ELOOP 在案既有红）

Exit Criteria:

- [x] S1 页 mobile canvas 可达可交互且列表页收录，strict validation 零 error
- [x] focused e2e `--retries=0` 全绿（求交 skuLocate=0 断言在；\_\_replMallCalls 计数证据在）
- [x] G16 求交 vitest 单测绿（§3.3 ①义务闭环）
- [x] axe 分支 B 基线登记绿
- [x] roadmap §2 S1 置 `planned`（转 active 提交已兑现）

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（general-purpose，2026-10-31）
- Verdict: pass（round-2；round-1 fail 1 Major + 6 Minor 全部修复并经复核）
- Rounds: 2
- Findings addressed: Major-1〔includeScope 载荷契约写实——页级 form scope 表单值集合/form.tsx ScopeContext+readOwn 机制链；M3 勘误 2 引用改准为 form submitAction 链的机制复用；e2e ④⑤ 镜像逐字段硬断言〕；Minor-1〔images fixture CarouselItemSchema 形状+画廊 img 计数硬断言〕、Minor-2〔§3.3『3 规格列』按 D4 §2.1 两列×各 3 值澄清〕、Minor-3〔roadmap planned 中间态归 Phase EC，done 归 Closure Gates〕、Minor-4〔G16 单测机制=import JSON walk 提取表达式+sundial 先例〕、Minor-5〔createReplMallFetcherBranches 复数命名〕、Minor-6〔goodsFeed 累加器四 face 显式列出〕

## Closure Gates

- [x] in-scope 工作全部落地（S1 页 + mall mock 域 + G16 单测 + roadmap 回写）
- [x] 行为/契约结果已达成（D4 §5 S1 断言清单全绿，--retries=0：focused 12/12）
- [x] 必要 focused verification 已完成（G16 求交单测 5/5 在；axe 22/22；四页回归 47/47）
- [x] 不存在被静默降级的 in-scope 缺口（G15 近似归 missing-components 线、B7 既有登记；D4 §2.1 勘误 8 条在案，§5 各断言面 live 均有对应断言）
- [x] 受影响 owner docs 已同步（daily log；D4 §2.1 末 S1 实现勘误 8 条）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`（触达面零新增红口径；新增测试 unused-var 已修）
- [x] `pnpm test`（触达面零新增红口径；flux-renderers-layout ELOOP 系 807 Deferred 在案既有环境红，diff 零 packages/ 改动）
- [x] `pnpm check`（触达面零新增红口径；exit 0）

## Deferred But Adjudicated

### （继承）check/lint 链状态

- Classification: `watch-only residual`（layout contract-honesty 加载失败——807 Deferred HEAD 既有红环境级 ELOOP，与本计划触达面零交集）
- Why Not Blocking: 不适用（现无已知红；收口实跑零新增口径维持）
- Successor Required: `no`
- Successor Path: 不适用（并行会话后续 WIP 引入新红归其自有义务）

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段
- G15 四项近似（价格文本/吸底栏/加购动效/场次分段）为既定近似口径，真组件需求归 missing-components 登记线（本计划不扩约）

## Closure

Status Note: S1 页全链收口（2026-10-31）——mall mock 域新建（ReplMall 分支五端点+时钟推进 sessionStorage 偏移+三写镜像）、mobile host override、schema（瀑布流翻页链/画廊 viewer/促销横幅三件套/场次三态/SKU 面板求交+缺货闸/吸底双按钮 includeScope）、entry、G16 求交单测 5/5（JSON walk+真实表达式求值）、focused e2e 12/12（--retries=0）、axe 分支 B 登记（22/22）、四页回归 47/47、playground unit 561/561、strict 59/59、typecheck/build/lint/check 全仓 exit 0。执行期适配以 D4 §2.1 末 S1 实现勘误 8 条在案（cards $slot.item/picker 列静态域值/refreshSource 顶层 targetId/sessionStorage 时钟/images 投影/includeScope 全量载荷/面板手势仲裁/axe 基线）。closure audit 独立 fresh sub-agent approved（4 条 informational，零阻塞）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（general-purpose，2026-10-31，不复用执行者上下文）
- Evidence: audit 报告 Verdict: approved——独立实跑 focused e2e 12/12、axe 22/22、M1/M2/M3/W1 回归 47/47、playground vitest 561/561、typecheck/build/lint/check exit 0；逐面核对（求交全脸+skuLocate=0/钳制/时钟 sessionStorage 链/镜像逐字段/翻页 9→18/viewer 投影/场次/focus ①②③）；勘误逐条对源（cards-renderer.tsx:121/WheelPickerOption 无 disabled/built-in-actions refreshSource targetId/CarouselItemSchema 形状/Progress 无可访问名 prop）；git status 13 文件零 packages/ 改动

Follow-up:

- 全量 test:e2e 归 P1 阶段（Non-Blocking Follow-ups 既有项）
- G15 四项近似 → missing-components 登记线（既有归属）；B7 行级路径绑定 → 既有登记
- content Progress 可访问名 prop 缺失（axe aria-progressbar-name）→ 组件 owner 债务（既有登记族）
