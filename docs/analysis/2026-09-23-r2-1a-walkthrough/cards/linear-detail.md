# [card] page:linear-detail

- **批次**: R2-1a（波 2）｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/linear-detail` ｜ **载体**: complex-page（外部应用复刻 · 问题详情全页）
- **矩阵裁剪**: full（glass 未抽查，理由同 linear-issues 卡）

## 1. 截图清单

| 状态                    | light                                                   | dark                                     |
| ----------------------- | ------------------------------------------------------- | ---------------------------------------- |
| 默认 1280×800           | `…/r2-1a/linear-detail/linear-detail-default-light.png` | `…/linear-detail-default-dark.png`       |
| 默认 ~800×900           | `…/linear-detail-default-800-light.png`                 | `…/linear-detail-default-800-dark.png`   |
| 卡内滚动至子问题/活动流 | —                                                       | `…/linear-detail-scrolled-dark.png`      |
| 复制链接后（toast）     | —                                                       | `…/linear-detail-after-copy-dark.png`    |
| 归档后                  | —                                                       | `…/linear-detail-after-archive-dark.png` |

## 2. A–H 维度勾选表

- A：A1 pass A2 pass A3 pass（仅视觉隐藏 native input 1×1，属已登记误报豁免） A4 n/a A5 pass A6 n/a A7 n/a A8 n/a A9 pass（复制出 toast「链接已复制」；归档后 key ENG-101→ENG-105 即视图推进，反馈明确）
- B：B1 fail(R2-1a-B1-03 页面实例) B2–B6 pass
- C：C1 fail(R2-1a-C-01 页面实例 clipY=921/ch=568；800 宽另有 clipX=231-247) C2 pass C3 fail(R2-1a-C-01) C4 warn（800 宽双栏属性侧栏横向溢出） C5 fail(R2-1a-C-02) C6 n/a
- D：D1 pass（活动流条目节距一致） D2 pass D3 pass（子问题行高一致） D4–D8 pass
- E：E1 fail(R2-1a-C-01) E2 pass E3 pass E4 pass（左列文本 x 对齐一致） E5 pass E6 n/a
- F：pass（状态/优先级 pill 语义与 issues 页一致） G：n/a H：n/a（无弹层；属性侧栏为常驻面板）

## 3. 发现条目

### [R2-1a-C-01 页面实例] 侧栏块与详情主体纵向堆叠

- **页面/路由**: `#/complex-pages/linear-detail`
- **主题/视口/状态**: 双主题 / 1280×800 / 默认
- **截图**: `…/linear-detail-default-light.png`、`…/linear-detail-scrolled-dark.png`
- **目视描述**: 标题区在折叠下缘被切；子问题列表（ENG-108/119 等）与活动流在折叠下方。
- **程序化证据**:
  - 探针: 同 C-01 主条目探针本页复跑
  - 输出: flex-row 容器 body 子元素 y=[192, 474]（纵排）；clipY=921/ch=568；nop-card diff=889、sbW=0；belowCount=109
- **对照基准**: 同 R2-1a-C-01 主条目
- **严重程度**: P1
- **用户影响**: 详情页核心区块（子问题/活动流/属性侧栏下半）首屏不可见。
- **修复方向**: 同 C-01 主条目
- **归族**: systemic → R2-3 批（并入 C-01）
- **复核状态**: 未复核

### [R2-1a-C4-16 页面实例] ~800px 视口下左栏+属性侧栏双栏横溢 231-247px

- **页面/路由**: 本页，800×900 视口
- **截图**: `…/linear-detail-default-800-light.png`
- **程序化证据**: overflowScan：nop-card clipX=231(cw=512)、`ln-root` clipX=247(cw=480)
- **对照基准**: C4 视口弹性；属性侧栏应折到下方或收窄
- **严重程度**: P2
- **用户影响**: 窄视口下属性侧栏被裁不可达（横向仅靠隐藏滚动条）。
- **修复方向**: 属性侧栏 `min-w` 改弹性/`lg:` 断点下移堆叠。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1a-B1-03 页面实例] 标识符/弱元数据 3.45:1@12px

- **程序化证据**: `.ln-row-key` ratio=3.45；row-title 17.9、row-meta 6.13、side-item 6.13 均过
- **严重程度**: P3 ｜ **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

### [R2-1a-A9-17 注] 归档行为取证（无缺陷）

- **程序化证据**: 点击 archive 后 key 变 ENG-105（当前 issue 归档并推进到下一条）；copy 出 toast「链接已复制」
- **归族**: watch-only → 台账（行为确认：归档即推进，无确认弹层——低风险，但值得产品侧知悉）
- **复核状态**: 未复核

## 4. 误报排除记录

| 现象                           | 排除依据                                                       |
| ------------------------------ | -------------------------------------------------------------- |
| 归档后“当前问题消失”疑为丢数据 | key 推进至 ENG-105，属“归档并前进”交互设计；toast/视图状态一致 |

## 5. 台账回写

- 完成后 `ledger.md` 行 → `carded`；归族后 → `digested`；复检通过 → `verified`。
