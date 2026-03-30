# 18 Tailwind @source Wrong Relative Path — flux-lib Classes Not Generated

## Problem

- nop-chaos-next 登录页面 Card 组件内所有内容贴边显示（padding 为 0），`px-6`、`py-6`、`gap-6` 等工具类完全不生效
- Dashboard 页面同样缺少 padding，字体 fallback 到系统默认字体
- 但部分 Tailwind 类（如 `text-sm`、`rounded-xl`、`flex`、`grid`）正常工作

## Diagnostic Method

**诊断难度：中高。** 表面现象与 bug #14 类似（Tailwind 类未生成），但根因不同。

### 诊断路径

1. **用 Playwright 检查 computed style** — 确认 `px-6` 元素的 `paddingLeft`/`paddingRight` 为 `0px`，`py-6` 元素的 `paddingTop`/`paddingBottom` 为 `0px`
2. **搜索所有 stylesheet 中的 `.px-6` 规则** — 确认该规则在任何 stylesheet 中都不存在
3. **系统性地检查各类是否生成** — 发现 `p-4`/`px-4`/`gap-4` 生成了，但 `p-6`/`px-6`/`py-6`/`gap-6` 未生成。初步怀疑是特定数值被过滤，但实际是因为这些类只在 `flux-lib/ui` 的源码中使用，不在 consumer 自身源码中
4. **验证 `@source` 路径解析** — 用 Python `os.path.normpath` 从 `apps/main/src/styles/` 目录计算 `../../flux-lib/ui` 的实际解析路径，发现解析到 `apps/main/flux-lib/ui`（不存在），而 `flux-lib/` 实际在仓库根目录，需要四级 `../`

### 关键证据

```
CSS 文件位置:  apps/main/src/styles/tailwind.css
@source 写的:  ../../flux-lib/ui
实际解析到:    apps/main/flux-lib/ui  ← 不存在
正确路径:      ../../../../flux-lib/ui  ← 仓库根目录下
```

```
// 浏览器 computed style（修复前）
.px-6   -> paddingLeft = 0px, paddingRight = 0px
.py-6   -> paddingTop = 0px, paddingBottom = 0px
.gap-6  -> gap = normal

// 修复后
.px-6   -> paddingLeft = 24px, paddingRight = 24px
.py-6   -> paddingTop = 24px, paddingBottom = 24px
.gap-6  -> gap = 24px
```

## Root Cause

`tailwind.css` 中 `@source` 和 `@config` 的相对路径从 `apps/main/src/styles/` 出发只回退了两级（`../../`），到达 `apps/main/`，而非仓库根目录。`flux-lib/` 目录位于仓库根目录下，需要四级回退（`../../../../`）。

这是从旧版 `packages/ui`（位于 `packages/` 下，三级 `../` 即可）迁移到 `flux-lib/`（位于仓库根目录下）时路径计算错误的遗留问题。由于 Tailwind v4 的 `@source` 指向不存在的目录时**不报错、不警告**，问题完全静默。

### 为什么部分类仍能工作？

- `text-sm`、`rounded-xl` 等在 consumer 自身代码（`apps/main/src/`）中使用，被 Vite 的自动内容扫描覆盖
- `p-4`、`gap-4` 等在 consumer 的 `packages/core/` 中使用，也被自动扫描覆盖
- `p-6`、`px-6`、`py-6`、`gap-6` **仅在** `flux-lib/ui/src/components/ui/card.tsx` 中使用，而 `@source` 路径错误导致该文件未被扫描

## Fix

将 `apps/main/src/styles/tailwind.css` 中的相对路径从两级修正为四级：

```css
/* 修复前 */
@config '../../tailwind.config.ts';
@source '../../flux-lib/ui';

/* 修复后 */
@config '../../../../tailwind.config.ts';
@source '../../../../flux-lib/ui';
```

## Tests

无自动化测试。通过 Playwright 手动验证 computed style 确认修复。

## Affected Files

- `nop-chaos-next/apps/main/src/styles/tailwind.css` — 修正 `@source` 和 `@config` 相对路径

## Notes For Future Refactors

1. **Tailwind v4 的 `@source` 指向不存在的目录时完全静默，不会产生任何错误或警告。** 新增 `@source` 时务必用 `os.path.normpath` 或类似工具验证路径解析结果，不要凭直觉数 `../` 的级数。
2. **`@source` 的相对路径基准是 CSS 文件自身所在目录，不是项目根目录。** 当 CSS 文件位于深层嵌套目录（如 `src/styles/`）时，`../` 的级数容易算错。建议在注释中标注目标绝对路径。
3. **迁移目录结构（如 `packages/ui` → `flux-lib/ui`）后，必须重新验证所有相对路径。** 旧路径和新路径的目录深度可能不同。
4. **与 bug #14 的区别**：#14 是缺少 `@source` 指令；本 bug 是 `@source` 指令存在但路径错误。两者症状相同（Tailwind 类未生成），但根因不同。诊断时应优先验证路径解析而非假设指令缺失。
