# [card] page:antdpro-form-step

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/antdpro-form-step` ｜ **载体**: complex-page（antdpro 复刻域；wizard 三步 + 步骤条）
- **矩阵裁剪**: full（无弹层（H 列 n/a）、无拖拽；步骤切换为页面内交互已实测；第三步"完成"依赖前两步有效数据，走查仅验证到步骤校验拦截）

## 1. 截图清单

| 状态                       | light                                                                                           | dark                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 默认 1280×800              | `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-form-step/antdpro-form-step-default-light.png` | `…/antdpro-form-step-default-dark.png`        |
| 默认 800×900               | `…/antdpro-form-step-default-light-narrow.png`                                                  | `…/antdpro-form-step-default-dark-narrow.png` |
| 步骤校验失败态（错误反馈） | `…/antdpro-form-step-step2-light.png`（红框 + 错误文案 + "步骤校验未通过"）                     | —                                             |
| 步骤 3 尝试推进            | `…/antdpro-form-step-step3-light.png`（校验拦截，仍停第 1 步）                                  | —                                             |
| hover/focus                | 按钮 hover 含于 step2 截图；focus 同 form-basic 复验口径                                        | —                                             |
| dark 字段标签              | —                                                                                               | 探针读值 `rgb(248,250,252)`（同 B5-02 族）    |
| 弹层/拖拽/loading          | n/a                                                                                             | n/a                                           |

## 2. A–H 维度勾选表

- A 交互：A1 ✔ A2 ✔（同构输入框已复验） A3 fail(R2-1a-A3-01 实例：步骤圆点 20×20，嵌于 160×54 可点步骤钮内缓解) A4 n/a A5 n/a A6 n/a A7 n/a A8 n/a A9 ✔（下一步触发校验：红框 + "收款账户名不能为空" + "步骤校验未通过"提示，非静默失败）
- B 颜色：B1 ✔（light：步骤标题 21:1、描述 72,86,106 ≈7:1、错误红可读） B2 ✔ B3 ✔（错误红 = 语义正确） B4 ✔ B5 **fail(R2-1a-B5-02 实例)**（dark label `rgb(248,250,252)` 不可见） B6 ✔（步骤态：激活黑字+浅灰底药丸、未至灰字，不裸奔）
- C 布局：C1 ✔ C2 ✔ C3 **fail(R2-1a-C3-02 实例)**（wizard 卡 shrink-to-fit ~430px，authored max-w-3xl=768） C4 ✔ C5 ✔ C6 n/a
- D 间隔：D1 ✔（步骤条内间距均匀、字段 16px） D2 ✔ D3 n/a D4 n/a D5 ✔（错误文案与控件间距一致） D6 n/a D7 ✔ D8 ✔
- E 排布：E1 ✔（步骤条直答"共 3 步、当前第 1 步"） E2 ✔（下一步 primary、上一步 outline） E3 ✔（上一步左、下一步右——分步表单惯例） E4 ✔（三步骤块 y 相等、字段左缘对齐） E5 ✔ E6 ✔（步骤描述文案引导任务）
- F 一致性：F1 ✔（步骤条/校验/按钮与 w6 form-wizard 页同语义同位） F4 ✔（"上一步/下一步"文案标准）
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1a-C3-02]（本页实例）wizard 卡 430px（authored 768px）

- **页面/路由**: `#/complex-pages/antdpro-form-step`
- **主题/视口/状态**: light / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-form-step/antdpro-form-step-default-light.png`
- **程序化证据**: `max-w-3xl`（768px）schema 授权；实际卡片宽 ~430px（flex-column 容器内 `mx-auto` shrink-to-fit，同 R2-1a-C3-02 主发现根因 `antdpro-form-basic-width.mjs` 已证机制）
- **对照基准**: C3 主内容占比；AntD Pro StepsForm 原版宽卡
- **严重程度**: P2（同主发现判级） ｜ **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

### [R2-1a-B5-02]（本页实例）dark 下步骤表单标签隐形

- **页面/路由**: `#/complex-pages/antdpro-form-step`
- **程序化证据**: dark 下 `.nop-field` 首 span computed `rgb(248,250,252)`（收款账户名\*）叠白卡（`antdpro-form-step-probe.mjs` → `darkLabels`）
- **截图**: `…/antdpro-form-step-default-dark.png` ｜ **严重程度**: P1
- **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

### [R2-1a-A3-01]（本页实例）步骤圆点 20px

- **程序化证据**: 步骤序号圆 `20×20`，但外层步骤按钮 160×54 整体可点（点击直达该步），热区缓解充分
- **对照基准**: WCAG 2.5.8 ｜ **严重程度**: P3
- **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                                                 | 排除理由                                                                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 探针注入值后仍停第 1 步，疑"下一步失效"              | 探针用 `el.value=…` + 合成 input 事件未走 React 受控链，校验按空值拦截并给出完整错误反馈——行为正确（A9 通过）；非缺陷 |
| 收款账户名 placeholder "与银行开户名一致" 疑文案错位 | 业务占位符示例文案（提示填写规则），非渲染串位；术语域内一致，不报                                                    |
| 步骤条步骤 3"完成"在未到达时已可点击                 | 分步导航设计（允许回看/跳步），且前进有校验门；不报                                                                   |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：C3-02/B5-02/A3-01 → R2-3 系统性批；批内复检通过后 → `verified`。
