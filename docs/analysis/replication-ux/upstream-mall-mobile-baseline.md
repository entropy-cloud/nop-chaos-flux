# 上游商城移动端基准卡（Replication UX Fidelity U0）

> Created: 2026-11-04（plan 845，roadmap work item U0）
> Status: active 基准——U1-U7 执行的样式/交互对标权威；发现与本文冲突时以本文勘误流程更新（就地附注，不改写历史）
> 上游素材源（只读，不改上游仓）：
>
> - flux.yaml 页面：`~/app/nop-app-mall-wt/nop-app-mall-master/app-mall-web/src/main/resources/_vfs/app/mall/mobile/`（12 页）
> - v1 `mall-*` CSS 实测值：`~/app/nop-app-mall-wt/.../app-mall-mobile-web/.../mobile/assets/host-app-state-*.css`（构建产物）
> - v2 `mallv2-*`/`--mall-*` 设计层：`~/app/nop-chaos-next-wt/nop-chaos-next-master/apps/main/src/styles/index.css`（L992 起，dark 覆写 L1045 起；TSX 基准注明 `apps/mall-mobile src/styles/tokens.css @ dc4d8bf97^`）
> - TSX 对照实现：flux 仓 git 历史 `dc4d8bf97^`（apps/mall-mobile 89 文件，2026-10-30 退役）
>   审计对象（下游）：`apps/playground/src/complex-pages/` 二十一页复刻页（W1-V3，business-page-replication 1.0 交付）。

---

## 1. 21 页程序化枚举清单（U7 对账权威）

构成勘误（plan 845 审查 F-1）：21 页 = schema JSON 17 页 + host override 4 页（K1 亦为 host override；mobile host 3 页：W1/M3/S1）。

| 代码 | 页面 schema/host                                                        | 族      | 域批 |
| ---- | ----------------------------------------------------------------------- | ------- | ---- |
| W1   | `wms-pda-receiving`（host: `replication/wms-pda-receiving-host.tsx`）   | mobile  | U1   |
| W2   | `wms-wave-picking`                                                      | desktop | U2   |
| W3   | `wms-stock-ledger`                                                      | desktop | U2   |
| C1   | `crm-opportunity-kanban`                                                | desktop | U2   |
| C2   | `crm-customer-360`                                                      | desktop | U2   |
| C3   | `crm-sales-dashboard`                                                   | desktop | U2   |
| I1   | `itam-asset-inventory`                                                  | desktop | U3   |
| I2   | `itam-depreciation-dashboard`                                           | desktop | U3   |
| K1   | `ai-knowledge-chat`（host: `replication/ai-knowledge-chat-host.tsx`）   | desktop | U3   |
| K2   | `ai-ticket-console`                                                     | desktop | U3   |
| K3   | `ai-approval-trail`                                                     | desktop | U3   |
| M1   | `mes-shopfloor-board`                                                   | desktop | U4   |
| M2   | `mes-work-reporting`                                                    | desktop | U4   |
| M3   | `mes-andon-material`（host: `replication/mes-andon-material-host.tsx`） | mobile  | U1   |
| S1   | `mall-sku-picker`（host: `replication/mall-sku-picker-host.tsx`）       | mobile  | U1   |
| S2   | `mall-distribution`                                                     | desktop | U4   |
| O1   | `doc-ocr-workbench`                                                     | desktop | U4   |
| O2   | `doc-hitl-inbox`                                                        | desktop | U4   |
| V1   | `iot-telemetry-device`                                                  | desktop | U5   |
| V2   | `iot-ota-rollout`                                                       | desktop | U5   |
| V3   | `iot-geofence-videowall`                                                | desktop | U5   |

页面级 CSS 落点：`apps/playground/src/complex-pages/shared/replication.css`（repl-\* 类）。

## 2. 商城品牌设计令牌表（对标权威）

### 2.1 V2 `--mall-*` 令牌（next 壳 `index.css` L1004-1061）

| 类别     | 令牌                                                | Light                                                          | Dark                                  |
| -------- | --------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------- |
| 品牌主色 | `--mall-primary`                                    | `#e02e24`                                                      | `#ff5a4e`                             |
|          | `--mall-primary-strong`                             | `#c31f16`                                                      | `#e02e24`                             |
|          | `--mall-primary-soft`                               | `#fdeceb`                                                      | `#3a1a18`                             |
|          | `--mall-gradient`                                   | `linear-gradient(135deg,#ff6034 0%,#ee0a24 100%)`              | 同                                    |
| 语义色   | `--mall-price`                                      | `#ff5000`                                                      | `#ff7a45`                             |
|          | `--mall-promo`                                      | `#ff2c50`                                                      | `#ff5a75`                             |
|          | `--mall-success`                                    | `#07c160`                                                      | —                                     |
|          | `--mall-gold`                                       | `#ffe9b8`                                                      | —                                     |
| 中性面   | `--mall-bg` / `--mall-surface` / `--mall-surface-2` | `#f4f5f7` / `#ffffff` / `#f7f8fa`                              | `#111214` / `#1d1e22` / `#26282d`     |
|          | `--mall-border`                                     | `#f0f0f0`                                                      | `#303237`                             |
| 文字     | `--mall-text` / `-2` / `-3` / `-inverse`            | `#1a1a1a` / `#666666` / `#999999` / `#ffffff`                  | `#f0f1f3` / `#b0b3ba` / `#7d818a` / — |
| 字号     | xs/sm/md/lg/title/price                             | 11/12/14/16/17/20px                                            | 同                                    |
| 圆角     | sm/md/lg/pill                                       | 6/10/14/999px                                                  | —                                     |
| 阴影     | card / float                                        | `0 2px 8px rgba(0,0,0,.05)` / `0 6px 20px rgba(224,46,36,.28)` | `rgba(0,0,0,.4)` / `rgba(0,0,0,.5)`   |
| 布局     | `--mall-tabbar-height` / safe                       | 56px / `env(safe-area-inset-*)`                                | —                                     |

第三轮评审裁决：tab bar 与分类 rail 激活色统一为 `#ff5000`（TSX `--color-primary` 回退值，像素实测基准）。深色激活态用 `--mall-price`（`#ff7a45`）。

### 2.2 V1 页面类关键实测值（上游构建产物 CSS）

- 品牌渐变头/主按钮：`linear-gradient(135deg,#ff6034,#ee0a24)`；主红 `#ee0a24`；激活/价格橙 `#ff5000`；加购橙 `#ffa300`（V2 橙金渐变 `linear-gradient(90deg,#ffb03a,#ff7a2f)`）；警示橙 `#ff8a00`；白胶囊 `rgba(255,255,255,.96)`；金色 tag 底 `color-mix(in srgb,#d4a017 14%,transparent)` / 字 `#b8860b`；promo tag 底 `color-mix(#ee0a24 12%)` / 字 `#ee0a24`。
- 布局节奏：区块 margin 10px；卡内 padding 12px；gap 档位 2/4/6/8/10/12/16；`is-flush` 全出血。
- 圆角档位：999（胶囊/主钮/tag）>16（底部抽屉顶）>14（section 卡）>12（trigger/hero）>10（商品卡/图/input）>8（缩略图/step/option）。
- 字号：16/700 区块标题；15/600 品牌名；14/600 正文按钮；13 次要；12 tag/描述；11 promo-tag；价格 16/700 `#ff5000` 三段式（小¥+大整数+小小数，`size-sm` 整数 16px）；划线价 13 line-through；好评率数字 22/700 红。
- 触控目标：主按钮/input 高 40px；auth input 高 44px；搜索胶囊 36px；step ± 32×32（低于 WCAG 24px 底线之上但为上游既有形态——对标时保留，不判缺陷）；金刚区 item 高 56px；缩略图 56×56；rail item padding 14px×6px。
- 结构类：`.mall-section{margin:10px;padding:12px;border-radius:14px;background:var(--card)}`；`.mall-goods-card`（1:1 图+shadow+`:active scale(.98)`）；`.mall-goods-action-bar{position:sticky;bottom:0;padding:8px 10px calc(8px+safe);box-shadow:0 -4px 16px rgba(0,0,0,.06)}`；`.mall-sku-panel{fixed;bottom:0;border-radius:16px 16px 0 0;box-shadow:0 -4px 16px rgba(0,0,0,.12);animation:mall-slide-up .25s ease}` + `.mall-sku-mask{rgba(0,0,0,.45);animation:mall-fade-in .2s}`。

### 2.3 flux 侧移植裁决（U1-U5/U6 引用）

- **裁决：等价类移植**（不是逐字复制上游类名）。在 `replication.css` 新增/修订 `repl-*` 类承载上游令牌值（品牌渐变、价格三段式、吸底栏、卡片密度、圆角/间距档位），类名沿用 flux 侧既有 repl-_ 命名；CSS 变量层面新增 `--repl-mall-_`前缀令牌镜像 §2.1 表（浅/深双套，深色经`[data-mode='dark']` 或等价主题选择器）。
- `replication.css` 现存浅色硬编码（P2 MIN-5 在册）在本轮 U6 归族时一并收敛为变量引用；U1-U5 页内就地修复允许临时使用变量或直值，但直值须与 §2.1/§2.2 表一致。
- desktop 族（U2-U5）对齐口径：`replication.css` 既有 repl-\* 令牌基线 + §2.2 间距/圆角/字号档位通则（商城品牌色仅用于 S2 商城域页；其余域不强制品牌红）。
- 壳 chrome 差异豁免（登记在案，非缺陷）：上游底部 tab bar 由壳提供（`.nop-mobile-tabbar` 56px），flux playground 无 tab bar——mobile 族三页对标时不因缺 tab bar 判 Blocker；页内自绘导航/吸底栏形态仍须对齐。

## 3. mobile 族逐页对标卡

> 判据基线（roadmap §4.2 固化）：S1 与上游 goods-detail **逐页并排比对**（375×667 双栏截图 + 逐区块形态/间距/令牌），允许内容差异，不允许形态/层级/密度代差；W1/M3 为工业移动页，上游无对应页——对齐口径为**移动形态/组件级基准**（导航 / 吸底栏 / 触控目标 ≥44px〔上游 40px 钮为既有形态可保留〕 / 品牌令牌 / 列表密度五轴）。

### 3.1 S1 `mall-sku-picker` ↔ 上游 `goods-detail.flux.yaml`（529 行）逐区块对标

上游结构树（区块顺序）：自绘 `mall-navbar`（chevron-left 返回 + 动态标题居中加粗）→ 空态 `mall-empty-tip` → 沉浸画廊（主图 1:1 cover 点击开受控 image-viewer；自绘 dots 按 `activeImgIndex` 动态 `is-active` + `mall-gallery-index`"1/N"角标；缩略图行 56×56 横滑 4-setValue 同步）→ 价格信息卡 `mall-section`（三段式价格 + 划线价 when counterPrice；promo-tag 行：新品 gold / 热卖 promo / 常驻 soft"七天无理由退货"；名称 + brief + 库存语义行）→ SKU 触发行（已选/请选择规格 + ›）→ 评价摘要卡（好评率 22px 大字 + 星级 5→1 分布行）→ 富文本详情卡（`type: html`，prop `content`/`empty`）→ 吸底操作栏（收藏双态心形互斥 when + 加购橙钮 flex:1 + 立即购买渐变主钮，sticky bottom + safe-area）→ SKU 底部抽屉（mask 渐入 + 面板上滑动画；缩略图 64×64 + 名称 + 价；规格 option wrap gap:6，`is-active` = 红边 + 8% 红底；数量 stepper 下限 1 保护；确认钮 skuMode 动态文案）→ image-viewer（images/open/initialIndex/onClose 全受控）。

flux S1 现状锚点（`page-schemas/mall-sku-picker.json` + `replication/mall-sku-picker-host.tsx`）：pull-refresh + infinite-scroll 商品卡瀑布流 + carousel 画廊 + image-viewer 受控 + 促销横幅（repl-price + countdown + progress）+ 场次 button-group-select + floating-panel SKU 面板（picker-view×2 + ARRAYFILTER 前端求交 + 数量 purchaseLimit 钳制 + 缺货标识）+ grid repl-sticky-footer 吸底双按钮（addToCart / placeOrder）。

对标卡（U1 走查逐行核对；"判据"列为 A-H 评分 grounding 维度）：

| #   | 区块        | 上游形态                                                                                       | flux S1 现状锚点                                       | 对齐判据                                                                               |
| --- | ----------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| G1  | 画廊        | 1:1 主图 + 自绘 dots + 1/N 角标 + 缩略图行 + 点击开 viewer                                     | carousel 画廊 + onChange 计数 + image-viewer 受控      | C/E：主图 1:1 无拉伸、指示形态等价（dots 或 index 角标至少其一）、viewer 可开          |
| G2  | 价格        | 三段式 ¥+大整+小数 `#ff5000` + 划线价 13px line-through                                        | repl-price 大小字 + 划线价                             | B/D：三段式基线对齐、色值 `--repl-mall-price`、划线价存在且为 counterPrice>retail 语义 |
| G3  | 促销标签    | gold/promo/soft 三态 pill 11px                                                                 | 促销横幅（countdown 秒杀 + progress 抢购）             | B/C：标签形态（pill/圆角 999/11px）与色值对齐；横幅渐变底白字                          |
| G4  | SKU 面板    | 底部抽屉 fixed bottom + mask + slide-up 动画 + option 红边激活 + stepper                       | floating-panel 半屏 + picker-view×2 + number-keyboard  | C/H：面板吸底形态、遮罩、动画或等价过渡；激活态可见                                    |
| G5  | 吸底操作栏  | sticky bottom + safe-area + 加购橙 / 购买渐变双钮 40px                                         | grid repl-sticky-footer 双按钮                         | C/D：吸底不遮内容、双钮形态（橙/渐变区分）、高度 ≥40px                                 |
| G6  | 商品瀑布流  | （上游为详情页无瀑布；瀑布形态取自 home：双列 `calc(50%-4px)`、1:1 图、角标、两行截断、brief） | pull-refresh + infinite-scroll 27 卡瀑布               | C/D/E：双列、卡密度（图:文比例）、截断、角标                                           |
| G7  | 缺货/售罄态 | SKU option 缺货 disabled+"缺货"角标不隐藏；售罄双钮 disabled+确认钮"已售罄"文案                | 缺货标识 + SOLD_OUT/LIMIT_EXCEEDED 分支                | A：缺货可见不隐藏、按钮态文案正确                                                      |
| G8  | 交互正确性  | 求交全轴等值命中、反选支持、单 SKU 直确认、数量 min/max 钳制                                   | ARRAYFILTER 求交（skuLocate 计数）+ purchaseLimit 钳制 | A：focused e2e `--retries=0` 全绿为硬门                                                |

已知预警：S1 画廊占位色块（主审目检观察，roadmap §2；U1 走查正式取证——上游画廊为真实商品图，复刻页若为纯色占位须替换为有形素材或程序化渐变图，判 Major 直至修复）。

### 3.2 W1 `wms-pda-receiving` 移动形态组件级基准卡

五轴（上游形态基准 ← 跨页约定 §2.2/§4）：

| 轴       | 上游基准                                                                 | flux W1 现状锚点                     | 对齐判据                                                  |
| -------- | ------------------------------------------------------------------------ | ------------------------------------ | --------------------------------------------------------- |
| 导航     | 页内自绘 `mall-navbar`（返回 + 居中加粗标题）或沉浸式头                  | host override 画布头                 | C：头部形态完整（标题可见、层级清晰）、无桌面 chrome 残留 |
| 吸底栏   | sticky/fixed bottom + safe-area + 主操作钮 40px（goods-action-bar 形态） | 提交确认 dialog 链 + floating-bubble | C/D：主操作入口固定可及、不遮内容                         |
| 触控目标 | 主钮/input 40px、step 32×32、列表行 padding 10px                         | 扫码作业面控件                       | D：可点目标 ≥24px（WCAG 底线），行密度与上游列表相当      |
| 品牌令牌 | §2.1/§2.2 表（工业页可不用品牌红，但中性面/字号/圆角档位适用）           | repl-\* 类                           | B：无浅色硬编码残留（P2 MIN-5 族）、深色主题可渲染        |
| 列表密度 | 列表行 padding 10px、卡 gap 8-10px、次要文本 12-13px                     | infinite-scroll 作业记录 swipe-cell  | D/E：行高、间隔、次要文本层级                             |

交互组件口径（上游实证用法）：pull-refresh（四段文案 + onRefresh 多 refreshSource）、swipe-cell（direction:left + `right:` 删除钮）、countdown（epoch-ms + HH:mm:ss）、floating-bubble/action-sheet/floating-panel。W1 既有 e2e 载荷断言为硬门，视觉修复不得弱化。

### 3.3 M3 `mes-andon-material` 移动形态组件级基准卡

同 §3.2 五轴，现状锚点：notice-bar 播报 + pull-refresh + infinite-scroll + 任务卡 swipe-cell（催单/关闭）+ countdown 响应倒计时（onFinish 超时 toast + 行标红）+ floating-bubble action-sheet + floating-panel 半屏发起表单（wheel-picker + input-image + image-viewer + input-table + number-keyboard）+ submitAction andonCreate。

增补判据：倒计时超时态（行标红 + toast）属交互四态审计必过项（A 维）；floating-panel 两档 anchors 拖拽手感属 interaction-state-audit（交互前-中-后连续性）；列表密度取上游 cart-row 形态（flex gap 10、图 72×72、次要文本 12px）。

## 4. 上游 12 页简表与跨页约定（U1 补充基准）

| 页面                 | 主要区块                                                                                                                                                                                                                                       | 交互要点                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| home                 | pull-refresh → 渐变头（品牌条+搜索胶囊 36px）→ carousel（autoPlay 4000/loop/indicators）→ 金刚区 8 宫格（56px item 八色阶）→ 秒杀楼层（渐变底 + countdown + 104×104 横滑卡 + progress 伪进度）→ 专题横滑 150px 卡 → 双列瀑布 + infinite-scroll | 每楼层 loading/error/empty 三态壳（FloorState） |
| goods-detail         | §3.1 已展开                                                                                                                                                                                                                                    | SKU 求交/抽屉/viewer/收藏双态                   |
| cart                 | 顶栏（清空 confirm 链）→ swipe-cell 列表（图 72×72 + stepper）→ 吸底结算栏（合计 + 去结算双态）                                                                                                                                                | 右滑删除、数量防抖 500ms 失败回滚、空车置灰     |
| category             | 搜索胶囊条 → 双栏（rail 92px 左 3px 指示条 `#ff5000` + 内容两列卡）                                                                                                                                                                            | rail 点击 setValue + refreshSource              |
| search               | navbar + 灰底无框输入（wrap h40 r20 `#f2f3f5`）→ 历史/热门 tag 芯片（`#fff0e6`/`#ff5000`）→ 两列结果                                                                                                                                           | 历史会话内存数组、initFetch:false               |
| brand-list/detail    | navbar → 品牌卡（logo 64×64）→ hero 140px → 两列商品流                                                                                                                                                                                         | 纯浏览                                          |
| topic-detail         | navbar → hero 16:9 → html content                                                                                                                                                                                                              | —                                               |
| auth-forgot/register | navbar → auth form（input 44px、描边验证码钮）→ 渐变主钮                                                                                                                                                                                       | 无倒计时 disabled                               |
| checkout             | 占位页（"即将上线"+返回钮）                                                                                                                                                                                                                    | —                                               |
| profile              | 渐变用户卡（头像 52 圆形 25% 白底）→ 5 入口 is-disabled 灰置                                                                                                                                                                                   | —                                               |

跨页契约（上游实证，复刻页写 schema 时同口径）：loop 的 `empty` 必须为 schema 节点；html 组件 prop 为 `content`/`empty`；价格两位小数 `MOD(ROUND(price*100),100)` 补零；价格三段式结构（symbol/int/dec）；促销/金剛/秒杀等楼层统一 loading/error/empty 三态。

## 5. TSX 对照实现要点速查（交互/视觉细节权威）

来源：git `dc4d8bf97^:apps/mall-mobile`（sku-matrix.ts / gallery.tsx / seckill-countdown.tsx / price-text.tsx / QuantityStepper / SkuDrawer / cart 防抖）。

- **SKU 求交**（sku-matrix.ts）：从 product.specifications 解析轴值 → `axes[{id,name,values}]`；`resolveProduct` 全轴齐且逐位等值才命中；`optionHasStock` 该轴任一有货 SKU → 缺货选项 disabled + "缺货"角标（不隐藏）；反选支持；单 SKU 有货可直确认；命中售罄确认钮文案"已售罄"。
- **画廊**：translateX 横滑 + 水平手势判定（|dx|>10 且>|dy|，阈值 40px）+ 循环取模 + dots 可点 + 右上 1/N 角标 + 首图 eager 其余 lazy + 空态"无图"。
- **倒计时**：无后端时间时锚定下一个 2 小时会话边界（`Math.ceil((now+1)/2h)*2h`），秒级 interval，到点滚下一场；tick 盒 22×20 r4 黑底半透明金字 tabular-nums。
- **价格三段式**：¥0.6em + 整数 20px + 小数 0.7em baseline 对齐；划线价仅 counterPrice>retailPrice 时显示。
- **数量 stepper**：min=1/max=999；到 min 减号变 🗑 删除语义（Vant 风）；到 max disabled；购物车数量 500ms debounce + 失败回滚 + "值未变不发"。
- **吸底栏/抽屉**：sticky/fixed + env(safe-area-inset-bottom)；抽屉 mask 渐入 0.2s + 面板 slide-up 0.25s。
- **瀑布流**：双列 `column-count:2, break-inside:avoid`（v1 等价 `calc(50%-4px)`）；卡 `:active scale(.98)` 反馈。
- **秒杀进度**：伪进度 `92-((i*17)%55)`，条内"已抢 x%"（上游 flux.yaml 同款表达式——S1 现有实现同源）。
- **库存语义行**：后端返回 {level,label,color}，前端直渲；兜底充足=`#07c160` 青绿。
- **收藏心形**：双态互斥渲染（is-on 红填充）+ 静默 ajax + toast。

## 6. 审计方法定标（四 skill 分工表）

| Skill                                                   | 对象       | 复刻页族触发时机                                                                                                              | 产出                                     |
| ------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `visual-page-quality-inspection-prompt.md`（主方法）    | 渲染页面   | U1-U7 每页必跑：三步法（自由 critique → A-H 维度 grounding → 逐条程序化取证）+ 浅/深双主题 + 交互中间态；**禁止单轮看图打分** | A-H 评分卡 + findings 表（域-维度-序号） |
| `interaction-state-audit-prompt.md`                     | 交互过程态 | 每页 loading/error/empty/成功反馈四态 + 交互前-中-后连续性（拖拽/滑动/倒计时/弹层开合）                                       | 交互态取证表                             |
| `complex-component-display-operability-audit-prompt.md` | 组件级深挖 | 仅当页面走查发现组件级可疑（kanban 拖卡/pivot 钻取/scada 组态/wizard 步进等显示或可操作异常）时定点触发，不做全组件普查       | 组件级 findings                          |
| `ux-design-pattern-audit-prompt.md`                     | 源码模式   | 仅当修复批需新增 schema/样式且存在模式疑义（图标语义/按钮 variant/一致性）时定点触发                                          | 模式 findings                            |

评分卡判据基线：B3/D 维以 §2 令牌表为基准；复刻页对标第三方/上游的样式差异是复刻目标本身，除横切维度（B3 语义色、A2 focus、对比度）外不按本项目一致性判（走查 prompt 既有豁免条款同口径）；desktop 族以 `replication.css` repl-\* 令牌基线为基准（§2.3 裁决）。

## 7. U1-U5 分组拆分裁决与依赖图

- **裁决：确认 roadmap 既定分组**——U1（W1/M3/S1 mobile 三页，最重差距面先行）、U2（W2/W3/C1/C2/C3）、U3（I1/I2/K1/K2/K3）、U4（M1/M2/S2/O1/O2）、U5（V1/V2/V3）。U0→U1/U2-U5 两批可并行；U1 与 U2-U5 完成后汇入 U6 归族 → U7 复检 → U8/U9 审计。
- 每个工作项一个 execution plan（U1 起 plan 编号顺延）；任一 work item 执行中超一个 plan 容量按字母后缀滚动拆批（roadmap §8 预授权，R2 先例）。
- 依赖图见 roadmap §7（不重复绘制）；表 §1 域批列即本裁决的页级落点。

## 8. Failure Paths（本基准的仓外依赖降级）

上游 worktree（nop-app-mall-wt / nop-chaos-next-wt）或 git 历史 `dc4d8bf97^` 若后续不可达：本文档 §2-§5 已固化全部所需数值与结构基准，U1-U7 以本文档为唯一对标权威继续执行，不阻塞；如需复核上游原始文件而不可达，在 findings 中标注"来源降级：仅本文档"即可。
