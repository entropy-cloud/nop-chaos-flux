# R2-1a replica 域发现独立复核（review agent B，fresh session）

- **日期**: 2026-09-23
- **复核对象**: `docs/analysis/2026-09-23-r2-1a-walkthrough/cards/` 中 P1×8 + P2×4
- **方法**: 按 `docs/skills/visual-page-quality-inspection-prompt.md` 阶段 3 要求——先读卡，再**重开页面重截同态截图、独立重写探针重跑**（不复用原探针代码），先独立判断再与原发现比对。色彩探针含 oklch/oklab→sRGB 解析与逐层背景合成（自测：黑白 21:1、oklch(1 0 0)=rgb(255,255,255) 正确）。
- **取证落盘**: 探针 `_tmp/r2-1a-recheck/*.mjs`（lib-recheck.mjs + p\*.mjs）；截图 `_tmp/visual-inspection-2026-09-23/r2-1a-recheck/`。dev server http://127.0.0.1:4175 未重启。

## 汇总表

| #   | 发现 id     | 页面                  | 原判级 | 结论                 | 复核实测关键值                                                      | 备注                                                                     |
| --- | ----------- | --------------------- | ------ | -------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | R2-1a-C-01  | linear-issues 等 6 页 | P1     | **保留**             | 主列 y=894 > vh800；子块全部 x=296 纵堆；section 1747/568；滚动条 0 | 6/6 schema 静态坐实同根因                                                |
| 2   | R2-1a-C2-02 | antdpro-list          | P1     | **保留**             | sticky td bg 透明、默认态重叠 66px、横滚量 236px                    | 全滚到底后重叠=0（细节修正）                                             |
| 3   | R2-1a-B5-02 | antdpro 全域          | P1     | **保留**             | 查询/表单 label 1.05:1 不可见；css 0 处 dark 覆盖                   | 触发器底色细节与原文有出入，缺陷成立                                     |
| 4   | R2-1a-H5-01 | antdpro-form-dialog   | P1     | **保留**             | justify normal、gap 12px≠8、按钮 60×32<72、右侧留白 404px           | 与原值一致                                                               |
| 5   | R2-1a-A9-02 | cal-confirm           | P1     | **保留**             | toast 正文 `[object Object]×4`（确认预约+添加嘉宾双触发）           | 截图目视坐实                                                             |
| 6   | R2-1a-B1-01 | cal-confirm           | P1     | **保留**             | placeholder 1.04:1（原文≈1.05）；灰板 rgb(188,191,197)              | 输入文字实测 5.6:1（原文"文字亦贴近灰板"略夸大）                         |
| 7   | R2-1a-H3-01 | airtable-grid         | P1     | **降级 P1→P2**       | bottom 828>vh800 属实；**但 body 区可滚（sh1849/ch738），字段可达** | "末尾字段完全不可达"不成立；残余缺陷=弹层越界 28px+保存钮部分裁切        |
| 8   | R2-1a-B1-01 | form-wizard           | P1     | **保留**             | light 3.05:1 / dark 1.10:1（与原文逐位一致）                        | Badge secondary 双模式均不达标                                           |
| 9   | R2-1a-B1-04 | notion-database       | P2     | **保留**             | dark 面板 label 1.05:1（原文 1.00:1，同根因）                       | 截图目视坐实                                                             |
| 10  | R2-1a-C4-04 | stripe-payments       | P2     | **保留**             | st-root sw733/cw480（逐位一致）；doc sw800 无横滚逃生               | —                                                                        |
| 11  | R2-1a-B1-19 | sundial-analytics     | P2     | **保留**（实例修正） | 橙色文字 2.87:1@12px、sd-badge 2.65:1@10px                          | 「今天」图例文字实为灰色 6.01:1 通过；橙 token 命中在计数徽章与 sd-badge |
| 12  | R2-1a-A2-01 | notion-database       | P2     | **驳回**             | 触发器 role=button + tabindex=0 + Enter 实测可开面板                | 与当前构建表现矛盾（疑已修复或原探针误测）                               |

**总计**: 保留 10（其中 1 条实例细节修正）、降级 1、驳回 1。

---

## P1-1 [R2-1a-C-01] linear 六页容器 className 误路由

**原发现摘录**: 顶层容器 `className: "flex flex-row items-stretch min-h-screen"` 挂外层不控布局，侧栏与主内容纵向堆叠，首屏主区整片空白（P1，systemic 6 页）。

**独立取证**:

- 静态：`apps/playground/src/complex-pages/page-schemas/` 全部 6 个 linear-\*.json 的 `-main` container 均为 `className: "flex flex-row items-stretch min-h-screen"`（grep 输出 6/6 命中，linear-issues / board / detail / inbox / projects / settings）；`docs/architecture/styling-system.md`「Container 的 className 路由（关键差异）」明文 `className` 挂外层 `nop-container` 不控制子节点排列，必须 `bodyClassName` 或 semantic prop。根因描述与契约完全吻合。
- 运行时（linear-issues，1280×800 light）：`-main` 根 class=`nop-container flex flex-row …`，`container-body` computed `flex-direction: column`；两个子块 x 均 296（纵堆），侧栏 y=192 h=686，主列 y=894 h=1029 → **主列整体在 800 视口折叠线下**；`section.nop-page` scrollHeight 1747 / clientHeight 568；showcase 卡 scrollDiff=1147、scrollbarWidth=0（无可感知滚动）。linear-settings 同构（子块 x 均 296，面板 y=484 起，scroll 1288/588）。
- 截图: `_tmp/visual-inspection-2026-09-23/r2-1a-recheck/linear-issues-default-light-recheck.png`（右侧约 75% 纯黑空白）、`linear-settings-default-light-recheck2.png`。
- 探针: `_tmp/r2-1a-recheck/p1-linear.mjs`。

**结论: 保留（P1）**。根因定位（className 误路由）、影响面（6 页同源）、首屏主区不可见均独立复现；实测值与原发现（主列 y=894、子块 x=296、clipY/ch）一致。

## P1-2 [R2-1a-C2-02] sticky 操作列透明底压字

**原发现摘录**: tbody sticky td bg 透明，1280 默认视口即叠压"下单时间"列 66px+（P1）。

**独立取证**:

- 源码：`packages/flux-renderers-data/src/table-renderer/fixed-columns.ts` `createStickyStyle` 仅设 `position/left|right/zIndex`，**未设任何 background**（注释宣称"背景透明继承"但无 `background: inherit` 实现）；`packages/ui/src/styles/table.css` 的 `nop-table-sticky-edge-*` 仅画边缘阴影，无底色规则；表头 sticky 由 `table-header-row.tsx` 显式给 `var(--table-header-bg)`——与"th 不透明、td 透明"的实测吻合。
- 运行时：table scrollWidth 1130 > 滚动容器 clientWidth 894（236px 横滚量，与原值一致）；`thead th[操作]` sticky + bg rgb(255,255,255)；`tbody td[操作]` sticky + **bg rgba(0,0,0,0)** + zIndex 1；默认态与前一单元格重叠 66px（前格"陈立群" x1003-1113，sticky x1047-1207）。滚到底（scrollLeft=236）后 prevRight=1047=stickyLeft，重叠=0。
- 截图: `antdpro-list-default-light-recheck.png`——首行可见"查看 编辑**20删8-01 09**"两层文字穿透。
- 探针: `_tmp/r2-1a-recheck/p2-3-4-antdpro.mjs`。

**结论: 保留（P1）**。机制、数值、视觉三重复现。细节修正：全滚到底后无重叠，"部分缓解"表述准确；穿透发生在默认及任意未滚到底状态（高频主路径），P1 维持。

## P1-3 [R2-1a-B5-02] antdpro dark 半适配拼贴

**原发现摘录**: `--adp-*` 字面亮底无 dark 覆盖而 flux 语义令牌翻转，dark 下标签/查询控件文字不可读（P1，9 页）。

**独立取证**:

- 静态：`apps/playground/src/antdpro-replica/antdpro-replica.css` 中 `data-mode` **0 次命中**；L45-50 `--adp-text: rgba(0,0,0,0.88)`、`--adp-bg-container: #ffffff` 亮字面定义属实。
- 运行时（dark 1280）：antdpro-list 查询区字段标签"关键字" computed `rgb(248,250,252)`（--foreground 翻转值）叠 adp 白底 → **1.05:1 不可见**；antdpro-form-basic "执行时间段/目标权重（%）/目标描述" 同为 1.05:1，仅红色必填星号 2.44:1 可辨；select 触发器内文 `rgb(175,189,207)` on 白 1.91:1；宿主页头 feature chips 1.05:1 与 1.10:1。
- 截图: `antdpro-form-basic-default-dark-recheck.png`（dark 下整卡白块、表单标签幽灵化、灰色药丸输入框）、`antdpro-list-default-dark-recheck2.png`。
- 探针: `_tmp/r2-1a-recheck/p3b-antdpro-dark.mjs`、`p3c-antdpro-dark2.mjs`。

**结论: 保留（P1）**。核心机制（语义令牌翻转 × adp 字面不翻转 → 1.05:1 标签不可见）与"半成品 dark"拼贴观感逐项复现。细节出入：我实测下拉触发器为白底+浅灰字（1.91:1），非原文"深蓝底 rgb(31,42,61)×黑字≈1.1:1"——不同实例/不同令牌层，不影响判级与根因。

## P1-4 [R2-1a-H5-01] ModalForm footer 左对齐

**原发现摘录**: footer `justify-content: normal` 左对齐、gap 12px、按钮 60×32，右留白 424px（P1）。

**独立取证**:

- 令牌基准核实：`packages/theme-tokens/src/styles.css` L124-125 `--overlay-anatomy-footer-gap: 8px`、`--overlay-anatomy-footer-button-min-width: 72px`。
- 运行时（light，打开"新建订单"弹层）：dlg 560px @x360-920；footer computed `justify-content: normal`、`gap: 12px`、`display: flex`；取消 x=384 w=60 h=32、确定 x=456 w=60 h=32；**按钮右侧留白 404px**。与原发现（384/456/60×32/12px）逐位一致。
- 截图: `antdpro-form-dialog-dialog-open-light-recheck.png`。
- 探针: `_tmp/r2-1a-recheck/p2-3-4-antdpro.mjs`。

**结论: 保留（P1）**。三处违例（对齐、间距档、按钮最小宽）全部复现，对照 anatomy 令牌成立。

## P1-5 [R2-1a-A9-02] cal-confirm toast 渲染 [object Object]

**原发现摘录**: 确认预约/添加嘉宾后 toast 正文为四段 `[object Object],` 拼接（P1）。

**独立取证**:

- 运行时：点击"确认预约"（空表单）→ `LI.cn-toast` text = `[object Object],[object Object],[object Object],[object Object]`；点击"添加嘉宾"复测同样输出。
- 截图: `cal-confirm-toast-light-recheck.png`——右下 toast 乱码肉眼可证。
- 探针: `_tmp/r2-1a-recheck/p5-6-7-8-cal-airtable-wizard.mjs`。

**结论: 保留（P1）**。主路径反馈通道输出乱码，双触发点复现。

## P1-6 [R2-1a-B1-01] cal-confirm dark 输入灰板 placeholder 不可读

**原发现摘录**: dark 下卡面钉白、输入框成中灰板，placeholder ≈1.05:1（P1）。

**独立取证**:

- 运行时（dark 1280）：`.cal-root` 与卡 bg 均 `rgb(255,255,255)`（钉白属实）；input bgRaw `oklab(0.284899 -0.0068 -0.0375 / 0.3)`（与原值逐位一致）逐层合成于白卡 → **rgb(188,191,197) 灰板**；placeholder `rgb(175,189,207)` 对灰板 → **1.04:1**；`--background` token 已是 dark（`222 84% 5%`）证明系令牌泄漏而非未切主题。
- 截图: `cal-confirm-default-dark-recheck.png`。
- 探针: 同上 p5-6-7-8（dbg5 复测，含合成修正后的读数）。

**结论: 保留（P1）**。placeholder 1.04:1 与原判 1.05:1 一致，灰板合成值复现。细节修正：输入文字 rgb(55,65,81) 对灰板实测 **5.6:1**（通过），原文"输入文字亦贴近灰板"略夸大——但 dark 下主要输入的占位提示不可读成立，表单为本页唯一任务，P1 维持。

## P1-7 [R2-1a-H3-01] airtable 记录 modal 底部越界

**原发现摘录**: modal 560×768 @y60 → bottom 828 > vh800 越界 28px，modal 不可滚、遮罩下页面不可滚 → 末尾字段（优先评分/资产条码）完全不可达（P1）。

**独立取证**:

- 运行时（light 1280×800，行 hover"展开"）：dlg w560 h768 top60 **bottom828**（越界 28px，逐位一致）；dlg 自身 overflowY visible、maxHeight 768px；遮罩下无滚动。
- **但**：dlg 内存在 body 滚动区 `flex min-h-0 … overflow-y-auto`（scrollHeight 1849 / clientHeight 738）；程序化 scrollTop=1111 后尾部内容"资产条码 | 创建时间 | 最后修改 | 保存修改"全部进入可视区 → **字段可达，H8 body 滚动契约实际成立**。
- 残余缺陷：弹层容器越界 28px；滚到底后"保存修改"钮（位于滚动 body 尾部）viewport 区间 784-812，底部 12px 仍被视口裁切（可点但破相）。
- 截图: `airtable-grid-record-modal-1280x800-light-recheck2.png`。
- 探针: `_tmp/r2-1a-recheck/p7-8-redo.mjs`、`dbg7.mjs`。

**结论: 降级 P1 → P2**。"越界 28px"复现，但原发现的定级依据"末尾字段完全不可达、无滚动手段"被证伪（body 区可滚、字段全部可达）。残余缺陷为 H3"弹层高度 ≤ 视口"违例 + 保存钮部分裁切，用户可完成任务 → 按"一次性路径/可绕过"降 P2。修复方向不变（弹层 max-height 收进视口，`calc(100vh - 2rem)` 档）。

## P1-8 [R2-1a-B1-01] form-wizard 页头徽章对比度

**原发现摘录**: feature 徽章 light 3.05:1 / dark 1.10:1，`Badge variant="secondary"` 令牌对双模式不达标（P1，40 页共用）。

**独立取证**:

- 运行时：light「wizard」「per-step 校验」「onComplete 提交」三徽章均 `rgb(10,71,169)` on `rgb(166,137,250)` = **3.05:1** @10px；dark 同三枚 `rgb(178,206,251)` on `rgb(203,186,252)` = **1.10:1**。与原发现逐位一致。另测「复杂表单」chip dark 下白底白字 1.05:1（同族）。
- 截图: `form-wizard-header-badges-dark-recheck.png`（dark 下三枚紫底徽章文字不可见）。
- 探针: `_tmp/r2-1a-recheck/dbg8.mjs`、`dbg9.mjs`。

**结论: 保留（P1）**。10px 非大字需 4.5:1，light 即不达标、dark 完全不可读；共享 showcase 头部影响全部 complex-pages，系统性成立。

---

## P2-1 [R2-1a-B1-04] notion 设置面板 dark 开关标签 1.00:1

**原发现摘录**: dark 下 View settings 面板亮底，属性行标签隐形只剩开关（P2，并入宿主 `--popover` 已知项影响面）。

**独立取证**:

- 运行时（dark，Enter 打开 `notion-settings-form`）：面板合成底 rgb(255,255,255)；"卡片尺寸/行高/名称/状态/负责人/工作量"等 6 个标签 computed `rgb(248,250,252)` → **1.05:1**（原文 1.00:1，同为白上白）；"布局/属性可见性/筛选"走 adp 系深色 12.26:1 正常——两套令牌混拼机制与 B5-02 同源。
- 截图: `notion-database-settings-dark-recheck2.png`（标签幽灵化肉眼可证）。
- 探针: `_tmp/r2-1a-recheck/dbg10.mjs`。

**结论: 保留（P2）**。影响面实测成立，归族并入宿主弹层亮底项合理。

## P2-2 [R2-1a-C4-04] stripe-payments 800px 整页超宽

**原发现摘录**: 800 视口 `st-root sw733/cw480` 越界 253px，无横滚逃生（P2）。

**独立取证**:

- 运行时（800×900 light）：`st-root` scrollWidth **733** / clientWidth **480**（逐位一致）；document/body scrollWidth 800（**无横向滚动条**，越界直接裁切）；右缘越出视口的元素 278 个（搜索框 right=861、图表 right=984 等）。
- 截图: `stripe-payments-default-800x900-light-recheck.png`。
- 探针: `_tmp/r2-1a-recheck/p9-p2-batch.mjs`。

**结论: 保留（P2）**。本波最宽窄视口违例复现，右侧列不可见成立。

## P2-3 [R2-1a-B1-19] sundial 橙色 badge 对比度 2.87:1

**原发现摘录**: 橙色 badge「今天」rgb(234,122,42) 2.87:1@10px，本页最差实例（P2）。

**独立取证**:

- 运行时（light 1280，含滚动后全页扫描）：橙色 `rgb(234,122,42)` 文字命中两处——计数徽章"3"（12px，白底）**2.87:1**（与原文比值逐位一致）；`sd-badge sd-badge-brand`"本周已经输出 32 点…"（10px，橙 tint 底 rgb(253,244,238)）**2.65:1**。图例「今天」文字实测为灰 `rgb(99,99,99)` 6.01:1（通过）——「今天」当前未以橙色文字渲染，橙 token 落在计数徽章与 sd-badge。
- 截图: `sundial-analytics-scrolled-light-recheck.png`。
- 探针: `_tmp/r2-1a-recheck/dbg11.mjs`。

**结论: 保留（P2，实例修正）**。同色 token 文字 2.65–2.87:1 < 3:1 的核心缺陷坐实；原发现所述具体实例「今天」文字徽章在当前构建未命中（其文字为灰色通过），最差实例更正为"3"计数徽章 2.87:1@12px + sd-badge 2.65:1@10px。判级与修复方向（badge 文字加深/深底白字）不变。

## P2-4 [R2-1a-A2-01] notion「设置」入口键盘不可达

**原发现摘录**: 入口非 button、无 tabindex、键盘不可达，仅鼠标可用（P2）。

**独立取证**:

- 运行时：触发器 `DIV[data-testid="notion-settings-trigger"]` 实测 **`role="button"` + `tabindex="0"`**；`el.focus()` 后 `document.activeElement` 即该元素且 `outline-style: auto`（有可见焦点环）；**按 Enter 后 `[data-testid="notion-settings-form"]` 面板打开**（innerText 含"布局/卡片尺寸/属性可见性…"），键盘链路端到端可用。
- 探针: `_tmp/r2-1a-recheck/dbg10.mjs`。

**结论: 驳回**。当前构建中该入口具备 button 语义、可聚焦、有焦点指示、Enter 可开面板——原发现三项指控（无语义/无 tabindex/键盘不可达）均与实测矛盾。两种可能：走查后已被修复，或原探针选择了错误元素（原文称探测的是"可点击 text 容器"）。若需追溯以 git 历史佐证，可在汇总批补一条备注；本复核以当前构建实测为准。

---

## 复核过程备注（可复现性）

- 复核初期发现并修正了本方探针的两个缺陷：① `resolveBg` 在命中不透明祖先时提前返回、丢弃半透明层的合成（导致 cal-confirm 输入框灰板误判为纯白）；② SPA hash 导航不重载页面，`data-mode` 会跨页残留（导致首批 airtable/form-wizard "light" 截图实为 dark）——均已在 lib 修正并对受影响项重测（`*-recheck2` 系列）。原发现数值经修正后的独立管线复测仍成立，反向提高了可信度。
- 自测基线：黑白 21:1、同色 1:1、`oklch(1 0 0)`→rgb(255)、`oklab(0.2849,-0.0068,-0.0375,0.3)`→rgb(31,42,61)@30%——命中必读口径中 oklch/oklab 合成陷阱的正确处理。
