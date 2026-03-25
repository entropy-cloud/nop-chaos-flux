import { BaseSchema, SchemaApi, SchemaClassName, SchemaTpl } from './common';

/**
 * MappingSchema 映射展示控件
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/mapping
 */
export interface MappingSchema extends BaseSchema {
  /** 指定为 map/mapping 渲染器 */
  type: 'map' | 'mapping';
  /** 关联字段名 */
  name?: string;
  /** 配置映射规则 */
  map?: Record<string, SchemaTpl>;
  /** map或source为对象数组时，作为value值的字段名 */
  valueField?: string;
  /** map或source为对象数组时，作为label值的字段名 */
  labelField?: string;
  /** 自定义渲染映射值 */
  itemSchema?: unknown;
  /** 如果想远程拉取字典，请配置 source 为接口 */
  source?: SchemaApi;
  /** 占位符 */
  placeholder?: string;
}

/**
 * CalendarSchedule 日程配置
 */
export interface CalendarSchedule {
  /** 开始时间 */
  startTime?: string;
  /** 结束时间 */
  endTime?: string;
  /** 内容 */
  content?: SchemaTpl;
  /** CSS 类名 */
  className?: SchemaClassName;
}

/**
 * CalendarSchema 日历控件
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/calendar
 */
export interface CalendarSchema extends BaseSchema {
  /** 指定为 calendar 渲染器 */
  type: 'calendar';
  /** 日程 */
  schedules?: CalendarSchedule[] | SchemaApi;
  /** 日程显示颜色自定义 */
  scheduleClassNames?: string[];
  /** 日程点击展示配置 */
  scheduleAction?: unknown;
  /** 是否开启放大模式 */
  largeMode?: boolean;
  /** 今日激活时的自定义样式 */
  todayActiveStyle?: Record<string, unknown>;
  /** 日历模式 */
  scheduleViewMode?: 'month' | 'year';
}
