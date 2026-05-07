# 17 Naming

- 深挖轮次: 1
- 深挖发现数: 1
- 维度复核: 1 保留 / 0 降级 / 0 驳回
- 子项复核: 已完成

## 第 1 轮初审

- `README.md` / `README.zh-CN.md` 仍把 `closeDialog` 当正式 owner-aware built-in action 介绍

## 维度复核结论

保留。

## 子项复核结论

成立。

## 最终保留项

### [维度17] README 双语入口文档仍把 `closeDialog` 当正式动作示例，而非 `closeSurface`

- **文件**: `README.md`, `README.zh-CN.md`
- **严重程度**: P1
- **现状**: 对外入口文档仍教学 `closeDialog`
- **风险**: compatibility alias 继续反向污染公开 DSL 基线
- **建议**: README 改为 `closeSurface`，若保留 `closeDialog` 仅作为 alias 说明
- **复核状态**: 子项复核通过
