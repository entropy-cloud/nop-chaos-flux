# dom-structure: video

> Package: flux-renderers-content | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-533-dom-structure-content-plan.md

## 结构图（根 → 首个内容）

- root `<figure class="nop-video" data-renderer="video" data-testid data-cid>`（video-poster/-media/-title/-fallback slot）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | figure 语义 |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | 原生媒体元素语义 |

## Proof

- 登记卡；行为由既有 video 测试覆盖
