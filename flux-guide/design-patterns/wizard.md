# Wizard 多步骤向导

## 基本用法

```json
{
  "type": "wizard",
  "steps": [
    {
      "key": "step1",
      "title": "基本信息",
      "body": [
        { "type": "input-text", "name": "name", "label": "姓名", "required": true },
        { "type": "input-email", "name": "email", "label": "邮箱", "required": true }
      ]
    },
    {
      "key": "step2",
      "title": "详细信息",
      "body": [
        { "type": "input-text", "name": "phone", "label": "电话" },
        { "type": "input-text", "name": "address", "label": "地址" }
      ]
    }
  ],
  "onComplete": { "action": "showToast", "args": { "level": "success", "message": "提交成功" } }
}
```

## 线性导航 + 步骤校验

```json
{
  "type": "wizard",
  "linear": true,
  "steps": [
    {
      "key": "basic",
      "title": "基本信息",
      "body": [{ "type": "input-text", "name": "name", "label": "姓名", "required": true }]
    },
    {
      "key": "verify",
      "title": "验证",
      "body": [{ "type": "input-text", "name": "code", "label": "验证码", "required": true }]
    }
  ],
  "onStepCommit": { "action": "ajax", "args": { "url": "/api/validate-step" } },
  "onComplete": { "action": "ajax", "args": { "url": "/api/submit" } }
}
```

## 跳跃导航 + 条件步骤

```json
{
  "type": "wizard",
  "linear": false,
  "steps": [
    {
      "key": "type",
      "title": "选择类型",
      "body": [{ "type": "select", "name": "type", "label": "类型", "options": ["个人", "企业"] }]
    },
    {
      "key": "company",
      "title": "企业信息",
      "visible": "${type === '企业'}",
      "body": [{ "type": "input-text", "name": "companyName", "label": "企业名称" }]
    },
    { "key": "done", "title": "完成", "body": [{ "type": "text", "text": "请确认信息" }] }
  ]
}
```

## 作用域状态

```json
{
  "type": "wizard",
  "statusPath": "wizardStatus",
  "steps": [
    { "key": "s1", "title": "步骤 1", "body": [{ "type": "input-text", "name": "field1" }] },
    { "key": "s2", "title": "步骤 2", "body": [{ "type": "input-text", "name": "field2" }] }
  ]
}
```

通过 `statusPath` 发布只读状态：`${wizardStatus.currentStepKey}`、`${wizardStatus.currentStepIndex}`、`${wizardStatus.stepCount}`、`${wizardStatus.canGoNext}`、`${wizardStatus.canGoPrev}`。

## 字段参考

| 字段                   | 类型                 | 说明                                  |
| ---------------------- | -------------------- | ------------------------------------- |
| `steps`                | `WizardStepSchema[]` | 步骤数组                              |
| `value`/`defaultValue` | `string \| number`   | 当前步骤 key 或 index（1-based 种子） |
| `linear`               | `boolean`            | 线性导航（默认 true）                 |
| `allowStepJump`        | `boolean`            | linear=true 时允许跳转                |
| `mountOnEnter`         | `boolean`            | 进入时挂载步骤主体                    |
| `unmountOnExit`        | `boolean`            | 退出时卸载步骤主体                    |
| `statusPath`           | `string`             | 发布只读步骤状态的 scope 路径         |
| `onChange`             | `ActionSchema`       | 导航时触发                            |
| `onStepCommit`         | `ActionSchema`       | 点击"下一步"时触发（前进前）          |
| `onComplete`           | `ActionSchema`       | 最后一步提交成功                      |
| `onStepError`          | `ActionSchema`       | 步骤提交失败                          |

每步支持：`key`、`title`、`description`、`body`、`actions`、`visible`、`disabled`、`beforeEnter`（`ActionSchema`）、`beforeLeave`（`ActionSchema`）。
