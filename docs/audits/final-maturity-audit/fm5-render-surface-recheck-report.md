# FM-5 渲染面回归复检报告（plan 646，2026-10-18）

> 口径：`docs/skills/visual-page-quality-inspection-prompt.md`（A–H 走查）+ `docs/skills/ux-design-pattern-audit-prompt.md`（叠加，bounded 单轮）；R2 基线 = 2026-09-24 收官（121 页 + 139 控件）。

## 增量集与抽样裁定（程序化，双源）

- **route-set diff**（inventory 再生成前后 id 集）：18 条新增路由、0 删除（245→263）。generator 规模钉自 R2 时代过期（124/121 → 134/129），已按 FM-5 再基线（批次规则未动，仅规模计数）。
- **新增 walked（8，全量复检）**：bisheng-build, content-landing, page-designer, pih-workspace, scada-gallery, three-gallery, three-industrial-demo, xlang-debug。
- **新增 carrier（10，快速检查）**：lab-cron-editor/department-select/input-city/input-color/input-signature/rating/resizable/slider/user-select/verification-code。
- **改版 walked（精确文件匹配 = 自有 schema/源文件有提交）**：40 页 → 超上界 40，按口径执行模型声明首批裁 32 页 + 8 页顺延 FM-5a（scada-pressure-demo/standard-crud/stripe-payments/sundial-detail/sundial-todo-dialog/sundial-workbench/three-canvas-demo/tree-crud）。
- **存量抽样**：14 页（10%–15% 边界内，random seed 646）。
- capture 矩阵：357 张截图落 `_tmp/visual-inspection-2026-10-18/`（dark/light × 1280x800/800x900）。

## Phase 1 走查结果汇总（三分片 + 修复）

| 分片                    | 范围                       | 页数 | pass/fail | 新 findings                                                                      |
| ----------------------- | -------------------------- | ---- | --------- | -------------------------------------------------------------------------------- |
| 1 新增页全量            | 8 新走查页 + 10 新 carrier | 18   | 14/4      | **P0×1、P1×2(+xlang P1 领地外 1)、P2×3、P3×13**                                  |
| 2 改版页批一            | 16 页                      | 16   | 16/0      | 零新增；10 项 R2 finding 确认已修复（正向销项）；11 条在案复发维持原归族         |
| 3 改版页批二 + 存量抽样 | 16 + 14                    | 30   | 29/1      | P2×1（linear-settings light 标签 1.00:1）+ P3×4；13 项历史修复确认；watch 零恶化 |
| ux-design-pattern 叠加  | 12 文件抽样                | —    | —         | 12 findings（HIGH 2 / MEDIUM 5 / LOW 5）                                         |

### P0/P1 当批修复（先红后绿，全部完成）

1. **P0 bisheng-build 边路由崩溃**：真因 = condition 节点端口 `position: "right-top"/"right-bottom"` 超出路由器四向联合 → `handlePoint` 落空返回 undefined → `sp.x` TypeError（走查初判"缺测量几何"经 live 复现修正口径）。修复：`edge-router.ts` 增 `hasMeasuredGeometry`/`hasRoutableSides` 守卫（几何缺失或 side 越界 → 回退 default 边，NaN 盒不再污染场度量）。判别：`edge-router-defensive.test.ts` 3 用例旧实现 2 红 → 修复 3 绿；plan 640 byte-for-byte characterization 5 条原样通过；flow-designer-core 213/213 绿。live 证据：修复后 bisheng-build 6 nodes + 6 edges 渲染、console 0 error（截图 fm5-fix-bisheng-rendered-\*.png）。
2. **P1 scada-gallery light 标签对比度**：1.48:1 → 15.74:1（画布容器 `text-[#e6ecf3]`，dark 逐字节不变）。
3. **P1 linear-inbox「归档所选」**：标签改「全部归档」+ confirmText（对齐行为语义与家族确认基线）；live 验证确认框弹出。
4. **P1 antdpro-list 批量删除**：补 confirmText `${$crud.selectionCount}` 计数插值（对齐 standard-crud 基线）；live 验证 10 行选中弹「确认删除选中的 10 条记录？」。

### 领地外 / watch-only / 归族

- **FM-032（watch-only，领地）**：xlang-debug dark CodeMirror 无主题适配 + 门控表单裸元素（form.tsx IME 同族并发会话领地，归 FM-6 候选注明领地）。
- **FM-031（P2 linear-settings light 标签 1.00:1）**：复刻画布恒暗 × 主题响应式 token——local→FM-6 候选（修复方向：画布本地固定色或 dark 作用域）。
- 在案复发 11 条（C3-02 版心收缩族/C4 窄视口族/dark 半适配族）维持 R2 原归族；采集伪影（空白帧/交互态未捕获/lazy chunk 首帧）经 settled 复拍定谳并登记 runner 改进建议（settle 延迟/双帧采样/空白帧重拍）。
- ux 叠加 MEDIUM 5 条（linear-inbox 空态、死导航项、徽标双机制、行删除三做法、collapse tone 色条）→ FM-6 候选清单。
- 其余 P3：3D 性能域 watch、lab carrier console 噪音、stripe-payments 注释裁切、three-canvas 头部不一致等（分片文件逐条）。

## Phase 2 — 评分卡对比 + 台账

- coverage 台账：129 walked（pending 8 新页）+ 149 controls（pending 10 新控件）——结构闭合 uncovered=0/orphan=0（新行按生成器批次规则入账，FM-5 归属注记 note 列）。
- findings 台账：FM-031–035 五条三态归族（见 ledger FM-5 批）。
- 评分卡对比结论：改版面 32 页零新回归（R2 基线维持）；正向销项 23 项（10 项 R2 finding + 13 项历史修复确认）；新增面 18 页暴露 1 P0 + 4 P1 级（3 已修 + 1 领地立案）。

## 附：分片原始文件

`_tmp/fm5-walk-shard-{1,2,3}.md`、`_tmp/fm5-ux-overlay.md`、`_tmp/fm5-increment.json`、`_tmp/fm5-scope.json`。evidence cards：`docs/analysis/fm5-render-recheck/cards/`。
