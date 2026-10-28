# Amount In Words 组件设计

## 1. 组件定位

- `amount-in-words` 是只读展示 renderer：把金额数值转换为 zh-CN 人民币大写文案（plan 785）。
- 转换逻辑是共享纯函数 `amountInWords(value, locale)`，位于 `@nop-chaos/flux-core`（`src/utils/amount-in-words.ts`）；flux-renderers-content 与 flux-renderers-form-advanced 都依赖 flux-core，因此工具不下沉到任何 renderer 包，避免包间横向依赖。
- 只读展示，无值 owner；配合 `input-table`（plan 785 ERP 从表）或独立字段展示使用。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无对应内置组件（ERP 场景常见于 jshERP 等单据从表大写栏）。

## 3. Flux 中的 renderer/type 定义

- `type: 'amount-in-words'`，归属 `@nop-chaos/flux-renderers-content`，随 `registerContentRenderers` 注册。

## 4. schema 设计

- `value`（可选）：金额，number 或 numeric string，可来自表达式/source。
- `placeholder`（可选）：值为空或不可数值化（NaN/Infinity/非法字符串）时的占位文本。

## 5. 转换口径（zh-CN）

- 数字用大写：零壹贰叁肆伍陆柒捌玖；位权 拾佰仟 + 万/亿 分组。
- 两位小数 → 角/分；超出两位四舍五入到分（抹零）。
- 无角分时以 `整` 结尾（元 > 0）；仅角时无整；角为 0 分 > 0 时补 `零`（如 壹元零伍分）。
- 0 → `零元整`；负数加 `负` 前缀；非法输入返回空串（渲染 placeholder）；角分缩放后超出 `Number.MAX_SAFE_INTEGER`（约 9e13 元以上）精度不可保证，同样返回空串。
- 仅支持 `zh-CN`；其他 locale 返回空串（follow-up 登记）。

## 6. DOM marker 约定

- 根节点 `data-slot="amount-in-words-root"` + `nop-amount-in-words` marker；`data-state="resolved" | "empty"`。
