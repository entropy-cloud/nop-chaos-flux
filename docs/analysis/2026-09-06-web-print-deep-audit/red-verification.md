# P5 红测验证记录（Phase 1 Proof）

> 日期: 2026-09-06
> 方法: 每个审计缺陷先写失败断言（红测），运行确认失败原因与审计结论一致，再进入修复。
> 命令: `pnpm --filter @nop-chaos/flux-print-core exec vitest run src/red-verification.test.ts`、`pnpm --filter @nop-chaos/flux-print-renderers exec vitest run src/editor/use-print-editor.test.ts src/print-inspector.test.tsx src/print-preview.test.tsx`

## 红测结果（修复前）

| 红测                                                                          | 对应缺陷                            | 结果                                                            |
| ----------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| ① full-page slices emit tr height + td font-size                              | D21-04 (P0)                         | ❌ 红：tr 无高度样式、td 无字号                                 |
| ② text below 40-row table follows flow cursor                                 | D21-01 (P1)                         | ❌ 红：below 被钉到 267 而非表格末片底                          |
| ③ universal invariant: all slices ≤ contentBottom（15 行×2、tb2.baseTop=120） | D21-02 (P1)                         | ❌ 红：tb2 强保片 272+16=288 > 277                              |
| ④ lastPage aggregate height included in placedHeight                          | D21-03 (P1)                         | ❌ 红：placedHeight 56 ≠ 62（缺聚合 6mm）                       |
| ⑤ print/export throws PRINT_VALIDATION_BLOCKED on error template              | 文档 P1（design.md §10 闸门未实现） | ❌ 红：两条通道均正常输出，无闸门                               |
| ⑥a print waits for iframe load                                                | D23-01 (P2)                         | ❌ 红：srcdoc 设置前同步调用 print（竞态）                      |
| ⑥b id counter seeded from loaded template                                     | D07-02 (P2)                         | ❌ 红：载入 text_1 后新元素 id 撞号、auto-commit 静默失败       |
| ⑥c style color css-injection sanitized                                        | D15-01 (P2)                         | ❌ 红：`red;} body{background:url(https://evil)` 原样进内联样式 |
| ⑥d qrcode foreground attribute escaped                                        | D15-01 (P2)                         | ❌ 红：`"><script>` 原样进 fill 属性                            |
| ⑥e table source exec error → PRINT_BIND_EVAL                                  | D19-02 (P2)                         | ❌ 红：无 EVAL 诊断（catch 吞为无诊断/SYNTAX 路径）             |
| ⑥f preview diagnostics same code once                                         | D22-02 (P2)                         | ❌ 红：PRINT_BIND_PATH_MISSING 出现 2 次                        |
| ⑥g inspector paperName preset select                                          | 16b-1 (P2)                          | ❌ 红：无「纸张」标签控件                                       |

结论：审计缺陷全部实证存在（12/12 红），未出现误报。红测文件：`packages/flux-print-core/src/red-verification.test.ts`、`packages/flux-print-renderers/src/editor/use-print-editor.test.ts`（追加）、`packages/flux-print-renderers/src/print-inspector.test.tsx`（追加）、`packages/flux-print-renderers/src/print-preview.test.tsx`（新建）。修复后本文件所列用例全部转绿并保留为回归测试。
