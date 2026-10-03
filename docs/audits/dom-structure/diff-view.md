# dom-structure: diff-view

> Package: flux-renderers-content | Source: src/diff-view/diff-view-renderer.tsx:90-526（wrap:true，帧根三件套；内层多分支根） | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-533-dom-structure-content-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；内层分支根：split/unified/empty/cross-file = `div[data-slot="diff-view"]`；three-column 分支 W3 轮次漏检、W6 补 `data-slot="diff-view"`（:93）；cross-file 内嵌 SingleFileDiff 产生嵌套同名 slot（:514/:526，登记）；内层无 data-cid——帧根单点锚语义（合规）
- DiffHeader/DiffSplitView/DiffUnifiedView/DiffThreeColumnView/DiffFileList 子组件

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 帧根三件套；内层分支根统一 data-slot（W6 补 three-column） |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 分支根带 slot |
| D4 区域 slot | pass | diff-view-empty + 子组件体系 |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Actions

- [x] three-column 分支根补 `data-slot="diff-view"`（与其它分支一致）

## Proof

- `src/dom-structure-contract.test.tsx`（three-column 分支 slot 断言）
