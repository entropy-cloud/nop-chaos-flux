# [card] page:text-icon-visual-fields

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/text-icon-visual-fields` ｜ **载体**: domain demo 页（`apps/playground/src/pages/text-icon-visual-fields-demo.tsx` + `flux-renderers-basic/src/text.tsx` + icon renderer）
- **矩阵裁剪**: simplified（展示型 demo 页，无弹层无拖拽；执行 light+dark × 1280/800、元素态抽样（copy 钮/图标 focus）、中间态必查：copyable 点击、maxLineToggle 展开/收起；裁掉：clipboard 真实写入断言（headless 无剪贴板权限，以反馈可见性为判据）、glass 皮肤）

## 1. 截图清单

| 状态          | light                                                                                    | dark                            |
| ------------- | ---------------------------------------------------------------------------------------- | ------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-09-23/r2-1d/text-icon-visual-fields/default-light-1280.png` | `default-dark-1280.png`         |
| 默认 ~800 宽  | `default-light-800.png`                                                                  | `default-dark-800.png`          |
| toggle 展开后 | `toggle-expanded-light-1280.png`、`toggle-area-expanded-light-1280.png`                  | `toggle-expanded-dark-1280.png` |
| icons 区      | `icons-area-light-1280.png`                                                              | `icons-area-dark-1280.png`      |
| copy 点击后   | `copy-clicked-light-1280.png`（无 toast = 证据本身）                                     | —                               |

## 2. A–H 维度勾选表

- A 交互：A1 n/a A2 pass（copy 钮 focus 环） A3 **warn（已知 A3 族确认：copy 图标钮 20×20，见 §3 族注）** A4 n/a A5 n/a A6 n/a A7 n/a A8 n/a A9 **fail(A9-30：copyable 点击无可见反馈)**；maxLineToggle pass（aria-expanded false→true、高 48→98、文案 展开→折叠、data-expanded 同步）
- B 颜色：B1 pass（body copy 6.43:1、正文 12.61:1） B2 pass B3 pass（icon 语义色 #eab308/#ef4444 schema 显式） B4 pass（其余走 currentColor） B5 pass（dark 图标 rgb(230,236,243) 自适应、hero 令牌深底正常） B6 pass
- C 布局：C1 pass（溢出零命中） C2–C6 pass
- D 间隔：D1 pass（节间距 24px gap-lg 一致） D2–D8 pass
- E 排布：E1 pass E2 **fail(E2-32：tag:h2 段落标题与正文层级不可辨)** E3 pass E4 pass（图标与文本行对齐） E5 pass E6 n/a
- F 一致性：F1–F5 pass
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-A9-30] copyable 点击复制无可见反馈（toast 已触发但页面未挂载 Toaster）

- **页面/路由**: `#/text-icon-visual-fields`（text-visual-copyable-target）
- **主题/视口/状态**: light / 1280 / 点击复制图标后
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/text-icon-visual-fields/copy-clicked-light-1280.png`（点击后画面零变化）
- **目视描述**: 点击 `hello@nop-chaos.dev` 旁的复制图标后，无 toast、无图标态变化、无任何反馈；demo 文案却声称「一键复制 + toast 反馈」。
- **程序化证据**: 探针：点击后 `[data-sonner-toast], [role="status"]` 等容器均不存在（toastVisible=false）。源码链路：`flux-renderers-basic/src/text.tsx` L75 确有 `toast.success(t('flux.common.copied'))`；但本 demo 页未渲染 `<Toaster />`（对比 w4a/w4b 页均有），`pageEnv.notify` 亦仅 `console.info`。headless 无剪贴板权限时 clipboard 写入失败走 L77 `toast.error` 同样不可见。
- **对照基准**: A9 交互后反馈可见，非静默更新；WCAG 3.3.1/状态提示。
- **严重程度**: P3
- **用户影响**: 用户点击复制后不知道是否成功（尤其 clipboard 被拒的桌面浏览器），demo 自证能力受损。
- **修复方向**: demo 页挂载 `<Toaster />` 并接入 notify（照抄 w4a demo 的 env 写法）；同时建议 renderer 层考虑复制成功给图标级微反馈（icon 切 ✓ 1.5s），降低对宿主 Toaster 的依赖。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1d-E2-32] schema tag:h2 段落标题经 preflight 重置，与正文层级不可辨（跨页同模式）

- **页面/路由**: `#/text-icon-visual-fields`（5 个 `tag:'h2'` 段落标题）；同根因同模式复现于 `#/layout-family-enhancements`（5 处）
- **主题/视口/状态**: light+dark / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/text-icon-visual-fields/default-light-1280.png`（"copyable — 一键复制" 等标题与正文视觉同权）
- **目视描述**: 各 section 标题与普通正文行并排时几乎无差异——同色、同字重，仅大 2px，页面层级完全依赖间距撑起。
- **程序化证据**: 探针：全部 h2 computed `fontSize:16px / fontWeight:400`；正文 text renderer 为 14px/400。根因：Tailwind preflight 将标题重置为 inherit，`text` 渲染器按 tag 输出 h2 但不附加任何标题字级/字重类。
- **对照基准**: E2 视觉层级与重要性一致（标题强于正文）；排版基线（标题至少有 size/weight 一个强维度）。
- **严重程度**: P3
- **用户影响**: 长 demo/文档型页面扫读困难，标题失去导航作用；凡 schema 用 tag:h1–h6 的页面同模式。
- **修复方向**: `text` 渲染器对 heading tag 应用默认排版档（如 h2 → `text-lg font-semibold`，h3 → `text-base font-semibold`），保持 schema className 可覆盖；一次性修复全部消费页。
- **归族**: systemic → R2-3 批（渲染器级默认排版缺失，波内 2 页复现，凡 heading tag 消费面均中）
- **复核状态**: 未复核

**族注（记录）**: ①已知 A3 族确认：copy 图标钮 20×20（<24px），并入已知 A3 小目标族。②maxLine=2/3 两段样例文本在 900px 卡片内自然排 2 行、未触发截断（无省略号），演示效果打折——属演示数据简化（红线豁免）；截断机制本身经 maxLineToggle 样例证实可用（clamp 2 行 48px → 展开 98px，aria-expanded/data-expanded 同步，无溢出时不渲染 toggle）。③正例：icon schema size（16/24/32）与 token（sm12/md16/lg20）精确映射、颜色字面值按 schema 生效、dark 下 currentColor 自适应、B1 对比度 6.43–12.61:1 全达标。

## 4. 台账回写

- 本卡完成后：ledger.md `text-icon-visual-fields` 行 status → `carded`；findings 归族后 → `digested`。
