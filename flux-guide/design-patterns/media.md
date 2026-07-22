# 媒体组件（Audio / Video / Carousel）

## Audio

```json
{
  "type": "audio",
  "src": "https://example.com/audio.mp3",
  "controls": true,
  "autoPlay": false,
  "loop": false
}
```

### Audio 带封面

```json
{
  "type": "audio",
  "src": "${audioUrl}",
  "poster": "${coverUrl}",
  "title": [{ "type": "text", "text": "节目名称" }]
}
```

## Video

```json
{
  "type": "video",
  "src": "https://example.com/video.mp4",
  "controls": true,
  "width": 640,
  "height": 360
}
```

### Video 自动播放（静音）

```json
{
  "type": "video",
  "src": "${videoUrl}",
  "autoPlay": true,
  "muted": true,
  "loop": true,
  "poster": "${thumbnailUrl}"
}
```

## Carousel

```json
{
  "type": "carousel",
  "autoPlay": true,
  "interval": 3000,
  "items": [
    { "image": "/img/banner1.jpg", "title": "春季促销", "caption": "全场八折" },
    { "image": "/img/banner2.jpg", "title": "新品上市", "caption": "限时抢购" }
  ]
}
```

### Carousel 自定义内容

```json
{
  "type": "carousel",
  "autoPlay": false,
  "indicators": true,
  "controls": true,
  "items": [
    {
      "image": "/img/slide1.jpg",
      "body": [
        { "type": "text", "text": "自定义内容", "className": "text-white text-lg" },
        { "type": "button", "label": "立即查看", "variant": "default" }
      ]
    }
  ]
}
```

## 字段参考

### Audio

| 字段          | 类型           | 说明                      |
| ------------- | -------------- | ------------------------- |
| `src`         | `string`       | 音频 URL                  |
| `poster`      | `string`       | 封面图片 URL              |
| `controls`    | `boolean`      | 显示播放控件（默认 true） |
| `autoPlay`    | `boolean`      | 自动播放（默认 false）    |
| `loop`        | `boolean`      | 循环播放（默认 false）    |
| `title`       | `SchemaInput`  | 标题（figcaption）        |
| `onLoadError` | `ActionSchema` | 加载失败事件              |

### Video

| 字段          | 类型               | 说明                                      |
| ------------- | ------------------ | ----------------------------------------- |
| `src`         | `string`           | 视频 URL                                  |
| `poster`      | `string`           | 预览帧 URL                                |
| `controls`    | `boolean`          | 显示播放控件（默认 true）                 |
| `autoPlay`    | `boolean`          | 自动播放（默认 false）                    |
| `loop`        | `boolean`          | 循环播放（默认 false）                    |
| `muted`       | `boolean`          | 静音（默认 false）                        |
| `width`       | `number \| string` | 视频宽度（数字=px，字符串=任意 CSS 单位） |
| `height`      | `number \| string` | 视频高度（数字=px，字符串=任意 CSS 单位） |
| `title`       | `SchemaInput`      | 标题（figcaption）                        |
| `onLoadError` | `ActionSchema`     | 加载失败事件                              |

### Carousel

| 字段         | 类型                   | 说明                                       |
| ------------ | ---------------------- | ------------------------------------------ |
| `items`      | `CarouselItemSchema[]` | 轮播项数组                                 |
| `autoPlay`   | `boolean`              | 自动播放（默认 false）                     |
| `interval`   | `number`               | 切换间隔（ms，默认 5000）                  |
| `loop`       | `boolean`              | 循环播放（默认 true）                      |
| `controls`   | `boolean`              | 显示左右箭头（默认 true）                  |
| `indicators` | `boolean`              | 显示指示器（默认 true）                    |
| `onChange`   | `ActionSchema`         | 切换事件，payload: `{ activeIndex, item }` |

每项：`image`（图片 URL）、`title`（标题）、`caption`（描述）、`body`（自定义内容区域）。
