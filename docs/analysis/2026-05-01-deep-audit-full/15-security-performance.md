# 15 安全与性能红线

## 复核结论

- 保留: 0
- 降级: 1
- 驳回: 0

## 安全

- 零发现: live `packages/**/src` 与 `apps/**/src` 未发现 `eval(` / `new Function(`。

## 已降级

### owner-only form error query 仍会退回 broad subscription

- 文件: `packages/flux-react/src/hooks.ts`, `packages/flux-react/src/hook-subscriptions.ts`
- 结论: 已降级
- 依据: field/path-scoped hook 已经走 per-path；剩余 broad case 是 owner-only aggregate query，属于 intentional aggregate behavior，不足以上升为本轮 P1 性能违约。

## 复核备注

- review-only 观察项: `.semgrep.yml` 已覆盖 `new Function(...)`，但仍建议补上与之对称的 `eval(...)` 规则。
