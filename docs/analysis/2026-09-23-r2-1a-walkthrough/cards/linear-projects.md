# [card] page:linear-projects

- **批次**: R2-1a（波 2）｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/linear-projects` ｜ **载体**: complex-page（外部应用复刻 · 项目周期）
- **矩阵裁剪**: full（glass 未抽查，理由同 linear-issues 卡）

## 1. 截图清单

| 状态             | light                                                       | dark                                     |
| ---------------- | ----------------------------------------------------------- | ---------------------------------------- |
| 默认 1280×800    | `…/r2-1a/linear-projects/linear-projects-default-light.png` | `…/linear-projects-default-dark.png`     |
| 默认 ~800×900    | `…/linear-projects-default-800-light.png`                   | `…/linear-projects-default-800-dark.png` |
| 卡内滚动至项目卡 | —                                                           | `…/linear-projects-scrolled-dark.png`    |

## 2. A–H 维度勾选表

- A：A1 pass A2 pass A3 pass A4 n/a A5 pass A6 n/a A7 n/a A8 n/a A9 n/a（本页为只读概览形态）
- B：B1 fail(R2-1a-B1-03 页面实例) B2 pass B3 pass（活跃=橙/已完成=绿/即将开始=灰，语义正确） B4 pass B5 pass B6 pass
- C：C1 fail(R2-1a-C-01 页面实例 clipY=945/ch=588) C2 warn(R2-1a-D-18 进度条缺失) C3 fail(R2-1a-C-01) C4 pass（800 宽仅纵向溢出） C5 fail(R2-1a-C-02) C6 n/a
- D：D1 pass（项目卡内 分组摘要/周期行 节距一致） D2 pass D3 pass（周期行高一致 50px 档） D4–D8 pass
- E：E1 fail(R2-1a-C-01) E2 pass E3 pass E4 pass（周期行三列左中右对齐） E5 pass E6 n/a
- F：pass（状态 pill 与 issues/board 同语义同色） G：n/a H：n/a

## 3. 发现条目

### [R2-1a-C-01 页面实例] 侧栏块与项目卡纵向堆叠

- **页面/路由**: `#/complex-pages/linear-projects`
- **主题/视口/状态**: 双主题 / 1280×800 / 默认
- **截图**: `…/linear-projects-scrolled-dark.png`（项目卡仅占左侧 ~390px，右侧空黑）
- **程序化证据**:
  - 探针: 同 C-01 主条目探针本页复跑
  - 输出: flex-row 容器 body 子元素 y=[172, 610]（纵排）；clipY=945/ch=588；nop-card diff=913、sbW=0；belowCount=75
- **对照基准**: 同 R2-1a-C-01 主条目
- **严重程度**: P1
- **用户影响**: 项目卡首屏不可见；窄列浪费 2/3 横向空间（本页为卡片网格语义，堆叠后单列）。
- **修复方向**: 同 C-01 主条目；修复后项目卡宜双列网格。
- **归族**: systemic → R2-3 批（并入 C-01）
- **复核状态**: 未复核

### [R2-1a-D-18] 项目卡/周期行进度条不渲染，仅剩 % 文本

- **页面/路由**: 本页项目卡（移动端体验 35%、性能专项 90%）与周期行（42%/0%/100%）
- **主题/视口/状态**: 双主题 / 1280×800 / 卡内滚动
- **截图**: `…/linear-projects-scrolled-dark.png`（“35%”与分隔线之间无进度条轨迹）
- **程序化证据**:
  - 探针: 收集 `[data-testid="linear-projects-card-progress(-fill)"]` / `cycle-progress(-fill)` 可见元素 rects+bg
  - 输出: card-progress 363×34（仅含 % 文本），`card-progress-fill`/`cycle-progress-fill` 无可见元素（height 0 或缺失）；cycle-progress 实为 18px 高纯文本（w 随文本 18.7-31.8px 变化）
- **对照基准**: 页面自述“项目卡（…进度条…）”；replica 对标 Linear 项目进度条
- **严重程度**: P3（% 文本已承载信息，条形为增强表达）
- **用户影响**: 页面承诺的可视化降级为纯数字，一眼对比进度能力缺失。
- **修复方向**: 检查 fill 子节点渲染条件（宽度/高度类丢失）；轨道+填充按令牌补齐（轨道 `--border`、填充语义色）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1a-B1-03 页面实例] 周期概览弱元数据 6.13:1 pass，仅行内引用键同 3.45 档

- **程序化证据**: `.ln-row-meta` ratio=6.13 pass；无新增低于阈值项（引用键 token 同 B1-03）
- **严重程度**: P3 ｜ **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

## 4. 误报排除记录

| 现象                                          | 排除依据                                          |
| --------------------------------------------- | ------------------------------------------------- |
| 状态 pill「活跃/已完成/即将开始」与其它页色差 | 同一语义跨页同色（活跃=橙、完成=绿），B3 复核通过 |

## 5. 台账回写

- 完成后 `ledger.md` 行 → `carded`；归族后 → `digested`；复检通过 → `verified`。
