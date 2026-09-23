# R2-2a 走查独立复核 — Review A（basic 域 18 卡，fresh session）

- **复核人**: 独立复核 agent A（fresh session，先独立取证再比对原发现）
- **日期**: 2026-09-24
- **口径**: `docs/skills/visual-page-quality-inspection-prompt.md`（阶段 3 独立复核：重开页面、重截同态截图、重跑探针，不得只读发现文本后采信）；严重度判据用该提示词严重度表（P1=明显交互障碍/大范围视觉缺陷且高频路径必经；P2=明显不一致/缺失反馈/系统性偏差；系统性发现 ≥3 同根因整体升一级）
- **环境**: dev server `http://127.0.0.1:4175`（200 确认，未重启）；Playwright 1.63.0；探针落 `_tmp/r2-2a-review/`（`ra-*.mjs` + `ra-*.json`），截图落 `_tmp/r2-2a-review/ra/<control>/`
- **复核范围**: R2-2a basic 域 P1 ×4 + P2 ×10，共 14 条（涉及 badge/button/dialog/icon/keyboard/page/scope-debug/tabs/text 9 张卡）
- **本路第二职责**: basic 域 18 控件 owner-doc drift 复核（见 §drift）

## 0. 汇总表

| #   | 发现 id     | 卡          | 原判级 | 独立取证结果                                                                                                                                                      | 结论                      | 备注                                                                                                           |
| --- | ----------- | ----------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | R2-2a-B5-01 | badge       | P1     | 真 dark 下 secondary 徽章 fg rgb(178,206,251) on 不透明亮紫底 rgb(203,186,252) = **1.1:1**（像素级坐实）                                                          | **保留 P1（证据修正）**   | 原卡 dark success/warning "同败"系探针伪象，实为 6.36/6.24 过；dark danger 3.24 实败（见 §1）                  |
| 2   | R2-2a-A1-03 | button      | P1     | Default `<button>` hover 前后 bg/color/shadow 全同（hoverChanged=false）；同页 secondary/outline/ghost/destructive 均有 Δ                                         | **保留 P1**               | 逐字命中严重度表 P1 示例"主按钮 hover 无反馈"                                                                  |
| 3   | R2-2a-B5-04 | button      | P1     | dark Secondary 钮 1.1:1（与 #1 同 token 对）；dark Default 3.26 复现（已知族引用）                                                                                | **保留 P1**               | 数值修正：原 1.06 → 实测 1.1，实质不变                                                                         |
| 4   | R2-2a-A5-21 | icon        | P1     | 对装机 lucide-react@1.17.0 复刻归一化链：home/house/ant-design:home(-outlined) 四形态全部落 `icons['Home']` 缺键 → Circle；live fallback 场景渲染 `lucide-circle` | **保留 P1（表述精确化）** | 见 §4；P1 依据=系统性发现升一级条款（同根因 ≥3 实例：m3/m5 tabbar + 本卡）                                     |
| 5   | R2-2a-B1-02 | badge       | P2     | light 四语义徽章 3.05 / 2.14 / 1.76 / 3.12，全部 <4.5（12px font-medium）                                                                                         | **保留 P2（数值修正）**   | 方向与原卡一致；原 2.59/2.13/3.78 与本次差异为 oklab-α 合成口径差，均不达标                                    |
| 6   | R2-2a-B1-05 | button      | P2     | "Destructive" 钮实为 `variant:'destructive'` = **红字 rgb(239,67,67) on 10% 红底合成 rgb(253,236,236) = 3.12:1**                                                  | **保留 P2（证据修正）**   | 原卡"白字压红实底 3.78"系 fg/bg 对调（比值巧合相等）；根因同 `--destructive` 令牌过亮                          |
| 7   | R2-2a-H3-08 | dialog      | P2     | 双主题复现：top 60 + height 768 = bottom **828**（阈值 792，超 36）；OK 钮 rect 886–918 首屏不可见；body 内滚可用（scrollTop 106）                                | **保留 P2**               | 几何与原卡逐项一致；根因三件套见 §7                                                                            |
| 8   | R2-2a-A9-23 | keyboard    | P2     | 复现：chord/裸 g/Mod+Enter 行为态均更新（last chord: g o / g (fallback)）而 toast 扫描七类选择器全 0、无 Toaster 节点                                             | **保留 P2（根因改判）**   | 真吞点=lab env 的 `notify: () => undefined`（defaults.ts L26），仅挂 Toaster 修不好（见 §8）                   |
| 9   | R2-2a-E2-24 | page        | P2     | h2 "Team Dashboard" 16px/400 与正文 16px/400 完全同权重（sameAsBody=true）                                                                                        | **保留 P2**               | 根因 page.tsx L262 裸 `<h2>` + 无标题排版基线                                                                  |
| 10  | R2-2a-B5-34 | page        | P2     | 复现：emulateMedia dark → `prefersDark:true` 但 dataMode 恒 'light'、标题色恒 light 墨；setAttribute 后翻 rgb(230,236,243)                                        | **保留 P2（状态更新）**   | runner 修复已**在工作区未提交**（capture-visual-matrix.mjs +6 行），见 §10                                     |
| 11  | R2-2a-E5-29 | scope-debug | P2     | 双主题 section bg rgba(0,0,0,0)、border 0、padding 0、header block、pre overflow-x:visible；全仓 css 对 `nop-scope-debug` 零命中                                  | **保留 P2**               | 根因 scope-debug.tsx L105–124 声明类与 slot 但无样式表                                                         |
| 12  | R2-2a-H5-32 | tabs        | P2     | Note dialog 560@x360，动作条 flex justify-content:normal，Save @x384 吸左、右侧 512px 条空置；内建 关闭 @x884 吸右上                                              | **保留 P2（根因锐化）**   | 该动作条=form renderer `[data-slot="form-actions"]`，default-spacing.css L29–32 只给 flex+gap 无对齐（见 §12） |
| 13  | R2-2a-F4-33 | tabs        | P2     | 全页 `.nop-tabs` 无一携带 `data-tabs-mode`/`data-tabs-sidebar-right`；s4(listX 301<contentX 389) 与 s5(301<400) 几何同构（导航均居左）                            | **保留 P2**               | fixture L127–149 未设 tabsMode/sidePosition；renderer 分支（tabs.tsx L135/L443/L465）全仓零覆盖                |
| 14  | R2-2a-C1-36 | text        | P2     | 400 字符无空格串 scrollW 4147 vs clientW 918、overflow-wrap:normal、text-overflow:clip；verticalClipped=false → `measureOverflow` 恒 false，展开钮永不出现        | **保留 P2**               | DOM 含全文 400 字符，可视 ≈918px，静默信息丢失                                                                 |

**总裁决：14 条全部保留（P1 ×4、P2 ×10），0 降级，0 驳回；其中 #1/#6 证据修正、#8 根因改判、#4 表述精确化、#10 状态更新（修复已在工作区）、#12 根因锐化、#5 数值修正。**

---

## 1. [R2-2a-B5-01] dark secondary 徽章不可读 —— 保留 P1（证据修正）

### 原发现摘录（cards/badge.md）

dark 下 Info/Active/计数 0 等 secondary 徽章为实心亮紫药丸、亮蓝字，1.06:1 完全不可读；并称 dark Success 1.84 / Warning 1.94 同败、Danger 4.92 仅 Danger 过。根因 `--secondary-foreground` 未随 dark 翻转（theme-tokens styles.css L195–198 classic dark、L315–318 glass dark）。

### 独立取证（`ra-badge-button.mjs` + `ra-pixels.mjs` 像素级 ground truth）

- **token 层坐实**：styles.css L195–198 classic dark `--secondary: 255 92% 86%`（亮紫）与 `--secondary-foreground: 217 89% 84%`（亮蓝）成对亮色；L315–318 glass dark（256 92% 79% + 172 76% 82%）同构。
- **像素级实测**（对 dark 截图逐元素采样渲染像素，非 DOM 推算）：secondary 徽章渲染底 = rgb(203,186,252)（不透明亮紫，与 DOM 侧一致），fg rgb(178,206,251) → **1.1:1**（原卡 1.06，差异为 fg oklab 解析位差，实质相同：不可读）。dark 截图目检一致（Info/Active/0 药丸文字不可见）。
- **证据修正（同卡 dark 侧补充数值推翻）**：原卡"dark Success 1.84 / Warning 1.94 同败、Danger 4.92 过"为探针伪象——DOM 逐层合成在无不透明背景祖先时以白为基线，而本应用暗背景经 `background-image` 渐变绘制。像素实测：dark Success **6.36 过**（底像素 rgb(23,63,57)）、Warning **6.24 过**（rgb(61,53,37)）、Danger **3.24 败**（rgb(55,24,30)，fg rgb(217,38,38)）。即 dark 下语义 tint 徽章里 success/warning 达标，danger 反而不达标（原卡结论反向）。
- 截图：`_tmp/r2-2a-review/ra/badge/recheck-dark-1280.png`（对照 `recheck-light-1280.png`）。

### 结论：**保留 P1**

secondary 是 badge 未指定 level 时的默认变体，dark 下默认徽章文字完全不可读，属"高频路径大范围视觉缺陷"，P1 成立。**修复面收窄**：翻 `--secondary-foreground`（classic+glass dark 两块）即可消 P1；danger tint 的 3.24 归入 R2-4 对比度族随 token 修复一并复检，原卡"dark success/warning 同败"表述不再作为修复依据。

---

## 2. [R2-2a-A1-03] default 按钮悬停零反馈 —— 保留 P1

### 原发现摘录（cards/button.md）

default variant `<button>` 分支无任何 `hover:` 规则（仅 `[a]:hover:bg-primary/80`），hover 前后 bg/shadow 零变化。

### 独立取证（`ra-badge-button.mjs` hoverFocus 段）

- Default 钮（渲染 `<button>`，fixture 实证）：hover 前 `{bg rgb(28,110,242), color rgb(255,255,255), shadow none}` = hover 后全同，`hoverChanged:false`；250ms 等待排除 transition 未完成。
- 同页对照：Secondary（bg → `--secondary`@0.8）、Outline（白→rgb(241,245,249) 且字色加深）、Ghost（透明→rgb(241,245,249)）、Destructive（tint 0.1→0.2）`hoverChanged` 全 true——唯独 default 无 hover 可供性，与原卡一致。
- 根因复核（`packages/ui/src/components/ui/button.tsx`）：L17 `default` 与 L22 `primary` 类串只有 `[a]:hover:bg-primary/80`；**L32–38 `info/success/warning/danger` 四个 level 档同样只有 `[a]:hover:*`**——原卡修复方向已提及 level 档，复核确认其与 default 同构，属同一修复 PR 面。

### 结论：**保留 P1**。逐字命中严重度表 P1 示例"主按钮 hover 无反馈"；修复方向照原卡（`hover:bg-primary/90` 双通道 + level 档同步）。

- 截图：`_tmp/r2-2a-review/ra/button/recheck-hover-default-light-1280.png`

---

## 3. [R2-2a-B5-04] dark secondary 按钮不可读 —— 保留 P1

### 原发现摘录（cards/button.md）

dark Secondary 钮 color rgb(178,206,251) on rgb(203,186,252) → 1.1:1；dark Default 3.26 为已知族引用；light Secondary 3.05 亦 <4.5。

### 独立取证（`ra-badge-button.mjs`）

- dark Secondary：color rgb(178,206,251)、bg 原值 rgb(203,186,252)（**不透明**，无合成伪象风险）→ **1.1:1**，与原卡一致。dark 截图目检：Secondary 亮紫药丸配近同亮度文字。
- dark Default：白字 on rgb(77,141,245) → 3.26 复现（已知族 #2 引用成立，不另立）。
- token 根因与 #1 同一对（`--secondary`/`--secondary-foreground` classic dark L195–198、glass dark L315–318）。
- 顺带实测（家族新实例，不计入本次 14 条裁决）：dark Destructive 钮红字 rgb(217,38,38) on 30% 暗红 tint，源码值推算 ≈2.8:1 亦不达标——建议 R2-4 翻 token 后一并复检。

### 结论：**保留 P1**（secondary 按钮 dark 不可读；与 badge B5-01 同一根因条目的第二实例，收一修复）。

- 截图：`_tmp/r2-2a-review/ra/button/recheck-dark-1280.png`

---

## 4. [R2-2a-A5-21] home/house 别名乒乓静默回退 Circle —— 保留 P1（表述精确化）

### 原发现摘录（cards/icon.md）

归一化链把 home/house 双向都归一到 `home`，而 lucide-react 1.17 `icons` 索引已无 `Home` 键 → 静默渲染 Circle；`icons/index.mjs` L827 只有 `House`。

### 独立取证（`ra-icon.mjs` 对装机包复刻 + `ra-icon-live.mjs` live DOM）

- **装机包核查**：lucide-react@1.17.0（pnpm 实装版本）。`icons` 命名空间 = `lucide-react.mjs` L9–10 `import * as index from './icons/index.mjs'; export { index as icons }`，即其键集为 index.mjs 的具名导出（实测 1713 键）：`indexHasHouse=true`（L827 `export { default as House }`）、`indexHasHome=false`。
- **链路复刻**（按 icon-utils.ts 逐行复刻，含 ANT 表不带引号键解析）：`home` / `house` / `ant-design:home` / `ant-design:home-outlined` 四种输入全部 normalize → `'home'` → `toLucideKey` → `'Home'` → `icons` 索引未命中 → Circle 回退；对照 `gear→Settings2`、`check-circle→CircleCheckBig`、`layout→LayoutDashboard` 均解析成功。
- **live 坐实**：`#/lab/icon` fallback 场景 DOM 中未知名的渲染结果为 `svg.lucide.lucide-circle`（单 circle 子元素）；截图并排可见。
- **表述精确化**：原卡"lucide-react 导出集已删除 Home"不够准确——barrel `lucide-react.mjs` **L124 仍导出 `Home`**（与 `House` 同指 `icons/house.mjs`）；缺键的是 icon-utils 实际消费的 `icons` 命名空间。机制、根因（icon-utils.ts L7 `house:'home'` × L118 `home:'house'` 乒乓 + L289–293 落空静默回退 Circle 无告警）与修复方向（删 `house:'home'` 别名、ANT 表目标改最终规范键、dev warn）均成立。
- **P1 判级复核**：按提示词升降级条款"系统性发现（≥3 页同根因）整体升一级"——同根因已坐实 3 处（R2-1d m3 tabbar、m5 tabbar、本卡 lab 复现 + 任何 home 语义 schema），且属静默错图（作者与用户双无感），P1 维持。

### 结论：**保留 P1**（卡内表述按上文精确化，回写时建议主 session 顺手订正）。

- 截图：`_tmp/r2-2a-review/ra/icon/recheck-fallback-row-light-1280.png`、`recheck-fallback-light-1280.png`

---

## 5. [R2-2a-B1-02] light 四语义徽章对比度不足 —— 保留 P2（数值修正）

### 原发现摘录（cards/badge.md）

light 下 Info 3.05 / Success 2.59 / Warning 2.13 / Danger 3.78，12px font-medium 全部 <4.5:1。

### 独立取证（`ra-badge-button.mjs`，oklab-α 逐层合成 + 手工抽验）

实测（合成底按徽章自身 10–20% α 语义 tint 与父链亮底合成）：Info(secondary) **3.05**、Success **2.14**、Warning **1.76**、Danger **3.12**；类名与原卡一致（`bg-success/15 text-success` 等），字号 12px font-medium（非大字，门槛 4.5）。Success 数值经 OKLab→sRGB 手工换算抽验（tint 合成 ≈rgb(220,244,236)，比值 ≈2.2）与探针一致。与原卡的逐项位差（2.59/2.13/3.78）源于两轮探针对 oklab-α 层与父链底的合成口径差异；**四档全部 <4.5 的结论两轮一致**，最差档（Warning 1.76–2.13）量级一致。

### 结论：**保留 P2**（系统性：badge 全语义档 light 不达标，状态标签高频）。修复方向照原卡（badge 成对前景令牌，或加深 light `--success/--warning/--danger` 文字用色）；R2-4 复检时以本次探针口径为基准。

- 截图：`_tmp/r2-2a-review/ra/badge/recheck-light-1280.png`

---

## 6. [R2-2a-B1-05] light destructive 按钮对比度不足 —— 保留 P2（证据修正）

### 原发现摘录（cards/button.md）

light Destructive 白字 on `oklab(0.6356…)` 红实底 → 3.78:1 <4.5。

### 独立取证（`ra-badge-button.mjs` + fixture/源码核对）

- fixture（button-lab-page.tsx L43）"Destructive" 钮为 `variant: 'destructive'`；ui button.tsx L30 destructive variant = `bg-destructive/10 text-destructive`——**不是白字压红实底**。
- 实测：color **rgb(239,67,67)**（红字）on `oklab(0.6356…/0.1)` 与父亮底合成 **rgb(253,236,236)** → **3.12:1** <4.5（14px font-medium）。原卡"白字 on 红实底 3.78"系 fg/bg 对调（白/该红互换比值恰好同 3.78，属巧合，探针字段读反）；两方向均 <4.5，发现实质成立。
- 根因归一：`--destructive: 0 84% 60%`（styles.css L72，light）作为文字色对浅底 3.12、作为实底对白字 3.78——**同一令牌过亮**，修一处两用法同收益。dark 侧（`0 70% 50%`）红字 on 暗红 tint ≈2.8（源码推算），归 R2-4 一并复检。

### 结论：**保留 P2**（低频高后果操作的标签对比不达标）。修复方向按修正后的机制执行：加深 `--destructive`（light 目标以 text-on-tint ≥4.5 为准，实底白字同过），或 destructive variant 改成对前景令牌。

- 截图：`_tmp/r2-2a-review/ra/button/recheck-light-1280.png`

---

## 7. [R2-2a-H3-08] top 锚定长弹层底部越出视口 —— 保留 P2

### 原发现摘录（cards/dialog.md）

Edit Record 弹层 top 60、height 768、bottom 828 > innerHeight−8=792，底缘被裁 28px，OK 钮需滚动才可见。

### 独立取证（`ra-dialog.mjs`，双主题）

- light：dialog top 60 / height 768 / bottom 828；**OK 钮 rect 886–918，inViewport=false**；内建 关闭 钮 68–96 可见。
- dark（真 data-mode）：逐项同值（60/768/828，overByVsThreshold=36）；`maxH` computed `768px`（=ui L184 `max-h-[calc(100dvh-2rem)]`，视口 800−32）、`top: 60px`（=dialog-host.tsx L268 `calc(var(--dialog-top-offset) + stack*var(--dialog-stack-step))`）。两套几何独立生效、互不感知，60+768=828 结构性必然。
- 缓解通道实测：body `overflow-y:auto` scrollHeight 844 vs clientHeight 738，scrollTop 0→106 生效——footer/OK 可经内滚到达（降 P1 风险的实质性缓解）。
- token 复核：`--dialog-top-offset: 60px`（styles.css L117）。

### 结论：**保留 P2**。长表单弹层高频、OK 首屏不可见 + 底缘破版观感；内滚可达故不到 P1。修复方向照原卡（top 锚定分支同步约束 maxHeight，或 ui DialogContent max-h 计入 `--dialog-top-offset`）。

- 截图：`_tmp/r2-2a-review/ra/dialog/recheck-edit-open-dark-1280.png`、`recheck-edit-open-light-1280.png`

---

## 8. [R2-2a-A9-23] lab 载体 showToast 零反馈 —— 保留 P2（根因改判）

### 原发现摘录（cards/keyboard.md）

onTrigger/allowInInput 的 showToast 行为态正常但提示不可见；归因"lab 载体未挂 Toaster"（component-lab grep 零命中），修复方向为 lab 壳挂 `<Toaster />`。

### 独立取证（`ra-keyboard.mjs`）

- **行为面复现**：`g o` → `last chord: g o`；裸 `g` 等 1.3s → `last chord: g (fallback)`；INPUT 聚焦断言 true 后 `Ctrl+Enter` → `gated hits` 不动（门控正确）——三路 showToast 均已 dispatch，而按后 150ms 七类 toast 选择器扫描（sonner/status/alert/toaster/data-testid）**全 0**，`bodyHasTriggered/bodyHasSaved=false`，`toasterInDom=false`。
- **根因改判**：showToast 在 action-adapter.ts L358–372 落 `ctx.runtime.env.notify(level, message)`；lab 壳（multi-scenario-lab-page.tsx L34）用 `createDefaultEnv()`，其 `notify: () => undefined`（**flux-react/src/defaults.ts L26，硬编码 no-op**）——**通知在 env 层就被吞掉，根本到不了 toast()**。complex-pages 之所以有 toast，是 showcase-env.ts L508 显式覆写 notify → `toast.*` 并在 render-host.tsx L103 挂 `<Toaster />`（成对）。
- **修复方向改判**：原卡"仅挂 `<Toaster />`"**修不好本条**——还须给 lab 壳 env 覆写 notify（可复用 showcase-env 的 toast 桥）。归族仍成立（波内 124 条 lab 路由共享壳层缺口），但缺口是两件套：notify 覆写 + Toaster 挂载。
- 顺带旁证：本次探针在非输入态按的两次 `g` 使 gating 场景计数 0→2，与 keyboard 卡疑点"三节点共享 window keydown 串扰"一致（不计发现）。

### 结论：**保留 P2**（载体级静默失败，跨路由同根因）；根因与修复方向按本节改判回写。

- 截图：`_tmp/r2-2a-review/ra/keyboard/recheck-chord-after-light-1280.png`、`recheck-modenter-after-light-1280.png`

---

## 9. [R2-2a-E2-24] page 标题零层级 —— 保留 P2

### 原发现摘录（cards/page.md）

h2 16px/400 与正文完全同权重；根因 page.tsx L262 裸 `<h2>`，Tailwind preflight 归零后无标题排版基线。

### 独立取证（`ra-page.mjs`）

`#/lab/page` 场景 1：h2 "Team Dashboard" `fontSize 16px / fontWeight 400 / marginBottom 0 / color rgb(33,53,71)`，与正文 `.nop-text` 16px/400 逐项相同（sameAsBody=true）。源码复核：flux-renderers-basic/src/page.tsx L262 输出裸 `<h2>` 无类；`packages/flux-renderers-basic/src/styles.css` 与槽位基线均无标题排版规则。原卡数值与归因逐项吻合。

### 结论：**保留 P2**（全部带标题页面复现的基础层级缺失）。修复方向照原卡（renderer styles.css `@layer base` 槽位基线或 h2 加基线类）。

- 截图：`_tmp/r2-2a-review/ra/page/recheck-default-light-1280.png`

---

## 10. [R2-2a-B5-34] runner dark 截图为 light 渲染 —— 保留 P2（状态更新：修复已在工作区未提交）

### 原发现摘录（cards/page.md）

capture runner 仅 emulateMedia，playground dark 由 `data-mode` 驱动（theme.ts），runner dark 档实为 light 渲染，dark 回归检出率为零。

### 独立取证（`ra-page.mjs` + git 核对）

- **缺陷复现**：`emulateMedia({colorScheme:'dark'})` 后 `prefersDark:true` 但 `dataMode:'light'`、标题色恒 rgb(33,53,71)（light 墨）；`setAttribute('data-mode','dark')` 后标题翻 rgb(230,236,243)。theme.ts `commit()`（L34–40）确以 `data-mode` 属性为唯一渲染驱动、无 matchMedia 同步。
- **状态更新**：HEAD（4c560a4a0）的 `capture-visual-matrix.mjs` L133 确只有 emulateMedia（缺陷成立）；**当前工作区已带未提交修复**（git diff：+6 行，emulateMedia 后 `page.evaluate` setAttribute data-mode，注释引用 R2-2a-B5-34）。
- 给主 session 的两点核对项：① 修复只设 `data-mode` 未写 localStorage——渲染口径足够（CSS 只吃 `[data-mode]`），但页面主题选择器显示值会与实际渲染脱节，属可接受噪声，建议知悉；② setAttribute 后无显式等帧，截图前靠既有 waitForTimeout 兜底，建议提交前抽 1 条 dark 截图人工目检确认生效。

### 结论：**保留 P2**（证据基建缺陷成立且影响此前全部 runner dark 列）；回写时标注"修复已在工作区，待提交 + 复捕历史 dark 列"。

- 截图：`_tmp/r2-2a-review/ra/page/recheck-emulateMedia-dark-1280.png`（假 dark）vs `recheck-true-dark-1280.png`（真 dark）

---

## 11. [R2-2a-E5-29] scope-debug 面板零样式 —— 保留 P2

### 原发现摘录（cards/scope-debug.md）

面板无容器视觉、header 堆叠、JSON pre 无横向包容；组件仅声明 data-slot 结构，全仓 css 零命中。

### 独立取证（`ra-scope-debug.mjs`）

`#/lab/scope-debug` 双主题：section `.nop-scope-debug` `bg rgba(0,0,0,0)` / `border 0px solid` / `padding 0px` / radius 0；header `display:block`（三行堆叠）；pre `overflow-x:visible` + `white-space:pre`（长值结构性外溢）。全仓 `packages/*/src/**/*.css` grep `nop-scope-debug` **零命中**（与原卡一致）；页内 panelCount=4（2 场景 + 自动附加面板）。源码：scope-debug.tsx L105（类名）与 L109–124（5 个 data-slot）确实无对应样式表。

### 结论：**保留 P2**（每个使用点的开发者可见 UI，不阻塞任务故不升 P1）。修复方向照原卡（补 `nop-scope-debug` 小块样式；注意 debug 卡令牌渐变值勿重蹈 IACVT）。

- 截图：`_tmp/r2-2a-review/ra/scope-debug/recheck-panel-light-1280.png`、`recheck-panel-dark-1280.png`

---

## 12. [R2-2a-H5-32] tab 面板内 dialog footer 动作左对齐 —— 保留 P2（根因锐化）

### 原发现摘录（cards/tabs.md）

Add Note dialog 内 Save 吸左（x=384）、footer 右半空置；修复方向为 footer 容器改 `justify-content: flex-end`。

### 独立取证（`ra-tabs.mjs`，先激活 Surfaces tab 再开弹层）

- dialog 560 宽 @x360；Save @x384（=body 左 padding 处）、right 438；同弹层内建 关闭 钮 @x884 吸右上（y=68）——左右两套动作位分裂复现。
- **根因锐化**：Save 不是 dialog footer 通道的产物——fixture（tabs-lab-page.tsx L244–248）把 `actions` 声明在 `body.form.actions` 内，form 渲染层输出 `[data-slot="form-actions"]`（flux-renderers-form/src/renderers/form.tsx L544），其样式来自 flux-react/src/default-spacing.css **L29–32：仅 `display:flex` + `gap: var(--space-form-actions-gap)=12px`（styles.css L28），无 justify-content** → 默认吸左。实测该动作条 `justifyContent: normal, gap 12px`。对照：dialog real-schema 场景 actions 走 `openDialog.args.actions` → surface footer 通道（flex-end 右对齐）正确。
- 因此原卡修复方向第一句"footer 容器改 flex-end"只适用于 surface footer 通道；本实例的正确收口是二选一：① schema 把 actions 提升到 `args.actions`；② form 渲染层把 form.actions 转投 surface footer 槽（与 dialog 卡 R2-2a-H5-09 同一决断，两卡应合并为一个修复条目）。

### 结论：**保留 P2**（与 loop 卡同族、dialog 卡 H5-09 同根因，弹层 actions 左对齐族主条目维持 tabs 卡）。

- 截图：`_tmp/r2-2a-review/ra/tabs/recheck-s7-dialog-open-light-1280.png`

---

## 13. [R2-2a-F4-33] sidebar-right 场景渲染为左导航 —— 保留 P2

### 原发现摘录（cards/tabs.md）

场景 5 宣称右侧导航，渲染与场景 4 完全一致；fixture 未设 `tabsMode:'sidebar'/sidePosition:'right'`，renderer 分支全仓零覆盖。

### 独立取证（`ra-tabs.mjs`）

- 全页 `.nop-tabs` 逐一读属性：`data-tabs-mode` 与 `data-tabs-sidebar-right` **全部为 null**（含场景 4/5 两个 vertical 实例）。
- 几何：s4 listX 301 < contentX 389；s5 listX 301 < contentX 400——**两场景同为导航居左**（8px 位差为内容宽度差，非方向差），与原卡"right 场景是 left 的复制品"一致。
- fixture（tabs-lab-page.tsx L127–149）仅 `orientation:'vertical'`；场景标题/描述（L299–301）宣称 right。renderer 分支真实存在：tabs.tsx L135（isSidebarRight）、L443（`data-tabs-sidebar-right`）、L465（`flex-row-reverse`），lab 与全仓 fixture 均未触发。
- tabs design.md L200/L501 称 sidePosition"当前代码已实现"——代码层属实（非 doc drift），缺口在 fixture 覆盖（F4-33 本条已承载）。

### 结论：**保留 P2**（载体误导 + sidebar-right 能力零渲染验证的隐性回归风险）。修复方向照原卡（fixture 补 `tabsMode:'sidebar', sidePosition:'right'`）。

- 截图：`_tmp/r2-2a-review/ra/tabs/recheck-s5-sidebar-right-light.png`

---

## 14. [R2-2a-C1-36] maxLine 横向静默硬裁切 —— 保留 P2

### 原发现摘录（cards/text.md）

不可断行内容 scrollWidth 4147→918 无省略号；`measureOverflow` 仅判 `scrollHeight > clientHeight`，横向溢出永不触发展开钮。

### 独立取证（`ra-text.mjs`）

maxLine 场景元素：400 字符串，`scrollW 4147 / clientW 918 / scrollH 24 = clientH 24`、`overflow-wrap normal`、`word-break normal`、`text-overflow clip`、`-webkit-line-clamp: 5` + `--nop-line-count:5`（V0 修复的 CSS 变量机制真实生效）。**verticalClipped=false → `measureOverflow`（text.tsx L50–53）恒 false**，页面仅有 scope-debug 的 Collapse 钮、无任何展开钮；DOM 全文 400 字符在、可视 ≈918px——静默截断复现。text design.md L19/L24 把 toggle 触发条件明文裁定为 `scrollHeight > clientHeight`——实现与文档一致，故本条是**规格盲区**而非实现偏差（文档需随修复同步修订，见 §drift T-3）。

### 结论：**保留 P2**（长 URL/令牌/base64 高频真实内容 + 完全静默）。修复方向照原卡（钳制态加 `overflow-wrap:anywhere`；`measureOverflow` 补 `scrollWidth > clientWidth + 1` 分支），并同步修订 design.md 触发条件表述。

- 截图：`_tmp/r2-2a-review/ra/text/recheck-maxline-light-1280.png`

---

## §drift owner-doc drift 复核（basic 域 18 控件）

登记口径：`docs/components/<type>/design.md` 断言 vs live 渲染/源码行为矛盾，逐条对照 live code 确认后列出；不直接改 docs/components/。

### D-1 drawer —— footer 按钮全宽拉伸 vs design.md"与 dialog 一致"（待裁决线索①，坐实）

- **控件**: drawer ｜ **文档断言**: design.md §2 决策表 L29"独立 `header`/`footer` region …与 dialog 一致"；§10 标准壳 `DrawerContent -> DrawerHeader? -> DrawerBody -> DrawerFooter?`，未提 footer 按钮形态与 dialog 不同。
- **live 实际**: ui `DrawerFooter`（drawer.tsx L446–453）= `flex flex-col gap-…`（**全断点纵列、无对齐/最小宽**，按钮默认 stretch 通栏）；ui `DialogFooter`（dialog.tsx L324–338）= `flex-col-reverse … sm:flex-row sm:justify-end` + `[&_button]:min-w-…`（桌面右对齐紧凑）。live 探针：左抽屉 footer flex/normal，479 宽内 Close 单钮 **431px 通栏**（`ra-drift2.json`、截图 `ra/drawer/recheck-footer-light-1280.png`）——与 drawer 卡 R2-2a-H5-12 实测一致。
- **建议回写文案**（二选一，归 design/ui 裁决）：① 统一形态——DrawerFooter 对齐 DialogFooter（`sm:flex-row sm:justify-end` + 按钮最小宽），design.md §10 补"footer 按钮条与 dialog 同规：移动端纵列、桌面（≥768px）右对齐紧凑"；② 保留纵列——design.md §10 补"drawer footer 按钮纵列全宽为有意形态（移动优先惯例），与 dialog 的桌面右对齐紧凑并存"，并在 H5-12 裁决为按设计关闭。

### D-2 page —— D7 零间隙（待裁决线索②，裁为**无 drift**）

- **控件**: page ｜ **文档断言**: design.md §10 L87 明文"页面布局、间距和背景来自 schema 样式字段，**不应在 renderer 内硬编码页面专属 spacing 规则**"；L88 仅定义槽位 marker。
- **live 实际**: page-toolbar/footer 槽自身 0 垂直间距（本次复核顺带复测 titleToToolbarGap=0、bodyToFooterGap=0、footerPaddingTop=0，`ra-page-e2-b5.json`）。
- **裁决**：零结构间隙**符合**文档契约（间距归 schema），不构成矛盾；page 卡 R2-2a-D7-25 属 fixture/schema 参数层。若 R2-4 决意给槽位加默认间距（default-spacing.css），须**先修订 design.md L87** 再动代码——该依赖关系请主 session 在回写 D7-25 时注明。

### D-3 icon —— 解析流程文档化了一条死链（新发现，坐实）

- **控件**: icon ｜ **文档断言**: design.md《图标名称解析》步骤 5（L85）："应用 `ICON_ALIAS_MAP`（**`house` → `home`**、`gear`/`cog` → `settings-2` 等）"，随后步骤 7 在 lucide `icons` 对象按 PascalCase 查找——文档把 `house→home` 描述为功能性别名。
- **live 实际**: lucide-react@1.17.0 `icons` 命名空间无 `Home` 键（1713 键实测），`home`/`house`/`ant-design:home` 全部经该别名链落 `Home` 缺键 → Circle（R2-2a-A5-21，本复核 §4 坐实）。
- **建议回写文案**：别名修复（`home→house` 单向对齐 lucide 规范名、删 `house:'home'`）落地后，将步骤 5 示例改为 `gear/cog → settings-2` 等（删除 house↔home 示例或注明映射终点为规范名 `house`），并在 Failure Paths 补记"未知名 → Circle 回退、dev warn 一次性提示"。

### D-4 scope-debug —— "自包含的调试面板"无视觉承载（轻微，坐实）

- **控件**: scope-debug ｜ **文档断言**: design.md §6 L42"渲染一个**自包含的调试面板**"。
- **live 实际**: 面板零容器样式（透明/无边框/无 padding，§11），视觉上与页面内容混排、不构成"面板"边界。
- **建议回写文案**：E5-29 修复落地后在 design.md 补 §样式约定（容器 chrome 走令牌：rounded/border/bg/padding、header 行内排布、pre 横向包容）；或短期先把"自包含"改为"结构自包含（不含视觉承诺）"。

### D-5 owner-doc-missing 登记（不新建）

- `docs/components/keyboard/`：无 design.md（headless 通道控件，卡内已按结构类契约走查）。
- `docs/components/command-palette/`：无 design.md。

### D-6 核对后无 drift 的项（记录避免重复排查）

- **text**：design.md L74 明文"tag 只负责语义标签切换，不应顺带决定视觉级别"——live h3/p/label 同貌**符合**文档，text 卡 R2-2a-E2-37 不是 doc drift（其修复选项①在 design.md 层已完成，表达力缺口在 flux-guide/quick-reference 一侧）。
- **text maxLine**：design.md L19/L24 明文触发条件 `scrollHeight > clientHeight`——live 一致；C1-36 为规格盲区，修复时按 §14 建议同步修订该句即可。
- **tabs sidePosition**（L200/L501"代码已实现"）：代码层属实，缺口在 fixture（F4-33 承载）。
- **container**：design.md L91"container-body 默认纵向内容流带默认 gap"——live 实测 flex column gap 16px，一致。
- **recurse**：design.md 明文"本身没有 UI 壳层"——E5-27 零缩进属 fixture/模板层，非 doc drift。
- **badge/button（视觉面）**：badge design.md 无颜色/变体视觉断言；button design.md 无 hover 行为断言——B5-01/B1-02/A1-03/B5-04 均无文档矛盾面。

---

## 复核方法附注

- 每条均为 fresh browser context 重开页面 + 独立探针先行，再与原卡比对；未采信原卡数值。
- **对比度探针基线伪象（重要方法发现）**：本应用页面底色经 `background-image` 渐变绘制，DOM 逐层合成探针在找不到不透明 `backgroundColor` 祖先时以白色为合成基线——light 误差小，**dark 下会系统性高估背景亮度**（本复核首轮同样中招）。本次以 pngjs 对截图逐像素采样为 ground truth（`ra-pixels.mjs`），据此修正 B5-01 的 dark success/warning/danger 数值并排除 ghost 按钮"dark 1.19"类伪实例（像素实测 15.54 过）。建议后续探针 lib（w1-lib/ra-lib）将渐变 stop 纳入合成基线或直接像素采样；原卡中依赖该口径的 dark 数值（badge dark 语义 tint 档、tabs 卡 B1 dark inactive 换算）在修复复检时统一按像素口径重测。
- Playwright 1.63 `page.evaluate` 一律传真函数/字符串+参（沿用前批坑位结论）；playground dark 一律 `document.documentElement.setAttribute('data-mode', …)`。
- A9-23 探针顺带复现 keyboard 卡疑点"跨场景按键串扰"（非输入态 `g` 使 gating 计数 0→2），佐证该疑点成立。
- 本复核未修改任何产品代码；除本文件与 `_tmp/r2-2a-review/` 外无其他写入（cards/、ledger.md、docs/components/、packages/、interactions.mjs 均只读）。

**总裁决：14/14 保留（P1 4、P2 10），0 降级，0 驳回；证据/根因修正 6 处（#1 #4 #5 #6 #8 #12），状态更新 1 处（#10）；drift 清单 5 条（D-1/D-3/D-4 待回写、D-2 裁无 drift、D-5 missing 登记）+ 无 drift 记录 6 条。**
