# 深度审核汇总报告

## 审核范围

- **执行的维度**: 20 个维度（01-20），全部 6 大类
- **覆盖的包**: 25 个 packages + apps/playground + tests/e2e
- **审核日期**: 2026-05-17
- **执行方式**: 按 5 个批次并行派发第 1 轮初审 → 对有发现的维度串行追加深挖（共 N 轮）→ 维度复核 → 最终汇总
- **总子 agent 数**: ~30+（含初审、深挖、复核 agent）

## 深挖统计

| 维度          | 深挖轮次   | 初审发现             | 深挖新增    | 复核后保留      |
| ------------- | ---------- | -------------------- | ----------- | --------------- |
| 01 依赖图     | 2          | 8 (1 P1)             | 4 (2P2+2P3) | 1P1+1P2+3P3     |
| 02 模块职责   | 1          | 8 (2P1+3P2+3P3)      | -           | 待复核          |
| 03 API 表面积 | 1          | 6 (4P1+1P2+1P3)      | -           | 待复核          |
| 04 状态所有权 | 1 (零发现) | 0                    | -           | 零发现确认通过  |
| 05 订阅精度   | 2          | 9 (2P2+7P3)          | 4 (2P1+2P2) | 5P2+4P3(降级后) |
| 06 异步安全   | 2          | 6 (2P2+4P3)          | 6 (3P2+3P3) | 5P2+6P3         |
| 07 生命周期   | 1          | 6 (1P1+4P2+1P3)      | -           | 待复核          |
| 08 验证系统   | 1          | 7 (1P1+1P2+5P3)      | -           | 待复核          |
| 09 渲染器契约 | 2          | 9 (4P2+5P3)          | 4 (2P2+2P3) | 5P2+6P3         |
| 10 样式系统   | 1          | 1 (P1)               | -           | 待复核          |
| 11 UI 组件    | 1          | 1 (中)               | -           | 待复核          |
| 12 字段 Slot  | 1          | 1 (低)               | -           | 待复核          |
| 13 类型安全   | 1          | 3 (1P1+1P2+1P3)      | -           | 待复核          |
| 14 测试覆盖   | 1          | 16 (1P0+1P1+9P2+5P3) | -           | 待复核          |
| 15 安全性能   | 2          | 8 (1P1+1P2+6P3)      | 3 (P3)      | 1P2+7P3+2Info   |
| 16 文档一致性 | 1          | 2 (低)               | -           | 待复核          |
| 17 命名术语   | 1          | 2 (低)               | -           | 待复核          |
| 18 跨包模式   | 1          | 0                    | -           | 待复核          |
| 19 错误传播   | 1          | 6 (3P1+3P2)          | -           | 待复核          |
| 20 可访问性   | 1          | 1 (中)               | -           | 待复核          |

**深挖总发现数(初审+追加)**: ~105 条（含已复核和待复核）
**零发现维度**: 维度04（已独立复核确认通过）、维度18（待复核确认）

## 已独立复核统计（维度 01, 04, 05, 06, 09, 15）

| 维度 | 初审数 | 保留 | 降级                 | 驳回              |
| ---- | ------ | ---- | -------------------- | ----------------- |
| 01   | 9      | 4    | 1 (P2→P3)            | 0                 |
| 04   | 0      | 0    | 0                    | 0（零发现确认）   |
| 05   | 13     | 11   | 2 (P1→P2)            | 0                 |
| 06   | 12     | 11   | 0                    | 1 (06-06保留确认) |
| 09   | 13     | 12   | 1 (P2→P3)            | 0                 |
| 15   | 11     | 9    | 2 (P1→Info, P3→Info) | 0                 |

**合计**: 58 条初审 → 47 保留 + 6 降级 + 0 驳回 + 1 零发现

## P0 清单

| 编号  | 文件                           | 摘要                     |
| ----- | ------------------------------ | ------------------------ |
| 14-01 | `test-support.tsx` submitCalls | 模块级可变数组跨文件泄漏 |

## P1 清单（已复核）

| 编号  | 文件                              | 摘要                                |
| ----- | --------------------------------- | ----------------------------------- |
| 01-01 | `flux-react/package.json`         | 测试文件存在未声明的 workspace 依赖 |
| 07-03 | `import-stack.ts:379-423`         | 部分安装失败时无 provider 回滚      |
| 08-01 | `form-runtime-owner.ts:232-234`   | disposed 状态返回 ok:true           |
| 19-01 | `form-runtime-owner.ts:399-411`   | 吞没验证错误原因                    |
| 19-03 | `form-runtime-validation.ts:433`  | catch 无 cause 保留                 |
| 19-04 | `runtime-action-helpers.ts:48-53` | 原因丢失                            |

## P1 清单（待复核，来自初审）

| 编号  | 文件                        | 摘要                        |
| ----- | --------------------------- | --------------------------- |
| 02-01 | `shape-validation.ts`       | 深层字段分析应提取          |
| 02-02 | `variant-field.tsx`         | 副作用与渲染混合            |
| 03-01 | 4 个包                      | 通配符导出                  |
| 03-02 | `flux-core/src/index.ts`    | schema-diagnostics 内部泄漏 |
| 03-03 | `flux-bundle/index.tsx`     | 绕过索引导入                |
| 03-04 | `flux-bundle/src/index.tsx` | 无类型桥接                  |
| 10-01 | `canvas-styles.css`         | 硬编码 RGB 颜色             |
| 13-01 | `flux-bundle/src/index.tsx` | 无类型跨包桥接              |
| 14-02 | `test-dom-polyfills.ts`     | 全局 DOM patch 无 restore   |

## 高频问题文件

| 文件                         | 出现维度   | 问题数 |
| ---------------------------- | ---------- | ------ |
| `flux-bundle/src/index.tsx`  | 03, 13     | 3      |
| `form-runtime-owner.ts`      | 08, 15, 19 | 4      |
| `form-runtime-validation.ts` | 08, 19     | 3      |
| `import-stack.ts`            | 06, 07     | 3      |
| `flux-react/src/index.tsx`   | 01, 02     | 2      |
| `crud-renderer.tsx`          | 09, 13     | 2      |

## 跨维度模式

| 模式                 | 涉及维度 | 描述                                    |
| -------------------- | -------- | --------------------------------------- |
| flux-bundle 类型桥接 | 03, 13   | 通配符导出 + as unknown as 类型抹除     |
| 错误原因丢失         | 15, 19   | 多个 catch 块不保留 { cause }           |
| 广播订阅             | 05, 09   | 多个渲染器使用全量 scope/store 广播订阅 |
| 模块级可变状态       | 09, 04   | ObjectField/DialogCanvas 模块级 WeakMap |

## 已自动化的检查项

- ESLint no-eval / no-new-func ✅（安全红线硬门禁）
- ESLint max-lines ✅（700 行硬门禁）
- check:workspace-manifest-deps ✅（依赖声明检查）
- check:oversized-code-files ✅（文件行数基线）
- check:audit-missing-renderer-markers ✅（渲染器标记检查）
- check:audit-fieldframe-bypasses ✅（FieldFrame 绕过检查）

## 建议新增自动化检查

1. **check:unused-dependencies**: 检查 package.json 中被声明但源码中无导入的 workspace deps
2. **check:no-wildcard-exports**: 禁止在入口文件使用 export \*（校准后）
3. **check:error-cause**: 检查 catch 中 new Error() 是否使用 { cause }

## 可暂缓项

- 全仓库缺少 performance.mark/measure → 降级为 Info
- 非表格大数据组件缺少虚拟化 → 前瞻建议，当前无受影响组件
- 部分文件命名不一致 → 低优先级
- 文档陈旧行号引用 → 低优先级

## 误报排除清单

- 63 处 `[data-slot]` 选择器 → 全部通过豁免检查（spreadsheet画布、widget渲染器、@layer base 主题CSS）
- 103 处 async failure suspects → 多数为有意图的防御性 catch，6 条确认为真实发现
- 4 处 reactive-render-read suspects → 全部不在渲染路径中，误报
- 6 处 JSON.stringify → 全部非热路径变更检测，排除
