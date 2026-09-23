# [card] control:checkbox-group

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/checkbox-group` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：Basic multi-select checkbox group / Checkbox group with min/max selection validation）
- **矩阵裁剪**: simplified（matrixReason：多选组控件，无弹层无异步；裁掉的状态：glass 皮肤、disabled/readonly 变体（fixture 未提供）、动态 options 远端源（非渲染面））
- **dark 证据**: dark 截图为本波自采真 data-mode（R2-2a-B5-34 同前）。`checkbox-group-error-*`（0 选中提交无错误呈现）与 `checkbox-group-overmax-noerror-*`（5 连选超 maxSelect=4）均为本波补拍/重命名，命名与内容逐张核对过。

## 1. 截图清单

| 状态                                              | light                                                                                             | dark（真 data-mode）                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 部分选中态（1/5，场景截图）                       | `_tmp/visual-inspection-2026-09-23/r2-2a/checkbox-group/checkbox-group-checked-light.png`         | `_tmp/visual-inspection-2026-09-23/r2-2a/checkbox-group/checkbox-group-checked-dark.png`         |
| 全选态（5/5，场景截图）                           | `_tmp/visual-inspection-2026-09-23/r2-2a/checkbox-group/checkbox-group-all-selected-light.png`    | `_tmp/visual-inspection-2026-09-23/r2-2a/checkbox-group/checkbox-group-all-selected-dark.png`    |
| 超 max 连选后（5/5 > maxSelect 4，无钳制/无提示） | `_tmp/visual-inspection-2026-09-23/r2-2a/checkbox-group/checkbox-group-overmax-noerror-light.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/checkbox-group/checkbox-group-overmax-noerror-dark.png` |
| 0 选中提交后（无错误呈现）                        | `_tmp/visual-inspection-2026-09-23/r2-2a/checkbox-group/checkbox-group-error-light.png`           | `_tmp/visual-inspection-2026-09-23/r2-2a/checkbox-group/checkbox-group-error-dark.png`           |
| 窄视口 800×900 默认                               | `_tmp/visual-inspection-2026-09-23/r2-2a/checkbox-group/checkbox-group-800-light.png`             | —                                                                                                |

## 2. A–H 维度勾选表

- A 交互：A1 n/a A2 pass（`:focus-visible` 命中，3px primary 半透明环）A3 pass（16×16 视觉盒 + `::after` 扩展 40×32 命中区）A4 n/a（fixture 无 disabled）A5 n/a A6/A8 n/a A7 n/a A9 **fail(R2-2a-A9-42)**（min/maxSelect 声明完全不生效：超选不钳制、不足提交无错误、无任何反馈）
- B 颜色：B1 pass（本卡无错误文案呈现——正是问题所在；选中蓝/文字对比达标）B2 pass B3 pass B4 pass（选中态溯源 `--primary`）B5 pass（dark 平价无新缺陷；选中底偏亮归 R2-4 族）B6 pass
- C 布局：C1 pass（1280/800 `docOverX: 0`；horizontal direction 下 5 项 800 宽不换行错乱）C2–C5 pass/n-a C6 n/a
- D 间隔：D1 pass（组内项 gap 均匀）D2–D8 n/a/pass
- E 排布：E1–E2 pass（Selected: 回显行紧随组后）E3–E6 n/a/pass
- F 一致性：F1 pass（与 checkbox 单体同构同色）F2–F3 n/a F4 pass（选项文案英文；无 zh 输出）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2a-A9-42] schema 声明 minSelect=2/maxSelect=4 完全不生效：超选不钳制、不足提交无错误、无 limit 提示

- **页面/路由**: `#/lab/checkbox-group`（场景 2 Checkbox group with min/max selection validation；schema 含 `minSelect: 2, maxSelect: 4`，5 个 option）
- **主题/视口/状态**: 双主题 / 1280 / 全选 5 项 + 0 选中提交两个状态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/checkbox-group/checkbox-group-overmax-noerror-light.png`（5/5 全亮，无禁用/无提示）；`checkbox-group-error-light.png`（0 选中提交后无任何错误标记，scope `"valid": true`）
- **目视描述**: 用户可以勾满 5 项（超出"choose 2 to 4"），控件既不阻止也不提示；全部取消后点 Submit，表单无错误文案、无红边、无 aria-invalid，静默通过。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w3d-complete.mjs` recheck.groupMinMax + `w3g-mini.mjs` groupZero 段
  - 输出: `allChecked: [true×5]`（第 5 次点击未被拦截）；`echoAfterFive: "Selected: ts, react, node, postgres, docker"`；0 选中提交 `fieldError: null, alerts: [], anyInvalidMark: false`（两主题一致）；`limitHint`（`[data-slot="checkbox-group-limit-hint"]`）DOM 不存在
- **对照基准**: 检查提示词 A9（交互后反馈可见，非静默更新）；AMIS 表单校验契约（validateMessageType/min 选数约束应在提交面呈现）；已知族「表单 AMIS 契约缺口（validate.api、submit payload）→ R2-3 候选」
- **严重程度**: P2（schema 作者写明的约束对用户完全不可见，属于静默失效；lab fixture 描述文本自认"exercises min/max validation authoring"仅停留在 authoring 层）
- **用户影响**: 业务约束（至少选 2 个技能）在 UI 上不存在，用户按 1 项也能提交成功，数据质量靠后端兜底。
- **修复方向**: `packages/flux-renderers-form/src/renderers/checkbox-group-renderer.tsx`：① 接线 minSelect/maxSelect 到 form 校验规则（提交/失焦时产出 field-error）；② 达到 maxSelect 后禁用其余未选项（disabled + 降透明度）；③ 渲染 limit 提示行（如 "已选 3/4"）。
- **归族**: systemic → R2-3 批候选（表单 AMIS 契约缺口族，与本族合并收编）
- **复核状态**: 已复核（保留 P2，review-b 2026-09-24）。订正（根因改判）：渲染器未接线证伪——min/max 钳制+提示已实现且有单测，契约键为 minSelected/maxSelected，fixture 用的 minSelect/maxSelect 被静默丢弃；真实缺口 = min 数提交面校验缺失 + 未知校验键零诊断

## 4. 已知族命中（引用，不另立项）

- 表单 AMIS 契约缺口（R2-3 候选）：A9-42 即该族在 checkbox-group 上的实例（min/max 校验声明未消费）。
- `--primary` dark 过亮/对比度（R2-4）：dark 全选态 5 个选中底偏亮，同 B1-40 根因，引用不立项。
- i18n zh-CN 回退（R2-2a-F4-11 族）：本页截图含 scope-debug 面板"调试/折叠"中文 chrome，引用不立项。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-checkbox-group` → carded（卡列填本路径）；findings 归族后 → digested。
