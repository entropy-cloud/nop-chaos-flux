## 口径

- 扫描面 = `packages/ui/src/components/ui` 的非测试 `.ts/.tsx`（渲染器族经 ui 原语继承，不单独枚举——roadmap「全组件」口径以此为准；canvas 族豁免同 WCAG 基线矩阵）。
- 标签判定（机械）：`base-ui` = import `@base-ui/react/<原语>`（utility 子路径 merge-props/use-render/direction-provider 不计）；`focus-visible` = 含 focus-visible 样式；`programmatic` = 含 `.focus(` 调用；皆无 = `non-interactive`。
- 主标签优先级：base-ui > programmatic > focus-visible > non-interactive。
- 抽检（2026-10-27，closure audit R1 勘正后名单）：non-interactive 抽 5 = alert / aspect-ratio / breadcrumb / carousel / chart（逐一开文件核实：纯展示容器或透传，零 focus 钩子；avatar 实为 base-ui、card 实为 focus-visible，不入此名单）；focus-visible 抽 3 = accordion / badge / button-group（样式真实存在）。另：closure audit 发现裸包根导入形态（`from '@base-ui/react'`，combobox.tsx）——分类器已补该形态。
- 已知差距：focus-visible 缺失的原语清单见生成表（补样式归 ui owner 面）；`use-surface-focus-wrap.ts` 为包内焦点陷阱 hook（programmatic 面核心实现）。
<!-- BEGIN GENERATED:focus-ledger (regenerate with --update; hand edits fail check:focus-ledger) -->

```txt
| 文件 | 主标签 | 全部标签 |
| --- | --- | --- |
| accordion | base-ui | base-ui, focus-visible |
| alert-dialog | base-ui | base-ui |
| alert | non-interactive | non-interactive |
| aspect-ratio | non-interactive | non-interactive |
| avatar | base-ui | base-ui |
| badge | focus-visible | focus-visible |
| breadcrumb | non-interactive | non-interactive |
| button-group | focus-visible | focus-visible |
| button | base-ui | base-ui, focus-visible |
| calendar | programmatic | programmatic |
| card | focus-visible | focus-visible |
| carousel | non-interactive | non-interactive |
| chart | non-interactive | non-interactive |
| checkbox | base-ui | base-ui, focus-visible |
| collapsible | base-ui | base-ui |
| color-picker | non-interactive | non-interactive |
| combobox | base-ui | base-ui |
| command | focus-visible | focus-visible |
| context-menu | base-ui | base-ui |
| dialog | base-ui | base-ui, focus-visible |
| direction | non-interactive | non-interactive |
| dirty-close-guard | non-interactive | non-interactive |
| drawer | base-ui | base-ui, focus-visible |
| dropdown-menu | base-ui | base-ui |
| empty | non-interactive | non-interactive |
| field | non-interactive | non-interactive |
| hover-card | base-ui | base-ui |
| input-group | programmatic | focus-visible, programmatic |
| input-otp | non-interactive | non-interactive |
| input | focus-visible | focus-visible |
| item | focus-visible | focus-visible |
| json-viewer | non-interactive | non-interactive |
| kbd | non-interactive | non-interactive |
| label | non-interactive | non-interactive |
| menubar | base-ui | base-ui, focus-visible |
| native-select | focus-visible | focus-visible |
| navigation-menu | base-ui | base-ui, focus-visible |
| overlay-z-index | non-interactive | non-interactive |
| pagination | non-interactive | non-interactive |
| popover | base-ui | base-ui |
| progress | base-ui | base-ui |
| radio-group | base-ui | base-ui, focus-visible |
| rating | focus-visible | focus-visible |
| resizable | focus-visible | focus-visible |
| scroll-area | base-ui | base-ui, focus-visible |
| scroll-mask | non-interactive | non-interactive |
| select | base-ui | base-ui, focus-visible |
| separator | base-ui | base-ui |
| sheet-gesture-close | non-interactive | non-interactive |
| sheet | base-ui | base-ui |
| sidebar-context | non-interactive | non-interactive |
| sidebar-layout | focus-visible | focus-visible |
| sidebar-menu | focus-visible | focus-visible |
| sidebar | non-interactive | non-interactive |
| skeleton | non-interactive | non-interactive |
| slider | base-ui | base-ui, focus-visible |
| sonner | non-interactive | non-interactive |
| spinner | non-interactive | non-interactive |
| switch | base-ui | base-ui, focus-visible |
| table-row-class-name | non-interactive | non-interactive |
| table | non-interactive | non-interactive |
| tabs | base-ui | base-ui, focus-visible |
| textarea | focus-visible | focus-visible |
| toggle-group | base-ui | base-ui, focus-visible |
| toggle | base-ui | base-ui, focus-visible |
| tooltip | base-ui | base-ui |
| use-dialog-drag | non-interactive | non-interactive |
| use-surface-focus-wrap | programmatic | programmatic |
```

<!-- END GENERATED:focus-ledger -->
