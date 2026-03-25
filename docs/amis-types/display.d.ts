import { BaseSchema, SchemaApi, SchemaClassName, SchemaTpl } from './common';

/**
 * ImageSchema 图片
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/image
 */
export interface ImageSchema extends BaseSchema {
  /** 指定为 image 渲染器 */
  type: 'image' | 'static-image';
  /** 图片地址 */
  src?: SchemaTpl;
  /** 图片描述 */
  description?: SchemaTpl;
  /** 图片宽度 */
  width?: number | string;
  /** 图片高度 */
  height?: number | string;
  /** 图片大小 */
  imageClassName?: SchemaClassName;
  /** 默认占位图 */
  defaultImage?: string;
  /** 是否可预览 */
  enlargeAble?: boolean;
  /** 预览图地址 */
  originalSrc?: string;
  /** 是否显示图片标题 */
  showTitle?: boolean;
  /** 图片标题 */
  title?: SchemaTpl;
  /** 图片圆角 */
  borderMode?: 'square' | 'rounded' | 'circle';
}

/**
 * ImagesSchema 图片集
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/images
 */
export interface ImagesSchema extends BaseSchema {
  /** 指定为 images 渲染器 */
  type: 'images' | 'static-images';
  /** 图片列表 */
  value?: unknown;
  /** 列表数据源 */
  source?: SchemaApi;
  /** 图片地址字段 */
  src?: string;
  /** 原图地址字段 */
  originalSrc?: string;
  /** 图片描述字段 */
  description?: string;
  /** 每行显示个数 */
  enlargeAble?: boolean;
  /** 图片宽度 */
  width?: number;
  /** 图片高度 */
  height?: number;
  /** 图片间距 */
  gap?: number;
}

/**
 * AudioSchema 音频
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/audio
 */
export interface AudioSchema extends BaseSchema {
  /** 指定为 audio 渲染器 */
  type: 'audio';
  /** 音频地址 */
  src?: SchemaTpl;
  /** 是否自动播放 */
  autoPlay?: boolean;
  /** 是否循环播放 */
  loop?: boolean;
  /** 是否显示播放控制条 */
  controls?: boolean;
  /** 音频名称 */
  name?: string;
}

/**
 * VideoSchema 视频
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/video
 */
export interface VideoSchema extends BaseSchema {
  /** 指定为 video 渲染器 */
  type: 'video';
  /** 视频地址 */
  src?: SchemaTpl;
  /** 是否自动播放 */
  autoPlay?: boolean;
  /** 是否循环播放 */
  loop?: boolean;
  /** 视频封面 */
  poster?: string;
  /** 是否显示播放控制条 */
  controls?: boolean;
  /** 视频类型 */
  videoType?: string;
  /** 视频宽度 */
  aspectRatio?: 'auto' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
  /** 是否内联播放 */
  inline?: boolean;
}

/**
 * ChartSchema 图表
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/chart
 */
export interface ChartSchema extends BaseSchema {
  /** 指定为 chart 渲染器 */
  type: 'chart';
  /** 图表配置 (ECharts) */
  config?: unknown;
  /** 图表配置 API */
  api?: SchemaApi;
  /** 初始化数据 */
  data?: Record<string, unknown>;
  /** 图表宽度 */
  width?: number | string;
  /** 图表高度 */
  height?: number | string;
  /** 是否替换配置 */
  replaceChartOption?: boolean;
  /** 图表未加载提示 */
  placeholder?: string;
  /** 是否自动刷新 */
  autoAppendData?: SchemaApi;
  /** 刷新间隔 */
  interval?: number;
  /** 是否静默刷新 */
  silentPolling?: boolean;
  /** 图表不再刷新条件 */
  stopAutoRefreshWhen?: string;
  /** 是否支持数据映射 */
  trackExpression?: string;
  /** ECharts 版本 */
  chartTheme?: string;
  /** 是否支持点击 */
  clickAction?: unknown;
}

/**
 * CarouselSchema 轮播图
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/carousel
 */
export interface CarouselSchema extends BaseSchema {
  /** 指定为 carousel 渲染器 */
  type: 'carousel';
  /** 轮播选项 */
  options?: CarouselItemSchema[];
  /** 轮播间隔 */
  duration?: number;
  /** 轮播类型 */
  animation?: 'fade' | 'slide';
  /** 轮播方向 */
  direction?: 'horizontal' | 'vertical';
  /** 轮播宽度 */
  width?: number | string;
  /** 轮播高度 */
  height?: number | string;
  /** 轮播 CSS 类名 */
  controlsTheme?: 'light' | 'dark';
  /** 是否显示指示器 */
  controls?: Array<'dots' | 'arrows' | 'thumbnails'>;
  /** 是否自动播放 */
  auto?: boolean;
}

/**
 * CarouselItemSchema 轮播项
 */
export interface CarouselItemSchema {
  /** 图片地址 */
  image?: string;
  /** HTML 内容 */
  html?: SchemaTpl;
  /** 链接 */
  href?: string;
  /** 打开方式 */
  blank?: boolean;
}

/**
 * QRCodeSchema 二维码
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/qrcode
 */
export interface QRCodeSchema extends BaseSchema {
  /** 指定为 qrcode/qr-code 渲染器 */
  type: 'qrcode' | 'qr-code';
  /** 二维码内容 */
  value?: string;
  /** 二维码大小 */
  size?: number;
  /** 二维码背景色 */
  backgroundColor?: string;
  /** 二维码前景色 */
  foregroundColor?: string;
  /** 二维码级别 */
  level?: 'L' | 'M' | 'Q' | 'H';
  /** 二维码图案模式 */
  mode?: 'canvas' | 'svg';
  /** Logo 地址 */
  imageSettings?: {
    src?: string;
    height?: number;
    width?: number;
    excavated?: boolean;
  };
}

/**
 * ProgressSchema 进度条
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/progress
 */
export interface ProgressSchema extends BaseSchema {
  /** 指定为 progress 渲染器 */
  type: 'progress';
  /** 进度值 */
  value?: number | string;
  /** 最大值 */
  max?: number;
  /** 进度条样式 */
  mode?: 'line' | 'circle' | 'dashboard';
  /** 进度条宽度 */
  strokeWidth?: number;
  /** 进度条大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示值 */
  showLabel?: boolean;
  /** 是否动画 */
  animate?: boolean;
  /** 颜色映射 */
  map?: Array<string | { value: number; color?: string }>;
  /** 标签 */
  placeholder?: string;
  /** 是否为条纹 */
  stripe?: boolean;
  /** 进度条颜色 */
  color?: string;
  /** 匹配值 */
  valueTpl?: SchemaTpl;
}

/**
 * StatusSchema 状态
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/status
 */
export interface StatusSchema extends BaseSchema {
  /** 指定为 status 渲染器 */
  type: 'status';
  /** 状态值映射 */
  map?: Record<string, { label?: string; icon?: string; className?: SchemaClassName }>;
  /** 状态值 */
  value?: string | number;
  /** 占位符 */
  placeholder?: string;
  /** 标签文本 */
  label?: string;
  /** 图标尺寸 */
  iconSize?: 'sm' | 'md' | 'lg';
}

/**
 * TagSchema 标签
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/tag
 */
export interface TagSchema extends BaseSchema {
  /** 指定为 tag 渲染器 */
  type: 'tag';
  /** 标签文本 */
  label?: SchemaTpl;
  /** 标签颜色 */
  color?: string;
  /** 标签样式 */
  displayMode?: 'normal' | 'rounded' | 'status';
  /** 标签图标 */
  icon?: string;
  /** 标签级别 */
  level?: 'info' | 'success' | 'warning' | 'danger' | 'primary';
  /** 是否可关闭 */
  closable?: boolean;
}

/**
 * AvatarSchema 头像
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/avatar
 */
export interface AvatarSchema extends BaseSchema {
  /** 指定为 avatar 渲染器 */
  type: 'avatar';
  /** 头像地址 */
  src?: SchemaTpl;
  /** 头像文字 */
  text?: SchemaTpl;
  /** 头像图标 */
  icon?: string;
  /** 头像形状 */
  shape?: 'circle' | 'square' | 'rounded';
  /** 头像大小 */
  size?: number;
  /** 图标背景色 */
  iconClassName?: SchemaClassName;
  /** 文字背景色 */
  fit?: 'cover' | 'contain' | 'fill' | 'none';
  /** 额外样式 */
  style?: React.CSSProperties;
}

/**
 * ColorSchema 颜色
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/color
 */
export interface ColorSchema extends BaseSchema {
  /** 指定为 color 渲染器 */
  type: 'color';
  /** 颜色值 */
  value?: string;
  /** 是否显示默认值 */
  showValue?: boolean;
  /** 空白占位 */
  placeholder?: string;
  /** 默认值 */
  defaultColor?: string;
}

/**
 * JsonSchema JSON 查看器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/json
 */
export interface JsonSchema extends BaseSchema {
  /** 指定为 json 渲染器 */
  type: 'json' | 'static-json';
  /** JSON 值 */
  value?: unknown;
  /** 数据源字段 */
  source?: string;
  /** 展开级别 */
  levelExpand?: number;
  /** 是否可复制 */
  enableClipboard?: boolean;
  /** 图标样式 */
  iconStyle?: 'square' | 'circle' | 'triangle';
  /** 是否显示键引号 */
  quotesOnKeys?: boolean;
  /** 是否排序键 */
  sortKeys?: boolean;
}

/**
 * SparkLineSchema 迷你图
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/sparkline
 */
export interface SparkLineSchema extends BaseSchema {
  /** 指定为 sparkline 渲染器 */
  type: 'sparkline';
  /** 图表数据 */
  value?: number[];
  /** 图表宽度 */
  width?: number;
  /** 图表高度 */
  height?: number;
  /** 图表颜色 */
  color?: string;
  /** 是否显示面积图 */
  areaClassName?: string;
  /** 图表类型 */
  chartType?: 'line' | 'bar';
  /** 大小 */
  name?: string;
}

/**
 * IFrameSchema 内嵌框架
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/iframe
 */
export interface IFrameSchema extends BaseSchema {
  /** 指定为 iframe 渲染器 */
  type: 'iframe';
  /** iframe 地址 */
  src?: SchemaTpl;
  /** iframe 宽度 */
  width?: string;
  /** iframe 高度 */
  height?: string;
  /** 是否边框 */
  frameBorder?: number;
  /** 滚动条 */
  sandbox?: string;
}

/**
 * IconSchema 图标
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/icon
 */
export interface IconSchema extends BaseSchema {
  /** 指定为 icon 渲染器 */
  type: 'icon';
  /** 图标类名 */
  icon?: string;
  /** 图标大小 */
  size?: number;
  /** 图标颜色 */
  vendor?: 'iconfont' | 'fa' | '';
}
