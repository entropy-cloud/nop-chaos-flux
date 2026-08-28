# 36 tailwind-preset + theme-tokens 实现代码检查报告

- 检查日期：2026-08-20
- 范围：
  - `packages/tailwind-preset/src/`：2 个文件 241 行（index.ts 142 行 + index.test.ts 99 行），另核对 package.json / tsconfig / vitest.config
  - `packages/theme-tokens/src/`：4 个文件 541 行（index.ts 40 行 + styles.css 350 行 + index.test.ts 42 行 + styles.test.ts 109 行），另核对 package.json / tsconfig / vitest.config
  - 交叉核对：根 `tailwind.config.ts`、`apps/playground/src/styles.css`、`apps/playground/src/main.tsx`、`apps/playground/src/pages/pivot-table-demo.tsx`、`tailwind-safelist.txt`、`knip.json`、`tsconfig.base.json`、`vite.workspace-alias.ts`、`scripts/copy-build-assets.mjs`，以及 `docs/bugs/14-*.md`、`docs/architecture/theme-compatibility.md`、`docs/architecture/styling-system.md`
- 结论概览：**P0 x0 / P1 x3 / P2 x4 / P3 x3**
- 总评：两个包本体代码质量尚可（类型清晰、测试齐、exports 字段正确、包结构合规），且两包之间的 sidebar token 契约（theme-compatibility.md L263、styling-system.md L159-162）落实到位。核心问题集中在**主题切换机制分裂**（`.dark` class vs `data-mode` 属性两套互不相识的暗色开关，3/4 主题变体块全仓不可达）、**`:root` 基础块缺失 BASE_TOKEN_NAMES 声明的 5 个语义色 token**（违反文档明示的"无属性默认根必须有效"契约）、以及**三层主题定义竞争（preset theme.extend / playground `@theme inline` / theme-tokens `:root`）+ 根 config content 列表严重过期**带来的漂移风险。样式漏扫（bug 14 场景）当前由 `@source "../../../packages"` 兜底，未发现实际漏扫，但存在三重冗余扫描配置并存。
- 说明：本次为只读审计，未运行任何 pnpm 命令、未改动 packages/ 下任何文件。

## P0 缺陷

无。默认路径（playground 固定 classic/light）下未发现样式静默失效或构建破坏类缺陷。

## P1 隐患

### F-01 暗色/主题切换双机制分裂，3/4 主题变体块全仓不可达

- 位置 1：`packages/tailwind-preset/src/index.ts:134`
  ```ts
  darkMode: ['class', '.dark'],
  ```
- 位置 2：`packages/theme-tokens/src/styles.css:112/172/232/292`
  ```css
  :root[data-theme='classic'][data-mode='light'] { ... }
  :root[data-theme='classic'][data-mode='dark'] { ... }
  :root[data-theme='glass'][data-mode='light'] { ... }
  :root[data-theme='glass'][data-mode='dark'] { ... }
  ```
- 问题：两包采用互不感知的暗色切换机制。preset 让 Tailwind `dark:` 变体挂在 `.dark` class 上；theme-tokens 让 CSS 变量挂在 `data-mode='dark'` 属性上。宿主必须**同时**设置两者才能完整切换暗色主题，但仓库内没有任何代码、测试或文档做这个配对：
  - `apps/playground/src/main.tsx:14-15` 硬编码 `data-theme='classic'` + `data-mode='light'`，无任何运行时切换点；
  - 全仓唯一切换点是 `apps/playground/src/pages/pivot-table-demo.tsx:155`，只 `classList.toggle('dark')` 不改 `data-mode`；
  - tests/ 与 index.html 中均无设置根 `data-mode='dark'` 或 `data-theme='glass'` 的路径。
- 影响：(1) 在 pivot demo 中切换"暗色"后，`dark:` 变体与 `.dark .nop-glass-card`（styles-theme-utilities.css:107）生效，但全部语义色 CSS 变量仍是亮色值——半切换的破碎 UI；(2) `classic-dark`、`glass-light`、`glass-dark` 三个变体块（styles.css 约 180 行）是死主题代码，永远不可达，也无测试覆盖其正确性。
- 修复方向：二选一统一机制——(a) preset 增加 `data-mode` 属性驱动的自定义变体（`@custom-variant dark` 对应 `[data-mode='dark'] &`），CSS 与工具类同源切换；或 (b) 保留 `.dark` class 方案，把 theme-tokens 的变体选择器改为 `.dark` / `.theme-glass.dark` 等 class 组合。并在 playground 提供一个同时驱动两者的切换点（哪怕仅 demo 级）。

### F-02 `:root` 基础块缺失 BASE_TOKEN_NAMES 声明的 5 个语义色 token，违反"默认根有效"契约

- 位置 1：`packages/theme-tokens/src/index.ts:17-21`
  ```ts
  SECONDARY: '--secondary',
  SECONDARY_FOREGROUND: '--secondary-foreground',
  SUCCESS: '--success',
  WARNING: '--warning',
  DANGER: '--danger',
  ```
- 位置 2：`packages/theme-tokens/src/styles.css:1-110`（`:root` 块）。逐项核对后确认 `:root` 中**没有** `--secondary`、`--secondary-foreground`、`--success`、`--warning`、`--danger`，它们只出现在 4 个 `[data-theme][data-mode]` 变体块中。
- 位置 3：`packages/tailwind-preset/src/index.ts:52-53`（success/warning 映射无 fallback）
  ```ts
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  ```
- 问题：`BASE_TOKEN_NAMES` 把这 5 个名字声明为 base token，但 CSS 基础块未定义。文档契约明确要求默认根有效：theme-compatibility.md L263 "…so default-theme roots stay valid **without host-only theme attributes**"；styling-system.md L160 "…the backing CSS variables must exist in the public theme-tokens stylesheet on the supported path"。preset 对 `destructive` 做了 fallback（`hsl(var(--destructive, var(--danger)))`），但 `success`/`warning`/`secondary` 没有。
- 影响：任何宿主在未设置 `data-theme`/`data-mode` 属性的根上引入 `@nop-chaos/theme-tokens/styles.css` + preset 后，`bg-secondary`（仓库内有 4 处类名使用）、`text-success`（3 处）、`text-warning`（4 处）解析为 `hsl(var(--undefined))` → 无效值 → 颜色回退为初始值/继承，静默失效。当前 playground 因 main.tsx 恒设属性而侥幸不触发。
- 修复方向：在 `:root` 块补齐这 5 个 token 的默认值（直接从 classic-light 复制即可），并在 `styles.test.ts` 增加"BASE_TOKEN_NAMES 每一项都必须出现在 `:root` 块"的交叉校验（现有测试只抽查了部分名字，恰是漏网原因）。

### F-03 根 tailwind.config.ts 以源码相对路径引用 preset，且 content 列表严重过期

- 位置：`tailwind.config.ts:2-18`
  ```ts
  import { nopTailwindPreset } from './packages/tailwind-preset/src';
  const config: Config = {
    presets: [nopTailwindPreset],
    content: [
      './apps/playground/index.html',
      './apps/playground/src/**/*.{ts,tsx,json}',
      './packages/ui/src/**/*.{ts,tsx}',
      './packages/flux-react/src/**/*.{ts,tsx}',
      './packages/flux-renderers-basic/src/**/*.{ts,tsx}',
      './packages/flux-renderers-form/src/**/*.{ts,tsx}',
      './packages/flux-renderers-data/src/**/*.{ts,tsx}',
      './packages/flow-designer-renderers/src/**/*.{ts,tsx}',
      './packages/report-designer-renderers/src/**/*.{ts,tsx}',
      './packages/spreadsheet-renderers/src/**/*.{ts,tsx}',
      './tailwind-safelist.txt',
    ],
  };
  ```
- 问题（三点叠加）：
  1. **content 列表过期**：缺少 `flux-renderers-form-advanced/mobile/content/layout/scheduling/ai/graph/map/pivot/industrial/dashboard`、`word-editor-renderers`、`nop-debugger` 等后增包。已核实 Tailwind v4.2.2 会把 `@config` 加载的 legacy `content` 数组注册为扫描源（node_modules tailwindcss dist 中 `r.content??[] … e.content.files.push({base, pattern})`），即这份列表是活的配置而非死代码——目前靠 `apps/playground/src/styles.css:19` 的 `@source "../../../packages"` 全量兜底才没有实际漏扫。
  2. **绕过包边界**：根 config 用 `./packages/tailwind-preset/src` 相对路径引源码而非 `@nop-chaos/tailwind-preset`（workspace 亦未声明该依赖），包的 `main`/`exports`（dist/index.js）全仓零消费者，包的发布形态从未被验证。
  3. **三重扫描配置并存**：自动检测 + content 数组 + `@source`，语义重叠。bug 14（docs/bugs/14）的教训正是"以为 content 在维护"。任何人未来"精简"掉 `@source` 或只对照 content 列表判断覆盖面，就会重现画布不可见类漏扫（styled 类名只写在 packages 源里）。
- 影响：当前无用户可见缺陷，但这是 bug 14 同型回归的温床，且包边界被绕过使 knip 等工具无法看到消费关系（knip.json 只 ignore 了 theme-tokens）。
- 修复方向：把 content 数组删减为仅 `./apps/playground/**` + `./tailwind-safelist.txt`（或整体删除，交给 `@source` 与自动检测），文件头加注释说明 `@source "../../../packages"` 是包扫描的唯一权威来源；根 config 改为从 `@nop-chaos/tailwind-preset` 导入并在根 package.json 声明 workspace 依赖（或明示为何必须引 src）。

## P2 风险

### F-04 theme-tokens 大面积死 token（约 60+ 条声明零消费）

- 位置：`packages/theme-tokens/src/styles.css`（各变体块）
- 摘录（示例）：`:root` 的 `--icon-sm: 16px;`（L15）、`--transition-fast: 0.15s ease;`（L19）；变体块的 `--gray-50`…`--gray-900`（L130-139 等）、`--primary-dark/--primary-light/--primary-bg`（L114-116）、`--app-topbar-bg/--app-sidebar-bg/--app-tabs-bg`（L158-160）、`--danger-bg`（L125）、`--info/--info-bg`（L121）。
- 交叉 grep 结果（全仓 apps/ + packages/ 的 var() 直接引用与 Tailwind 类名间接消费均计 0）：`--icon-sm/md/lg/xl` 全灭、`--transition-fast/--transition-slow` 全灭（`--transition-base` 有 3 处存活）、`--gray-50..900` 四变体共 40 条全灭、`--primary-dark/light/bg` 全灭、`--app-topbar-bg/--app-sidebar-bg/--app-tabs-bg` 全灭、`--danger-bg` 灭、`--info/--info-bg` 仅被 playground `@theme inline` 的 `--color-info` 引用但 `text-info` 类全仓零使用（链条整体死）。
- 影响：350 行样式表中约 1/6 是死声明，且每个新增主题变体都要复制维护这批死 token（glass 块又复制了一份），放大后续维护成本与"改了没反应"的排查噪音。
- 修复方向：删灰阶/图标/过渡/app-shell/primary 渐变家族，或给 `--gray-*` 接上真实消费者；若保留须在注释或文档登记为预留 token。注意 `--danger` 是 preset `destructive` 的 fallback，半死不活，可借 F-02 一并处理。

### F-05 preset 的 float / fade-in-up 动画扩展零消费

- 位置：`packages/tailwind-preset/src/index.ts:83-84、91-98`
  ```ts
  'fade-in-up': 'fadeInUp 0.4s ease forwards',
  float: 'float 22s ease-in-out infinite',
  ```
- 问题：`animate-float`、`animate-fade-in-up` 全仓（apps/ + packages/）零类名使用，对应 keyframes（translate3d 22s 漂移动画，明显是落地页遗留）一并死置。`animate-caret-blink` 有 1 处真实消费（`packages/ui/src/components/ui/input-otp.tsx:64`），应保留。
- 影响：死配置进入每个宿主的 Tailwind 构建，增加无谓的主题条目；`float` 这类 22s 无限动画若被误用还有性能隐患。
- 修复方向：删除 `fade-in-up`/`float` 两个 animation 与对应 keyframes。

### F-06 暗色变体块未设置 `color-scheme: dark`，原生控件在暗色下仍为亮色

- 位置：`packages/theme-tokens/src/styles.css:2`（`:root { color-scheme: light; … }`）对照 L172-230、L292-350（两个 dark 变体块均无 `color-scheme` 声明）。
- 问题：`:root` 固定 `color-scheme: light`，dark 变体块不覆盖，切到暗色后浏览器原生滚动条、表单控件、`<input>` 光标等仍按 light 渲染。
- 影响：暗色主题视觉不完整（与 F-01 叠加，当前不可达，修复 F-01 后会显形）。
- 修复方向：两个 `[data-mode='dark']` 块加 `color-scheme: dark;`。

### F-07 radius/shadow 三层定义竞争 + 同名自引用依赖级联巧合成立

- 位置 1：`packages/tailwind-preset/src/index.ts:63-77`
  ```ts
  borderRadius: { xl: 'var(--radius-xl)', lg: 'var(--radius-lg)', … },
  boxShadow: { xs: 'var(--shadow-xs)', … },
  ```
- 位置 2：`packages/theme-tokens/src/styles.css:3-6`（`--radius-sm: 8px` … `--radius-xl: 20px`）
- 位置 3：`apps/playground/src/styles.css:47-50、79`
  ```css
  --radius-sm: calc(var(--radius) - 4px); … --radius: 0.75rem;
  ```
- 问题：v3 风格的 `borderRadius.xl = 'var(--radius-xl)'` 在 Tailwind v4 兼容层下会生成与 token **同名**的 theme 变量 `--radius-xl: var(--radius-xl)`（自引用），置于 `@layer theme`。它没有成环的唯一原因是 theme-tokens 的 `:root` 声明未分层、在层叠中胜出（unlayered > layered）。`--shadow-*` 同理（shadow 命名空间在 v4 也直接是 `--shadow-*`）。同时 playground 的 `@theme inline` 又用 `calc(var(--radius)±4px)` 第三处定义 radius，且把 `--radius` 覆写为 `0.75rem`——playground 实际生效标度是 8/10/12/16px，与 theme-tokens 定义的 8/12/16/20px 不一致，preset 的 borderRadius 映射实际被架空。colors 命名空间因映射到 `--color-*` 无同名冲突，不受影响。
- 影响：生效值取决于层级叠顺序这一"巧合"：任何宿主把 theme-tokens 放进 `@layer`、或调整引入顺序，`rounded-*`/`shadow-*` 即变为循环引用而失效；半径标度三层各说各话，调 token 不见效果。
- 修复方向：统一为一层——建议 preset 去掉与 token 同名的 borderRadius/boxShadow 映射（v4 下 token 名即 theme 名，无需映射），或改为 `--radius-*` 引用别名变量（如 token 改名 `--tw-radius-*`）；playground `@theme inline` 与 theme-tokens 二选一作为 radius 权威。

## P3 提示

### F-08 theme-tokens 的 TS API 零外部消费者，且测试缺 BASE_TOKEN_NAMES ↔ styles.css 交叉校验

- 位置：`packages/theme-tokens/src/index.ts:1-40`。全仓 grep `BASE_TOKEN_NAMES|defineHostTokenExtension|HostTokenExtension|BaseTokenName` 在包外零命中（tsconfig.base.json 路径与 vite 别名已铺好，knip.json:16 还 ignoreDependencies 了该包）。CSS 半边（styles.css）被 playground 实际消费，TS 半边是纯死 API。
- 影响：作为"宿主扩展点"的预期产物当前无宿主使用，属预埋接口；更重要的是 `styles.test.ts` 只做字符串包含抽查，没有"BASE_TOKEN_NAMES 全集 ⊆ `:root` 块"的校验——这正是 F-02 能长期潜伏的原因。
- 修复方向：若近期无宿主接入计划可降级为纯 CSS 包（删 TS API），或至少补上交叉校验测试让 BASE_TOKEN_NAMES 真正成为契约而非摆设。

### F-09 tailwindcss-animate 是 v3 时代插件，v4 下走弃用路径

- 位置：`packages/tailwind-preset/package.json:21-26`（`peerDependencies: tailwindcss ^4.2.2` + `dependencies: tailwindcss-animate ^1.0.7`）、`src/index.ts:138`（`plugins: [animate]`）。已核实安装版本 tailwindcss@4.2.2 + tailwindcss-animate@1.0.7。
- 影响：v4 官方推荐迁移到 `tw-animate-css`（CSS 引入式）；当前经 `@config` 兼容层可运行，但处于官方弃用路径，未来 v4 小版本升级存在破坏风险。
- 修复方向：择机换 `tw-animate-css` 并在 playground styles.css `@import`，preset 中移除 JS 插件。

### F-10 exports/main 字段正确但发布形态未验证；mergeThemeExtension 仅浅合并一层

- 位置 1：两包 package.json 的 `main`/`types`/`exports` 自洽（tailwind-preset 仅 `.`；theme-tokens 有 `.` 与 `./styles.css` 子路径，`sideEffects: ["*.css"]` 合理，build 脚本的 `scripts/copy-build-assets.mjs` 存在，dist/styles.css 已产出）——字段本身无错。但结合 F-03，tailwind-preset 的 dist 全仓无消费，exports 正确性停留在纸面。
- 位置 2：`packages/tailwind-preset/src/index.ts:106-128` `mergeThemeExtension` 只做一层浅合并：host 传 `{ colors: { primary: {…} } }` 时会整体替换 base 的 `primary` 对象（丢 `foreground` 子键）而非深合并，函数名与行为有轻微误导，且无注释说明。
- 修复方向：给 mergeThemeExtension 加一行深合并语义说明或实现深合并；tailwind-preset 若继续保留包形态，应让根 config 走包入口（见 F-03）以验证 exports。

## 检查过程记录

1. 通读两包全部 6 个 src 文件 + package.json/tsconfig/vitest.config（行数：tailwind-preset 241 行，theme-tokens 541 行，其中 styles.css 350 行）。
2. 读背景文档 `docs/bugs/14-tailwind-v4-monorepo-content-scan-canvas-invisible-fix.md`、`docs/architecture/theme-compatibility.md`、`docs/architecture/styling-system.md`（重点 L157-162 Shared Token Ownership Baseline、L182 STY2 LOCK）。
3. 消费链核查：grep `@nop-chaos/tailwind-preset`（仅自身 package.json 命中）→ 追出根 `tailwind.config.ts:2` 以 `./packages/tailwind-preset/src` 相对路径消费 preset；grep `@nop-chaos/theme-tokens`（playground styles.css L3 + workspace 依赖 + tsconfig 路径 + vite 别名 + knip ignore，wiring 完整）。
4. 扫描覆盖核查：确认 `apps/playground/src/styles.css:19` `@source "../../../packages"` 是唯一权威包扫描源，覆盖全部 renderer 包；核实 v4.2.2 的 `@config` 会读取 legacy content（tailwindcss dist 内 `e.content.files.push({base,pattern})` 证据）与 `darkMode`（`config("darkMode",null)` + `['class','.dark']` 解析证据），据此判定根 config content 列表为活配置且过期。
5. 主题可达性核查：全仓 grep `setAttribute('data-theme'|'data-mode'`（仅 main.tsx 硬编码 classic/light）、`.dark` class 切换（仅 pivot-table-demo.tsx:155）、tests/ 与 index.html（无根级主题属性设置）。
6. token 死活交叉 grep：对约 50 个 token 家族逐一统计包外 `var(--x` 直接引用（apps/ + packages/，剔除 theme-tokens 自身与 dist），并对 `text-success`/`bg-secondary`/`bg-surface`/`text-sidebar-foreground`/`shadow-primary-*`/`animate-*` 等类名做子串级消费统计。
7. preset ↔ theme-tokens 拼写比对：colors 16 组映射（border/input/ring/background/foreground/primary/secondary/muted/accent/card/popover/sidebar×9/destructive/success/warning）逐名核对 theme-tokens 定义，全部存在（无拼写漂移）；radius 4 组、shadow 7 组同名存在（但见 F-07 自引用问题）；`--danger` fallback、`--popover*`/`--sidebar*` fallback 链有效。
8. bug 14 关联项：`packages/tailwind-preset/src/styles/base.css` 已不存在，`nop-gradient-*`/`nop-glass-card` 现由 `apps/playground/src/styles-theme-utilities.css` 提供——文档所述为历史快照，非现行缺陷。
9. 检查维度覆盖：D1 正确性（F-02/F-06/F-07）、D2 契约漂移（F-01/F-02/F-03，对照 theme-compatibility.md L263 与 styling-system.md L159-162）、D5 错误处理（两包几乎无运行时逻辑，仅 mergeThemeExtension 有合并语义问题，见 F-10；preset 的 var() fallback 链属"容错设计"已核对有效）、D8 结构（两包结构合规；theme-tokens 单文件混居主题 token 与组件级 token（--table-_/--dialog-_），文件尚在 500 行红线内，暂不单列 finding）。
