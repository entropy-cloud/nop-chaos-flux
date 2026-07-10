# 表达式语法

> 组件字段定义看 `flux-types/*.d.ts`。这里只记录模板与表达式语法。

---

## 模板语法 (在 `SchemaTpl` 字段中使用)

```
${variable}                          → 变量替换
${variable | filter:args}           → 带过滤器
```

## 条件表达式 (在 `SchemaExpression` 字段中使用)

```
${variable === 'value'}              → 等于
${variable > 10}                     → 比较
${a && b}                            → 与
${a || b}                            → 或
${!a}                                → 非
${a ? 'yes' : 'no'}                  → 三元
${arr | ARRAYINCLUDES:'x'}           → 数组包含元素
${s | CONTAINS:'sub'}                → 字符串包含子串
```

## 常用过滤器

所有内置函数名**大写**。可通过 `${}` 管道语法 `value | FUNC:args` 调用。

| 过滤器          | 作用       | 示例                                    |
| --------------- | ---------- | --------------------------------------- |
| `TRIM`          | 去空格     | `${s \| TRIM}`                          |
| `UPPER`         | 大写       | `${s \| UPPER}`                         |
| `LOWER`         | 小写       | `${s \| LOWER}`                         |
| `LEN`           | 长度       | `${s \| LEN}`                           |
| `INT`           | 取整       | `${n \| INT}`                           |
| `MOD`           | 取模       | `${n \| MOD:3}`                         |
| `CONCAT`        | 数组拼接   | `${arr \| CONCAT}`                      |
| `CONCATENATE`   | 拼接       | `${a \| CONCATENATE:b}`                 |
| `REPLACE`       | 替换       | `${s \| REPLACE:old:new}`               |
| `SPLIT`         | 分割       | `${s \| SPLIT:delimiter}`               |
| `JOIN`          | 数组连接   | `${arr \| JOIN:,}`                      |
| `CONTAINS`      | 包含子串   | `${s \| CONTAINS:sub}`                  |
| `ARRAYINCLUDES` | 数组含元素 | `${arr \| ARRAYINCLUDES:'x'}`           |
| `ISARRAY`       | 是否数组   | `${x \| ISARRAY}`                       |
| `ISEMPTY`       | 是否为空   | `${x \| ISEMPTY}`                       |
| `SUM`           | 求和       | `${arr \| SUM}`                         |
| `AVG`           | 平均值     | `${arr \| AVG}`                         |
| `COUNT`         | 计数       | `${arr \| COUNT}`                       |
| `UNIQ`          | 去重       | `${arr \| UNIQ}`                        |
| `COMPACT`       | 过滤假值   | `${arr \| COMPACT}`                     |
| `IF`            | 条件       | `${IF(cond, val1, val2)}`               |
| `SWITCH`        | 多分支     | `${SWITCH(expr, case1, val1, default)}` |
| `t`             | 国际化     | `${t('key')}`                           |

此外还有 `$Math`、`$JSON`、`$Date` 命名空间可用：

```
${$Math.PI}
${$Date.format(value, 'YYYY-MM-DD')}
${$JSON.stringify(obj)}
```

## 适用字段

- `SchemaTpl` → `text`, `title`, `label`, `tpl`, `html`, `placeholder`, `tooltip`, `description`
- `SchemaExpression` → `when`, `visible`, `hidden`, `disabled`, `readOnly`
