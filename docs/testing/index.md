# Manual Test Issues

人工测试问题按日期归档。

## Structure

```
docs/testing/
├── 00-testing-issue-writing-guide.md
├── index.md
├── 2026/
│   ├── 05-06.md
│   └── ...
└── 2027/
    └── ...
```

## Usage

- Path convention: `docs/testing/{year}/{month}-{day}.md`
- Writing rules and entry format: `docs/testing/00-testing-issue-writing-guide.md`

## Index (Reverse Chronological)

### 2026-05

- [05-19](2026/05-19.md) — Performance Table Full Stress 在 StrictMode host mutations 后出现 `$slot.record` 渲染错误
- [05-18](2026/05-18.md) — flux basic 表格前几行 Inspect 按钮无法稳定弹出对话框
- [05-11](2026/05-11.md) — tabs with form 值丢失、flux basic Inspect 对话框未打开、array child items 删除无效、Report Designer 面板无收起按钮、字段面板无 margin、sheet tab 抖动与样式不统一
- [05-10](2026/05-10.md) — key-value 控件的删除操作不起作用
- [05-07](2026/05-07.md) — playground performance-table 中 table cell 的 tag-list 行级校验错误被共享到多行显示
- [05-06](2026/05-06.md) — ArrayField 删除按钮位置不合适；Flow Designer 报错 Renderer not found for type: input-number；Flow Designer 节点内容丢失、连线文字为空；chart 缺少 series 颜色；line chart 未显示连线；Performance Table 的 Full Stress 点击后疑似崩溃
