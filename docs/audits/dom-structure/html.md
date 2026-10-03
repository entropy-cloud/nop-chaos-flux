# dom-structure: html

> Package: flux-renderers-content | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-533-dom-structure-content-plan.md

## 结构图（根 → 首个内容）

- root 携带三件套（data-testid/data-cid + data-slot 或 nop-html class）；单元素/薄壳组件，无可疑包装层（详见盘点事实：separator 双形态含 label 分支；spinner spinner-label；link 为安全门 <a>；html dangerouslySetInnerHTML + html-empty）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | leaf 直出 |
| D3 包装付租 | pass | 0 层 |
| D4 区域 slot | pass | 条件 slot（label/empty 等） |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 html 测试覆盖
