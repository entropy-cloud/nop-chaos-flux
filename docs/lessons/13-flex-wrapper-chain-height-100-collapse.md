# 13 flex 容器包装链上的 height:100% 静默塌陷（mobile 画布布局教训）

> Created: 2026-11-04（replication-ux-fidelity U1，plan 846 F-S1-2/F-M3-1）

## 现象

375×667 mobile 画布内的页面 shell 高度实测 3930px（远超画布），导致：内容被压进 320px 定高条、sticky footer 锚错滚动上下文、fixed 面板与 footer 叠压。CSS 中明明写了 `.shell { height: 100% }` 却不生效。

## 根因

`height: 100%` 要求**父级有确定高度**。screen（667，确定）→ display:contents 包装 → nop-page（auto）→ wrapper div（auto）→ nop-form（auto）→ shell：链条中间任一层高度为 auto，其后代的 100% 全部解析为 auto。且 screen 与 shell 之间隔着渲染器生成的多层包装（contents/wrapper），结构不在页面作者控制视野内。

## 教训

- `height:100%` 链必须在**每一层**显式落高度；用 getComputedStyle 逐层实测高度是唯一可靠诊断（本次壳→shell 五层逐层读数定位）。
- position:sticky 的锚定上下文是"最近的滚动祖先"而非视觉父容器——布局塌陷后 sticky 会悄悄换锚到外层滚动容器，产生"元素叠压"的错觉性 bug。
- 截图取证注意：IAB 浏览器长条 clip 截图底部约 90px 为合成伪影（重复顶部内容），elementsFromPoint 可证伪——不要据此报 DOM 缺陷。

## 关联

plan 846 F-S1-2/F-M3-1；replication.css `.repl-mobile-canvas-screen` 高度链规则。
