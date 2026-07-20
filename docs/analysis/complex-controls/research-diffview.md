# 版本对比（Diff View）开源实现调研报告

> 日期：2026-07-20
> 调研项目：git-diff-view (MIT), react-diff-view v3.3.3 (MIT)
> 参考仓库：`~/sources/complex-controls/git-diff-view/`, `~/sources/complex-controls/react-diff-view/`

---

## 1. 调研概要

| 项目            | 许可 | 框架                       | 核心依赖                                    | 架构                   |
| --------------- | ---- | -------------------------- | ------------------------------------------- | ---------------------- |
| git-diff-view   | MIT  | React/Vue/Solid/Svelte/CLI | diff, lowlight/shiki (可选)                 | Core 模型 + 框架适配器 |
| react-diff-view | MIT  | React                      | gitdiff-parser, diff-match-patch, refractor | 单包 React 组件        |

---

## 2. git-diff-view 详细分析

### 2.1 架构风格

git-diff-view 是**核心模型 + 多框架适配器**架构：

- `@git-diff-view/core`：`DiffFile` 类，封装所有 diff 解析、行构建、语法高亮、展开/折叠逻辑
- `@git-diff-view/react`/`vue`/`solid`/`svelte`：框架渲染层
- `@git-diff-view/file`：从两个文件内容生成 diff（使用 `diff` 库）
- `@git-diff-view/lowlight`/`shiki`：语法高亮适配器

### 2.2 核心模型：DiffFile

`DiffFile` 是中央数据类（1881 行），封装从输入到渲染的全生命周期：

**输入方式**（两种）：

```typescript
// 方式一：直接传 Git diff 字符串
new DiffFile(fileName, null, null, null, diffStrings, options);

// 方式二：传文件内容（由 @git-diff-view/file 包装）
generateDiffFile(oldFileName, oldContent, newFileName, newContent, lang, lang, options);
```

**内部数据结构**：

```
#oldFileResult / #newFileResult   → File 实例（原始行 + 语法 AST）
#diffListResults                  → IRawDiff[]（解析后的 Git diff hunk）
#diffLines                        → DiffLineItem[]（合并后的 diff 行）
#splitLeftLines / #splitRightLines → SplitLineItem[]（拆分视图行对）
#unifiedLines                     → UnifiedLineItem[]（统一视图行）
```

**`DiffLine` 类型**：

```typescript
class DiffLine {
  type: 'context' | 'add' | 'delete' | 'hunk'; // 行类型
  text: string; // 原始行文本
  oldLineNumber: number | null; // 旧行号
  newLineNumber: number | null; // 新行号
  changes?: IRange; // 字符级变更范围
  diffChanges?: DiffRange; // fast-diff 精确变更
  plainTemplate?: string; // 预渲染纯文本 HTML
  syntaxTemplate?: string; // 预渲染语法高亮 HTML
}
```

**生命周期**（懒初始化）：

```
constructor()
  └─ (仅存储初始参数，不执行业务逻辑)

first access（首次调用 getDiffLines / getSplitLines 等）
  └─ buildLines()
       ├─ [lazy] initRaw()       → doFile() → composeRaw()
       ├─ [lazy] initSyntax()    → doSyntax() → composeSyntax()
       ├─ buildSplitDiffLines()  → 生成 #splitLeftLines[] / #splitRightLines[]
       └─ buildUnifiedDiffLines()→ 生成 #unifiedLines[]
```

### 2.3 Diff 解析

解析算法参考了 GitHub Desktop 的 GNU unified diff 解析器设计：

- 解析 `diff --git` 头部
- 解析 `@@ -l,s +l,s @@` hunk 头
- 处理二进制文件标记
- 处理 `\ No newline at end of file`
- 处理隐藏的 bidirectional 字符

### 2.4 语法高亮系统

**可插拔高亮器**：

```typescript
interface DiffHighlighter {
  highlight(content: string, lang: string): HighlightResult;
}
```

两种内置高亮器：

- `lowlight`（基于 refractor/Prism，轻量）
- `shiki`（基于 TextMate 语法，全面但重）

**缓存策略**：`Cache<string, File>` 最大 50 条，缓存完整文件的高亮 AST。

### 2.5 字符级变更（Inline Diff）

两种策略：

1. **`relativeChanges()`**：基于公共前缀/后缀剥离。简单、快速、无需额外依赖。
2. **`diffChanges()`**：使用 `fast-diff` 库精确计算字符级差异。更准确，但更重。

**模板预渲染**：差异行在构建时预渲染为 HTML 字符串，渲染时通过 `dangerouslySetInnerHTML` 插入，避免 JSX 处理大量行。

### 2.6 展开/折叠机制

Hunk 行跟踪 `startHiddenIndex`/`endHiddenIndex`，通过 `isHidden` 属性控制可见性。展开后更新 `isHidden` 并重新渲染。

---

## 3. react-diff-view 详细分析

### 3.1 架构风格

react-diff-view 是**解析器 + 管道式令牌系统**架构：

- `parseDiff()`：使用 `gitdiff-parser` 解析 diff
- `Tokenize Pipeline`：`toTokenTrees()` → `normalizeToLines()` → [enhancers] → `backToTree()`
- 渲染：`Diff` → `Hunk` → `SplitHunk`/`UnifiedHunk` → `CodeCell`

### 3.2 令牌系统（Token Pipeline）

这是 react-diff-view 最独特的设计：

```
hunks (解析后)
  │
  ├─ toTokenTrees(hunks, options)
  │   ├─ 从 hunks 重建完整新旧文件文本
  │   ├─ 使用 refractor (Prism) 高亮全文 → TokenNode AST
  │   └─ 返回 Pair<TokenNode>（新旧两棵 AST）
  │
  ├─ normalizeToLines(tokenTree)
  │   ├─ 将 AST 扁平化为行级 TokenPath[][]
  │   └─ 每行 = 从根到叶的路径数组
  │
  ├─ [enhancers] (可组合的变换函数)
  │   ├─ markEdits(hunks)          ← 使用 diff-match-patch 计算行内差异
  │   ├─ markWord(word, name, fn)  ← 标记特定字符（tab/回车）
  │   └─ pickRanges(oldRanges, newRanges) ← 自定义范围高亮
  │
  └─ backToTree(paths)
      └─ 重建 TokenNode 树 → 传入 CodeCell 渲染
```

**`markEdits` Enhancer**：使用 Google `diff-match-patch` 计算对应删除行和插入行之间的字符级差异。生成的 `RangeTokenNode` 带有 `type: 'edit'`，在 `CodeCell` 中被渲染为带背景色的 span。

### 3.3 渲染架构

**Diff 组件**：渲染 `<table>`，通过 React Context 传递配置（viewType, gutterType, widgets 等）

**分栏模式（Split）**：

- `groupElements(changes, widgets)` → 将 changes 数组分组为 `[delete+insert]` 对
- `SplitChange` 渲染 4 列：old gutter + old code + new gutter + new code
- 当只有新增或删除时，渲染 2 列（另一半空白）

**统一模式（Unified）**：

- 简单的 Change 迭代
- `UnifiedChange` 渲染 3 列：old gutter + new gutter + code

**Widget 系统**：

```typescript
widgets: Record<string, ReactNode>; // key = getChangeKey(change)
```

Widget 可以附加到特定变更行（分栏模式下可区分旧侧和新侧）

### 3.4 `parseDiff()` 的 zip 模式

```typescript
parseDiff(text, { nearbySequences: 'zip' });
```

默认 `gitdiff-parser` 将删除行和插入行分开列出。`zip` 模式重新排列相邻的删除/插入序列，使对应行在分栏视图中左右对齐。

---

## 4. 两个项目的对比

| 维度      | git-diff-view                         | react-diff-view                   |
| --------- | ------------------------------------- | --------------------------------- |
| 输入      | `DiffFile` 类（统一入口）             | `parseDiff()` 字符串 → `Change[]` |
| 语法高亮  | lowlight/shiki 可插拔                 | refractor (Prism, 内置)           |
| 行内 diff | fast-diff / relativeChanges           | diff-match-patch                  |
| 模板渲染  | 预渲染 HTML (dangerouslySetInnerHTML) | JSX CodeCell + 令牌               |
| 展开/折叠 | 内置 (isHidden)                       | 装饰组件 (Decoration)             |
| 多框架    | React/Vue/Solid/Svelte/CLI            | React only                        |
| API 风格  | 类 + 方法                             | React 组件 + props                |
| 文件对比  | 有 (@git-diff-view/file)              | 无（需外部提供 diff）             |

**Flux 选择**：推荐结合两者的优点。使用 git-diff-view 的 `DiffFile` 模型作为数据层（类接口，UI 无关），react-diff-view 的令牌管道作为渲染策略参考。

---

## 5. 对 Flux Diff-view 的设计建议

### 5.1 定位

Diff-view 是一个**纯展示组件**（`type: "diff-view"`），不参与表单 value/validation 通道。用途：合同版本对比（文本）、EDI 报文对比（XML/JSON）、配置版本对比。

### 5.2 数据层

```typescript
// Flux schema
interface DiffViewSchema extends BaseSchema {
  type: 'diff-view';
  oldContent: SchemaValue; // 旧内容（字符串）
  newContent: SchemaValue; // 新内容（字符串）
  language?: string; // 语法高亮语言（可选）
  viewType?: 'split' | 'unified'; // 默认 split
  showLineNumbers?: boolean; // 显示行号
  defaultCollapsedLines?: number; // hunk 折叠阈值
  events?: {
    onLineClick?: ActionSchema;
  };
}
```

输入方式（参考 git-diff-view 的双输入模式）：

```
方式一：两个文件内容 → DiffFile(oldText, newText, lang)
方式二：已有 diff 字符串 → DiffFile.parse(diffText)
```

### 5.3 组件结构

```
├── diff-view.tsx              // 主组件（类型: diff-view）
├── diff-view.types.ts         // 类型定义
├── diff-view.model.ts         // DiffFile 模型（非 React 依赖）
├── utils/
│   ├── diff-parse.ts          // Diff 解析器（参考 git-diff-view 的 GNU unified diff parser）
│   ├── diff-highlight.ts      // 语法高亮（使用 refractor/lowlight）
│   ├── diff-inline.ts         // 行内差异计算（diff-match-patch 或 fast-diff）
│   └── diff-template.ts       // 预渲染 HTML 模板
└── components/
    ├── diff-header.tsx         // 文件头部信息
    ├── diff-split-view.tsx     // 分栏视图
    ├── diff-unified-view.tsx   // 统一视图
    ├── diff-line.tsx           // 单行渲染
    ├── diff-hunk.tsx           // Hunk 展开/折叠
    └── diff-gutter.tsx         // 行号/变更标记
```

### 5.4 渲染策略

**分栏视图（Split）**——参考 git-diff-view 的并行行对 + react-diff-view 的 groupElements：

```
左栏(旧)  │  右栏(新)
──────────┼──────────
context   │  context
delete    │  (空)
(空)      │  insert
context   │  context
```

**行内差异高亮**——使用 `diff-match-patch`（react-diff-view 方式）：
差异部分用背景色高亮标示字符级变更，如 'Hello World' vs 'Hey World' 中 'l'→'y'、缺失 'lo' 等。

**展开/折叠**——参考 git-diff-view 的 `isHidden` + expand API：

- 默认长 hunk 折叠
- 点击展开箭头展开折叠部分

### 5.5 与现有 Flux content 组件的协调

| 组件        | 定位            | 关系                                                                              |
| ----------- | --------------- | --------------------------------------------------------------------------------- |
| `json-view` | JSON 格式化展示 | Diff-view 专注文本对比（合同版本、EDI 报文），与 json-view 的 JSON 树导航定位不同 |
| `html`      | HTML 渲染       | Diff-view 不渲染 HTML                                                             |
| `markdown`  | Markdown 渲染   | Diff-view 不渲染 Markdown                                                         |
| `mapping`   | 值映射展示      | 同名，不同定位                                                                    |

Diff-view 是**纯展示 + 对比分析**组件，与 content 包的只读定位一致。

---

## 6. 可复用开源参考代码

| 参考来源                                  | 模块/模式                               | 直接复用程度                                            |
| ----------------------------------------- | --------------------------------------- | ------------------------------------------------------- |
| git-diff-view `DiffFile`                  | 核心模型（parse → syntax → buildLines） | ★★★★ 完整数据流参考                                     |
| git-diff-view `diff-parse.ts`             | GNU unified diff 解析器                 | ★★★★ 参考 GitHub Desktop 的 GNU unified diff 解析器设计 |
| git-diff-view `change-range.ts`           | 字符级差异（prefix/suffix + fast-diff） | ★★★★ 行内高亮算法                                       |
| git-diff-view `template.ts`               | 预渲染 HTML 模板                        | ★★★ 性能优化参考                                        |
| git-diff-view `DiffHunk` expand           | 展开/折叠 hunk                          | ★★★ 交互模式                                            |
| react-diff-view token pipeline            | toTokenTrees → enhancers → backToTree   | ★★★★ 令牌系统参考                                       |
| react-diff-view `markEdits.ts`            | diff-match-patch 行内差异               | ★★★ 直接可用的增强器                                    |
| react-diff-view `parseDiff` zip           | `nearbySequences: 'zip'` 重组           | ★★★ 分栏质量关键                                        |
| react-diff-view `SplitHunk/groupElements` | 删除/插入配对                           | ★★★ 分栏核心算法                                        |
| react-diff-view widget                    | Record<string, ReactNode>               | ★★☆ 可扩展性，但 Flux 不急需                            |
