# R2-1d 走查独立复核 — Review C（fresh session）

- **复核人**: 独立复核 agent C（fresh session，先独立取证再比对原发现）
- **日期**: 2026-09-23
- **口径**: `docs/skills/visual-page-quality-inspection-prompt.md`（阶段 3 独立复核：重开页面、重截同态截图、重跑探针，不得只读发现文本后采信）
- **环境**: dev server `http://127.0.0.1:4175`（未重启）；Playwright 1.63.0；探针落 `_tmp/r2-1d-recheck/`（`probe-c1-kanban-b501.mjs` / `probe-c1b-backbtn.mjs` / `probe-c2-w2b-a727.mjs` + `probe-c2-out.json`），截图落 `_tmp/visual-inspection-2026-09-23/r2-1d-recheck/{kanban,w2b}/`
- **复核范围**: R2-1d P1 补充复核 2 条（kanban B5-01、w2b-date-family A7-27）

## 0. 汇总表

| #   | 发现                                                    | 页面            | 原判级 | 独立取证结果                                                                                                                   | 结论                            | 备注                                                                                                                                                                |
| --- | ------------------------------------------------------- | --------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | B5-01 demo 载体头部 `bg-white` dark 下标题/返回钮不可见 | kanban          | P1     | dark：header bg=rgb(255,255,255)（字面白）、h1/返回钮前景=rgb(230,236,243)、对比度 **1.19:1**；light 对照 12.61:1              | **保留 P1**                     | 数值与原卡吻合；见 §1 附注（ndbg 悬浮球叠压为既有族，不影响判定）                                                                                                   |
| 2   | A7-27 bounded 日期清值后弹层打开即「死月全灰」          | w2b-date-family | P1     | 清值→重开：caption 2026年9月、日格 **35/35 全 disabled、可选日=0**；对照组有值首开 caption 2024年6月、disabled 0；根因源码实锤 | **保留 P1（两处取证细节修正）** | ①计数 35/37→35/35（原 37 含 2 个导航钮）；②「连点 ‹ 27 个月」不准——caption 年/月下拉提供 2 步逃逸，但下拉项 0 禁用（可选出更多死月）且无引导，不构成降级理由。见 §2 |

**总裁决：2 条全部保留 P1，0 驳回，0 降级；#2 附两处取证细节修正。**

---

## 1. [R2-1d-B5-01] kanban demo 载体头部 `bg-white` dark 下标题/返回钮不可见 —— 保留 P1

### 原发现摘录（cards/kanban.md）

dark 1280 默认态：头部条仍为白底，页面标题与返回箭头以近白色渲染在白底上，肉眼不可见。程序化证据：6 个 demo 载体源码（如 `kanban-demo.tsx` L141）`<div className="… border-b bg-white shrink-0">`；dark computed header bg=`rgb(255,255,255)`、h1 color=`rgb(230,236,243)` → 白底白字。判 P1，归族 systemic → R2-4（本波 8 页同款写法）。

### 独立取证（fresh 重开 `#/kanban`，双主题同态重跑，`_tmp/r2-1d-recheck/probe-c1-kanban-b501.mjs`）

1. **源码**：`apps/playground/src/pages/kanban-demo.tsx` L141 现存 `<div className="flex items-center gap-3 px-4 py-2 border-b bg-white shrink-0">`，内含 ghost 返回钮 + `<h1 className="text-lg font-semibold">`；`#/kanban` 路由确挂 `KanbanDemoPage`（`App.tsx` L235）。
2. **light 对照**：headerBg=`rgb(255,255,255)`、h1/返回钮/箭头 svg 前景=`rgb(33,53,71)`，对比度 **12.61:1**（正常）。
3. **dark 实测**：`dark` class 已挂 `documentElement`（主题生效），headerBg 仍=`rgb(255,255,255)`（字面白不随主题）；h1、返回钮、箭头 svg 前景全部=`rgb(230,236,243)`（dark 前景近白）；对比度 **1.19:1**——远低于 4.5:1，甚至低于 3:1 图形下限。
4. **返回钮专项**（probe-c1b）：按钮 `backgroundColor=rgba(0,0,0,0)`、border 透明、svg stroke=`rgb(230,236,243)`——透明底叠白头部，近白箭头同样 1.19:1 不可见；元素级截图 `back-btn-dark.png` 中箭头仅剩极淡残影。
5. **截图**：`_tmp/visual-inspection-2026-09-23/r2-1d-recheck/kanban/header-strip-{light,dark}.png`、`full-dark-1280.png`——dark strip 中「Kanban Board Demo」为白底上的极淡灰字，肉眼基本不可读。
6. **附注（不影响判定）**：strip 左端深色胶囊经查为 ndbg 悬浮球越界叠压按钮区（R2-1d-C2-01 既有族同构），非返回钮底色；B5-01 判定不依赖该元素。

### 结论：**保留 P1**

- 与原卡逐项吻合（bg 字面白、前景近白、h1 与 ghost 返回钮同色不可见），R2-1a-B5-02 族模板实例成立；「8 页 demo 载体同款写法」的族级主张与 L141 源码模式一致（本轮运行时仅复测 kanban 实例，族内其余页面未逐一重测，不影响本条判定）。
- 修复方向照旧：`bg-white` → `bg-card`/`bg-background`，一行/页，可并入 R2-4 批按「demo 载体字面底色」归族处理。

---

## 2. [R2-1d-A7-27] bounded 日期清值后弹层打开即「死月全灰」—— 保留 P1（两处取证细节修正）

### 原发现摘录（cards/w2b-date-family.md）

清空值后再开弹层，日历停在「今天」所在月（2026-09），整月日格全部禁用灰化且无提示；原卡探针输出 `buttons=37, disabledBtns=35`（当月全部不可选），对照组有值首开 caption=2024-06、`disabledBtns=0`；称「用户需连点 ‹ 27 个月才能回到 2024」。判 P1：清值→重选是高频路径，用户面对整月死格且无引导。

### 独立取证（fresh 重开 `#/w2b-date-family`，dark 1280 全序列重放 + light 交叉验证，`_tmp/r2-1d-recheck/probe-c2-w2b-a727.mjs`，输出 `probe-c2-out.json`）

1. **对照组（demo-input-date 有值 2024-06-09，dark 首开）**：caption=`2024年6月`、日格 35、disabled=**0**——默认月跟随值，约束验证本身正常。
2. **清值**：点 `date-clear-inline`，回显 `date:2024-06-09` → `date:—`（清值生效）。
3. **重开（dark，决定性）**：caption=**`2026年9月`**、日格 **35、disabled=35、可选日=空集**；整月无一个可选日，且无任何「为何不可选」提示。截图 `dead-month-dark-1280.png` / `dead-month-dark-pop.png`：全月灰格，仅 today 23 号灰圈标记。
4. **死月内点击试探**：枚举启用日格为空（`enabledDayExists:false`），点击尝试后回显仍 `date:—`——当前态确实无法完成选择。
5. **light 交叉验证**：同序列 light 下完全同构（caption 2026年9月、35/35 disabled）——非 dark 特有。
6. **bounded 字段（demo-input-date-bounded）**：有值（2024-06-15）首开 caption=2024年6月，disabled=24，enabled 恰为 **10–20 共 11 天**——与原卡「enabled 恰为 10–20 共 11 天」吻合，min/max 边界正确。**补充事实**：该字段未开 `clearable`（无 inline 清除钮），故死月态在本 demo 中用户不可达，仅与 `demo-input-date` 共用同一组件代码路径（源码同构成立，运行时复现载体为 `demo-input-date`）。
7. **根因源码实锤**：`packages/flux-renderers-form/src/renderers/date/date-field-control.tsx` L270 `defaultMonth={selected ?? new Date()}`——无值时默认月取 today，不向 [minDate,maxDate] 夹逼；L67–72 `buildDisabledMatchers` 以 `{before:minDate}/{after:maxDate}` 禁用今日所在整月。与原卡修复方向（无值时 `clamp(today, minDate, maxDate)` 所在月作 defaultMonth）一致。
8. **逃逸路径核实（对原卡的修正）**：caption 为 `captionLayout="dropdown"`，年下拉（1926–2026 共 101 项）与月下拉（12 项）均**0 禁用**——用户可 2 步跳到 2024 年 6 月，原卡「需连点 ‹ 27 个月」表述不成立；但下拉项不按 [min,max] 裁剪（选 2025/2027 同样落死月）、死月态亦无引导指向下拉，逃逸存在但完全无引导，用户仍在失败态循环。

### 计数口径对齐

原卡 `buttons=37, disabledBtns=35` 系把弹层内 2 个导航钮计入分母（35 日格 + 2 导航 = 37）；本轮按日格过滤后为 **35/35**。两种口径同指一事实：**可见月全部日格禁用**。差异不影响结论。

### 结论：**保留 P1**

- 核心缺陷全链路复现并在源码定位：清值→重开落在 today 月，当 [min,max] 不含 today 时整月 0 可选、无提示；「清空重选」为 clearable 日期字段高频路径，A7（弹层打开态基本完整性）fail 成立。
- 两处取证细节修正随本复核回写：①计数口径 35/35（日格口径）；②逃逸路径为年/月下拉 2 步（非 ‹ 连点 27 次），但选项 0 裁剪 + 无引导，不足以降级。
- 归族照旧：local → R2-4 批，单渲染器根因（`date-field-control.tsx` L270），date-range/datetime 共用底层时同修；建议同批给年/月下拉按 [min,max] 裁剪选项（同根因的次级面）。
