/**
 * AMIS JSON Schema TypeScript 类型定义
 * 基于 amis@6.13.0
 *
 * 这是精简版本，只保留核心属性
 */

// ============================================================================
// 基础类型
// ============================================================================
export * from './common';

// ============================================================================
// 布局组件
// ============================================================================
export * from './layout';

// ============================================================================
// 表单
// ============================================================================
export * from './form';
export * from './form-controls';
export * from './form-advanced';

// ============================================================================
// 数据展示
// ============================================================================
export * from './table';
export * from './display';
export * from './data';

// ============================================================================
// 反馈
// ============================================================================
export * from './feedback';

// ============================================================================
// 标签页/折叠/步骤
// ============================================================================
export * from './tabs';

// ============================================================================
// 按钮/操作
// ============================================================================
export * from './button';

// ============================================================================
// 页面
// ============================================================================
export * from './page';

// ============================================================================
// 联合类型 - 所有组件 Schema
// ============================================================================

import type { PageSchema } from './page';
import type { FormSchema } from './form';
import type { ButtonSchema, ButtonGroupSchema, ButtonToolbarSchema, DropdownButtonSchema } from './button';
import type { TableSchema, CRUDSchema } from './table';
import type { DialogSchema, DrawerSchema, AlertSchema, SpinnerSchema, RemarkSchema, TooltipWrapperSchema } from './feedback';
import type { TabsSchema, CollapseSchema, CollapseGroupSchema, StepsSchema, TimelineSchema, AnchorNavSchema, PortletSchema, WizardSchema } from './tabs';
import type { TplSchema, PlainSchema, LinkSchema, DividerSchema, ContainerSchema, WrapperSchema, PanelSchema, FlexSchema, EachSchema } from './layout';
import type { ImageSchema, ImagesSchema, AudioSchema, VideoSchema, ChartSchema, CarouselSchema, QRCodeSchema, ProgressSchema, StatusSchema, TagSchema, AvatarSchema, ColorSchema, JsonSchema, SparkLineSchema, IFrameSchema, IconSchema } from './display';
import type { TableSchema2, ListSchema, CardsSchema, CardSchema, NavSchema, PaginationSchema, PaginationWrapperSchema, SearchBoxSchema, SliderSchema, ServiceSchema } from './data';
import type { TextControlSchema, NumberControlSchema, SelectControlSchema, CheckboxControlSchema, CheckboxesControlSchema, RadioControlSchema, RadiosControlSchema, SwitchControlSchema, TextareaControlSchema, DateControlSchema, DateTimeControlSchema, TimeControlSchema, DateRangeControlSchema, HiddenControlSchema } from './form-controls';
import type { ComboControlSchema, ArrayControlSchema, TransferControlSchema, TreeControlSchema, TreeSelectControlSchema, FileControlSchema, ImageControlSchema, RichTextControlSchema, EditorControlSchema } from './form-advanced';

/** 所有组件 Schema 的联合类型 */
export type AmisSchema =
  // 页面
  | PageSchema
  // 表单
  | FormSchema
  | TextControlSchema
  | NumberControlSchema
  | SelectControlSchema
  | CheckboxControlSchema
  | CheckboxesControlSchema
  | RadioControlSchema
  | RadiosControlSchema
  | SwitchControlSchema
  | TextareaControlSchema
  | DateControlSchema
  | DateTimeControlSchema
  | TimeControlSchema
  | DateRangeControlSchema
  | HiddenControlSchema
  | ComboControlSchema
  | ArrayControlSchema
  | TransferControlSchema
  | TreeControlSchema
  | TreeSelectControlSchema
  | FileControlSchema
  | ImageControlSchema
  | RichTextControlSchema
  | EditorControlSchema
  // 按钮
  | ButtonSchema
  | ButtonGroupSchema
  | ButtonToolbarSchema
  | DropdownButtonSchema
  // 数据展示
  | TableSchema
  | TableSchema2
  | CRUDSchema
  | ListSchema
  | CardsSchema
  | CardSchema
  | ImageSchema
  | ImagesSchema
  | AudioSchema
  | VideoSchema
  | ChartSchema
  | CarouselSchema
  | QRCodeSchema
  | ProgressSchema
  | StatusSchema
  | TagSchema
  | AvatarSchema
  | ColorSchema
  | JsonSchema
  | SparkLineSchema
  | IFrameSchema
  | IconSchema
  // 反馈
  | DialogSchema
  | DrawerSchema
  | AlertSchema
  | SpinnerSchema
  | RemarkSchema
  | TooltipWrapperSchema
  // 布局
  | TplSchema
  | PlainSchema
  | LinkSchema
  | DividerSchema
  | ContainerSchema
  | WrapperSchema
  | PanelSchema
  | FlexSchema
  | EachSchema
  // 标签页/折叠/步骤
  | TabsSchema
  | CollapseSchema
  | CollapseGroupSchema
  | StepsSchema
  | TimelineSchema
  | AnchorNavSchema
  | PortletSchema
  | WizardSchema
  // 导航
  | NavSchema
  | PaginationSchema
  | PaginationWrapperSchema
  // 其他
  | SearchBoxSchema
  | SliderSchema
  | ServiceSchema;

/** 组件类型映射 */
export type AmisSchemaByType = {
  'page': PageSchema;
  'form': FormSchema;
  'button': ButtonSchema;
  'action': ButtonSchema;
  'submit': ButtonSchema;
  'reset': ButtonSchema;
  'button-group': ButtonGroupSchema;
  'button-toolbar': ButtonToolbarSchema;
  'dropdown-button': DropdownButtonSchema;
  'table': TableSchema;
  'static-table': TableSchema;
  'table2': TableSchema2;
  'crud': CRUDSchema;
  'list': ListSchema;
  'static-list': ListSchema;
  'cards': CardsSchema;
  'card': CardSchema;
  'input-text': TextControlSchema;
  'input-email': TextControlSchema;
  'input-url': TextControlSchema;
  'input-password': TextControlSchema;
  'input-number': NumberControlSchema;
  'select': SelectControlSchema;
  'multi-select': SelectControlSchema;
  'checkbox': CheckboxControlSchema;
  'checkboxes': CheckboxesControlSchema;
  'radio': RadioControlSchema;
  'radios': RadiosControlSchema;
  'switch': SwitchControlSchema;
  'textarea': TextareaControlSchema;
  'input-date': DateControlSchema;
  'input-datetime': DateTimeControlSchema;
  'input-time': TimeControlSchema;
  'input-date-range': DateRangeControlSchema;
  'input-datetime-range': DateRangeControlSchema;
  'input-time-range': DateRangeControlSchema;
  'hidden': HiddenControlSchema;
  'combo': ComboControlSchema;
  'input-array': ArrayControlSchema;
  'transfer': TransferControlSchema;
  'input-tree': TreeControlSchema;
  'tree-select': TreeSelectControlSchema;
  'input-file': FileControlSchema;
  'input-image': ImageControlSchema;
  'input-rich-text': RichTextControlSchema;
  'editor': EditorControlSchema;
  'tpl': TplSchema;
  'html': TplSchema;
  'plain': PlainSchema;
  'text': PlainSchema;
  'link': LinkSchema;
  'divider': DividerSchema;
  'container': ContainerSchema;
  'wrapper': WrapperSchema;
  'panel': PanelSchema;
  'flex': FlexSchema;
  'each': EachSchema;
  'image': ImageSchema;
  'static-image': ImageSchema;
  'images': ImagesSchema;
  'static-images': ImagesSchema;
  'audio': AudioSchema;
  'video': VideoSchema;
  'chart': ChartSchema;
  'carousel': CarouselSchema;
  'qrcode': QRCodeSchema;
  'qr-code': QRCodeSchema;
  'progress': ProgressSchema;
  'status': StatusSchema;
  'tag': TagSchema;
  'avatar': AvatarSchema;
  'color': ColorSchema;
  'json': JsonSchema;
  'static-json': JsonSchema;
  'sparkline': SparkLineSchema;
  'iframe': IFrameSchema;
  'icon': IconSchema;
  'dialog': DialogSchema;
  'drawer': DrawerSchema;
  'alert': AlertSchema;
  'spinner': SpinnerSchema;
  'remark': RemarkSchema;
  'tooltip-wrapper': TooltipWrapperSchema;
  'tabs': TabsSchema;
  'collapse': CollapseSchema;
  'collapse-group': CollapseGroupSchema;
  'steps': StepsSchema;
  'timeline': TimelineSchema;
  'anchor-nav': AnchorNavSchema;
  'portlet': PortletSchema;
  'wizard': WizardSchema;
  'nav': NavSchema;
  'pagination': PaginationSchema;
  'pagination-wrapper': PaginationWrapperSchema;
  'search-box': SearchBoxSchema;
  'slider': SliderSchema;
  'service': ServiceSchema;
};
