# 57 Architecture Docs Grouping And Gradual Migration Plan

> Plan Status: completed
> Last Reviewed: 2026-04-10
> Source: `docs/architecture/README.md`, `docs/index.md`, `docs/analysis/2026-04-01-docs-design-review-2026-03-29.md`

## Purpose

æœ¬è®¡åˆ’ç”¨äºŽå¤„ç† `docs/architecture/` ç›®å½•è¶Šæ¥è¶Šæ‹¥æŒ¤çš„é—®é¢˜ï¼Œä½†é¿å…ä¸€æ¬¡æ€§å¤§æ¬å®¶å¯¼è‡´è·¯å¾„å™ªéŸ³ã€äº¤å‰å¼•ç”¨æ–­è£‚å’Œå¯¼èˆªå›žé€€ã€‚

## Current Baseline

- `docs/architecture/` å½“å‰å¹³é“ºå±‚å·²ç»æœ‰ 30+ æ¡ç›®ã€‚
- `flow-designer/` å’Œ `report-designer/` å·²ç»è¯æ˜Žâ€œç¨³å®šæ–‡æ¡£æ—è¿›å…¥å­ç›®å½•â€æ˜¯å¯è¡Œçš„ã€‚
- ä½† action/runtime/ui ç›¸å…³æ–‡æ¡£ä»é«˜åº¦äº¤å‰å¼•ç”¨ï¼Œç›´æŽ¥æ•´æ‰¹è¿ç§»æˆæœ¬è¾ƒé«˜ã€‚

## Goals

- å…ˆå»ºç«‹é€»è¾‘åˆ†ç»„å…¥å£ï¼Œè€Œä¸æ˜¯ç«‹åˆ»å…¨é‡ç‰©ç†è¿ç§»ã€‚
- å®šä¹‰å“ªäº›æ–‡æ¡£æ—æœªæ¥é€‚åˆè¿å…¥å­ç›®å½•ã€‚
- ä¿æŒé¡¶å±‚é”šç‚¹æ–‡æ¡£çš„ç¨³å®šæ€§ã€‚

## Non-Goals

- ä¸è¦æ±‚å½“å‰å›žåˆå°±ç§»åŠ¨æ‰€æœ‰ architecture æ–‡æ¡£ã€‚
- ä¸è¦æ±‚ä¸ºäº†ç›®å½•æ•´æ´ç‰ºç‰²äº¤å‰å¼•ç”¨ç¨³å®šæ€§ã€‚
- ä¸è¦æ±‚é‡å†™å…¨éƒ¨ `Related Documents` è·¯å¾„ã€‚

## Scope

### In Scope

- `docs/architecture/README.md`
- `docs/index.md`
- future doc-family migration notes

### Out Of Scope

- full path migration unless separately scheduled
- component docs directory reorganization

## Workstream 1 - Logical Grouping

Status: completed
Targets: `docs/architecture/README.md`, `docs/index.md`

- [x] freeze logical groups for core/action/runtime/ui/host/domain docs
- [x] use grouped index as the first navigation layer

Exit Criteria:

- [x] readers can navigate architecture docs by topic without relying on flat filename scanning

## Workstream 2 - Gradual Migration Strategy

Status: completed
Targets: successor plans if a concrete migration is approved

- [x] identify one stable doc family for the first physical move
- [x] batch-update cross-links for that family only
- [x] keep top-level anchors stable unless there is a strong reason to move them

Exit Criteria:

- [x] any future migration proceeds family-by-family instead of repo-wide at once

## Validation Checklist

- [x] architecture grouped index exists
- [x] docs explicitly state that flat architecture layout is crowded but not yet worth a full immediate move
- [x] docs define a gradual migration rule

## Closure

Status Note: Completed. Architecture navigation now has a stable grouped index and future physical moves are explicitly constrained to family-by-family migration.

Follow-up:

- no remaining plan-owned work

