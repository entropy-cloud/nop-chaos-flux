# [review] R2-1b 设计器域走查 — 独立复核报告

- **批次**: R2-1b ｜ **复核人**: 独立复核 agent（fresh session） ｜ **日期**: 2026-09-23
- **方法**: 按 `docs/skills/visual-page-quality-inspection-prompt.md` 阶段 3 口径——未采信原发现文本，全部重开页面、重跑独立编写探针、重截同态截图后独立判断。探针（自写）位于 `_tmp/r2-1b-recheck/`，输出 JSON 同目录；截图位于 `_tmp/visual-inspection-2026-09-23/r2-1b-recheck/<page>/`。
- **环境**: dev server http://127.0.0.1:4175（未重启），Playwright 1.63.0 chromium，1280×800 为主视口。

## 汇总表

| #      | 发现                                     | 原级                | 结论                             | 复核要点                                                                                                        |
| ------ | ---------------------------------------- | ------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1      | flow-designer G7-01 inspector 写路径断   | P1                  | **保留 P1**                      | fill 回弹 / combobox 不落盘 / JSON 证实 document 未写入，全部复现；钉钉 tab 对照写路径正常，断点限定 graph 模式 |
| 2      | taskflow-designer G7-02 双向断链         | P1                  | **保留 P1**                      | 读方向字段全空、写方向 fill 不落画布，双向均复现                                                                |
| 3      | scada-editor-demo G7-01 键入错提交       | P1                  | **保留 P1**                      | 逐键复现：键 355 → session 2405、input 恒显 240，图元被移出画布                                                 |
| 4      | print-designer G8-01 dark 墨色翻转       | P1（原存疑可降 P2） | **保留 P1**                      | dark 墨色 rgb(230,236,243) on 白纸 ≈1.19:1（light 12.61:1）；裁决见 §4，不降 P2                                 |
| 5      | flow-designer C2-01 调试器 chip 遮返回键 | P1                  | **保留 P1**                      | elementFromPoint 命中 chip、信任点击返回键中心不导航；word-editor 返回钮**未**被功能性遮挡（见 §5 族扩面核对）  |
| 6      | flow-designer G1-01 选中无视觉标识       | P2                  | **保留 P2**                      | 17 个子树元素 hover vs selected 样式 diff=0；选中边与默认边 stroke/宽度/dash 全同                               |
| 7      | flow-designer A1-01 网格开关死控件       | P2                  | **保留 P2**                      | click/Space 后 aria-checked 恒 false；开关未勾选但网格 pattern opacity=1 可见，三态矛盾复现                     |
| 8      | dingtalk-flow-demo F4-02 孤儿路由        | P2                  | **保留 P2**                      | 路由表有项（domain-route-entries.ts:465）、App.tsx 无 case、运行时落主页、主页无卡片                            |
| 9      | word-editor C1-01 大纲面板被裁           | P2                  | **保留 P2**                      | 1280 下 nop-word-editor-page / nop-workbench clipX sx=222；800 下大纲面板整体不可达且无横向兜底                 |
| 存疑-1 | scada 连线拖拽可用性                     | —                   | **可用**（此前探针落点错误）     | 双接头 + 边锚点场景 commit/undo/redo 全通；中心落点距最近锚点 25px > 8px 阈值，noop 属正确行为                  |
| 存疑-2 | flow dark 对比度探针 3.81/1.05           | —                   | **确为渐变解析限制（探针伪值）** | 像素采样 13.6:1（light 16.36:1），dark 画布文字实际可读，G8 该项 pass                                           |

---

## 1. [R2-1b-G7-01] flow-designer 属性面板写路径断 — 保留 P1

**原发现摘录**: 选中节点后面板"名称"输入即回弹、回退表单可输入但不落盘、触发方式 combobox 选择后画布不变、JSON 面板证实 document 未写入；对照组钉钉 tab（tree 模式）写路径正常。

**独立取证**（探针 `_tmp/r2-1b-recheck/flow-main-recheck.mjs` → `flow-g7-c2-g1-a1-out.json`）:

- 受控回弹: `fill(名称, "改名复核")` → 200ms 后 `input.value = "开始"`（bouncedBack=true）；追加 Enter/Tab 提交后 value 仍 `"开始"`，画布 innerText 不含改名。
- 回退表单: `input[name="label"]` fill `"回退改名复核"` → 本地保留，800ms 后画布仍 `开始|register|…`（canvasChanged=false）。
- combobox: 选中"定时触发"（comboNow=定时触发）→ 900ms 后画布仍 `register`（canvasChanged=false）。
- JSON 面板: 打开后全文 `containsRegister=true, containsSchedule=false, containsRenamed=false` → document 确未写入。
- 对照组复验（`flow-dingtab-recheck.mjs` → `flow-dingtab-out.json`）: 钉钉审批流 tab 树模式 fill `发起人→发起人R` → 画布即时出现 `发起人R`。断点限定 graph 模式 schema inspector，与原卡口径一致。
- 截图: `flow-designer/flow-designer-json-recheck-light.png`、`flow-designer-combobox-open-recheck-light.png`

**结论**: **保留 P1**。主工作面编辑全链路无效且静默，四条子证据逐条复现。

## 2. [R2-1b-G7-02] taskflow-designer 面板双向断链 — 保留 P1

**原发现摘录**: 选中节点后 `step.common.*` 字段不回填（全空）、摘要卡显示原始 id、fill 后画布不变。

**独立取证**（`taskflow-g7-recheck.mjs` → `taskflow-g7-out.json`）:

- 读方向: 点击 Script 节点 validateInput（selectedText 确认）→ `input[name="step.common.name"]` value=`""`、`step.common.displayName`=`""`、`step.props.source` textarea=`""`——所选节点名应为 validateInput，回填为零。
- 写方向: fill `step.common.name = "renamedRecheck"` → 输入框本地保留，800ms 后画布 innerText 仍 `validateInput|…`（canvasChanged=false）。
- 截图: `taskflow-designer/taskflow-designer-g7-write-recheck-light.png`

**结论**: **保留 P1**。选中→查看→修改闭环双向皆断，与原卡一致。

## 3. [R2-1b-G7-01] scada-editor-demo inspector 键入错提交 — 保留 P1

**原发现摘录**: x 字段全选键入 355 → 会话写成 2405、输入框弹回 240，图元被静默移出画布。

**独立取证**（`scada-g7-conn-recheck.mjs` → `scada-g7-conn-out.json`，经测试句柄逐键采样 session.workingConfig + input.value）:

- tripleClick 选中 x 输入框（value=240）→ 键「3」→ sessionX=3、inputVal=**240**；键「5」→ sessionX=**2405**、inputVal=**240**；再键「5」→ 2405/240；Tab → 2405/240。
- 终态: demo-text x=2405（画布外），`canvasTextAfter=""`；显示与状态双向脱节、终值≠键入值，与原卡完全一致。
- 截图: `scada-editor-demo/scada-editor-demo-inspector-stepwise-recheck-light.png`

**结论**: **保留 P1**。数值错提交 + 显示失同步 + 图元不可见丢失，逐键复现。

## 4. [R2-1b-G8-01] print-designer dark 墨色翻转 — 保留 P1（特别裁决：不降 P2）

**原发现摘录**: dark 纸面恒白（V8a 豁免）但墨色翻成浅灰白（1.19:1、标尺 1.1:1），模板内容近乎消失；原卡存疑"打印设计器属亮室工具可降 P2"。

**独立取证**（`print-word-recheck.mjs` → `print-word-out.json`，computed + pngjs 像素双轨）:

- light: 标题 computed `rgb(33,53,71)` on 纸 `rgb(255,255,255)` → 像素采样对比度 **12.61:1**。
- dark: 同一标题 computed 翻为 `rgb(230,236,243)`，纸面仍 `rgb(255,255,255)`；标题区域像素采样 bgMode=[255,255,255]（84% 占比=纸面）、最深像素=[229,229,229]（浅墨反锯齿边界）→ 墨/纸对比 **≈1.19:1**，与原卡一致（阈值 4.5:1）。
- 截图: `print-designer/print-default-dark-recheck.png`（出库单标题、`${orderNo}`、表头全部洗白，模板形如清空）、对照 `print-default-light-recheck.png`。

**P1 vs P2 裁决**:

1. **豁免范围**: V8a 裁决仅覆盖"纸面 dark 恒白"，不覆盖墨色随主题翻转——原卡对豁免边界的读法正确，本条不在豁免内。
2. **用户影响量级**: 画布是该页唯一工作面（占比最大主区域），dark 下其全部内容不可读——按判级表属"大范围视觉缺陷"（P1 定义），并触及 P0 示例字面（"dark 下正文不可读"）。P2 定义（不一致/缺失视觉反馈）远低于此量级。
3. **dark 一级公民承诺**: 检查提示词状态矩阵 dark 必查、B5 dark 平价、theme-compatibility 的令牌化主题契约，均把 dark 视为受支持的一级主题。"亮室工具"论成立的前提是 dark 使用属边缘路径——与上述承诺矛盾。降级条款（"P1 仅出现在一次性路径"）也不适用：模板编辑是本页高频主路径。
4. 结论: **P1 成立，不予降级**。同时如实登记：按判级表 P0 示例的字面口径存在升 P0 空间，修复排期可据此加权。

## 5. [R2-1b-C2-01] flow-designer 调试器 chip 遮返回键 — 保留 P1 ＋ word-editor 族扩面核对

**原发现摘录**: 固定 chip（z9998）整体盖住返回按钮，elementFromPoint covered=true；taskflow 页同源压标题。

**独立取证**（`flow-main-recheck.mjs`）:

- 几何: 返回按钮 rect(37,36,28,28)，中心 (51,50)；chip rect(24,24,68,28)、`position:fixed; z-index:9998`。`elementFromPoint(51,50)` → chip 按钮（text=106），`hitInsideBackButton=false`。
- 功能: 全新 context 对返回键中心做信任点击 → `location.hash` 仍 `#/flow-designer`（点击被 chip 截获、调试器面板被展开而非导航）——返回键在鼠标路径上确实不可用。
- 视觉: `flow-designer/flow-designer-topleft-overlap-recheck-light.png` 可见返回键被 chip 整体压住、页标题 "Customer onboarding" 前 ~19px 被裁。
- **word-editor 族扩面核对**（`print-word-recheck.mjs` → `word.backInfo`）: 返回钮 rect(16,8,28,28)，中心 (30,22)；`elementFromPoint` 命中返回钮自身（insideBack=true）。chip fixed 位 (24,24) 只与其下半 (y24–36) 角部相交，中心点在 chip 上缘之外。**word-editor 返回键未被功能性遮挡，仅为视觉角部碰撞**——word 卡 §4 "遮压返回箭头"的表述偏重，R2-1a-C2-01 族在 word-editor 的扩面应记"视觉层"，真正的功能性遮挡以 flow-designer（P1）与 print-designer 顶栏首按钮（原卡 P2，本次 dark 截图同框佐证）为准。

**结论**: flow C2-01 **保留 P1**；word-editor 同象**降为视觉碰撞记录**（不构成指针遮挡）。

## 6. [R2-1b-G1-01] flow-designer 选中无视觉标识 — 保留 P2

**原发现摘录**: hover vs selected 全子树 style diff 为空；选中边与默认边全同；唯一选中感知来自 inspector/浮动工具栏。

**独立取证**（`flow-main-recheck.mjs` → `g1`）:

- 节点: 选中态下对 17 个子树元素 diff `border/outline/boxShadow/background/filter/color/opacity` → **diff 0 项**。
- 边: 选中前 stroke `rgb(148,163,184)`/2px/dash none；`.selected` 置位后逐项全同。
- 截图: `flow-designer/flow-designer-node-selected-recheck-light.png`（start-1 已选中、画布无任何选中框/环）、`flow-designer-edge-selected-recheck-light.png`。

**结论**: **保留 P2**（明显缺失的视觉反馈；`selected` 类与 aria 契约在、纯视觉层缺失，systemic 归族判断不变）。

## 7. [R2-1b-A1-01] flow-designer 网格开关死控件 — 保留 P2

**原发现摘录**: 开关 aria-checked 恒 false（click/键盘均无效）且画布网格可见，三态矛盾。

**独立取证**（`flow-main-recheck.mjs` → `a1`）:

- 初始 `aria-checked="false"`、非 disabled；信任点击后仍 `false`；focus+Space 后仍 `false`。
- `.react-flow__background pattern` 点击前后均 `display:inline; opacity:1`（网格线可见）。
- 截图 `flow-designer/flow-designer-node-selected-recheck-light.png` 同框可见：工具栏开关未勾选 + 画布满幅网格线。

**结论**: **保留 P2**。

## 8. [R2-1b-F4-02] dingtalk-flow-demo 孤儿路由 — 保留 P2

**原发现摘录**: domain-route-entries 注册了 id、App.tsx switch 无 case、访问落主页、主页卡片清单亦无此项。

**独立取证**:

- 代码: `apps/playground/src/domain-route-entries.ts:465` 注册 `dingtalk-flow-demo`（eyebrow "Style Prototype"）；`apps/playground/src/App.tsx` domain switch case 清单无该 id（含 scada-demo/print-designer 等，独缺此条）。
- 运行时（`dingtalk-route-recheck.mjs` → `dingtalk-route-out.json`）: 直接访问 `#/dingtalk-flow-demo` 渲染主页（h1=Playground、"Select a testing scenario below"，`hasReactFlow=false`）；主页卡片清单无 DingTalk 项。
- 截图: `dingtalk-flow-demo/dingtalk-route-visit-recheck.png`。

**结论**: **保留 P2**（路由死项 + 描述与实况矛盾；实况内容可经 flow-designer 钉钉 tab 到达，不到 P1）。

## 9. [R2-1b-C1-01] word-editor 大纲面板被裁 — 保留 P2

**原发现摘录**: 1280 下右侧大纲面板被裁 222px（`nop-word-editor-page` overflow-hidden 无兜底），800 下面板整体不可达。

**独立取证**（`print-word-recheck.mjs` → `word`/`wordNarrow`）:

- 1280: `nop-word-editor-page h-screen overflow-hidden` clipX **sx=222**（cw=1280）；`nop-workbench` 同 sx=222；工作台内容右缘 1502 > 视口 1280。
- 800×900: 大纲面板完全不在视口内；`document.scrollWidth=800=innerWidth` → overflow-hidden 下无横向恢复路径。
- 截图: `word-editor/word-default-wide-recheck.png`、`word-default-narrow-recheck.png`（窄视口仅剩数据集面板+纸面）。

**结论**: **保留 P2**（默认基准视口即裁切 + 窄视口功能丢失；大纲为次面板，主编辑路径不受阻，级次恰当）。

---

## 存疑项复核（事实结论，不判级）

### 存疑-1 scada 连线拖拽（connection-drag-controller）— **交互可用，此前失败系探针落点错误**

取证链（`scada-g7-conn-recheck.mjs` → `scada-conn-dispatch.mjs` → `scada-conn-reg.mjs` → `scada-conn-anchor.mjs`，输出同名 JSON）:

1. demo schema 恒无 pipe-junction → 经测试句柄 `addSymbol` 注入双接头（recheck-j1(180,320,50,50)、recheck-j2(480,320,50,50)；junction 为 24 内置图元之一，`register-builtin.ts:31` 注册，palette 可达）。
2. mouse/PointerEvent 序列 pointerdown j1 主体内 → **beginDrag 确认触发**（window 上注册 `{once:true}` pointerup 监听，regDelta=1，与 `connection-wiring.ts:56` 一致）。
3. 落点语义: `anchor-snap.ts` 吸附锚点为 8 个**边锚点**（角+边中点，无中心点），阈值 ±8px。此前 walkthrough（junction→矩形中心）与本复核前两次尝试（落 j2 中心）距最近锚点均 25px > 8px → noop 属**正确行为**，非缺陷。
4. 落 j2 左中锚点 (480,345)±2px → pointerup **commit 成功**: `j1.custom.connections = [{id:'recheck-j1-conn-0', x:0, y:0.5, direction:'out', target:'recheck-j2'}]`；undo 栈 `topOperationKind='connection-update'`；undo 清除、redo 恢复，全链路可逆。
5. 视觉说明: 已提交连线按 `pipe-junction.ts` 设计渲染为 junction 界内 stub 短线（归一化端点指向），junction↔设备整线渲染属 I16 后置——截图无跨图元长线非缺陷。
6. 截图: `scada-editor-demo/scada-editor-demo-connection-anchor-drop-recheck-light.png`、`scada-connection-drag-mid-recheck-light.png`。

**事实结论**: 连线三段式交互（拾起→拖动吸附→释放提交）在生产页面可用且可逆；原卡"探针终点无效而非产品缺陷"的判断**正确**，本次以正向证据（commit+undo/redo）坐实。

### 存疑-2 flow 页 dark 对比度探针 3.81/1.05 — **确为渐变背景解析限制（探针伪值），dark 画布文字实际可读**

取证（`flow-dark-pixel.mjs` → `flow-dark-pixel-out.json`，pngjs 全帧像素采样）:

- 解析限制根因坐实: 画布文字元素自上而下叠 4+ 层背景，其中 3 层为 background-image 渐变（`fd-xyflow-surface` radial-gradient、workbench `linear-gradient(135deg, rgba(30,41,59,.5)…)`、body `linear-gradient(rgb(7,17,31)→rgb(15,23,42)→rgb(17,28,52))`）——DOM effectiveBg 探针只合成 backgroundColor（`rgba(15,23,42,0.55)` 永不达到不透明）且忽略 background-image → 兜底白底，产出 3.81/1.05 伪值。
- 像素真值（dark）: 节点标题/副标题文字像素 [226,229,233] vs 局部背景众数 [18,27,46] → **13.6:1**；light 同法 **16.36:1**。两者均远超 4.5:1。
- 截图: `flow-designer/flow-designer-default-dark-recheck.png`。

**事实结论**: G8"dark 画布文字可读"成立，flow 卡 B1 的 pass 判定与归因（渐变解析限制）均正确；该探针方法的局限应记入误报排除表（与 word 卡 dark 1.19 伪值同族——注意 print-designer 的 1.19:1 是**纸面白底上的浅墨**，属真实缺陷，两者数值巧合、机理相反，勿混淆）。

---

## 复核总评

- 9 条发现全部**保留**，原判级 8 条维持；print G8-01 特别裁决为**维持 P1**（并登记存在按判级表升 P0 的字面空间，供修复排期加权）。
- 2 条存疑均获事实结论：scada 连线交互**可用**（原"探针终点无效"判断正确）；flow dark 对比度低值**确系探针伪值**。
- 一处表述修正：word-editor 返回键仅视觉角部碰撞（中心可命中），不构成指针遮挡，族扩面记录应改记视觉层。
- 系统性模式再确认：flow/taskflow/dingtab 三页同源的 xyflow 桥接层缺陷（G1 选中无标识、G7 写断链限 graph 模式）与 playground 壳层悬浮件碰撞（C2 族）两组归族判断与原卡一致。
