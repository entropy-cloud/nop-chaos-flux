# [card] page:airtable-grid

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/airtable-grid` ｜ **载体**: complex-page（外部应用复刻 · Airtable 网格）
- **矩阵裁剪**: full（分组态样本经「按阶段」默认分组覆盖；行高四档、列头菜单、Hide fields、记录 modal 均程序化触发；拖拽为静态形态未拖帧——明示）

## 1. 截图清单

| 状态                             | light                                                                   | dark                                               |
| -------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------- |
| 默认 1280×800                    | `_tmp/.../r2-1a/airtable-grid/airtable-grid-default-1280x800-light.png` | `.../airtable-grid-default-1280x800-dark.png`      |
| 行高四档（超高样张）             | `.../airtable-grid-rowheight-xl-1280x800-light.png`                     | —（四档以行高统计为证：32/48/80/160）              |
| 网格底部（summary bar 尝试滚动） | `.../airtable-grid-grid-bottom-1280x800-light.png`                      | —                                                  |
| 列头菜单 dialog                  | `.../airtable-grid-col-menu-1280x800-light.png`                         | `.../airtable-grid-col-menu-1280x800-dark.png`     |
| Hide fields 抽屉                 | `.../airtable-grid-hide-fields-1280x800-light.png`                      | `.../airtable-grid-hide-fields-1280x800-dark.png`  |
| 记录详情 modal                   | `.../airtable-grid-record-modal-1280x800-light.png`                     | `.../airtable-grid-record-modal-1280x800-dark.png` |
| 800×900                          | `.../airtable-grid-narrow-800x900-light.png`                            | `.../airtable-grid-default-800x900-dark.png`       |

探针脚本：`_tmp/r2-1a-probes/airtable-interact.mjs` + REPL 复核（列头菜单/行高统计）。

## 2. A–H 勾选

- A 交互：A1 ✓ A2 ✓ A3 warn(A3-05) A4 ✓ A5 n/a A6 n/a（拖拽为接线但静态）A7 ✓（三弹层均可 Esc/关闭钮退出）A8 n/a A9 ✓（行高切换即时生效、summary 随动）
- B 颜色：B1 ✓ B2 ✓ B3 ✓（阶段 pill 四档语义色系一致）B4 ✓ B5 ✓（dark 整卡钉白且内部一致，无 notion 式表头/控件泄漏）B6 ✓
- C 布局：C1 ✓（网格 sw2857/cw864 为 auto 容器内有意横滚，白名单；长文本 cell sw552/cw168 为截断测量伪影，误报排除；TH `自动编号` 13px 头格溢出 P3）C2 ✓ C3 ✓ C4 fail(C4-03) C5 ✓ C6 n/a
- D 间隔：D1 ✓（16×32/8×4/4×2/12×2）D2 ✓ D3 ✓（四档行高 {32:10}/{48:10}/{80:10}/{160:10} 与文档 32/48/80/160 精确一致，无离群行——本页密度档为"整页一致的有意档"，符合误报排除口径）D4 ✓ D5 ✓ D6 ✓（「每页行数」分页条 gap=12）D7 ✓ D8 ✓
- E 排布：E1 ✓ E2 ✓（视图 switcher 选中态清晰、主字段列居左）E3 ✓ E4 ✓ E5 ✓ E6 ✓
- F 一致性：✓（replica 豁免；横切已查）
- G：n/a
- H 弹层：fail(H3-01)（其余项 pass：列头菜单 560 落 base 档、Hide fields 抽屉 480 落 sm 档、body 滚动契约 ✓、header/body padding 一致 16/24）

## 3. 发现条目

### [R2-1a-H3-01] 记录详情 modal 底部越出视口，末尾字段不可达

- **页面/路由**: `#/complex-pages/airtable-grid` 行 hover「⤢ 展开」→ 记录详情
- **主题/视口/状态**: light、dark / 1280×800（vh=800）/ modal 打开
- **截图**: `_tmp/.../r2-1a/airtable-grid/airtable-grid-record-modal-1280x800-light.png`
- **目视描述**: modal 高 768px 自 y≈60 铺开，底部「优先评分（1–5）/资产条码」字段行被视口底边裁切。
- **程序化证据**:
  - 探针: 打开 modal 读 `getBoundingClientRect().bottom` 与 `innerHeight`、`overflowY`；800×900 视口复测
  - 输出: `{w:560, h:768, bottom:828, vh:800, overflowY:"visible"}` → 越界 28px；modal 本体不可滚动（visible），遮罩下页面亦不可滚（fixed overlay）→ 末尾字段（优先评分/资产条码及其后分区）在 800 高视口完全不可达；900 高视口时 bottom=828<900 勉强可见但无余量
- **对照基准**: H3 弹层高度 ≤ 视口（max-height 生效）、H8 长内容滚动应发生在 body 区；记录编辑为网格页核心路径
- **严重程度**: P2（独立复核降级 P1→P2：越界 28px 属实但 body 区可滚、字段可达，「完全不可达」被证伪；残余为弹层越界+保存钮部分裁切——见 review-replicas.md #7）（P2 基础上按"P2 在高频主路径升 P1"升级：全字段编辑是该复刻页的主任务）
- **用户影响**: 800 高笔记本视口下无法查看/编辑末尾字段，也无滚动手段。
- **修复方向**: 记录 modal 加 `max-height: min(var(--overlay-size-*) 基准, calc(100vh - 2rem))` 并把字段区设为 `overflow-y:auto`（header/导航行固定），即 H8 契约的标准解剖；800 视口复测 bottom ≤ innerHeight-8。
- **归族**: local → R2-4 批（本波唯一一处 H3 违例；如复检发现其他 560 modal 同款解剖可并族）
- **复核状态**: 已复核（降级 P1→P2，review-replicas.md）

### [R2-1a-C4-03] 800px 下行高四档分段控件被裁只剩"短"

- **页面/路由**: `#/complex-pages/airtable-grid` 视图栏行高控件
- **主题/视口/状态**: light / 800×900 / 默认
- **截图**: `_tmp/.../r2-1a/airtable-grid/airtable-grid-narrow-800x900-light.png`
- **目视描述**: 视图栏「短/中/高/超高」分段控件只显示"短"，其余三档不可见。
- **程序化证据**:
  - 探针: 800px 下读 `.at-seg` 的 `scrollWidth/clientWidth` 及父容器
  - 输出: `.at-seg sw163/cw59`（内容 163px 被压到 59px）；父层 `sw384=cw384, overflowX visible`（无滚动逃生）；同视口 `at-root sw586/cw480`（整卡同样超宽，同 cal/notion 根因族）
- **对照基准**: C4 视口弹性（工具栏折叠合理）
- **严重程度**: P2（行高切换是本页宣传的四档密度样本入口）
- **用户影响**: 窄窗口用户无法切换中/高/超高密度。
- **修复方向**: 视图栏在窄视口折行（`flex-wrap`）或分段控件收纳进「视图选项」菜单；`at-seg` 加 `shrink-0` + 允许工具栏横向滚动并给滚动提示。
- **归族**: systemic → R2-3 批（复刻页窄视口同根因族）
- **复核状态**: 未复核

### [R2-1a-A3-05] 展开/列宽手柄/字段头目标偏小

- **页面/路由**: `#/complex-pages/airtable-grid`
- **主题/视口/状态**: light / 1280×800
- **截图**: `.../airtable-grid-default-1280x800-light.png`
- **目视描述**: 行尾「⤢ 展开」钮矮小；列宽手柄 4px；字段头行高 17.4px。
- **程序化证据**:
  - 探针: A3 短边遍历
  - 输出: 展开 `41.2×22`；手柄 `4×39.5`（hover 有 `bg-primary/40`，行业窄热区惯例酌情豁免）；`at-field-head 17.4px`
- **对照基准**: WCAG 2.5.8
- **严重程度**: P3
- **用户影响**: 触屏误触率略高。
- **修复方向**: 展开钮 h≥24；手柄热区加宽至 8-10px；字段头行高升档。
- **归族**: watch-only → 台账
- **复核状态**: 未复核

## 4. 误报排除记录

- C1 命中 `DIV sw2857/cw864`（20 字段网格）：网格本体在 `overflow-x:auto` 容器内横滚（Airtable 对标核心交互），误报（有意滚动白名单）。
- C1 命中 `at-longtext-text sw552/cw168`：长文本 cell 截断测量伪影（渲染按行截断显示），目视无溢出。
- 行高四档"数值偏大"：整页一致的有意密度档（文档值 32/48/80/160 精确命中），按误报排除表不报。
- 探针首跑脚本尾部卡死（locator 等待）：基础设施问题，数据已完整落盘；列头菜单首次 `th` 偏移点击未命中，改为头部中心点击后触发成功（详见 probe 目录记录），非页面缺陷。
- dark 下无表头深带：与 notion 不同，本页 dark 全卡钉白一致——印证 notion B1-03 为页面级令牌泄漏而非通用行为。

## 5. 台账回写提示

ledger.md 本行 status → `carded`；H3-01 归族 R2-4、C4-03 归族 R2-3 后 `digested`。

## 6. 弹层注册表扩面素材

- 列头菜单 dialog：560×543（base 档）、字段头中心点击触发、单选项/换型别静态条目（G-D 缺口注记）。
- Hide fields 抽屉：480px（sm 档）、右侧滑入、`drawer-popup`、body 滚动、主字段不可隐藏注记（A6/A14）。
- 记录详情 modal：560×768（base 档）、行 hover「展开」触发、上一条/下一条导航、H3 越界（见 H3-01）。
