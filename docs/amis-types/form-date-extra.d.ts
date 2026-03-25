import { FormBaseControl, SchemaApi, SchemaExpression } from './common';

/**
 * InputDateBaseControl 日期基础控件属性
 */
export interface InputDateBaseControlSchema extends FormBaseControl {
  /** 日期存储格式 */
  format?: string;
  /** 日期展示格式 */
  inputFormat?: string;
  /** 日期展示格式 (新：替代inputFormat) */
  displayFormat?: string;
  /** 替代 format */
  valueFormat?: string;
  /** 是否 UTC */
  utc?: boolean;
  /** 是否可清除 */
  clearable?: boolean;
  /** 边框模式 */
  borderMode?: 'full' | 'half' | 'none';
  /** 快捷选项 */
  shortcuts?: string[];
  /** 禁用日期表达式 */
  disabledDate?: SchemaExpression;
  /** 禁止输入 */
  inputForbid?: boolean;
  /** 是否内嵌 */
  embed?: boolean;
}

/**
 * MonthControl 月份选择器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/month
 */
export interface MonthControlSchema extends InputDateBaseControlSchema {
  /** 指定为 input-month 渲染器 */
  type: 'input-month';
}

/**
 * MonthRangeControl 月份范围选择器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/month-range
 */
export interface MonthRangeControlSchema extends InputDateBaseControlSchema {
  /** 指定为 input-month-range 渲染器 */
  type: 'input-month-range';
  /** 分隔符 */
  delimiter?: string;
  /** 最小日期 */
  minDate?: string;
  /** 最大日期 */
  maxDate?: string;
  /** 快捷选项 */
  ranges?: string[];
}

/**
 * QuarterControl 季度选择器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/quarter
 */
export interface QuarterControlSchema extends InputDateBaseControlSchema {
  /** 指定为 input-quarter 渲染器 */
  type: 'input-quarter';
}

/**
 * QuarterRangeControl 季度范围选择器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/quarter-range
 */
export interface QuarterRangeControlSchema extends InputDateBaseControlSchema {
  /** 指定为 input-quarter-range 渲染器 */
  type: 'input-quarter-range';
  /** 分隔符 */
  delimiter?: string;
  /** 最小日期 */
  minDate?: string;
  /** 最大日期 */
  maxDate?: string;
  /** 快捷选项 */
  ranges?: string[];
}

/**
 * YearControl 年份选择器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/year
 */
export interface YearControlSchema extends InputDateBaseControlSchema {
  /** 指定为 input-year 渲染器 */
  type: 'input-year';
}
