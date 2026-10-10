# 20 - 3D 渲染(three-canvas)

> 权威契约:`packages/flux-renderers-3d/src/schemas.ts` + `src/engine/`;
> 内部设计:`docs/components/threejs-integration/design-renderer.md`;
> 可跑示例:playground `#/three-gallery`(六示例画廊)、`#/three-canvas-demo`、`#/three-industrial-demo`。

three-canvas 是 three.js 的**薄桥接渲染器**:three 原生资产(SceneJSON、GLTF/GLB、
AnimationClip、OrbitControls)直接进,flux 负责「数据源 → 表达式 → 命名对象属性」注入
与事件回传。schema 支持两种场景形态(二选一,`json` 优先):

## 场景双形态

```json
{
  "type": "three-canvas",
  "height": "460px",
  "scene": {
    "camera": {
      "position": [6, 4, 7],
      "fov": 50,
      "controls": {
        "autoRotate": true,
        "autoRotateSpeed": 1.2,
        "minDistance": 4,
        "maxDistance": 14,
        "maxPolarAngle": 1.45,
        "enablePan": true
      }
    },
    "environment": {
      "background": "#101826",
      "toneMapping": "aces",
      "fog": { "color": "#0c1322", "near": 14, "far": 30 }
    },
    "lights": [
      { "type": "directional", "position": [5, 8, 4], "intensity": 1.4, "castShadow": true }
    ],
    "models": []
  }
}
```

- **`models[]` 声明式图元**(兼容形态):`primitive: { geometry, material }` 或 `url`(GLTF/GLB),
  互斥双源时 primitive 优先。
- **`{ json: <SceneJSON> }` 原生形态**(薄桥接):three.js `Object3D.toJSON()` / three 编辑器
  导出的 SceneJSON 经 `THREE.ObjectLoader` 直接装配;场景内带 `name` 的对象自动注册为绑定
  目标(首名注册,重名诊断 `scene-json-duplicate-name`);`interactiveObjects: [name…]` 点名
  开启射线拾取;解析失败诊断 `scene-json-invalid` 并走错误 UI。
- 空态判别:`json` 存在即非空;models 形态按数组长度判。

## 图元与材质(8 种几何 × 4 类材质)

geometry `type`:`box` / `sphere` / `cylinder` / `plane` / `cone` / `torus` /
`tube`(管道:`path: [[x,y,z]…]` CatmullRom 样条 + `args.radius/tubularSegments/closed`)/
`capsule`(`args.radius/length`)。

material(standard 缺省):`color` / `opacity` / `transparent` / `wireframe` / `flatShading` /
PBR 通道 `metalness` / `roughness`(standard)/ 自发光 `emissive` + `emissiveIntensity`
(standard/lambert/phong;告警变色通道)。basic 材质无 PBR/emissive 字段,写入被安全忽略。

模型级字段:`interactive`(射线拾取,缺省 false)、`label`(CanvasTexture Sprite 标注,
缺省锚定包围盒上方,`labelOffset` 显式定位)、`castShadow` / `receiveShadow`、
`initialAnimation`(GLTF clip 按名自动播放)。

## 绑定与关键帧

```json
{
  "bindings": [
    {
      "id": "level",
      "target": { "modelId": "tank-a-core", "path": "scale", "type": "scale" },
      "source": { "expression": "${tagTemp}" },
      "transform": { "range": { "input": [0, 100], "output": [0.15, 1] } }
    },
    {
      "id": "alarm",
      "target": { "modelId": "beacon", "path": "material.emissiveIntensity", "type": "material" },
      "source": { "expression": "${tagTemp}" },
      "transform": { "convert": "value > 80 ? 2.2 : 0.05" }
    }
  ],
  "animations": [
    {
      "id": "spin",
      "trigger": { "type": "time", "source": "auto" },
      "target": { "modelId": "spinner", "property": "rotation.y" },
      "keyframes": [
        { "time": 0, "value": 0 },
        { "time": 2400, "value": 6.283 }
      ],
      "loop": { "type": "loop" }
    }
  ]
}
```

- `target.path` 为点分路径(`position` / `material.color` / `material.emissiveIntensity` /
  `visible`…),`modelId` 在 models 形态是模型 id、在 json 形态是对象 name;
- `transform.range` 线性映射(clamp)、`convert` flux 表达式(注入 `value`)、
  `condition` 真值二选一;`transform.animation` 可选 tween/spring/step 过渡
  (离散数据 → 连续过渡的桥接胶水);
- `animations` 为自研关键帧 clip(time/state/event 三种触发,once/loop/pingpong),
  **能力冻结**——时间线动画优先用 GLTF clip(`initialAnimation`)与 three 原生动画体系,
  flux clip 只承担「数据/事件触发的场景反应」。

## 数据源接入(数字孪生)

`IndustrialAdapter` 消费 `RendererEnv.openSocket`(订阅帧 + `{address: value}` 数据帧,
bool/int16/float32 解码,断线指数退避重连),写入 scope `dataSources.<tagName>`;
页面把标签值镜像进组件 state 后,经 `data` prop 注入即成为绑定表达式变量——
完整链路见 playground `#/three-gallery` 的「数字孪生泵站」示例
(`three-gallery-demo.tsx`:合成 socket → IndustrialAdapter → 镜像 → flux 绑定 →
泵旋转/罐液位/信标告警发光)。

## 事件

`events.onObjectClick / onObjectHover / onReady / onError`(payload 见
`docs/components/threejs-integration/design-renderer.md`);hover 自带 emissive 高亮与
pointer cursor。

## 错误与诊断

| 诊断码                                               | 触发                                   |
| ---------------------------------------------------- | -------------------------------------- |
| `webgl-unavailable`                                  | WebGL 上下文创建失败(错误 UI 无 Retry) |
| `model-load-failed`                                  | GLB url 加载失败(错误 UI + Retry)      |
| `scene-json-invalid`                                 | SceneJSON 解析失败(559)                |
| `scene-json-duplicate-name`                          | 场景 JSON 内重名对象,首名注册(559)     |
| `primitive-invalid-config` / `primitive-dual-source` | 图元配置缺源/双源                      |

## 示例画廊导览(playground `#/three-gallery`)

| 示例               | 覆盖能力                                                                               |
| ------------------ | -------------------------------------------------------------------------------------- |
| 图元与材质         | metalness×roughness 球格、tube/capsule、emissive、toneMapping aces、label              |
| 灯光与阴影         | ambient/directional/point/spot 四类灯 + 阴影 + 相机 controls(autoRotate/距离/极角限制) |
| 原生 three.js JSON | `{ json }` 装配 + name 寻址绑定(吊车臂摆动/吊钩升降/状态灯发光)                        |
| GLB 加载           | GLTFExporter 现场导出组合场景 → url 喂第二画布(零外部资产的全链路)                     |
| 关键帧与交互       | time/state/event 三触发 clip + hover 高亮 + 点击 toast                                 |
| 数字孪生泵站       | IndustrialAdapter 标签帧端到端:泵转速/罐液位/信标告警/点击详情                         |
