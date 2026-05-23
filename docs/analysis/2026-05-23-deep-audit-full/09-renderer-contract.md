# 维度 09: 渲染器契约合规性

## 第 1 轮（初审）

### [维度09-01] `variant-field-view.tsx` 直接实例化 `FieldFrame` 命中 scanner，但需复核它是否越过了允许的 local wrapper 路径

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx:195-217`
- **证据片段**:
  ```tsx
  return (
    <FieldFrame
      name={typeof schemaProps.name === 'string' ? schemaProps.name : undefined}
      label={schemaProps.label as React.ReactNode}
      ...
      rootTag="div"
    >
      {body}
    </FieldFrame>
  );
  ```
- **严重程度**: P2
- **现状**: `pnpm check:audit-fieldframe-bypasses` 把该路径标为 direct `FieldFrame` usage；表面看像绕过 `wrap: true -> NodeFrameWrapper` 的共享 renderer contract。
- **风险**: 如果它真在本地重复 owner chrome 逻辑，会导致 field shell 行为与共享 wrapper 分叉。
- **建议**: 对照 `docs/architecture/field-frame.md` 判断这是否属于允许的 `rootTag="div"` 例外，而不是直接进入 remediation backlog。
- **为什么值得现在做**: 这是 dimension 09 / 12 共用的 suspect，应先做 owner-doc adjudication，避免重复误报。
- **误报排除**: reopened adjudication 与 calibration 都要求对 `FieldFrame` adoption pressure 保持克制；本条先作为候选线索记录。
- **历史模式对应**: 对应 calibration pattern 9“Blanket FieldFrame adoption pressure”。
- **参考文档**: `docs/architecture/renderer-runtime.md`；`docs/architecture/field-frame.md`；`docs/references/audit-tooling.md`。
- **复核状态**: 未复核

## 深挖第 2 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度09-01]: 驳回。`field-frame.md:343-344` 明确允许“renderer 仍需要 shared field chrome 但不能安全使用真实 `<label>` root 时，选择 local `FieldFrame rootTag="div"` 路径”，而 `variant-field-view.tsx` 正是该受支持例外；未见额外 owner chrome 分叉证据。

## 子项复核结论

- [维度09-01]: 批量复核驳回。该命中属于 scanner candidate，不进入最终保留项。

## 最终保留项

| 编号 | 严重程度 | 文件 | 一句话摘要                   |
| ---- | -------- | ---- | ---------------------------- |
| 无   | -        | -    | 本维度经复核未发现需报告问题 |
