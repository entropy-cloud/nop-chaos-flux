# 07 flux-i18n 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-i18n/src/` 6 个源文件（排除 `*.test.*`），共 2909 行。其中实现逻辑文件 4 个精读（`i18n.ts` 134 行、`index.ts` 18 行、`hooks.ts` 23 行、`locales/index.ts` 2 行）；纯数据 locale 文件 2 个（`locales/zh-CN.ts` 1365 行、`locales/en-US.ts` 1367 行）做结构比对与抽样。交叉核对了 `packages/ui/src/lib/i18n.ts`（bridge 消费方）、`packages/flux-runtime/src/validation/message.ts`、`packages/flux-formula/src/builtins.ts`（formatter 消费方）、`packages/flux-i18n/node_modules/i18next@26.0.5` 与 `react-i18next@17` 源码（行为验证）。
- 结论概览：P0 x0 / P1 x1 / P2 x2 / P3 x6。总评：实现层是 i18next 的薄包装，核心查找/插值/切换行为正确且有契约测试锁定；主要问题在数据层一条单花括号占位符永不插值的用户可见缺陷，以及 UI bridge "剥前缀" 约定使 `@nop-chaos/ui` 内置回退成为死代码并被一个假阳性测试掩盖；zh/en 两包当前结构性完全一致，但跨语言 key 对等仅告警不拦截。

## P1 隐患

### F-01 单花括号占位符 `{name}` 永不插值，用户可见字面 `{name}`

- 位置：`packages/flux-i18n/src/locales/zh-CN.ts:227`、`packages/flux-i18n/src/locales/en-US.ts:226`
- 维度：D1 正确性（数据缺陷）
- 摘录：

```ts
// zh-CN.ts:227 (form namespace)
removeItem: '移除 {name}',
// en-US.ts:226
removeItem: 'Remove {name}',
```

- 问题：i18next 插值语法是 `{{name}}`（默认 prefix/suffix 均为 `{{`/`}}`，本包 `initFluxI18n` 未自定义，见 `i18n.ts:78-80` 仅设置 `escapeValue: false`）。单花括号 `{name}` 不会被替换。调用方确实传了参数：

```tsx
// packages/flux-renderers-form-advanced/src/upload-field.tsx:521-523
aria-label={t('flux.form.removeItem', {
  name: entry.name ?? entry.url ?? '',
})}
```

- 影响：upload-field 移除按钮的 aria-label（无障碍/悬停可见）渲染为字面 `Remove {name}` / `移除 {name}`，参数被静默丢弃。两种语言同时存在，属确定性缺陷而非边界条件。
- 反误报验证：全库仅此一对占位符使用了单花括号（grep 全量扫描 `{x}` 非 `{{x}}` 模式仅命中此 2 行）；契约测试 `i18n-contract.test.ts:115-129` 只覆盖 `{{name}}` 形态。
- 修复方向：两处改为 `{{name}}`，并补一条回归断言（`t('form.removeItem', { name: 'x' })` 不含 `{name}` 字面量）。属数据文件单行修复，风险极低。

## P2 风险

### F-02 UI bridge 剥前缀使 `@nop-chaos/ui` 内置回退成为死代码，且契约测试为假阳性

- 位置：`packages/flux-i18n/src/i18n.ts:44-48`（缺陷侧）；`packages/ui/src/lib/i18n.ts:48-54`（受害侧）；`packages/flux-i18n/src/i18n-contract.test.ts:69-74`（假阳性测试）
- 维度：D1/D5 跨包契约
- 摘录：

```ts
// i18n.ts:44-48 — bridge getter 先剥前缀再查
function bindUiI18n(instance: i18n | null): void {
  getUiI18nBridge().getter = instance
    ? (key: string) => instance.t(normalizeTranslationKey(key))
    : null;
}
// ui/src/lib/i18n.ts:48-54 — 以 translated !== key 判断未命中
export function t(key: string) {
  const translated = getUiI18nBridge().getter?.(key);
  if (translated && translated !== key) {
    return translated;
  }
  return messages[key] ?? key;
}
```

- 问题：key 缺失时 i18next 返回**传给 `instance.t` 的 key**（已读 `i18next@26.0.5` translate/resolve 源码确认无 `parseMissingKeyHandler` 时原样返回）。由于 getter 已剥掉 `flux.` 前缀，缺失时返回 `'sidebar.toggle'`，而 ui 侧比较对象是带前缀的 `'flux.sidebar.toggle'` —— `translated !== key` 恒为真，函数返回裸 key `'sidebar.toggle'`，内置英文回退表 `messages[key]` 永不可达（死代码）。
- 触发条件：任一 ui chrome key（共 23 个）从 locale bundle 缺失 —— 例如未来删除 key、`addResources` 传错结构。当前 23 个 key 已逐一验证全部存在于 zh/en 两包中，故为潜伏缺陷。
- 掩盖因素 1：`i18n-contract.test.ts:69-74`（"falls back to ui local defaults when flux i18n has no matching key"）用例声称走回退路径，但 `flux.sidebar.toggle` 实际存在于 en-US（`en-US.ts:402` 值 `'Toggle Sidebar'` 恰与 ui 内置回退相同），断言经 bridge 路径通过，回退分支从未被测到。
- 掩盖因素 2：`check:i18n-keys` 门禁只扫 `t('flux.*')` 字面调用模式（`scripts/check-i18n-keys.mjs` scanFile），ui 的 `messages` 映射是数据对象非调用点，不在门禁覆盖内。
- 修复方向（二选一，推荐前者）：getter 改为 `instance.exists(k) ? instance.t(k) : key`（缺失时返回原 key）；或将假阳性测试改为用一个确实不存在的 key 断言回退分支，同时修正 ui 比较逻辑为剥前缀后的 key。

### F-03 zh/en 跨语言 key 对等仅告警不拦截，数据一致性无硬门禁

- 位置：`scripts/check-i18n-keys.mjs:408-418`（告警段）对比 `:470-499`（used-but-undefined 才置 `hasErrors`/`exit 1`）
- 维度：D8 结构/流程（对象是本包数据文件的守护门禁）
- 摘录：

```js
const onlyInZh = [...zhKeys].filter((k) => !enKeys.has(k));
const onlyInEn = [...enKeys].filter((k) => !zhKeys.has(k));
if (onlyInZh.length > 0) {
  console.log(`\n⚠️  Keys only in zh-CN.ts (missing in en-US.ts):`); // 仅打印
```

- 问题：used-but-undefined 是硬失败，但"定义在一种语言、缺失于另一种"只打印 ⚠️ 不影响退出码。一旦漂移发生，缺失侧将显示 fallback 语言文案或裸 key，且 CI 不会拦截。
- 现状核查（本次审计实测）：两文件 1245 行 key 骨架（缩进+key 名）全量 diff 为零差异；41 个顶层 namespace 完全一致；51 个插值占位符名称与出现次数逐一对等。当前无漂移，纯风险项。
- 修复方向：将 `onlyInZh/onlyInEn` 非空纳入 `hasErrors`（该信息脚本已算好，只差一行）；或在 flux-i18n 包内加一条 zh/en key 集合对等的单元测试（现有测试只对 `industrial.scada` 一个子树做过对等断言，见 `i18n.test.ts:77-90`）。

## P3 提示

### F-04 `escapeValue: false` 的安全性依赖"所有 i18n 输出经 React 文本节点渲染"这一隐式不变量

- 位置：`packages/flux-i18n/src/i18n.ts:78-80`
- 核查结论（现状安全）：插值值不转义是 react-i18next 官方推荐配置。已追全部消费链：React 组件文本/aria-label（React 自转义）、`flux-runtime/validation/message.ts`（校验消息 → React 渲染）、`flux-formula/builtins.ts:210-213`（`t()` 公式函数）。仓库内 `dangerouslySetInnerHTML` sink（`flux-renderers-content/src/html.tsx:46`、diff-view、`ai-tool-call.tsx:171` highlightJson）均不消费 i18n 输出。风险仅在将来把 `t()` 结果注入 innerHTML 类 sink 时爆发，建议在 `i18n.ts` 配置处加一行注释固化该不变量（符合"易误读约束才写注释"的仓库规范）。

### F-05 缺失插值变量时输出保留字面 `{{var}}`

- 位置：`i18n.ts` 全局配置（未设 `missingInterpolationHandler`）；行为已由 `i18n-contract.test.ts:124-129` 锁定（`t('greet')` → `'Hello {{name}}!'`，i18next 26 默认 `skipOnVariables=true` 保留原样）。
- 说明：行为已知且有测试锁定，非缺陷；但用户侧会看到 `{{name}}` 字面文本，且无开发期告警（i18next 仅在 `skipOnVariables=false` 时 warn）。可选：设 `missingInterpolationHandler` 在 dev 模式打日志。与 F-01 同源不同症（F-01 是"传了参数但占位符写错"，此项是"占位符正确但参数未传"）。

### F-06 `getCurrentLanguage` 无条件 cast，`changeLanguage` 无运行时校验

- 位置：`packages/flux-i18n/src/i18n.ts:112-120`
- 摘录：`return (instance.language || DEFAULT_LANGUAGE) as SupportedLanguage;`
- 说明：类型上 `changeLanguage` 只收 `SupportedLanguage`，但运行时无校验——绕过类型（`as any`、动态字符串）传入未支持语言（如 `'fr-FR'`）时，`getCurrentLanguage()` 的 cast 是类型谎言，且所有 key 静默 fallback 到 zh-CN 无任何提示。当前 `SUPPORTED_LANGUAGES` 导出后无消费方做校验。低优先级加固点。

### F-07 `initFluxI18n` 二次调用静默丢弃全部新 options

- 位置：`packages/flux-i18n/src/i18n.ts:58-61`
- 说明：单例早返回使 `initFluxI18n({ lng: 'en-US', resources: mock })` 在已初始化后静默无效。`i18n-contract.test.ts:150-155` 已将其锁定为有意契约（配 `resetFluxI18n()` 使用），但对不知情的调用者（如想注入测试资源却忘记 reset）是静默失败点。可选：debug 模式下 log 一行，或文档注明必须先 reset。仅提示，不要求改动。

### F-08 `resetFluxI18n` 不清理 react-i18next 模块级全局（suspect）

- 位置：`packages/flux-i18n/src/i18n.ts:106-110`；`react-i18next/dist/es/initReactI18next.js`（`init(instance) { setDefaults(...); setI18n(instance); }`）
- 说明：`instance.use(initReactI18next)` 会把实例写入 react-i18next 的模块级单例。`resetFluxI18n()` 只置空本地引用与 formatter，不重置该全局；已挂载组件及未显式传 `{ i18n }` 的裸 `useTranslation()` 消费者继续持有死实例。若后续以 `react: false` 重新 init，全局也不修复。本包自己的 `useFluxTranslation` 每次渲染都显式传 `{ i18n }`（`hooks.ts:17`）不受影响。仅测试/HMR 场景可触发，标 suspect（源码推理，未复现）。

### F-09 en-US 无复数形式，"item(s)" 妥协文案与 count=1 语法错误

- 位置：`packages/flux-i18n/src/locales/en-US.ts:828,1027,1036-1037`（`'{{count}} item(s) scanned'` 等）；`en-US.ts:432`（`'Replaced {{count}} occurrences'` 在 count=1 时语法错误）
- 说明：全库无任何 `_one/_other` 复数后缀 key（已验证 zh/en 均无），所有复数退化为数字内插。已读 i18next 26 resolve 源码确认：缺复数后缀时回退裸 key，故无解析错误，仅文案质量损失；中文无复数范畴不受影响。P3 提示：若未来要正规复数，需为 en-US 补 `_one/_other` 并保持 zh/en 结构对等（当前结构对等性恰好排除了单侧加后缀的写法，否则触发 F-03 的告警盲区）。

## 已核查无问题项（检查过程记录见下）

- 复数解析回退链：i18next 26 `resolve()` 中 `finalKeys = [key, key+pluralSuffix, ...]` 逆序 pop 尝试，纯字符串 + `{count}` 正确回退裸 key（`i18next.js:822-860`）。
- locale 切换响应性：`useFluxTranslation` 显式绑定实例，`languageChanged` 触发重渲染，双向切换有测试锁定（`i18n.test.ts:104-172`）；`addResources` 深合并不覆盖既有 key（`i18n.test.ts:157-163`）。
- 日期/数字/货币格式化：**本包未实现**（src 内零 `Intl.`/`toLocale`/`new Date`），无时区/DST/toLocale 硬编码问题；`date` namespace 仅为"时/分/秒"标签文案。
- D6 性能：热路径 `t()` = 一次 null 检查 + `startsWith/slice` + i18next 标准 resolve；`Symbol.for` bridge 查找 O(1)；`useFluxTranslation` 每渲染新建闭包符合 React 19 无 memo 基线。无发现。
- D8 结构：`zh-CN.ts`/`en-US.ts` 超 500 行为已注册豁免（`scripts/check-oversized-code-files.mjs:33,45,50`），按要求不上报；实现文件均 <150 行。
- 反误报排除：en-US 中的 CJK 字符仅存在于 2 处代码注释（`en-US.ts:1302,1319`），非值污染；无空 catch、无 `as any`、无三花括号、无空字符串值；全库无其他 `t(k)===k` 形态的未命中判断消费方（仅 ui 一处，见 F-02）。

## 检查过程记录

1. `ls`/`wc` 摸底：src 6 文件 2909 行（与任务描述一致），读 `package.json`（i18next ^26.0.5、react-i18next ^17.0.4 peerDeps；exports 含 `./locales/zh-CN`、`./locales/en-US` 子路径）。
2. 全文精读 `i18n.ts`/`hooks.ts`/`index.ts`/`locales/index.ts`，读两个测试文件（171+173 行）提取已锁定的行为契约。
3. 门禁核对：`scripts/check-oversized-code-files.mjs` 确认两 locale 文件为注册豁免（不上报）；`scripts/check-i18n-keys.mjs` 全文读，确认 used-undefined 硬失败但跨语言对等仅告警（→ F-03），且 ui `messages` 映射不在其扫描模式内（→ F-02 加重）。
4. 数据文件一致性：顶层 41 namespace 列表 diff 零差异；全量 key 骨架（1245 行）diff 零差异；51 个 `{{占位符}}` 名称+频次逐一对等；复数后缀 key 零存在；单花括号占位符全量扫描命中 F-01；CJK 混入仅注释。
5. 行为验证（读 node_modules 源码，非运行）：i18next 26 `translate/resolve`（缺失 key 返回原样 key、复数回退链）、`Interpolator.interpolate`（缺失变量 skipOnVariables 保留字面、escapeValue 默认 true 本包显式关）；react-i18next `initReactI18next` 的 `setI18n` 模块级副作用（→ F-08）。
6. 消费链追踪：`setMessageFormatter` → flux-core `i18n-sink.ts` → `flux-runtime/validation/message.ts`（16 个静态 key，门禁覆盖）+ `flux-formula/builtins.ts:210`（`t()` 公式 builtin）；UI bridge → `packages/ui/src/lib/i18n.ts`（→ F-02）；`dangerouslySetInnerHTML` sink 全库 grep 确认无 i18n 输出流入（→ F-04 现状安全）。
7. grep 扫描（全部落空）：`as any`、空 catch、`new Date`、`toLocale`、`Intl.`、`{{{`、`: ''`、`(s)` 式复数（命中 F-09）。
8. 未运行任何 pnpm/测试命令（只读审计约束）；所有结论基于源码静态推理 + i18next/react-i18next 官方源码交叉验证，F-08 标 suspect。
