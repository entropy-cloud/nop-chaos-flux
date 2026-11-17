# Flux DevTools Protocol v1（冻结）

前端内核（`@nop-chaos/nop-debugger`）↔ Java 网关（nop-entropy DevTools Gateway）的消息协议单一事实源。

- 设计来源：`docs/research/2026-11-17-flux-devtools-design.md` §8.1、§10.2；`docs/research/2026-11-17-flux-devtools-capture-design.md` §2、§8；roadmap M0。
- 状态：**v1 已冻结**（2026-11-18，plan `docs/plans/2026-11-18-m0-devtools-protocol-freeze-plan.md`）。

## 文件

| 文件                            | 内容                                                                        |
| ------------------------------- | --------------------------------------------------------------------------- |
| `rpc-envelope.schema.json`      | 三种封包：request / response（result 与 error 互斥，oneOf）/ event          |
| `methods.schema.json`           | 方法注册表 v1（9 个方法）+ `devLogEntry`、matcher 等公共定义                |
| `intercept-frame.schema.json`   | `intercept.frame` 事件、`intercept.resolve` 请求、`intercept.degraded` 事件 |
| `screenshot-result.schema.json` | 统一截图结果                                                                |
| `dev-session.schema.json`       | 会话录制格式（meta/clock/inputs/envFrames/checkpoints/logs 六段 + version） |
| `visual-baseline.schema.json`   | 视觉基线条目（含 `xui:visual-ignore` 忽略区）                               |
| `fixtures.json`                 | 共享符合性样例（valid/invalid）；Java 侧（M6）直接消费同一份                |

## 方法清单 v1

`session.attach` · `session.detach` · `session.heartbeat` · `log.emit` · `intercept.register` · `intercept.resolve` · `capture.upload` · `baseline.get` · `baseline.put`

事件（服务端推送）：`intercept.frame` · `intercept.degraded` · `session.forceDetach`（后者 payload 复用 `intercept.degraded` 的 reason 结构；M6 联调如需扩展字段须回本 Schema）。

## TS 原生类型 → JSON 线上表示映射表（Decision）

| TS 类型                                       | JSON 表示                                        | 说明                                                                  |
| --------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| `Uint8Array` / `Blob`（截图、视频等媒体字节） | base64 string + 同对象 `encoding: 'base64'` 字段 | v1 JSON 通道不承载二进制帧；M6 如引入独立二进制通道须回本 Schema 增补 |
| `DOMRectReadOnly`                             | `{x, y, width, height}`                          |                                                                       |
| `Date`                                        | epoch ms number（`startedAt`/`endedAt`/`at` 等） |                                                                       |

## 拦截帧语义（冻结）

1. Java → 前端 `intercept.frame`（phase = `before:handler` | `after:handler`，带 `timeoutMs`）。
2. 前端 → Java `intercept.resolve`：`continue` | `modify`（JSON Patch）| `shortCircuit`（stub response）。
3. 超时未 resolve → Java 自动 continue，并发 `intercept.degraded`（reason = `timeout`）；不阻塞业务。

## 演进规则（协议红线）

任何协议变更（新增/修改/删除字段、方法、事件）必须：

1. 回到本目录对应 Schema 更新（版本号推进）；
2. 同步更新 `fixtures.json` 与前端（`src/protocol/` codec + 符合性用例）、Java 两端符合性用例；
3. 更新本 README 的映射表/方法清单。

符合性校验入口（前端）：`packages/nop-debugger/src/protocol/protocol-conformance.test.ts`（ajv 加载本目录 Schema，逐一校验 fixtures + codec 编解码往返 + mock 网关全往返）。
