# U1 mobile 族三页走查报告（plan 846 Phase 1-2）

> Created: 2026-11-04。方法：visual-page-quality-inspection-prompt 三步法（自由 critique → A-H grounding → 程序化取证）+ baseline §3 对标卡；环境：dev server（strict 校验）+ IAB 浏览器 1280×1080（spec 同款）+ 375×667 画布剪裁取证；e2e 反向验证（git stash 旧树对照）用于失败归因。
> 证据：走查截图为评审证据（IAB 会话内，不入库）；全部 pass/fail 判据程序化（getComputedStyle/locator/elementsFromPoint/焦点几何）。

## S1 `mall-sku-picker`（对标 baseline §3.1 G1-G8）

| #      | 发现                                                                                                                                                                                                                                     | 级别          | 根因取证                                                                                                                        | 处置                                                                                                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-S1-1 | 画廊/商品图为纯色占位大色块（roadmap §2 预警正式取证：内联 SVG `rect fill=#6366f1` + "G41" 字样，carousel 主图 343×343 全幅紫块）                                                                                                        | Major         | `mock-backend-repl-mall.ts mallSkuImage()`                                                                                      | ✅ 修：种子驱动双色渐变 + 器形剪影 + 小字标的 480×480 商品感占位 SVG                                                                                                         |
| F-S1-2 | 底部布局结构破损：浏览区压在 320px 定高条内（`.repl-mall-scroll{height:320px}`），shell 高度链断裂（shell 实测 3930px），sticky footer 锚到 canvas 而非画布底，与 fixed 面板叠压——与上游"全屏滚动 + 吸底操作栏"形态结构性代差（G5/C 维） | Major         | 父链（nop-page→wrapper→nop-form→wrapper）均为 auto 高，`height:100%` 不生效；`.repl-sticky-footer` sticky 的滚动上下文是 canvas | ✅ 修：`.repl-*-shell{height:100%}` + screen→shell 包装链全链 `height:100%;min-height:0` + scroller `flex:1 1 auto` + panel `bottom:64px` lift（footer 恒可达，G5 判据达标） |
| F-S1-3 | floating-panel 背景透明（列表透显成"重影"）                                                                                                                                                                                              | Major         | 渲染器 inline `background: var(--nop-floating-panel-bg)` 无 fallback；playground 未定义该变量                                   | ✅ 页面级修：canvas screen 定义 `--nop-floating-panel-bg: hsl(var(--card))`（浅/深双套）；渲染器侧 fallback 登记 improvement-analysis（2026-11-04）                          |
| F-S1-4 | 价格色 `#e11d48`、促销横幅粉底、双钮 outline/primary 默认形态——与上游令牌（price `#ff5000`、秒杀红橙渐变、加购橙/购买品牌渐变胶囊 40px）代差（B/D 维）                                                                                   | Major         | replication.css 旧值 + schema 无形态类                                                                                          | ✅ 修：`--repl-mall-*` 令牌（浅/深双套）+ banner 秒杀渐变白字 + `.repl-mall-btn-cart/-buy` 渐变胶囊                                                                          |
| F-S1-5 | 系统级：playground 令牌为裸 HSL 分量（`--card: 0 0% 100%`），`var(--card)` 直作颜色 invalid-at-computed-value-time → 透明（含既有 `.repl-sticky-footer`/`.repl-goods-card` 背景一直在裸奔）                                              | Major（横切） | styles.css L72-80 令牌定义                                                                                                      | ✅ 修：replication.css 全量改 `hsl(var(--token, fallback))` 形态；U6 归族待复核项登记                                                                                        |
| F-S1-6 | 场次 button-group-select 在渐变底上的胶囊形态                                                                                                                                                                                            | Minor         | —                                                                                                                               | 当场接受（深色下三态清晰、对比达标；不再加复杂度）                                                                                                                           |

评分卡终态（A 交互 e2e 全绿硬门 / B 颜色：品牌令牌对齐 ✓ / C 布局：全屏滚动+吸底栏 ✓ / D 间隔：上游节奏（区块 12px/行距 8-10px）✓ / E 排布：banner→画廊→信息→面板→吸底栏动线 ✓ / F 一致性：豁免条款（复刻对标） / G 不适用 / H 弹层：面板 lift 不遮 footer ✓）。**达标。**

## M3 `mes-andon-material`（baseline §3.3 五轴）

| #      | 发现                                                                                 | 级别              | 取证                                                        | 处置                                                                                                                                                                                                         |
| ------ | ------------------------------------------------------------------------------------ | ----------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F-M3-1 | 列表压在 300px 定高条（`.repl-andon-scroll{height:300px}`），下部空白 + 面板透明叠压 | Major             | 同 F-S1-2/3 根因                                            | ✅ 修：shell/scroller flex 化（scroller 实测 594px）+ 面板白底 + 列表可达性 `padding-bottom:224px`                                                                                                           |
| F-M3-2 | 任务行无卡面（纯文本行贴灰底，行间无分隔）——列表密度轴不达上游基线                   | Major             | `.repl-record-row` 类在 schema 中引用但 CSS 从未定义        | ✅ 修：定义 `.repl-record-row` 白卡+边框+圆角+内距（M3/W1 共用）                                                                                                                                             |
| F-M3-3 | 超时行红色 ✓、countdown 文本形态 ✓（01:18:17 内响应 / 00:00:00 红色）——原实现保留    | —                 | 走查取证                                                    | 无需修                                                                                                                                                                                                       |
| F-M3-4 | e2e 交互④ 手势被面板覆盖区拦截（#5 行 scrollIntoViewIfNeeded 后位于 fixed 面板之下） | Major（断言裁决） | e2e 反向验证：旧树过、新树挂；1280 视口复刻探针定位面板拦截 | ✅ 裁决：行选择 #5→#2（首屏即在面板上方，同一 swipe-cell 关闭交互面，断言语义不变——§test 文件内裁决注）；页面侧补 padding-bottom 可达性惯例。否决 scrollBy 方案（触发 infinite-scroll 翻页污染刷新计数断言） |

评分卡终态：A 交互（13+1 调整后 e2e 全绿）/ B 颜色（中性面+语义红 ✓，工业页不用品牌红 per §2.3）/ C 布局（notice-bar→全高列表→常驻面板 ✓）/ D 间隔（卡面 8-10px 行距 ✓）/ E 排布 ✓ / H 面板白底 ✓。**达标。**

## W1 `wms-pda-receiving`（baseline §3.2 五轴）

| #      | 发现                                                                                                           | 级别  | 取证                                                            | 处置                                                                                                                                       |
| ------ | -------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| F-W1-1 | 作业记录行无卡面（同 F-M3-2 共用根因）                                                                         | Major | 同上                                                            | ✅ 修（共用 `.repl-record-row`）                                                                                                           |
| F-W1-2 | 表单面为桌面形态（全宽 input/select、桌面 spinner）但高度/圆角可接受，功能面完整（扫码链/键盘录入/提交链齐全） | Minor | 走查取证                                                        | 登记 residual（Why Not Blocking：工业 PDA 表单非消费级观感诉求，信息密度/可操作性达标；触控目标 ≥24px 底线全过；深度重塑属 U6 表单族议题） |
| F-W1-3 | 页面无自绘导航头（画布顶直接进表单）                                                                           | Minor | 上游 PDA 型页无强导航需求；三页中 S1/M3 亦无 navbar（画布即页） | 登记 residual（同上归 U6 页面框架族）                                                                                                      |

评分卡终态：A 交互（13/13 e2e 全绿，含 swipe/pull/putaway/error 分支）/ B 颜色（白卡+语义蓝按钮 ✓）/ C 布局（表单→按钮行→记录列表 ✓）/ D 间隔（卡面行距 ✓）/ E 排布（作业动线自上而下 ✓）。**达标（两 Minor residual 登记）。**

## 残留与归族

- floating-panel 渲染器侧 fallback → 已登记 improvement-analysis（2026-11-04）。
- playground 裸 HSL 令牌陷阱的全量复核 → U6 归族。
- W1 表单深度重塑 / 页面导航头 → residual（U6 页面框架族议题）。
- `.repl-mall-*` 令牌已按 §2.3 裁决以变量形态落在 replication.css，U6 收敛其余直值。
