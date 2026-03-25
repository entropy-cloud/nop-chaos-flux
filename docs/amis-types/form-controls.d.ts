import { FormBaseControl, FormOptionsSchema, SchemaApi, SchemaClassName } from './common';

/**
 * TextControl 文本输入框
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/input-text
 */
export interface TextControlSchema extends FormOptionsSchema {
  /** 指定为 input-text 渲染器 */
  type: 'input-text' | 'input-email' | 'input-url' | 'input-password' | 'native-date' | 'native-time' | 'native-number';
  /** 附带的操作按钮 */
  addOn?: {
    type?: string;
    label?: string;
    icon?: string;
    position?: 'left' | 'right';
    [key: string]: unknown;
  };
  /** 是否去除首尾空白 */
  trimContents?: boolean;
  /** 自动完成 API */
  autoComplete?: SchemaApi;
  /** 原生 autoComplete 属性 */
  nativeAutoComplete?: string;
  /** 边框模式 */
  borderMode?: 'full' | 'half' | 'none';
  /** 最小输入长度 */
  minLength?: number;
  /** 最大输入长度 */
  maxLength?: number;
  /** 是否显示计数 */
  showCounter?: boolean;
  /** 前缀 */
  prefix?: string;
  /** 后缀 */
  suffix?: string;
  /** 自动转换值 */
  transform?: {
    lowerCase?: boolean;
    upperCase?: boolean;
  };
  /** Control 节点 CSS 类名 */
  inputControlClassName?: SchemaClassName;
  /** 原生 input CSS 类名 */
  nativeInputClassName?: SchemaClassName;
  /** 空值时清除 */
  clearValueOnEmpty?: boolean;
}

/**
 * NumberControl 数字输入框
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/input-number
 */
export interface NumberControlSchema extends FormOptionsSchema {
  /** 指定为 input-number 渲染器 */
  type: 'input-number';
  /** 最大值 */
  max?: number;
  /** 最小值 */
  min?: number;
  /** 步长 */
  step?: number;
  /** 精度 */
  precision?: number;
  /** 是否显示步进器 */
  showSteps?: boolean;
  /** 是否大数模式 */
  big?: boolean;
  /** 是否前缀 */
  prefix?: string;
  /** 是否后缀 */
  suffix?: string;
  /** 边框模式 */
  borderMode?: 'full' | 'half' | 'none';
  /** 千分符 */
  kilobitSeparator?: boolean;
  /** 只读模式显示 */
  readOnlyMode?: 'text' | 'input';
}

/**
 * SelectControl 下拉选择框
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/select
 */
export interface SelectControlSchema extends FormOptionsSchema {
  /** 指定为 select 渲染器 */
  type: 'select' | 'multi-select';
  /** 自动完成 API */
  autoComplete?: SchemaApi;
  /** 自定义菜单模板 */
  menuTpl?: string;
  /** 显示无效匹配 */
  showInvalidMatch?: boolean;
  /** 边框模式 */
  borderMode?: 'full' | 'half' | 'none';
  /** 勾选展示模式 */
  selectMode?: 'table' | 'group' | 'tree' | 'chained' | 'associated';
  /** 左侧选项 */
  leftOptions?: Array<{ label: string; value: string | number }>;
  /** 左侧选择模式 */
  leftMode?: 'tree' | 'list';
  /** 右侧选择模式 */
  rightMode?: 'table' | 'list' | 'tree' | 'chained';
  /** 搜索结果展示模式 */
  searchResultMode?: 'table' | 'list' | 'tree' | 'chained';
  /** 表格列配置 */
  columns?: unknown[];
  /** 搜索结果表格列 */
  searchResultColumns?: unknown[];
  /** 是否可搜索 */
  searchable?: boolean;
  /** 搜索 API */
  searchApi?: SchemaApi;
  /** 选项高度 (虚拟滚动) */
  itemHeight?: number;
  /** 虚拟滚动阈值 */
  virtualThreshold?: number;
  /** 是否默认全选 */
  defaultCheckAll?: boolean;
  /** 全选按钮文案 */
  checkAllLabel?: string;
  /** 最大标签数 */
  maxTagCount?: number;
  /** 溢出标签配置 */
  overflowTagPopover?: unknown;
  /** 选项 CSS 类名 */
  optionClassName?: SchemaClassName;
  /** 下拉框配置 */
  overlay?: {
    width?: number | string;
    align?: 'left' | 'center' | 'right';
  };
}

/**
 * CheckboxControl 复选框
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/checkbox
 */
export interface CheckboxControlSchema extends FormBaseControl {
  /** 指定为 checkbox 渲染器 */
  type: 'checkbox';
  /** 勾选值 */
  trueValue?: string | number | boolean;
  /** 未勾选值 */
  falseValue?: string | number | boolean;
  /** 选项说明 */
  option?: string;
}

/**
 * CheckboxesControl 复选框组
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/checkboxes
 */
export interface CheckboxesControlSchema extends FormOptionsSchema {
  /** 指定为 checkboxes 渲染器 */
  type: 'checkboxes';
  /** 是否全选 */
  checkAll?: boolean;
  /** 全选文案 */
  checkAllLabel?: string;
  /** 默认列数 */
  columnsCount?: number;
  /** 选项 CSS 类名 */
  itemClassName?: SchemaClassName;
  /** 是否为图片模式 */
  imageClassName?: SchemaClassName;
  /** 是否为卡片模式 */
  cardClassName?: SchemaClassName;
  /** 是否内联 */
  inline?: boolean;
}

/**
 * RadioControl 单选框
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/radio
 */
export interface RadioControlSchema extends FormOptionsSchema {
  /** 指定为 radio 渲染器 */
  type: 'radio';
  /** 选项说明 */
  option?: string;
}

/**
 * RadiosControl 单选框组
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/radios
 */
export interface RadiosControlSchema extends FormOptionsSchema {
  /** 指定为 radios 渲染器 */
  type: 'radios';
  /** 默认列数 */
  columnsCount?: number;
  /** 选项 CSS 类名 */
  itemClassName?: SchemaClassName;
  /** 是否为图片模式 */
  imageClassName?: SchemaClassName;
  /** 是否为卡片模式 */
  cardClassName?: SchemaClassName;
  /** 是否内联 */
  inline?: boolean;
}

/**
 * SwitchControl 开关
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/switch
 */
export interface SwitchControlSchema extends FormBaseControl {
  /** 指定为 switch 渲染器 */
  type: 'switch';
  /** 开启值 */
  trueValue?: string | number | boolean;
  /** 关闭值 */
  falseValue?: string | number | boolean;
  /** 开启文案 */
  onText?: string;
  /** 关闭文案 */
  offText?: string;
}

/**
 * TextareaControl 多行文本框
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/textarea
 */
export interface TextareaControlSchema extends FormBaseControl {
  /** 指定为 textarea 渲染器 */
  type: 'textarea';
  /** 最小行数 */
  minRows?: number;
  /** 最大行数 */
  maxRows?: number;
  /** 是否显示计数 */
  showCounter?: boolean;
  /** 最大长度 */
  maxLength?: number;
  /** 是否自动增高 */
  autoSize?: boolean;
  /** 边框模式 */
  borderMode?: 'full' | 'half' | 'none';
}

/**
 * DateControl 日期选择器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/input-date
 */
export interface DateControlSchema extends FormOptionsSchema {
  /** 指定为 input-date 渲染器 */
  type: 'input-date';
  /** 日期格式 */
  format?: string;
  /** 显示格式 */
  inputFormat?: string;
  /** 最小日期 */
  minDate?: string;
  /** 最大日期 */
  maxDate?: string;
  /** 是否 UTC */
  utc?: boolean;
  /** 是否可清除 */
  clearable?: boolean;
}

/**
 * DateTimeControl 日期时间选择器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/input-datetime
 */
export interface DateTimeControlSchema extends FormOptionsSchema {
  /** 指定为 input-datetime 渲染器 */
  type: 'input-datetime';
  /** 日期格式 */
  format?: string;
  /** 显示格式 */
  inputFormat?: string;
  /** 时间格式 */
  timeFormat?: string;
  /** 最小日期时间 */
  minDate?: string;
  /** 最大日期时间 */
  maxDate?: string;
  /** 是否 UTC */
  utc?: boolean;
}

/**
 * TimeControl 时间选择器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/input-time
 */
export interface TimeControlSchema extends FormOptionsSchema {
  /** 指定为 input-time 渲染器 */
  type: 'input-time';
  /** 时间格式 */
  format?: string;
  /** 显示格式 */
  inputFormat?: string;
  /** 时间步长 */
  timeFormat?: string;
  /** 最小时间 */
  minTime?: string;
  /** 最大时间 */
  maxTime?: string;
}

/**
 * DateRangeControl 日期范围选择器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/input-date-range
 */
export interface DateRangeControlSchema extends FormOptionsSchema {
  /** 指定为 input-date-range 渲染器 */
  type: 'input-date-range' | 'input-datetime-range' | 'input-time-range';
  /** 日期格式 */
  format?: string;
  /** 显示格式 */
  inputFormat?: string;
  /** 分隔符 */
  delimiter?: string;
  /** 最小日期 */
  minDate?: string;
  /** 最大日期 */
  maxDate?: string;
  /** 是否 UTC */
  utc?: boolean;
  /** 快捷选项 */
  ranges?: string[];
}

/**
 * HiddenControl 隐藏字段
 */
export interface HiddenControlSchema extends FormBaseControl {
  /** 指定为 hidden 渲染器 */
  type: 'hidden';
}

