# 维度 03：API 表面积与契约一致性

## 第1轮初审

- 结论：零发现。
- 核查范围：全部 `packages/*/src/index.ts(x)`、`package.json` exports map、稳定导出 hooks/types、`unstable` 子路径、疑似未接线文件。
- 关键确认：
  - `RendererComponentProps`、`ScopeRef` 的单一定义与跨包使用未见漂移。
  - root barrel 与 exports map 基本对齐。
  - 未发现可高置信定性的 dead code；命中 calibration pattern 6 的候选项均未越过证据门槛。

## 深挖统计

- 第1轮发现数：0
- 深挖终止：第1轮后直接进入复核

## 维度复核结论

- 独立复核确认：零发现结论成立。
- 当前未见 root barrel / exports map / stable hook surface 的高置信失配项。

## 子项复核结论

- 无需逐条复核项。
