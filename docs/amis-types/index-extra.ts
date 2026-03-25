/**
 * AMIS JSON Schema TypeScript 类型定义 (补充)
 * 基于 amis@6.13.0
 * 
 * 这是补充类型定义文件，包含之前缺失的组件类型
 */

// ============================================================================
// 布局组件 (补充)
// ============================================================================
export * from './layout-extra';

// ============================================================================
// 表单控件 (补充)
// ============================================================================
export * from './form-controls-extra';
export * from './form-date-extra';

// ============================================================================
// 数据展示 (补充)
// ============================================================================
export * from './display-extra';

// ============================================================================
// 数据组件 (补充)
// ============================================================================
export * from './data-extra';

// ============================================================================
// 其他组件
// ============================================================================
export * from './misc';

// ============================================================================
// 联合类型 - 补充组件 Schema
// ============================================================================

import type { GridSchema, HBoxSchema, VBoxSchema } from './layout-extra';
import type { PickerControlSchema, NestedSelectControlSchema, ChainedSelectControlSchema, MatrixControlSchema, LocationControlSchema, IconPickerControlSchema, InputCityControlSchema, InputColorControlSchema, InputSignatureSchema, UUIDControlSchema, TableControlSchema, RatingControlSchema, RangeControlSchema, DiffControlSchema, FormulaControlSchema } from './form-controls-extra';
import type { MonthControlSchema, MonthRangeControlSchema, QuarterControlSchema, QuarterRangeControlSchema, YearControlSchema } from './form-date-extra';
import type { MappingSchema, CalendarSchema } from './display-extra';
import type { CRUD2Schema } from './data-extra';
import type { TasksSchema, WordsSchema, ExpandableSchema, MultilineTextSchema, SubFormControlSchema, FieldSetControlSchema, GroupControlSchema, InputGroupControlSchema, SwitchContainerSchema, PasswordSchema, JsonSchemaEditorControlSchema, ListControlSchema } from './misc';

/** 补充组件 Schema 的联合类型 */
export type AmisSchemaExtra =
  // 布局
  | GridSchema
  | HBoxSchema
  | VBoxSchema
  // 表单控件
  | PickerControlSchema
  | NestedSelectControlSchema
  | ChainedSelectControlSchema
  | MatrixControlSchema
  | LocationControlSchema
  | IconPickerControlSchema
  | InputCityControlSchema
  | InputColorControlSchema
  | InputSignatureSchema
  | UUIDControlSchema
  | TableControlSchema
  | RatingControlSchema
  | RangeControlSchema
  | DiffControlSchema
  | FormulaControlSchema
  // 日期控件
  | MonthControlSchema
  | MonthRangeControlSchema
  | QuarterControlSchema
  | QuarterRangeControlSchema
  | YearControlSchema
  // 数据展示
  | MappingSchema
  | CalendarSchema
  // 数据组件
  | CRUD2Schema
  // 其他
  | TasksSchema
  | WordsSchema
  | MultilineTextSchema
  | SubFormControlSchema
  | FieldSetControlSchema
  | GroupControlSchema
  | InputGroupControlSchema
  | SwitchContainerSchema
  | PasswordSchema
  | JsonSchemaEditorControlSchema
  | ListControlSchema;

/** 补充组件类型映射 */
export type AmisSchemaExtraByType = {
  'grid': GridSchema;
  'hbox': HBoxSchema;
  'vbox': VBoxSchema;
  'picker': PickerControlSchema;
  'nested-select': NestedSelectControlSchema;
  'chained-select': ChainedSelectControlSchema;
  'matrix-checkboxes': MatrixControlSchema;
  'location-picker': LocationControlSchema;
  'icon-picker': IconPickerControlSchema;
  'input-city': InputCityControlSchema;
  'input-color': InputColorControlSchema;
  'input-signature': InputSignatureSchema;
  'uuid': UUIDControlSchema;
  'input-table': TableControlSchema;
  'rating': RatingControlSchema;
  'input-range': RangeControlSchema;
  'diff': DiffControlSchema;
  'formula': FormulaControlSchema;
  'input-month': MonthControlSchema;
  'input-month-range': MonthRangeControlSchema;
  'input-quarter': QuarterControlSchema;
  'input-quarter-range': QuarterRangeControlSchema;
  'input-year': YearControlSchema;
  'mapping': MappingSchema;
  'map': MappingSchema;
  'calendar': CalendarSchema;
  'crud2': CRUD2Schema;
  'tasks': TasksSchema;
  'words': WordsSchema;
  'multiline-text': MultilineTextSchema;
  'subform': SubFormControlSchema;
  'fieldset': FieldSetControlSchema;
  'group': GroupControlSchema;
  'input-group': InputGroupControlSchema;
  'switch-container': SwitchContainerSchema;
  'password': PasswordSchema;
  'json-schema-editor': JsonSchemaEditorControlSchema;
  'list': ListControlSchema;
};
