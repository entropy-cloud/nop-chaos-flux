# Barcode Input 条码输入

表单字段组件，支持手动输入、摄像头扫码（原生 BarcodeDetector / zxing 回退）、连续扫码、批量队列与静态校验。

## 基础用法

```json
{
  "type": "barcode-input",
  "name": "productCode",
  "label": "产品条码",
  "placeholder": "输入或扫描条码",
  "formats": ["qr_code", "code_128", "ean_13"],
  "scanButton": true
}
```

## 连续扫码与批量模式

```json
{
  "type": "barcode-input",
  "name": "assetCodes",
  "label": "盘点资产",
  "continuousScan": true,
  "scanInterval": 300,
  "batchMode": true,
  "formats": ["qr_code", "data_matrix"]
}
```

> `batchMode: true` 时不立即触发 `onScan`，而是把扫码结果压入队列（状态 `pending → submitted | duplicate`，`error` 为预留状态），由宿主统一处理批量提交。

## 自动提交与校验

```json
{
  "type": "barcode-input",
  "name": "barcode",
  "label": "条码",
  "autoSubmit": true,
  "scanOnFocus": true,
  "clearable": true,
  "validate": {
    "message": "条码不存在"
  },
  "onScan": {
    "action": "ajax",
    "args": { "url": "/api/products/${event.barcode}" }
  }
}
```

> `validate` 当前只消费 `message`（静态校验文案，配合 `required`/`minLength`/`maxLength`/`pattern` 使用）；`validate.action` / `validate.debounce` 已声明但未接线。

## 字段参考

| 字段                    | 类型                                       | 说明                                                         |
| ----------------------- | ------------------------------------------ | ------------------------------------------------------------ |
| `name`                  | `string`                                   | 表单项名称                                                   |
| `label`                 | `string`                                   | 标签文本                                                     |
| `placeholder`           | `string`                                   | 占位文本                                                     |
| `required`              | `boolean`                                  | 必填                                                         |
| `disabled`              | `boolean`                                  | 禁用                                                         |
| `readOnly`              | `boolean`                                  | 只读                                                         |
| `clearable`             | `boolean`                                  | 显示清除按钮                                                 |
| `trimContents`          | `boolean`                                  | 裁剪首尾空白                                                 |
| `minLength`/`maxLength` | `number`                                   | 输入长度限制                                                 |
| `pattern`               | `string`                                   | 正则校验                                                     |
| `validate`              | `{ message?: string; action?; debounce? }` | 自定义校验（仅 `message` 生效，action/debounce 未接线）      |
| `formats`               | `BarcodeFormat[]`                          | 支持的条码格式数组                                           |
| `continuousScan`        | `boolean`                                  | 连续扫码模式                                                 |
| `scanButton`            | `boolean`                                  | 显示扫码按钮（默认 true）                                    |
| `scanInterval`          | `number`                                   | 连续扫码间隔 ms（默认 300）                                  |
| `batchMode`             | `boolean`                                  | 批量模式（结果入队而非立即 onScan）                          |
| `torchButton`           | `boolean`                                  | 显示手电筒按钮（设备支持时）                                 |
| `wasmUrl`               | `string`                                   | zxing wasm 地址（默认 unpkg CDN；原生 BarcodeDetector 优先） |
| `scanButtonClassName`   | `string`                                   | 扫码按钮类名                                                 |
| `autoSubmit`            | `boolean`                                  | 扫码后自动提交                                               |
| `scanOnFocus`           | `boolean`                                  | 聚焦后自动开启扫码                                           |

### Events

| 事件          | 说明                                        |
| ------------- | ------------------------------------------- |
| `onScan`      | 扫码成功，payload: `{ barcode, format }`    |
| `onScanError` | 扫码失败，payload: `{ error: { message } }` |
| `onMount`     | 挂载完成                                    |
| `onUnmount`   | 卸载前                                      |

### 支持格式

`aztec`, `code_39`, `code_93`, `code_128`, `data_matrix`, `ean_8`, `ean_13`, `itf`, `pdf_417`, `qr_code`, `upc_a`, `upc_e`
