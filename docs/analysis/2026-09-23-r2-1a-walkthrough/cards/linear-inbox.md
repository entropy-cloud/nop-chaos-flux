# [card] page:linear-inbox

- **批次**: R2-1a（波 2）｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/linear-inbox` ｜ **载体**: complex-page（外部应用复刻 · 收件箱）
- **矩阵裁剪**: full（glass 未抽查，理由同 linear-issues 卡）

## 1. 截图清单

| 状态                | light                                                 | dark                                      |
| ------------------- | ----------------------------------------------------- | ----------------------------------------- |
| 默认 1280×800       | `…/r2-1a/linear-inbox/linear-inbox-default-light.png` | `…/linear-inbox-default-dark.png`         |
| 默认 ~800×900       | `…/linear-inbox-default-800-light.png`                | `…/linear-inbox-default-800-dark.png`     |
| 卡内滚动至通知流    | —                                                     | `…/linear-inbox-scrolled-dark.png`        |
| 归档一封后（toast） | —                                                     | `…/linear-inbox-after-archive-dark.png`   |
| 批量已读后          | —                                                     | `…/linear-inbox-after-bulk-read-dark.png` |

## 2. A–H 维度勾选表

- A：A1 pass A2 pass A3 pass（本页未扫出 <24 交互目标） A4 n/a A5 pass A6 n/a A7 n/a A8 n/a A9 pass（归档出 toast“通知已归档”、批量已读未读点清零）
- B：B1 fail(R2-1a-B1-03 页面实例：ln-row-key 3.45) B2–B6 pass
- C：C1 fail(R2-1a-C-01) C2 warn(R2-1a-C-15 通知行内容挤压左列) C3 fail(R2-1a-C-01) C4 warn（800 宽 clipY 2026，纵向更甚） C5 fail(R2-1a-C-02) C6 n/a
- D：D1 pass D2 pass D3 warn(R2-1a-D3-15) D4–D8 pass
- E：E1 fail(R2-1a-C-01) E2 pass E3 pass E4 pass E5 pass E6 pass
- F：pass（分组标签 今天/本周/更早 与 通知语义一致） G：n/a H：n/a

## 3. 发现条目

### [R2-1a-C-01 页面实例] 侧栏与通知流纵向堆叠，通知流被压成 302px 窄列

- **页面/路由**: `#/complex-pages/linear-inbox`
- **主题/视口/状态**: 双主题 / 1280×800 / 默认
- **截图**: `…/linear-inbox-scrolled-dark.png`（通知只占左 1/4，右侧全空）
- **目视描述**: 通知行内容全部堆在 300px 窄列内、纵向拉长；卡片右侧 ~600px 空黑。
- **程序化证据**:
  - 探针: 同 C-01 主条目探针本页复跑 + rowScan
  - 输出: flex-row 容器 body 子元素 y=[172, 662]（纵排）；`[data-testid="linear-inbox-item"]` w=301.6；`ln-root` clipY=2354/ch=588（全批最大）；nop-card diff=2322、sbW=0
- **对照基准**: 同 R2-1a-C-01 主条目
- **严重程度**: P1
- **用户影响**: 收件箱一行一屏的可用性被破坏；横向空间浪费 2/3。
- **修复方向**: 同 C-01 主条目；通知行内部还需保证 avatar/正文/时间/归档钮横排。
- **归族**: systemic → R2-3 批（并入 C-01）
- **复核状态**: 未复核

### [R2-1a-D3-15] 通知行高 228.5px——非有意密度档，系窄列挤压的次生畸变

- **页面/路由**: 本页通知流
- **截图**: `…/linear-inbox-scrolled-dark.png`
- **程序化证据**:
  - 探针: `rowScan('[data-testid="linear-inbox-item"]')`
  - 输出: 9 行全部 228.5px（一致但病态；Linear 收件箱行约 60-70px）；行内子块纵排（avatar→类型行→标题→摘要→时间→已读归档钮竖直堆叠）
- **对照基准**: D3 行密度与行业档一致；replica 对标 Linear 收件箱
- **严重程度**: P2（高密度收件箱页主路径）
- **用户影响**: 一屏放不下一封通知，浏览效率骤降（根因修好后预计自然恢复 ~70px）。
- **修复方向**: 随 C-01 修复后复测；行内改横排 grid（avatar | 正文 | 时间+归档）。
- **归族**: systemic → R2-3 批（C-01 的次生项，同批修复）
- **复核状态**: 未复核

### [R2-1a-B1-03 页面实例] 通知行内引用问题标识符 3.45:1@12px

- **程序化证据**: `.ln-row-key` rgb(98,102,109) ratio=3.45；`.ln-row-meta` 5.01 pass
- **严重程度**: P3 ｜ **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

## 4. 误报排除记录

| 现象                                          | 排除依据                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 归档点击后 itemCount 未减（9→8 为 mock 流动） | toast「通知已归档」出现 + 未读点清零（bulk-read 后 unread=0）→ 交互链路通，数据为 mock 流式 |
| 页面描述“批量已读栏形态”与实际可点            | bulk-read 按钮实测生效，非静态形态                                                          |

## 5. 台账回写

- 完成后 `ledger.md` 行 → `carded`；归族后 → `digested`；复检通过 → `verified`。
