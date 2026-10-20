# NumberKeyboard 组件设计

> Source: plan 669（M11a/M11b，2026-10-20）；形态参照 `docs/analysis/2026-10-19-mobile-advanced-libs-deep-research.md` §4.10（zarm keyboard+keyboard-picker 金融级形态）、§4.1（vant/antd-mobile 默认布局：1-9 可乱序、末行 [. 0 delete]、confirm 独立列）

## 1. 组件定位

- `number-keyboard` 是**受控打开**的虚拟数字键盘弹层 renderer：4 行数字网格 `[1-3][4-6][7-9][. 0 delete]` + 右侧 confirm 独立列（antd-mobile/vant 布局）。归属 `flux-renderers-mobile`；弹层承载复用 M7/M8 模式（useGlobalZIndex 栈位 + M6 useLockScroll + safe-bottom + mask）。

## 2. M11b 对账记录（与 verification-code 联动边界）

- 既有 `verification-code`（flux-renderers-form，InputOTP 域字段）：全长度提交不变式（`next.length === length ? next : undefined`）+ 刻意 uncontrolled cells（外部值仅 mount 时回显）。逐键回显不经 value 通道。
- **联动边界裁定**：`number-keyboard` 为独立输入面；消费方经 form value 通道集成（keyboard 的输出值写入目标字段），**不改造 verification-code 内部**（避免双实现）。
- **passcode**：repo 无既有实现（roadmap M11b 字样无对账对象），记录在案。

## 3. Schema 设计

```typescript
interface NumberKeyboardSchema extends BaseSchema {
  type: 'number-keyboard';
  open?: boolean;             // 受控打开
  decimal?: boolean;          // 小数点键，默认 true；false 不渲染
  randomOrder?: boolean;      // 数字键 1-9 每 mount Fisher-Yates 重排（键集不变）
  confirmDisabled?: boolean;  // 确认键禁用态
  title?: string;
  disabled?: boolean;
  onKey?: ...;                // { type:'key', key, value? } — 数字/`.`/delete（delete 省略 value）
  onConfirm?: ...;            // { type:'confirm' }
  onCancel?: ...;             // { type:'cancel' }（遮罩）
}
```

**通道契约（M2 裁定）**：数字/`.`/delete 统一走 `onKey`（delete 省略 value）；confirm 仅派发 `onConfirm`，不复派 onKey。

## 4. 键交互

- 每键 `data-key` 属性（e2e 断言通道：`data-key="5"` 等）；confirm `data-slot="number-keyboard-confirm"`。
- `randomOrder` 仅乱序 1-9（vant/antd-mobile 惯例）；0 固定末行中位。键集 {0-9} 不变量跨 mount 保持。
- Fisher-Yates per open（useEffect 依赖 [randomOrder, open]）。
- `decimal: false` 隐去小数点键（网格 3 列保持对齐）。

## 5. 边界情况

| 场景            | 行为                  |
| --------------- | --------------------- |
| decimal: false  | 小数点键不渲染        |
| confirmDisabled | 确认键禁用 + 0.5 透明 |
| disabled        | 全键盘冻结            |
| 遮罩点击        | 派发 onCancel 并关闭  |
