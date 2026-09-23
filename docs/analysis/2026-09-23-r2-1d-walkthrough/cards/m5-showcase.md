# [card] page:m5-showcase

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/m5-showcase` ｜ **载体**: 域页面（M1–M5 全景 showcase：390×844 phone frame + 单 JSON schema 驱动 App，home/category/cart/profile 四 tab）
- **矩阵裁剪**: simplified+移动专项（裁掉 glass（本波统一）、拖拽中间态（swipe/pull 详测在 mobile-components 卡，本页仅 pull-refresh 抽查）、800 视口（<1000 行为与 375 同为横滚，已由 375 实证）。375 主分析 + 1280 逐帧 tab 走查）

## 1. 截图清单（状态矩阵）

| 状态                                | light                                                                          | dark                         |
| ----------------------------------- | ------------------------------------------------------------------------------ | ---------------------------- |
| 默认 375×812（整页横滚证据）        | `_tmp/visual-inspection-2026-09-23/r2-1d/m5-showcase/m5-default-375-light.png` | `…/m5-default-375-dark.png`  |
| 默认 1280×800（phone frame + 侧栏） | `…/m5-default-1280-light.png`                                                  | `…/m5-default-1280-dark.png` |
| home tab 底部（tabbar 实拍）        | `…/m5-frame-home-bottom-1280-light.png`                                        | —                            |
| cart tab 全貌                       | `…/m5-frame-cart-bottom-1280-light.png`                                        | —                            |
| category/profile tab                | `…/m5-tab-分类-1280-light.png` / `…/m5-tab-我的-1280-light.png`                | —                            |
| pull-refresh 拖拽中间态（home tab） | `…/m5-pullrefresh-mid-1280-light.png`                                          | —                            |
| hover/disabled                      | n/a                                                                            | —                            |

## 2. A–H 维度勾选表

- A 交互：A1 ✔ A2 ✔ A3 ✔（tabbar 64×56、CTA 86×28≥24、cart stepper/checkbox ≥24） A4 n/a A5 **fail(R2-1d-A5-02 族实例)**（tabbar home/grid icon 同 m3）＋ **fail(R2-1d-A5-03)**（scope-debug 调试面板） A6 n/a A7 n/a A8 warn(R2-1d-A8-01)（pull-refresh 仅手势） A9 ✔（tab 切换即时、加购反馈）
- B 颜色：B1 ✔（frame 内 bg-background 主题面正常；外壳 zinc-\* 见误报排除） B2 ✔ B3 ✔（价格红/促销徽标语义一致） B4 warn（外壳 zinc-950/900/800 字面色——判读见误报排除：有意 demo 舞台设计，watch 不立项） B5 ✔（dark 下 frame 内容平价，外壳恒黑为设计） B6 ✔
- C 布局：C1 **fail(R2-1d-C4-01)**（375 文档级横滚 562/375） C2 ✔（cart submit 条与固定 tabbar 无叠压：submit 条在文档流内、tabbar fixed 其下） C3 ✔（phone frame 主内容占比合理） C4 **fail(R2-1d-C4-01)** C5 ✔（frame 内滚动独立） C6 n/a
- D 间隔：D1–D8 ✔（商品行/购物车行距一致；侧栏卡片节奏统一）
- E 排布：E1 ✔（3 秒可答：电商 demo、加购主操作、首页态） E2 ✔（CTA variant 强于次级） E3 ✔（tabbar 四项动线常规） E4 ✔ E5 ✔ E6 n/a
- F 一致性：F1 ✔（tabbar 按钮规格与 m3 同构——含同一 icon 缺陷） F2–F4 ✔（frame 内术语/空态一致） F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-C4-01] showcase 外壳无窄视口折叠：375 视口整页横向溢出（562/375），手机框自身 390px 超出视口

- **页面/路由**: `#/m5-showcase`（外壳布局 `main > flex-1 flex items-start justify-center gap-8 p-6`）
- **主题/视口/状态**: light+dark / 375×812 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/m5-showcase/m5-default-375-light.png`
- **目视描述**: 375 视口下出现整页横向滚动，phone frame（390px 固定宽）与右侧说明面板并排溢出；页面以「移动端组件全景」为题却无法在移动视口内直接完整查看。
- **程序化证据**:
  - 探针: 文档级 overflow 扫描（`_tmp/r2-1d-probes/m5-out.json` / smoke-375-out.json）
  - 输出: `docOverflow: true, docSW: 562, docCW: 375`（溢出链 main → flex 容器，均 `overflow-x: visible`）；源码 `m5-mobile-showcase-demo.tsx` L29：flex 容器无 `flex-col lg:flex-row` 折叠断点，面板 `w-full lg:w-80` 仅在宽度档上响应、方向从不折叠。
- **对照基准**: 检查提示词 C1（无意外横滚）/C4（视口弹性）；本波「~375 视口排布」专项口径。
- **严重程度**: P2
- **用户影响**: 移动视口用户需横向滚动才能看到 frame 右半与说明面板；首屏观感「页面坏了一半」。
- **修复方向**: `m5-mobile-showcase-demo.tsx`：容器加 `flex-col items-center lg:flex-row lg:items-start`（面板移到 frame 下方）；frame 保持 390px 固定（舞台本体），375 视口下允许纵向滚动查看。
- **归族**: local → R2-4 批（playground 页面布局）
- **复核状态**: 未复核

### [R2-1d-A5-03] showcase App 首位渲染 scope-debug 调试面板

- **页面/路由**: `#/m5-showcase`（`schemas/m5-showcase-app.json` body[0]）
- **主题/视口/状态**: light / 1280 / 默认（frame 顶部）
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/m5-showcase/m5-default-1280-light.png`（phone 顶部「调试/作用域调试/展开以查看作用域。」）
- **目视描述**: 手机框内容最顶部是一个「调试作用域」面板（352×98，含展开按钮），把 tabs 导航与商品内容向下推。
- **程序化证据**:
  - 探针: schema 遍历 + DOM 测量（`_tmp/r2-1d-probes/m5-followup-out.json` debugPanel）
  - 输出: `body types: ['scope-debug','data-source'×5,'tabs']`；DOM `{w:352, h:98, hasExpandBtn:true, text:'调试作用域调试展开展开以查看作用域。'}`。
- **对照基准**: 检查提示词 E1（首屏可答）/E6（非组件壳堆叠）；debug 设施不应出现在产品 showcase 面。
- **严重程度**: P3
- **用户影响**: demo 首屏出现开发调试 UI，观感与可信度受损；无功能阻塞。
- **修复方向**: 从 `m5-showcase-app.json` body 移除 `scope-debug` 节点（或以 `visible: "${isDev}"` 门控）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1d-A5-02 族实例] 底部 tabbar 首页/分类 icon 缺失（与 m3 同根因）

- **页面/路由**: `#/m5-showcase`（footer tabbar：`icon: home`/`grid` 的两钮 svg=0，`shopping-cart`/`user` 正常 svg=1）
- **主题/视口/状态**: light / 1280 / cart tab（tabbar 实拍）
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/m5-showcase/m5-frame-cart-bottom-1280-light.png`
- **程序化证据**: `_tmp/r2-1d-probes/m5-followup-out.json` tabbarIcons：`tabbar-home {svg:0}`、`tabbar-category {svg:0}`、`tabbar-cart {svg:1}`。
- **严重程度**: P2（并入 R2-1d-A5-02 主条目，见 m3-layout 卡；此处为跨页第二实例，佐证 systemic 归族）
- **归族**: systemic → R2-3 批（并档 m3 卡）
- **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                               | 探针/理由                                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 外壳 zinc-950/900/800 字面色（B4） | phone 舞台有意恒黑设计（演示 aesthetics），frame 内内容走 bg-background 主题令牌；glass/皮肤类有意差异不报口径 |
| 首轮 tab 切换文本探针「内容未变」  | textContent 读取到隐藏 tab 容器文本；实拍截图证实 tab 切换正常（cart/category/profile 三 tab 内容正确切换）    |
| 购物车「加入购物车」按钮 28px 高   | size=sm 档 ≥24 合规（M2 承诺仅 default/lg）                                                                    |
| 375 下 pre 代码块溢出              | 右侧说明面板 `overflow-x-auto` 有意滚动容器                                                                    |
| dark 下外壳仍是深色                | 舞台恒黑为设计；frame 内容 dark 平价正常                                                                       |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：C4-01 → R2-4 local；A5-03 → R2-4 local；A5-02 实例 → R2-3（并档 m3）；
- 批内复检通过后 → `verified`。
