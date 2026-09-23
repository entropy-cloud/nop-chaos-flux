# [card] control:text

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/text` ｜ **载体**: lab 页（5 场景：literal+interpolation / expression-only / tag variants / name binding write-through / maxLine clamp）
- **矩阵裁剪**: simplified（matrixReason：纯静态内容控件，元素态（hover/focus/disabled/selected）n/a——自身无交互面；**name binding 点击写穿与 maxLine 钳制中间态必查已做**；裁掉：glass、`copyable`（lab 未演示，fixture 缺口见疑点）、`maxLineToggle` 展开/收起中间态（lab 未演示，fixture 缺口见疑点）、~375 档）

## 1. 截图清单

| 状态                   | light                                                                             | dark                                                                   |
| ---------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 默认 1280×800          | `_tmp/visual-inspection-2026-09-23/lab-text-default-1280x800-light.png`           | `_tmp/visual-inspection-2026-09-23/lab-text-default-1280x800-dark.png` |
| 默认 800×900           | `_tmp/visual-inspection-2026-09-23/lab-text-default-800x900-light.png`            | `_tmp/visual-inspection-2026-09-23/lab-text-default-800x900-dark.png`  |
| tag variants 场景      | `r2-2a/text/s3-tag-variants-light.png`                                            | `r2-2a/text/s3-tag-variants-dark.png`                                  |
| name binding 点击前/后 | `r2-2a/text/s4-name-binding-before-light.png` / `s4-name-binding-after-light.png` | —（写穿行为与主题无关）                                                |
| maxLine 钳制场景       | `r2-2a/text/s5-maxline-clamp-light.png`                                           | `r2-2a/text/s5-maxline-clamp-dark.png`                                 |
| 全页 1280 dark         | `r2-2a/text/full-1280-dark.png`                                                   | 同左                                                                   |

## 2. A–H 维度勾选表

- A 交互：A1–A8 n/a（text 无自身交互面；copyable 的 copy 按钮 20×20（h-5 w-5）未在 lab 渲染，其 <24px 几何为 A3 watch 族潜伏实例，见疑点）A9 pass（name binding 点击 → 文本写穿更新，反馈可见，见 §3）
- B 颜色：B1 pass（正文 `rgb(33,53,71)`，light 合成对比度 12.61；dark `rgb(230,236,243)` vs 渐变最深档 14.24 同族令牌）B2 n/a B3 n/a B4 pass（computed 色可溯源 --nop-app-text/--nop-app-text dark）B5 pass（dark 复检无专有缺陷）B6 n/a
- C 布局：C1 **fail(R2-2a-C1-36)**（maxLine + 不可断行内容横向硬裁切）C2 pass C3 pass C4 pass（800 视口文本回流正常）C5 n/a C6 n/a
- D 间隔：D1–D8 n/a/pass（块间距由 schema/page 承担，无自身间距面）
- E 排布：E1 pass E2 **warn(R2-2a-E2-37)**（tag 语义档零视觉梯度）E3 pass E4 pass E5 n/a E6 n/a
- F 一致性：F1–F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 行为取证（schema 响应性族 #7 正向核对）

- 探针 `_tmp/r2-2a-probes/w2r-text.mjs` + `w2r-text2.mjs`：
  - 插值：`Hello, ${name}! You have ${count} messages.` + data `{name:'Alice',count:3}` → "Hello, Alice! You have 3 messages." ✓
  - 纯表达式：score=82 → "Score: 82 / Grade: B / Pass: Yes"（嵌套三元正确）✓
  - **name binding 写穿（AMIS 契约族 #8 正向）**：初值 `Initial`（name 绑定值优先于 text 'fallback'）→ 点击 Change Name → `Updated`（changed=true）✓
  - **maxLine 机制**：`line-clamp-(--nop-line-count)` 类在位 + `--nop-line-count:5` + `-webkit-line-clamp:5` + overflow hidden ✓（V0 修复的 CSS 变量机制真实生效）
  - maxLine 场景溢出实测：`scrollWidth 4147 vs clientWidth 918`、`scrollH 24 = clientH 24`、`overflow-wrap:normal`、`text-overflow:clip` → C1-36 坐实

## 4. 发现条目

### [R2-2a-C1-36] maxLine 文本横向静默硬裁切：不可断行内容 scrollWidth 4147→918 无省略号，且展开钮启发式测不到横向溢出

- **页面/路由**: `#/lab/text` 第 5 场景（maxLine clamps，400 字符无空格串）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/text/s5-maxline-clamp-light.png`（A 串顶到面板右缘戛然而止）
- **目视描述**: 长文本在面板右缘被直接切断，无省略号、无"展开"入口；用户无法得知内容被截以及截了多少。
- **程序化证据**:
  - 探针: `w2r-text.mjs`/`w2r-text2.mjs` 读 scroll/client 尺寸与 computed 文本属性
  - 输出: `scrollW=4147, clientW=918, scrollH=24=clientH`（单行）、`overflow-wrap:normal`、`word-break:normal`、`text-overflow:clip`。机制复合缺陷：① `nop-text` 未设 `overflow-wrap`，line-clamp 的省略号只服务垂直截断，横向为硬 clip；② 展开钮条件 `measureOverflow`（`text.tsx:50-53`）仅判 `scrollHeight > clientHeight`，横向溢出永不触发展开钮——即使 schema 声明 `maxLineToggle:true` 内容仍不可达。
- **对照基准**: 检查提示词 C1（无意外溢出/文本溢出容器）；WCAG 1.4.10（reflow：320px 宽无双向滚动）。
- **严重程度**: P2（fixture 为病态串，但长 URL/令牌/base64 是真实高频内容；截断完全静默）
- **用户影响**: 产品面 maxLine 文本遇不可断长词时读者看到无提示的半句话，且无法展开；信息静默丢失。
- **修复方向**: `text.tsx` 给钳制态加 `overflow-wrap:anywhere`（或 `break-word`）；`measureOverflow` 增加 `|| el.scrollWidth > el.clientWidth + 1` 分支使横向溢出也触发展开钮；补 URL 长词回归用例。
- **归族**: local → R2-4 批（text renderer 修复）+ 本卡实例
- **复核状态**: 已复核（保留 P2，review-a 2026-09-24）

### [R2-2a-E2-37] tag 语义档零视觉梯度：h3/p/label 渲染完全同貌（16px/400/0 margin）

- **页面/路由**: `#/lab/text` 第 3 场景（Semantic tag variants）
- **主题/视口/状态**: light / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/text/s3-tag-variants-light.png`
- **目视描述**: 三行文本视觉完全一致，`tag:'h3'` 的"Section heading"与正文不可区分，标题层级在渲染面上不存在。
- **程序化证据**:
  - 探针: `w2r-text.mjs` 读各 tag 元素 computed 排版
  - 输出: H3/P/LABEL 三元素 fontSize 均 16px、fontWeight 均 400、margin 均 0px（Tailwind preflight 重置 + renderer 不补排版类；`text.tsx:141-156` 仅输出 `nop-text` + meta.className）。
- **对照基准**: 检查提示词 E2（视觉层级与重要性一致：标题强于正文）；AMIS 契约族 #8 邻接（schema 语义属性应产生对应表现或明示不产生）。
- **严重程度**: P3
- **用户影响**: schema 作者写 `tag:'h3'` 期待标题观感，得到与正文同貌的行——页面层级扁平化；不影响任务，属表达力/文档缺口。
- **修复方向**: 二选一并落文档：① 保持语义 only，在 `flux-guide`/quick-reference 明示「tag 不改变视觉，层级请用 className/heading 组件」；② renderer 内建 tag→排版映射（如 h3 → `text-base font-semibold`）。
- **归族**: watch-only → 台账（待 R2-3 批与族 #8「表单/AMIS 契约」一并裁决：语义 props 与视觉表现的契约边界）
- **复核状态**: 未复核

## 5. 疑点（不计发现）

- `copyable` 场景 lab 未演示：`TextCopyButton`（`text.tsx:58-98`，h-5 w-5=20px < 24px）未获渲染验证——其几何为 A3 watch 族（<24px 小目标）潜伏实例，toast 反馈路径亦未走查；建议 R2-3 批补 fixture。
- `maxLineToggle` 未演示：展开/收起钮（size xs word label，源码注释 [G1-视角4-10]）与 C1-36 ② 项（启发式漏检横向溢出）强相关，补 fixture 时一并验。
- name 绑定值为 null/undefined 时回退 `text` 兜底（`String(boundValue ?? text ?? '')`）——0/false 正常显示不吞值 ✓（源码级核对，无需探针）。
- 宿主 stage 底色 IACVT（recurse 卡 R2-2a-B4-28）与本页同构，引用不另立项。

## 6. 台账回写

- 主 session 统一翻转 `lab-text` → carded。
