# 维度 06：异步模式与取消安全

## 第 1 轮（初审）

### [维度06-01] 树控件远程搜索 debounce 缺 in-flight 取消层

- **文件**: `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts:106-148`（useTreeRemoteSearch）+ `:60`（executeTreeSource 未透传 signal）+ `:194-240`（useTreeLazyChildren.runLoad）
- **证据片段**:
  ```ts
  106: let cancelled = false;
  107: const handle = setTimeout(() => {
  113:   executeTreeSource(searchSource!, helpers, { searchQuery: trimmed })
  114:     .then((result) => { if (cancelled) { return; } ... })
  144: return () => { cancelled = true; clearTimeout(handle); };
  ```
- **严重程度**: P2（初审）→ P3（复核降级）
- **现状**: useTreeRemoteSearch 用裸 boolean；executeTreeSource 不透传 signal；缺失 in-flight abort。`cancelled` 标志正确屏蔽 stale setState（无错误数据），但已 in-flight 远程请求不被 abort，浪费后端。
- **风险**: 复核评估实际影响低——React 18+ 对卸载后 setState 静默 no-op；`cancelled` 正确屏蔽 stale 结果；仅浪费带宽。"P5 mandatory 规则"在 AGENTS.md/docs 未能直接核实引用。
- **建议**: executeTreeSource 加 signal 形参转发到 helpers.dispatch；effect 改 AbortController + cleanup abort；runLoad 补卸载守卫。
- **误报排除**: 非"功能可用"降级——是 AbortController 收敛缺口，但影响有限故 P3。
- **复核状态**: 维度复核降级 P2→P3 → AUDIT-12。

### [维度06-02] qrcode / value-input 叶子 useEffect 残留裸 cancelled boolean

- **文件**: `packages/flux-renderers-content/src/qrcode.tsx:48-67`; `packages/flux-renderers-form-advanced/src/condition-builder/value-input.tsx:174-192`
- **证据片段**:
  ```ts
  // qrcode.tsx:48
  let cancelled = false;
  QRCode.toCanvas(canvasRef.current, valueStr, {...}).catch((error) => { if (!cancelled) { setFailed(true); ... } });
  return () => { cancelled = true; };
  ```
- **严重程度**: P3
- **现状**: 两处 async useEffect 用裸 boolean。底层 API（QRCode.toCanvas / evaluateFormula）不接 signal，第二层 in-flight 取消本身不适用；第一层 stale 屏蔽由 cancelled 正确完成。
- **风险**: 无用户可见故障（装饰性二维码 / 公式预览文本）。
- **建议**: 作为 P5 收敛统一改 AbortController，或在 P5 文档明确豁免"底层 API 不支持 signal 的本地计算 useEffect"。
- **误报排除**: 命中 calibration pattern 10 边界；P5 把"bare boolean"列为 Prohibited，但无用户可见失败故 P3。
- **复核状态**: 维度复核通过（保留 P3 → AUDIT-13）。

## 维度复核结论

- [06-01]: 降级 P2→P3 → AUDIT-12。复核确认 cancelled 正确屏蔽 setState，影响仅限浪费带宽。
- [06-02]: 保留 P3 → AUDIT-13。

所有 void-promise-no-catch suspect（spreadsheet default-page-body 146-246、report-designer-toolbar、dynamic-renderer、upload-field、pull-refresh 等）经复核全部驳回：内部已 fail-safe / 纯命令转发（dispatchSpreadsheetCommand try/catch 收敛）/ 动态 import loader。

## 最终保留项

| 编号  | 严重程度 | 文件                                          | 摘要                                    |
| ----- | -------- | --------------------------------------------- | --------------------------------------- |
| 06-01 | P3       | `tree-control-controllers.ts:106-148`         | 远程搜索缺 in-flight 取消（降级 P2→P3） |
| 06-02 | P3       | `qrcode.tsx:48-67`, `value-input.tsx:174-192` | 裸 cancelled boolean（P5 风格）         |
