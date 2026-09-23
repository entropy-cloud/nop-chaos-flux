# [card] control:hidden

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/hidden` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：Hidden field inside submitting form / Hidden field seeded value / hiddenFieldPolicy clearValueWhenHidden）
- **矩阵裁剪**: simplified + 走查口径替换（matrixReason：hidden 无可见渲染面，按任务口径走"表单参与 + 校验错误呈现"：值携带/回显/seed/policy 均程序化取证；**校验错误呈现矩阵裁空**——fixture 三个场景均未给 hidden 字段声明 required/校验规则，"hidden 字段错误如何在 form 面呈现"无载体，登记为 fixture 缺口而非控件缺陷）；主题矩阵保留（提交回显文本在 dark 下同样走查）。
- **dark 证据**: dark 截图为本波自采真 data-mode（R2-2a-B5-34 同前）。

## 1. 截图清单

| 状态                                                              | light                                                                     | dark（真 data-mode）                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 默认 1280×800（仅可见字段，hidden 无 chrome，scope 携带 orderId） | `_tmp/visual-inspection-2026-09-23/r2-2a/hidden/hidden-default-light.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/hidden/hidden-default-dark.png` |
| 窄视口 800×900 默认                                               | `_tmp/visual-inspection-2026-09-23/r2-2a/hidden/hidden-800-light.png`     | —                                                                        |

（控件本体无视觉状态可拍——`display: none`；状态矩阵的"截图位"由 scope JSON 与提交回显的程序化取证替代，见勾选表。）

## 2. A–H 维度勾选表（可见 chrome 维度按 n/a 处理）

- A 交互：A1–A8 n/a（无可见/可交互面）A9 pass（Submit 后回显 `Submitted orderId: A100 / customer: …`，hidden 值随 form scope 提交；seed 场景 `tenantId=seed` 可被兄弟 text 读取；policy 场景 clearValueWhenHidden 生效回显 `tenantId resolves as "undefined"`）
- B 颜色：B1–B6 n/a（控件零渲染；页面级 dark 平价见 form 卡）
- C 布局：C1 pass（`docOverX: 0` 800 宽；hidden input `display: none` 不占位）C2–C6 n/a
- D 间隔：n/a（无渲染面）
- E 排布：E1 pass（页面上只出现可见字段，无幽灵占位）E2–E6 n/a
- F 一致性：F4 **族命中**（seed 场景回显文本与调试面板中文混杂，见已知族节）
- G/H：n/a

## 3. 发现条目

### [R2-2a-A9-46] hidden 字段与原生 `<form>` 无关联（`input.form === null`），值仅靠 flux scope 携带——契约观察

- **页面/路由**: `#/lab/hidden`（场景 1）
- **主题/视口/状态**: 双主题 / 1280 / 提交链路
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/hidden/hidden-default-light.png`（orderId 仅存于 scope JSON，无 DOM 呈现）
- **目视描述**: 无可见缺陷（控件本设计为不可见）；本条登记的是提交通道的契约事实，供后续与 AMIS 契约族对表。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w3c-main-results.json` hidden.contract 段
  - 输出: `input[type=hidden]` 存在、`name: "orderId"`、`value: "A100"`、`display: none`，但 `participatesInForm: false`（`el.form === null`，flux form 不使用原生 `<form>` 元素）；提交回显正确（scope 通道工作）
- **对照基准**: AMIS hidden 字段语义（值随表单提交）；本仓库 form 提交走 flux action 而非原生 submit，原生关联缺失为架构一致行为
- **严重程度**: P3（当前架构下无用户影响；一旦宿主期待原生 form 序列化/自动填充集成会踩空）
- **用户影响**: 无直接影响；集成方需知悉 hidden 值不走原生表单通道。
- **修复方向**: 无需立即处理；若后续需要原生通道，在 hidden renderer 渲染时挂 `form` 属性关联最近 form id。
- **归族**: watch-only → 台账（架构契约记录）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- i18n zh-CN 回退（R2-2a-F4-11 族）：seed 场景回显文本被调试面板中文包围（`Hidden field value echoed from scope: 调试…折叠`），引用不立项。
- fixture 缺口登记（非缺陷）：三场景均无 hidden 字段校验用例，"hidden 字段校验错误的 form 面呈现"无法走查；建议后续 fixture 增加 `hidden + required` 场景补齐该矩阵。

## owner-doc drift 登记

- owner-doc 登记：无 docs/components/hidden/design.md（owner-doc-missing，review-b D-1，2026-09-24）；按本 plan Failure Paths 不新建，新建归后续 plan。

## 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-hidden` → carded（卡列填本路径）；findings 归族后 → digested。
