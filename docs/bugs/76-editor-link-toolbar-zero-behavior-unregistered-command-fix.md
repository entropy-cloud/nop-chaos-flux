# 76 Editor Link Toolbar Button Zero-Behavior — Unregistered Command + Missing URL Protocol Gate

## Problem

`editor` 默认工具栏包含 `link` 按钮（`DEFAULT_EDITOR_TOOLBAR` 含 `'link'`，`editor-schemas.ts:37-50`；lab 页文案宣称 "link via the toolbar"，`editor-lab-page.tsx:46`），但点击零行为：`TOOLBAR_BUTTONS.link.run` 调用 `setLink`/`unsetLink` 命令（`editor-renderer.tsx:116-130`），而依赖集仅 `@tiptap/react` + `@tiptap/starter-kit` —— StarterKit v3 **不含 Link 扩展**，`setLink` 命令未注册 → `isActive('link')` 恒 false、点击 no-op/抛错。配套安全缺口：即便命令存在，`setLink({ href })` 接受任意 scheme，粘贴/键入 `javascript:` href 会进入存储 HTML（输出 `getHTML()` 未二次 sanitize），宿主回显未净化即 XSS（dim 18 安全红线）。

## Root Cause

1. 扩展集只声明 StarterKit（`editor-renderer.tsx` `extensions: [StarterKit]`），工具栏配置却宣传 link 能力——**契约主张与扩展集漂移**（C3.5 审计 P1-1）。
2. 无 URL 协议校验点：Link 扩展未配置 `protocols`/`validate`，输出路径 `getHTML()` 未过 DOMPurify 门禁（输入路径 `sanitizeEditorHtml` 已有）——**输入有防线、输出无防线**（C3.5 审计 P1-2，安全红线）。

## Diagnostic Method

1. 审计读码：`TOOLBAR_BUTTONS.link` run 引用 `setLink` → 查 StarterKit 扩展清单（v3 不含 Link）→ 命中 P1-1
2. headless probe（先红）：`new Editor({ extensions: [StarterKit], content })` + `chain().setLink(...)` → 命令缺失抛错/无 `<a>` 输出（7 个 editor-link.test.tsx 用例先红）
3. 检查 `@tiptap/extension-link` v3 的 `protocols` + `validate` 配置点 → 修复方案成立

## Fix

1. 依赖：新增 `@tiptap/extension-link@^3.27.1`（dependencies，版本与 starter-kit 一致；`@tiptap/core` 进 devDependencies 供 headless 测试）。
2. `editor-renderer.tsx` 新增 `buildEditorExtensions()`：`[StarterKit, Link.configure({ protocols: ['http','https','mailto','tel'], validate: isSafeLinkUrl, openOnClick: false, autolink: false })]`。
3. 新增 `isSafeLinkUrl(url)` 纯函数（scheme 白名单：绝对 URL 仅 http/https/mailto/tel；相对/协议相对/锚点放行；空串拒绝）。
4. `link` 按钮 run：`window.prompt(t('flux.editor.linkPrompt'))` → null 走 unsetLink；安全 URL 走 setLink(trim)；不安全 scheme 静默忽略。
5. **输出防线**：`onUpdate` html 分支 `sanitizeEditorHtml(activeEditor.getHTML())` 再提交（design §W3d「输出只含安全子集」主张兑现）。
6. i18n：flux-i18n 新增 `editor.*` 14 键双 locale（工具栏标题/aria-label/编辑器 fallback/prompt），替换全部硬编码英文。
7. test-first：`editor-link.test.tsx`（9 用例：headless 命令注册/激活态/unset/协议拒绝/安全 scheme/isSafeLinkUrl 表）先红后绿；宿主 e2e `host-mr-editor-link` 真机 dialog 断言。

## Regression Tests

- `editor-link.test.tsx`（9 用例，headless TipTap Editor 驱动——直接覆盖被破坏的扩展接线面）
- `c3-5-host-surfaces.spec.ts` host-mr-editor-link：真机点击 link 按钮 + dialog 输入 https URL → 提交 HTML 含 `<a href>`；dialog 输入 `javascript:` → 拒绝不落值
- `host-mr-sanitize`：存储值注入 `<script>`/`javascript:` → 渲染内容与提交值均净化

## Evidence

- 修复前：`editor-link.test.tsx` 7 red（命令缺失 + 纯函数不存在）→ 修复后 form-advanced 1013 tests 全绿
- 门禁：`pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck && build && lint && test` 绿；`check:i18n-keys` 绿；宿主场景全绿（详见 `docs/logs/2026/08-03.md` C3.5 执行记录）
