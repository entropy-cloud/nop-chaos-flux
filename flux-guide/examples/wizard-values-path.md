# 范例：分步向导（valuesPath 分区 + 汇总提交）

> 演示 wizard 多步表单 + 每步用 `valuesPath` 把数据分区到 `wizardData.stepN` + 确认步跨步读取 + `onComplete` 把各步数据聚成一个 payload 提交。

## 场景

三步：基本信息 → 详细信息 → 确认提交。前两步各自一个 form，数据互不覆盖；最后一步只读展示并提交。

## Schema

```jsonc
{
  "type": "page",
  "body": [
    {
      "type": "wizard",
      "statusPath": "wizardStatus", // 向导进度发布到这里
      "mountOnEnter": true, // 每步进入时才挂载（懒渲染）
      "steps": [
        // ── 步骤 1：基本信息 ──
        {
          "key": "basic",
          "title": "基本信息",
          "description": "填写账号基础信息",
          "formId": "wizard-step1-form", // wizard 用这个 id 校验通过才放行 Next
          "body": [
            {
              "type": "form",
              "id": "wizard-step1-form",
              "valuesPath": "wizardData.step1", // 本步数据 → scope.wizardData.step1
              "body": [
                { "type": "input-text", "name": "name", "label": "姓名", "required": true },
                { "type": "input-text", "name": "email", "label": "邮箱", "required": true },
              ],
            },
          ],
        },

        // ── 步骤 2：详细信息 ──
        {
          "key": "detail",
          "title": "详细信息",
          "formId": "wizard-step2-form",
          "body": [
            {
              "type": "form",
              "id": "wizard-step2-form",
              "valuesPath": "wizardData.step2", // 本步数据 → scope.wizardData.step2
              "body": [
                // dict 驱动的 select（见 11-host-integration.md loadDict）
                {
                  "type": "select",
                  "name": "role",
                  "label": "角色",
                  "required": true,
                  "dict": "role",
                },
                { "type": "input-number", "name": "budget", "label": "预算额度(万)", "min": 0 },
                { "type": "switch", "name": "notify", "label": "接收通知" },
              ],
            },
          ],
        },

        // ── 步骤 3：确认（无 formId，纯展示） ──
        {
          "key": "confirm",
          "title": "确认提交",
          "body": [
            {
              "type": "fieldset",
              "title": "信息确认",
              "body": [
                // 跨步读取：wizardData.step1.* / wizardData.step2.*
                { "type": "text", "text": "姓名：${wizardData.step1.name || \"-\"}" },
                { "type": "text", "text": "邮箱：${wizardData.step1.email || \"-\"}" },
                { "type": "text", "text": "角色：${wizardData.step2.role || \"-\"}" },
                { "type": "text", "text": "预算：${wizardData.step2.budget ?? 0} 万" },
                {
                  "type": "text",
                  "text": "通知：${wizardData.step2.notify ? \"开启\" : \"关闭\"}",
                },
              ],
            },
          ],
        },
      ],

      // 最后一步点"完成"时触发：把各步数据聚成一个 payload
      "onComplete": {
        "action": "ajax",
        "args": {
          "url": "/api/users/save",
          "method": "post",
          "data": {
            "name": "${wizardData.step1.name}",
            "email": "${wizardData.step1.email}",
            "role": "${wizardData.step2.role}",
            "budget": "${wizardData.step2.budget ?? 0}",
            "notify": "${wizardData.step2.notify ?? false}",
          },
        },
        "messages": { "success": "提交成功" },
        "then": [{ "action": "setValue", "args": { "path": "wizardSubmitted", "value": true } }],
      },
    },

    { "type": "text", "text": "提交状态：${wizardSubmitted ? \"已完成 ✓\" : \"未提交\"}" },
  ],
}
```

## 为什么这样接

| 关键点                 | 说明                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| 每步 `valuesPath` 不同 | `wizardData.step1` / `step2` 把各步数据隔离，互不覆盖；确认步和 `onComplete` 统一从 `wizardData.*` 读。      |
| `formId` = 步骤校验闸  | 给 step 的 body 里那个 form 设 `id` 并在 step 上声明 `formId`，wizard 会先校验该 form 通过才允许进入下一步。 |
| 确认步无 `formId`      | 纯展示步不需要校验，不放 `formId`。                                                                          |
| `mountOnEnter: true`   | 步骤体进入时才挂载，避免一次性渲染全部表单（也避免未访问步骤的副作用）。                                     |
| `onComplete` 聚合提交  | 不依赖某个 form 的 `submitAction`，而是 wizard 自己的完成回调，把多步数据拼成一个请求。                      |
| `??` / `\|\|` 兜底     | 跨步引用时未填值要兜底（`?? 0`、`\|\| "-"`），否则渲染 `undefined`。                                         |

> 真实完整版（含 picker 部门选择）见 `apps/playground/src/complex-pages/page-schemas/form-wizard.json`。
