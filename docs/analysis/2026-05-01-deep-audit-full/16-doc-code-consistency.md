# 16 文档-代码一致性

## 复核结论

- 保留: 2
- 降级: 1
- 驳回: 1

## 保留

### `frontend-baseline.md` 活跃 workspace baseline 已过时

- 文件: `docs/architecture/frontend-baseline.md`
- 结论: 保留，P1
- 依据: 文档遗漏 `flux-compiler` 与 `flux-action-core`，而 `packages/` 与 `AGENTS.md` 均已包含。

### Plan 143 状态前后自相矛盾

- 文件: `docs/plans/143-unit-test-coverage-80-percent-target-plan.md`
- 结论: 保留，P1
- 依据: 文件头写 `completed`，但正文仍保留“before it can move from partially completed to completed”以及 phase-level `partially completed`。

## 已降级

### `field-metadata-slot-modeling.md` owner anchor 不再精确

- 文件: `docs/architecture/field-metadata-slot-modeling.md`
- 结论: 已降级
- 依据: 路径仍有效，但已不是最准确 owner；应从 `schema-compiler.ts` / `flux-react/index.tsx` 收紧到更具体的 live owner 文件。

## 已驳回

### 已移除术语仍出现在当前 dist d.ts

- 结论: 驳回
- 依据: 复核未在当前 `dist/**/*.d.ts` 中重现该 lead 所述旧术语暴露。

## 复核备注

- 额外确认多个 architecture doc 还保留失效的行号锚点，尤其是 flow/report designer 文档中对 `flux-react/src/index.tsx:479` 之类引用。
