# [card] control:icon

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/icon` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：gallery / inline with text / unknown-name fallback）
- **矩阵裁剪**: simplified（matrixReason：本控件为结构+视觉复合——icon 渲染真实 SVG 视觉面，按 widget 走查（别名解析/尺寸/着色）；无弹层→H 全 n/a、无拖拽→A6/A8 n/a、无异步→A5 loading 子项 n/a；glass 皮肤未跑）
- 本页实际裁掉的状态：glass 皮肤、~375 移动档、disabled/hover 元素态（icon 为 aria-hidden 非交互元素，无这些态，n/a 非裁剪）
- **runner dark 列作废声明**：capture runner 仅 `emulateMedia(colorScheme)`，playground dark 由 `data-mode` 属性驱动且无 matchMedia 同步——runner 产出的 `lab-icon-default-*-dark.png` 实为 light 渲染。本卡 dark 证据一律以自采 `_tmp/visual-inspection-2026-09-23/r2-2a/icon/full-*-dark.png`（显式 setAttribute data-mode）为准，见发现 R2-2a-B5-34（page 卡）。

## 1. 截图清单

| 状态                      | light                                                                   | dark（真 data-mode，自采）                                                                              |
| ------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 默认 1280×800             | `_tmp/visual-inspection-2026-09-23/lab-icon-default-1280x800-light.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/icon/full-1280-dark.png`                                       |
| 默认 800×900              | `_tmp/visual-inspection-2026-09-23/lab-icon-default-800x900-light.png`  | `_tmp/visual-inspection-2026-09-23/r2-2a/icon/full-800-dark.png`                                        |
| 全页（3 场景含 fallback） | `_tmp/visual-inspection-2026-09-23/r2-2a/icon/full-1280-light.png`      | 同上 dark 列                                                                                            |
| fallback 场景特写         | —                                                                       | `_tmp/visual-inspection-2026-09-23/r2-2a/icon/fallback-scenario-dark.png`（星形 + Circle 回退并排可见） |

## 2. A–H 维度勾选表

- A 交互：A1 n/a（aria-hidden 非交互）A2 n/a A3 n/a A4 n/a A5 pass（未知名回退 Circle 不崩溃，DOM 存在）A6 n/a A7 n/a A8 n/a A9 n/a
- B 颜色：B1 pass（dark 图标 rgb(230,236,243) 对黑底 17.66:1）B2 n/a B3 pass B4 pass（currentColor 继承正文令牌色，无字面色）B5 pass（真 dark 复拍，着色随 data-mode 翻转）B6 n/a
- C 布局：C1 pass（1280/800 overflow 扫描零命中）C2 pass C3 pass C4 pass（窄视口不塌）C5 n/a C6 n/a
- D 间隔：D1 **warn(R2-2a-D1-22)**（inline 行图标-文本 2px 贴死，fixture 层）D2–D8 n/a/pass
- E 排布：E1 pass E2–E6 n/a/pass
- F 一致性：F1–F5 n/a（本页无跨页操作语义）
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2a-A5-21] icon 别名乒乓落空：`home`/`house` 在 lucide 1.17 下静默回退 Circle

- **页面/路由**: `#/lab/icon`（fallback 场景 + 任意使用 `icon: 'home'/'house'` 的 schema；本卡在 lab 页以 runtime import 复现）
- **主题/视口/状态**: 双主题 / 全视口 / 渲染即现
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/icon/fallback-scenario-dark.png`（可见未知名渲染为 Circle）
- **目视描述**: 别名解析链把两个方向都归一化到 `home`，而 lucide-react 1.17 的 icons 索引已无 `Home` 键，任何 home 语义图标静默渲染成 Circle（圆形回退），无告警无提示。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w2-icon.mjs`（node 侧 import lucide-react@1.17.0 `dist/esm/lucide-react.mjs` 的 `icons` 命名空间 + 复刻 `icon-utils.ts` 归一化链）
  - 输出: `home → normalized 'home' → lucideKey 'Home' → iconExists: False`；`house → 'home' → 'Home' → False`；而 `icons/index.mjs` L827 只有 `export { default as House } from './house.mjs'`，无 `Home` 键。根因链：`packages/ui/src/lib/icon-utils.ts` L118 `home:'house'`（ANT 表）与 L7 `house:'home'`（ICON_ALIAS_MAP）乒乓后落回 `home`，撞上已删除的 `icons.Home` 导出。对照：`gear/cog → settings-2 → Settings2` 解析正常。
- **对照基准**: 图标别名回环已知族（命中的即 R2-1d-A5-02 族）；检查提示词 A5（回退应有意义且可感知——此处"回退"非 schema 主动选择而是解析链缺陷）
- **严重程度**: P1（高频语义图标名静默错图，产品面任何 home 图标变圆圈）
- **用户影响**: 使用 `home/house/ant-design:home` 的页面图标显示为无意义圆形，用户与作者双双无感知（无 console 告警）。
- **修复方向**: `packages/ui/src/lib/icon-utils.ts`：ICON_ALIAS_MAP 删除 `house:'home'`（或改为 `home:'house'` 单向对齐 lucide 1.x 规范名），并给 `resolveLucideIcon` 落空分支加一次性 dev warn；同时把 `ANT_DESIGN_LUCIDE_MAP.home` 目标改为最终规范键，消除双表乒乓。
- **归族**: systemic → 图标别名回环族（引用 R2-1d-A5-02，R2-3 候选 #9）+ 本卡实例（lucide 1.17 运行时坐实）
- **复核状态**: 已复核（保留 P1，review-a 2026-09-24）。订正（表述精确化）：barrel L124 仍导出 Home（与 House 同指 house.mjs），缺键的是 icon-utils 消费的 lucide icons 命名空间（index.mjs 1713 键无 Home）；P1 依据 = 系统性升一级条款。design.md 死链别名已回写（2026-09-24）

### [R2-2a-D1-22] inline 图标-文本行 2px 贴死（lab fixture 层）

- **页面/路由**: `#/lab/icon`（场景 2 "Inline with text labels"，schema `gap: 2`）
- **主题/视口/状态**: light / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/lab-icon-default-1280x800-light.png`（人形图标与 "Alice Johnson" 几乎相触）
- **目视描述**: 图标与文本间距仅 2px，视觉上贴死，三行 labelled 行都拥挤。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w2-icon.mjs` inlineGap 测量
  - 输出: `{ iconRight: 317, textLeft: 319, gap: 2 }`；`resolveGap`（`packages/flux-react/src/resolve-gap.ts` L22）把数字 gap 按 px 处理 → schema `gap: 2` = 2px。
- **对照基准**: 检查提示词 D1（4/8pt 栅格）/ D7（<4px 进复验）
- **严重程度**: P3（fixture 演示参数选择，非控件缺陷；icon 渲染本身正确）
- **用户影响**: 照抄 lab 示例的作者会复制出拥挤行；不影响控件本身使用者。
- **修复方向**: `apps/playground/src/component-lab/renderers/icon-lab-page.tsx` L33/L43/L53 `gap: 2` → `gap: 8`（或 token 别名 `gap: 'sm'`）。
- **归族**: watch-only → 台账（fixture 参数级；控件无责）
- **复核状态**: 未复核

## 4. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-icon` → carded（卡列填本路径）；findings 归族后 → digested。
