# 维度 01：依赖图与包边界

## 第1轮初审

- 结论：零发现。
- 核查范围：全部 `packages/*/package.json`、内部 `@nop-chaos/*` 依赖、跨包 import 私有路径、exports map、`tsconfig.build.json` / `build` 脚本。
- 结果摘要：
  - 未发现循环依赖。
  - 未发现 `@nop-chaos/*/src/*`、`/internal/*`、`/dist/*` 私有路径导入。
  - 所有包均存在 `build` 脚本与 `tsconfig.build.json`。
  - 根导出均保持 `types + default` 双条件；显式 `./unstable` / CSS / locale 子路径均已在 exports 中声明。

## 深挖统计

- 第1轮发现数：0
- 深挖终止：第1轮后直接进入复核

## 维度复核结论

- 独立复核确认：零发现结论成立。
- 当前仓库未见跨包私有路径导入、未声明 exports 子路径、循环依赖或构建出口错位问题。

## 子项复核结论

- 无需逐条复核项。
