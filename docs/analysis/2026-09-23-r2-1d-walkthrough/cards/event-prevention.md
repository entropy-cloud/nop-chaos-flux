# [card] page:event-prevention

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/event-prevention` ｜ **载体**: 域页面（X2 preventDefault/stopPropagation 演示）
- **矩阵裁剪**: simplified+交互（波指定 A9 行为反馈重点：三 demo 全链路点击/键入验证 + light/dark × 1280/800；裁掉弹层/拖拽——无此面）

## 1. 截图清单

| 状态                         | light                                                                             | dark                       |
| ---------------------------- | --------------------------------------------------------------------------------- | -------------------------- |
| 默认 1280×800                | `_tmp/visual-inspection-2026-09-23/r2-1d/event-prevention/default-1280-light.png` | `default-1280-dark.png`    |
| 默认 800×900                 | `default-800x900-light.png`                                                       | `default-800x900-dark.png` |
| Demo1 提交（prevent ON）     | `after-submit-prevent-on.png`                                                     | —                          |
| Demo2 链接点击（prevent ON） | `after-link-prevent-on.png`                                                       | —                          |
| Demo3 键入（prevent ON/OFF） | `keydown-prevent-on.png` / `keydown-prevent-off.png`                              | —                          |

## 2. A–H 勾选

- A: A1✔ A2✔ **A3 族确认（3 个 preventDefault 开关为原生 checkbox ≈13×13 → 已知 A3 小目标族，不新立）** **A9✖(A-51 标签滞留 / A-52 提交无反馈)**
- B: B1✔ B5✔（dark 下 toggle 文字 `rgb(230,236,243)` on `rgba(23,31,41,.86)` 对比正常）
- C: C1✔（800 视口无溢出，`w-full max-w-[900px]` 正确——与 flux-basic 61px 溢出形成对照）C4✔
- D: D1✔ E: E1✔
- F: F1✔（页面骨架与 flux-basic 同 hero 模式）
- G n/a ｜ H n/a

## 3. 发现条目

### [R2-1d-A-51] Demo1 toggle 后渲染树按钮标签滞留（行为已切换、文字不更新）

- **页面/路由**: `#/event-prevention`（Demo 1 开关 → schema 内 button label 与 preventDefault 标志）
- **主题/视口/状态**: light / 1280 / uncheck 后 1.5s
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/event-prevention/default-1280-light.png`（toggle 区 + 按钮）
- **目视描述**: 关闭 Demo1 preventDefault 后，页面级开关态文字变为 "preventDefault: false"，但 renderer 内按钮仍显示 "Switch to allow submit"（应变为 "Switch to prevent submit"）。
- **程序化证据**: 探针=toggle uncheck 后取按钮文本 + 后续 submit 行为；输出=`label: "Switch to allow submit"（1.5s 后不变）` 且 `navigated: true`（preventDefault 标志确已失效、原生提交真的放行）——行为绑定更新了，渲染文本未更新。
- **对照基准**: A9/E2（状态与表现一致）；与 diff-view R2-1d-A-47 同根因（SchemaRenderer 动态 schema 传播部分失效：属性/行为层新、文本层旧）。
- **严重程度**: P2（演示页核心语义"开关→标签"自相矛盾，易误导调试者）
- **用户影响**: 开关状态与按钮文案相反，演示页面失去自解释性。
- **修复方向**: 同 A-47 根因修复；短期 demo 可把按钮标签改为渲染在 SchemaRenderer 外（React 层）。
- **归族**: systemic → R2-3 批（与 A-47 合并归并）
- **复核状态**: 未复核

### [R2-1d-A-52] prevent ON 时点击 Submit 无任何可见反馈（P3）

- **页面/路由**: `#/event-prevention`（Demo 1，prevent ON）
- **主题/视口/状态**: light / 1280 / 点击 Submit 后 0.5s
- **截图**: `after-submit-prevent-on.png`
- **目视描述**: prevent ON 下提交被正确拦截（URL 不变），但无计数、无提示、无行闪——用户无法区分"被拦截"与"按钮失效"。
- **程序化证据**: 探针=点击后 DOM 全文匹配 formSubmitCount/counter；输出=`count-displayed: false`（schema 写入 scope 的计数从未渲染）。
- **对照基准**: A9（交互后反馈可见）。
- **严重程度**: P3
- **用户影响**: 演示说服力弱；键盘/链接两 demo 尚有"导航未发生/可键入"的行为反馈，本 demo 无。
- **修复方向**: schema 增加一个 text 节点绑定 `formSubmitCount`（与 linkClickCount/keydownCount 一起显示计数）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

## 4. 通过项存档（波重点 A9 行为反馈）

- preventDefault 三条链路行为全部正确：submit prevent ON 不导航（URL 不变）；link prevent ON 不导航；keydown prevent ON 输入被吞（value=""）、OFF 后正常键入 "xyz"。
- 误报排除：debugger "迹 0" 徽标为全局 fixture（重叠问题见 complex-pages-index 卡 C-46）。
