# 对抗性审查报告 — 2026-05-04 (第九轮: 收尾 — i18n/URL 编码/终止确认)

> 审查方式：按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。本轮为收尾轮，尝试覆盖前 7 轮未触及的领域。

---

## 视角选择

尝试角度：i18n 遗漏、CSS/样式冲突、性能微模式、错误消息质量、API 响应处理。

---

## 发现 1：生产代码中残留硬编码英文字符串 (MEDIUM)

**在哪里**

- `packages/flux-renderers-basic/src/dynamic-renderer.tsx:55`
- `packages/flux-renderers-basic/src/scope-debug.tsx:53`

**是什么**

这些文件已导入 `t` 函数但部分用户可见字符串仍硬编码为英文：

- `'Invalid schema received from API'` — 用户在 schema 加载失败时看到
- `'Scope Debug'` — 调试面板标题

**为什么值得关心**

当系统切换到中文 locale 时这些字符串不会翻译，造成中英混杂的用户体验。模式性检查建议可能还有其他类似遗漏。

**严重度**: MEDIUM  
**信心水平**: 确定。

---

## 发现 2：`buildUrlWithParams` 对数组参数用 `String()` 静默压平 (MEDIUM)

**在哪里**

- `packages/flux-runtime/src/async-data/request-runtime.ts:119`

**是什么**

```ts
searchParams.append(key, String(value));
```

当 URL params 包含数组值（如 `{ ids: [1, 2, 3] }`）时，`String([1,2,3])` 产生 `"1,2,3"`。没有数组序列化策略（重复 key、方括号、逗号分隔）。嵌套对象更糟 — 产生 `"[object Object]"`。

**为什么值得关心**

API 请求的 query string 静默畸形化。后端大概率解析失败但不报错（返回空结果），用户看到 "无数据" 但无错误提示。调试时很难定位到 URL 编码层。

**严重度**: MEDIUM  
**信心水平**: 确定。

---

## 审查终止声明

本轮仅产出 2 个 MEDIUM 级别新发现。前 7 轮已全面覆盖：

| 已覆盖领域                  | 轮次       |
| --------------------------- | ---------- |
| 生命周期泄漏 / dispose 缺陷 | 第 2、3 轮 |
| 竞态条件 / 时序攻击         | 第 3 轮    |
| Sandbox 逃逸 / 原型污染     | 第 4 轮    |
| 死代码 / 幽灵配置           | 第 5 轮    |
| 异常路径 / 状态半更新       | 第 5 轮    |
| 无障碍缺陷                  | 第 7 轮    |
| 构建配置脆弱性              | 第 7 轮    |
| 架构锁定 / 全局单例         | 第 8 轮    |
| 命名误导 / 接口偏移         | 第 6 轮    |
| i18n 遗漏 / URL 编码        | 本轮       |

**结论：对抗性审查已达到递减收益点。后续轮次预计只能产出 LOW 级别的风格/规范问题。建议转入修复阶段。**

---

## 全系列总评（跨 8 轮汇总）

### TOP 5 最高优先级修复项

| 优先级 | 问题                                                           | 轮次    | 严重度         |
| ------ | -------------------------------------------------------------- | ------- | -------------- |
| 1      | Expression evaluator sandbox 逃逸（`constructor.constructor`） | 第 4 轮 | CRITICAL       |
| 2      | Submit 流程 try/finally 覆盖不完整 — 表单永久锁死              | 第 5 轮 | HIGH           |
| 3      | 跨 Reaction 循环依赖绕过 MAX_CASCADE_DEPTH — 冻结浏览器        | 第 3 轮 | HIGH           |
| 4      | 在途异步验证请求未 abort（dispose 时 clear 而非 abort）        | 第 2 轮 | HIGH           |
| 5      | FieldError 无 aria-live + FieldLabel 无 label 元素             | 第 7 轮 | CRITICAL(a11y) |

### TOP 3 架构方向建议

1. **Formula registry DI 化** — 解决 SSR、多实例、插件隔离三个问题的单一根因。
2. **Submit flow 原子性保证** — 需要 value snapshot 或 isSubmitting 期间冻结 setValue。
3. **无障碍基础设施** — FieldLabel 改 `<label>`, FieldError 加 `role="alert"`, 是最基础的 WCAG 合规。
