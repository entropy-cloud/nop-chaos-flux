# [card] control:ai-bubble

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/lab/ai-bubble` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：standalone ai-bubble（placement start / shape rounded / showTimestamp），message 含 markdown 加粗 + 无序列表，data.message 注入）
- **矩阵裁剪**: simplified（matrixReason：单气泡静态面。裁掉的状态：error/loading content-renderer 态（载体 message 固定 markdown，无法经 UI 驱动 metadata.isError/loading；源码通道 `ai-bubble/renderers/error.tsx`、loading 占位已核对）、branch picker（branches 需宿主注入，fixture 未接线，源码 L233-282 BranchPicker 已核对）、user 编辑态（role=user + state.editing，载体不可达）、data-streaming 流式态（走 ai-chat/ai-message-list 卡实证，`data-streaming` 属性在本卡静态面恒缺省））

## 1. 截图清单

| 状态                        | light                                                                         | dark（真 data-mode，自采）                                                |
| --------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 默认 1280×800               | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-bubble/default-1280-light.png`    | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-bubble/default-1280-dark.png` |
| 复制点击后（1500ms 窗口内） | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-bubble/after-copy-1280-light.png` | —                                                                         |
| 默认 ~800 宽                | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-bubble/default-800-light.png`     | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-bubble/default-800-dark.png`  |

## 2. A–H 维度勾选表

- A 交互：A1 pass（copy 图标钮 hover color `rgb(72,86,106)→rgb(2,8,23)`（light）/ bg 透明→`rgb(31,42,61)`（dark），双主题 `changed: true`；首轮 dark 判零反馈经查为鼠标停在钮上的探针自伤，移开后复跑证伪——误报排除记录）A2 pass（copy focus `outline auto` + oklab ring，`occludedBy: null`）A3 pass（气泡内可交互元素 <24px 零命中，copy 钮 28×28）A4 n/a A5 n/a A6–A8 n/a A9 pass（copy 点击 → clipboard 写入成功后 Check 图标切换，headless 授权后 flip 通道源码+状态机核对；本卡截图轮未授权 clipboard 故保持 pre-copy，非缺陷）
- B 颜色：B1 pass（正文 `rgb(2,8,23)` on 白 20.01:1；dark 正文 `rgb(248,250,252)` on `rgb(15,23,41)` 17.08:1；timestamp light 7.46:1 / dark 9.36:1）B2 pass B3 pass B4 pass（muted-foreground/气泡底令牌）B5 pass（dark 气泡底 `rgb(15,23,41)` 换挡正常、user 角色另有 `--secondary-surface` 通道，`styles.css` L528）B6 n/a
- C 布局：C1 warn（见 §4：800 窄 scope-debug pre 溢出 214–275px 沿祖先链传播，已知族引用；气泡本体 `listOverX 0`）C2 pass C3 pass C4 pass（800 宽气泡 193px 自适应无溢出）C5 n/a C6 n/a
- D 间隔：D1 pass（markdown→timestamp 8px 落栅格；timestamp→actions 实测 14px = flex gap 8 + actions `margin-top: 0.375rem`(6px)（`styles.css` L538）两个设计值叠加，全气泡一致非随机，不判 off-grid）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass（加粗层级/timestamp 弱化正确）E3 pass E4 pass **E2 另见发现 R2-2c-E2-01（列表标记缺失致层级降级）** E5 pass E6 n/a
- F 一致性：F1–F3 n/a F4 warn（"复制消息" aria-label 中文上英文宿主——R2-2a-F4-11 族实例，§4；"调试/折叠" scope-debug 同族）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2c-E2-01] markdown 有序/无序列表标记完全不渲染：Tailwind preflight `list-style: none` 未被渲染器样式恢复

- **页面/路由**: `#/lab/ai-bubble`（场景 "Host bubble with timestamp + markdown (C8.1)"；所有走 `ai-bubble-markdown` 通道的列表内容同险——ai-chat/ai-message-list 内的 assistant 回复列表同根因）
- **主题/视口/状态**: 双主题 / 全视口 / 默认静态
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/ai-bubble/default-1280-light.png`（"item one / item two" 两行仅缩进、无圆点）
- **目视描述**: markdown 源 `- item one\n- item two` 渲染为两行缩进文本，无任何圆点/编号标记，视觉上像断裂的缩进段落而非列表。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w1-bubble-list.mjs`
  - 输出: `ulListStyle: "none"`、`ulPaddingLeft: "21px"`、`markerColor: "rgb(72,86,106)"`、`markerContent: "normal"`——渲染器样式写了 `[data-slot='ai-bubble-markdown'] li::marker { color: var(--ai-md-muted-fg) }`（`packages/flux-renderers-ai/src/styles.css` L345-347）并给 ul/ol 恢复了 `padding-left: 1.5em`（L330-334），但未恢复 `list-style-type`；Tailwind preflight 的 `ol, ul { list-style: none }` 全局生效，`::marker` 着色规则成为死规则（marker 不存在）。
- **对照基准**: 检查提示词 E2（视觉层级与重要性一致——列表语义全靠缩进传达，与普通段落缩进无法区分）；CommonMark 渲染惯例（ul 圆点 / ol 编号）
- **严重程度**: P3（不阻断阅读，信息无丢失；但列表/编号语义可视化完全缺失，嵌套列表更难读）
- **用户影响**: AI 回复中的步骤列表、要点列表丧失列表观感；有序列表（ol）同样无编号，步骤顺序只能靠行文推断。
- **修复方向**: `packages/flux-renderers-ai/src/styles.css` 的 `[data-slot='ai-bubble-markdown'] ul, ol` 块补一行 `list-style-type: revert`（或 ul `disc` / ol `decimal`），保留 GFM task-list 的 `.task-list-item { list-style: none }` 豁免；ai-sender tiptap 通道（L205）同查。
- **归族**: local → R2-4 批
- **复核状态**: 已复核（保留 P3，review-a 2026-09-25）

## 4. 已知族命中（引用，不另立项）

- **R2-2a-C1-63（scope-debug pre 溢出沿祖先链传播）**：800 窄 `scope-debug-json` overX 275 → scenario-stage overX 239 → p-6 wrapper overX 214（`overflow_light-800.hits`，`docOverX 0`），同修复面。
- **R2-2a-F4-11（i18n zh-CN 回退）**：copy 钮 aria-label "复制消息"、scope-debug "调试/折叠" 中文上英文宿主。
- **fixture 取舍豁免**：message 固定短内容，超长截断/代码块/图片等 content-renderer 分支不经本载体（error/loading 态已列矩阵裁剪）。
- **探针误报排除记录**：①dark copy hover "零反馈" 首轮判读为鼠标未移开的探针自伤（click 后指针停留），移开复跑 `changed: true`（bg 透明→`rgb(31,42,61)`），证伪；②`hoverProbe` 只采样 color/bg/shadow，link variant 的 `hover:underline` 反馈需另采 textDecoration——citations 卡同款触发钮已补测（`out-w1-cit-fixup.json` deco none→underline），本卡 copy 钮为图标钮无下划线通道，hover 判据以 bg/color 为准成立。
- **runner dark 列作废声明**：dark 证据全部自采真 `data-mode` 截图（R2-2a-B5-34 口径）。

## 5. 交互键上报

```json
{
  "lab-ai-bubble": [
    { "action": "click", "selector": "[data-slot=ai-action-copy]" },
    { "action": "waitFor", "ms": 300 }
  ]
}
```

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-ai-bubble`（control）→ carded（卡列填本路径）；R2-2c-E2-01 归族后 → digested。
