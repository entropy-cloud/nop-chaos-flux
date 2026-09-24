# [card] control:query-filter

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/query-filter` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：basic query region / inline mode with custom labels / collapsible filter）
- **矩阵裁剪**: simplified（matrixReason：非六属性复杂控件——单弹层面（内嵌表单 + 折叠壳）；下拉弹层（combobox）开态已查、折叠开合已查、值三态（空/填/重置）已查、双主题双视口已查。裁掉的状态：disabled / error（fixture 无 required/校验字段，校验呈现路径无法在载体触发，归 form 卡族 coverage）；loading/empty（query-filter 无异步数据通道）；glass 皮肤（本批统一不做））
- **runner dark 列作废声明**：沿 R2-2a-B5-34——本卡 dark 证据全部为自采真 `data-mode=dark` 截图 + 探针（`setAttribute('data-mode','dark')` 后 150ms）。

## 1. 截图清单

| 状态                               | light                                                                                       | dark（真 data-mode，自采）                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 默认 1280×800（整页）              | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/default-1280-light-full.png`          | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s1-default-dark-1280.png`                           |
| 场景 1 默认 1280                   | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s1-default-light-1280.png`            | 同上                                                                                                      |
| 已填值（keyword + Status=Pending） | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s1-filled-light-1280.png`             | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s1-filled-dark-1280.png`                            |
| 搜索提交后（回显未变，见 A9-121）  | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s1-submitted-light-1280.png`          | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s1-submitted-dark-1280.png`                         |
| 重置后                             | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s1-reset-light-1280.png`              | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s1-reset-dark-1280.png`                             |
| hover 搜索按钮（无态变化）         | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s1-hover-search-light-1280.png`       | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s1-hover-search-dark-1280.png`                      |
| focus keyword 输入框（ring）       | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s1-focus-input-light-1280.png`        | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s1-focus-input-dark-1280.png`                       |
| combobox 下拉开态                  | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s1-combobox-open-light-1280.png`      | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s1-combobox-open-dark-1280.png`（弹层白底，已知族） |
| combobox 键盘焦点环                | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s1-combobox-kbd-focus-light-1280.png` | —                                                                                                         |
| 场景 2 inline 模式                 | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s2-inline-light-1280.png`             | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s2-inline-dark-1280.png`                            |
| 场景 3 折叠态                      | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s3-collapsed-light-1280.png`          | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s3-collapsed-dark-1280.png`                         |
| 场景 3 展开态（草稿存活）          | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s3-expanded-light-1280.png`           | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s3-expanded-dark-1280.png`                          |
| 默认 800 宽                        | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/default-800-light.png`                | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/default-800-dark.png`                               |
| 场景 1 @800（3 列挤压）            | `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s1-default-800-light.png`             | —                                                                                                         |

## 2. A–H 维度勾选表

- A 交互：A1 fail→已知族（主按钮 hover 无反馈 = R2-2a button A1-03 P1 族实例，见 §4）A2 pass（input 与 combobox 触发器键盘 Tab 均有 3px oklab ring，`focusVisible.boxShadow` 第 4 影 = ring；`s1-focus-input-*` / `s1-combobox-kbd-focus-light-1280.png`）A3 fail→已知族（stepper 24×16，A3 小目标族实例）A4 n/a（fixture 无 disabled）A5 n/a A6/A8 n/a A7 pass（combobox 弹层几何 312×64 贴触发器左缘、选项 28px≥24、Esc 可关）A9 **fail(R2-2b-A9-121)**（搜索/重置后页面回显与 scope 均无变化）
- B 颜色：B1 pass（light label/按钮/input 11.6–12.6:1；dark 像素采样 label 14.33:1）B2 pass（focus ring oklab/0.5 3px 可见）B3 n/a（无语义色）B4 pass（`bg-muted/30`、`--primary` 走令牌）B5 **fail→已知族拆分**（dark 搜索按钮 3.26:1 = `--primary` dark 过亮族；combobox 弹层白底 = `--popover` dark 亮底族；均见 §4 引用不另立）B6 n/a
- C 布局：C1 pass（overflow 扫描零命中，800 宽 docOverX 0）C2 pass（弹层不压内容）C3 pass C4 **warn(R2-2b-C4-122)**（800 宽下 columnCount 3 恒定 → 字段 ~140px、placeholder 截断）C5 pass（无 sticky/双滚动条）C6 n/a
- D 间隔：D1 pass（3 列栅格间距均匀，按钮组 gap 8px 落栅格）D2 pass D3 n/a D5 pass（label-control 顶对齐统一、行距一致）D6–D8 n/a
- E 排布：E1 pass（筛选区主操作可辨识）E2 pass（搜索 primary / 重置 secondary variant 正确、右下主位）E3 pass（搜索在主位）E4 pass（三列左缘对齐 318/458/598 等距）E5 pass（边框容器分组）E6 pass（折叠态有 summary 文案引导）
- F 一致性：F1 pass（搜索/重置与 crud 查询区同构）F2 n/a F3 n/a F4 **warn→已知族**（默认提交/重置文案 zh-CN“搜索/重置”，stepper aria“增加/减少”，调试面板“调试/折叠”——i18n zh-CN 回退族实例，见 §4）F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（combobox 下拉 312px 贴触发器、在档）H2 n/a H3 pass（弹层 64px 高远小于视口）H4 n/a H5 n/a H6 n/a H7 pass（弹层 border/圆角走令牌；dark 白底为已知族，归 B5）H8 n/a H9 pass（800 宽下未复现弹层，几何按 1280 判过——弹层 312 < 800 视口无溢出风险）

## 3. 发现条目

### [R2-2b-A9-121] 搜索/重置 onSubmit/onReset 回显链路静默失效：点击后页面无任何可见反馈

- **页面/路由**: `#/lab/query-filter`（场景 1 basic query region；fixture `onSubmit: setValue(lastQuery,'searched')` / `onReset: setValue(lastQuery,'reset')` + 页面级 `${lastQuery}` 回显）
- **主题/视口/状态**: light + dark（真 data-mode）/ 1280 / 提交后与重置后
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s1-submitted-light-1280.png`、`s1-submitted-dark-1280.png`（"Last action:" 仍为空、scope 面板 `{"lastQuery": ""}`）、`s1-reset-*-1280.png`
- **目视描述**: 填入 keyword 并选 Status=Pending 后点击“搜索”，表单不提交反馈、不关弹层、无 toast（lab notify 为 no-op），页面级回显文本 `Last action:` 与 scope 调试面板 `lastQuery` 保持空串；点击“重置”字段被清空但 `lastQuery` 同样未变。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w4-qf3.mjs`（提交流：fill → click 搜索 → 读 `[data-testid="lab-qf-last-action"]` + scope 面板 JSON → click 重置 → 复读）
  - 输出: `actionText: 'Last action: '`、`actionTextAfterReset: 'Last action: '`（双主题一致）；`keywordAfter: ''`（重置清字段生效，证明重置按钮本身接线正确）。`w4-qf3.json` console 零报错（无运行时异常）。
- **对照基准**: 检查提示词 A9（交互后反馈可见，非静默更新）；fixture 场景描述自证预期"Search runs the embedded form submit pipeline (validation then onSubmit)"
- **严重程度**: P2（查询主路径交互后零反馈；demo 自证用途失效）
- **用户影响**: 用户无法知道搜索是否执行；作用域数据未被写入意味着依赖 onSubmit 触发下游刷新的页面（list/table 联动）不会更新。
- **修复方向**: 二选一根因验证：①`query-filter-definition.ts` L52-53 将 `schema.onSubmit` 转投 `form.submitAction` 后，`form-runtime-submit-flow.ts` L423 的 submitLifecycleAction 执行时 setValue 的 `path: 'lastQuery'` 解析到内嵌 form 子作用域（影子写入），应显式声明作用域解析规则或文档化 `path` 需带作用域前缀；②definition→region 传递链路丢 `submitAction`。建议先在 `form-runtime-submit-flow.ts` submitLifecycleAction 处加诊断日志定位①/②。
- **归族**: systemic → R2-3 候选（schema 动作作用域/契约静默族，与 R2-2a A9-42/A9-60“契约键静默丢弃”同方向；本条为动作作用域解析面）
- **复核状态**: 已复核（保留 P2，根因收敛，review-b 2026-09-24）：原卡假设②（丢 submitAction）证伪；收敛为嵌入 form 子树影子 scope（顶层 form 同链路对照实验通过）

### [R2-2b-C4-122] 800px 窄视口下 columnCount 3 恒定：字段挤压至 ~140px、placeholder 截断

- **页面/路由**: `#/lab/query-filter`（场景 1 basic query region，`columnCount: 3`）
- **主题/视口/状态**: light / 800×900 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/query-filter/s1-default-800-light.png`（Keyword placeholder "Order / customer" 截断为 "Order / custom…"）
- **目视描述**: 800 宽下三字段仍强行三列排布，单列 ~140px，文本输入 placeholder 被截断，Status 下拉与 Amount stepper 视觉拥挤但可用。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w4-qf.mjs` narrowGrid 段（label x 坐标序列）
  - 输出: `fields: [{x:318},{x:458},{x:598}]`（列距 140px 恒定）；`narrowOverflow.docOverX: 0`（无溢出，纯挤压）；1280 宽下同字段 284px。
- **对照基准**: 检查提示词 C4（~800 视口不塌不挤）；AMIS query-filter 窄视口惯例为降列数/折叠
- **严重程度**: P3（可用性保留，视觉密度劣化）
- **用户影响**: 平板/半屏窗口下筛选表单可读性下降，长 placeholder 无法完整提示输入格式。
- **修复方向**: query-filter/form 栅格在容器查询或媒体断点 <900px 时将 columnCount 折半（`grid-cols-3` → `grid-cols-1`），或在 query-filter definition 暴露 responsive columnCount 覆盖。
- **归族**: watch-only → 台账（窄视口栅格降级缺失；与“窄视口 flex/固定壳层”族（R2-3c 候选）相邻但根因为栅格列数不响应，独立登记）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项；附新实例证据）

- **主按钮 hover 无反馈（R2-2a button A1-03 P1 族）**：本载体新实例——`搜索` primary 按钮 hover 前后 `backgroundColor/filter/transform/opacity/boxShadow` 六项全等（light `rgb(28,110,242)`→同值；dark `rgb(77,141,245)`→同值，`w4-qf2.json hoverDeep`）；对照 `重置` secondary hover 有 `rgb(241,245,249)` 变化。`s1-hover-search-{light,dark}-1280.png`。
- **`--primary` dark 过亮（R2-1d 7/7 族 → R2-4 首批）**：dark 搜索按钮白字/`rgb(77,141,245)` = **3.26:1**（<4.5）；light 4.6:1 过线。`w4-qf.json contrastS1`。
- **`--popover` dark 亮底（宿主已知族）**：combobox 下拉 dark 整面白底（选项深字白底），`s1-combobox-open-dark-1280.png`；修复后需本卡 H7/B5 复检。
- **i18n zh-CN 回退（dialog F4-11 主条目 + 30+ 控件实例族）**：英文宿主页面上默认提交/重置文案“搜索/重置”、input-number stepper aria“增加/减少”、scope 调试面板“调试/折叠”均中文；折叠场景因 fixture 显式传 `collapsedLabel` 为英文而正常——反证默认值走 `t()` zh-CN 回退。
- **A3 小目标 <24px（R2-2a A3-100/A3-103 族）**：Amount stepper 按钮 `增加/减少` 实测 24×16（`w4-qf.json s1.buttons`）。
- **lab 载体与环境基建族（R2-2a §4.6）**：`createDefaultEnv().notify` 硬 no-op 吞提交 toast（A9-121 的反馈缺失有一半观感来自此处）；scope-debug 面板中文 chrome 逐场景出现。
- **正面对照（计划内锚点复检通过）**：折叠保草稿契约（源码 22-04 注释）程序化坐实——折叠→展开后 `draftAfterReexpand: 'draft-keeps-1'`；折叠壳 toggle 28×28、`aria-expanded` 正确翻转、折叠时 form `hidden` 挂载不卸载。

## owner-doc drift 登记

- owner-doc 登记：无 docs/components/query-filter/design.md（owner-doc-missing，review-b D-1，2026-09-24）；按本 plan Failure Paths 不新建，新建归后续 plan（可引用本卡 + A9-121 作用域契约结论）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-query-filter` → carded（卡列填本路径）；findings 归族后 → digested。
