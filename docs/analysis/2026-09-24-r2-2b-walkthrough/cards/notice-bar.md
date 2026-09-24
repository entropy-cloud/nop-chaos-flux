# [card] control:notice-bar

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/notice-bar` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：Host notice-bar close + click (C7)，三条并列——info+closable(onClose→probe) / warning+clickable(role=button, onClick→probe) / success+static(role=status)）
- **矩阵裁剪**: simplified（matrixReason：单条 bar surface 无弹层；本波要求的"滚动中"中间态在本载体 **interaction-dead**：fixture 三条均为单文本且未声明 `scrollable:true`，渲染器契约 `scrollable===true` 才启用 marquee（1280 实测三条 `textW 249/259/237 < contentW 834/870/870` 不溢出），滚动/carousel/hover 暂停（20-03）态均无 schema 通路，归渲染器单测（notice-bar-pause-a11y.test.tsx）覆盖；多文本 carousel 态同样不可达。实测态：三 variant 默认 × 双主题 × 1280/800/375、focus-visible、Enter 激活、关闭卸载）
- **dark 证据声明**：dark 截图为自采真 `data-mode="dark"`（R2-2a-B5-34）；notice-bar 自带 opaque 背景，DOM 合成对比度可靠（无渐变失真）。

## 1. 截图清单

| 状态                             | light                                                                       | dark（真 data-mode，自采）           |
| -------------------------------- | --------------------------------------------------------------------------- | ------------------------------------ |
| 默认 1280×800（三 variant 并列） | `_tmp/visual-inspection-2026-09-24/r2-2b/notice-bar/default-light-1280.png` | `…/notice-bar/default-dark-1280.png` |
| clickable bar focus-visible      | `…/notice-bar/focus-clickbar-light-1280.png`                                | —                                    |
| 关闭后（info bar 卸载）          | `…/notice-bar/after-close-light-1280.png`                                   | —                                    |
| 默认 800×900                     | `…/notice-bar/default-light-800.png`                                        | `…/notice-bar/default-dark-800.png`  |
| 默认 375×812（场景区）           | `…/notice-bar/default-light-375.png`                                        | `…/notice-bar/default-dark-375.png`  |

## 2. A–H 维度勾选表

- A 交互：A1 n/a A2 pass（clickable bar `tabindex=0`，focus 后 outline 1px `rgb(0,95,204)` 可见、位于 bar 内不被遮挡）A3 pass（关闭钮 28×28 ≥24；smallTargets 零命中）A4 n/a A5 pass A6 n/a A7 n/a A8 n/a A9 pass（关闭点击 → info bar 卸载（`removed:true`）+ `__c7noticeClose='closed'`；Enter 键激活 clickable bar → `__c7noticeClick='clicked'`，键盘等价通路生效）
- B 颜色：B1 pass（light：info 7.57 / warning 4.63 / success 4.57:1；dark：7.89 / 7.74 / 8.24:1，全部 ≥4.5）B2 pass（focus 环深蓝对 warning 浅底 >3:1）B3 pass（info 蓝 / warning 琥珀 / success 绿语义正确、双主题同相；error variant fixture 未含，契约由样式表锁定）B4 pass（`--nop-notice-bar-*` 专用令牌组，computed 值全部落令牌）B5 pass（dark 平价：同结构同层级，无 light-only 缺陷复现）B6 pass
- C 布局：C1 pass（1280/800 零溢出；375 见 C4）C2 pass C3 pass C4 **warn（家族引用，不立项）**（375 载体壳层压挤：三条 bar 收缩为 24px 彩色细条，`contentW:0` vs `textScrollW 249`，文本完全不可见——根因载体壳层，见 §4 #1）C5 pass C6 n/a
- D 间隔：D1 pass（三 bar 间距走宿主 gap-2，成栅格）D2–D8 n/a/pass（info bar 高 44 vs 其余 40：closable 增加 28px 关闭钮的自然结果，非异常行）
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 pass E6 n/a
- F 一致性：F1 pass（关闭钮 ghost icon-sm 与全站 icon 按钮同构）F2 n/a F3 n/a F4 **n/a（弱族实例记录）**（关闭钮 aria-label "关闭" 为 flux-i18n zh-CN 默认——R2-2a-F4-11 族 aria 级实例，引用不立项）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（本卡零新立项发现：A–H 全维度 pass 或归已知族；以下为正向取证要点）

- **OA-04 语义分裂正确落地**：clickable bar 的 `role="button"` + `tabindex=0` 挂在 `notice-bar-action` 内容面而非根节点（根节点 hosting 真实关闭 Button，避免 interactive 嵌套违规）；static bar 为 `role="status"` 不可聚焦——三态语义角色实测与源码契约一致（`out-w6-notice-bar.json` defaultLight1280: `actionRole:'button'/actionTabIndex:'0'` vs `role:'status'`）。
- **OA-22 方向映射锁定**：未声明 `direction` 的 fixture 三条均 `animationName:'none'`（不溢出不滚动），无反向滚动误触发。
- **H31 容器宽度观测**：375 压挤下 `contentW:0` 仍无 JS 报错、ResizeObserver 链路稳定。

## 4. 已知族命中（引用，不另立项）

- **窄视口 flex/固定壳层（R2-3c 候选族）**：375 下三条 bar 收缩为 24px 宽彩色细条、文本全隐（`default-light-375.png`；探针 `defaultLight375: contentW 0 / textScrollW 249/259/237`）。根因载体壳层（同 countdown 卡 §4 #1），引用不立项。注意：该压挤同时使 R2-1d-A5-04（长文案静态拦腰截断）在本载体无法干净复现——文本在截断发生前已被壳层压没；A5-04 原条目（demo 页实例）维持。
- **i18n zh-CN 回退族（R2-2a-F4-11 watch）**：关闭钮 aria-label "关闭"（`t('flux.mobile.noticeBar.close')` 默认值）在英文宿主出中文——aria 级实例，视觉不可见，引用不立项。
- **R2-1d-A5-04（长文案静态截断 P3）**：本载体 fixture 三条文本均不溢出（textW ≈250 < contentW ≈850），且 `scrollable` 未声明时 marquee 不启用（渲染器契约即如此）——该族根因（无默认 marquee/ellipsis）不变，原条目维持，本卡无可复现实例。

## 5. 误报排除记录

| 疑点                                 | 排除理由                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| "滚动中"态缺失疑似交互死锁           | 渲染器契约为 `scrollable===true` 显式启用 marquee（OA-15/OA-19 记录）；fixture 未启用且文本不溢出——非缺陷，归矩阵裁剪说明 |
| info bar（44px）比另两条（40px）高   | closable 增加关闭钮的自然增高，三 bar 内 padding 一致（px-3 py-2），非 D3 离群行                                          |
| dark 下 warning bar 文本 4.63:1 贴线 | ≥4.5 达标；且该值为 DOM 合成精确值（bar 自带 opaque 底无渐变失真）                                                        |

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-notice-bar` → carded（卡列填本路径）；
- findings：零新立项；族引用（窄视口壳层/i18n 回退/A5-04 原条目）随各自主条目走；批内复检通过后 → verified。
