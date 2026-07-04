/**
 * Flux Schema 类型索引
 * 所有组件的联合类型 + type→接口映射。
 * 与 schema.d.ts 同步维护；修改 packages 下 schema 须同步本文件与 schema.d.ts。
 */

export type { BaseSchema, BoundFieldSchemaBase, FormFieldSchema, ApiSchema, Option, SchemaInput, SchemaExpression, SchemaTpl, SchemaBoolean, SchemaValue, SchemaObject, FieldRemarkSchema, XuiImportSpec, OperationControlConfig } from './common';
export type { ActionSchema, ActionShapeFields, AjaxActionSchema, SubmitFormActionSchema, OpenDialogActionSchema, OpenDrawerActionSchema, CloseDialogActionSchema, CloseDrawerActionSchema, CloseSurfaceActionSchema, RefreshTableActionSchema, RefreshSourceActionSchema, SetValueActionSchema, SetValuesActionSchema, ShowToastActionSchema, ConfirmActionSchema, AlertActionSchema, NavigateActionSchema, ComponentActionSchema, NamespacedActionSchema } from './common';

export type {
  // Page / Dialog / Drawer
  PageSchema, DialogSchema, DrawerSchema, SurfaceSize,
  // Layout
  ContainerSchema, FlexSchema, GridItemSchema, GridSchema,
  TabsItemSchema, TabsSchema, CollapseItemSchema, CollapseSchema,
  ButtonGroupItemSchema, ButtonGroupSchema, DropdownButtonItemSchema, DropdownButtonSchema,
  StepsItemSchema, StepsSchema, TimelineItemSchema, TimelineSchema,
  WizardStepSchema, WizardSchema, SeparatorSchema,
  // Form
  FormCrossFieldRule, FormSchema, FieldsetSchema, InputSchema,
  InputTextSchema, InputPasswordSchema, InputEmailSchema, InputNumberSchema, TextareaSchema,
  SelectSchema, CheckboxSchema, CheckboxGroupSchema, SwitchSchema, RadioGroupSchema,
  InputDateSchema, InputDatetimeSchema, InputTimeSchema, DateRangeSchema, InputPeriodSchema, MarkdownEditorSchema,
  // Advanced Form
  ComboSchema, InputTreeSchema, TreeSelectSchema, TransferSchema,
  PickerSchema, InputTableSchema, EditorSchema, ConditionBuilderSchema,
  InputFileSchema, InputImageSchema,
  TagListSchema, KeyValueSchema, ArrayEditorSchema, ObjectFieldSchema, ArrayFieldSchema, VariantFieldSchema,
  DetailFieldSchema, DetailViewSchema,
  // Data
  TableColumnSchema, TableSchema, CrudSchema, CrudColumnSchema, CrudQueryFormConfig, CrudSelectionConfig,
  CrudQuickEditConfig, CrudColumnFilterConfig, CrudClientModeConfig, CrudPaginationConfig, CrudResponsiveConfig,
  ListSchema, TreeSchema, ServiceSchema, PaginationSchema, ChartSchema, DataSourceSchema,
  // Display
  TextSchema, ButtonSchema, IconSchema, BadgeSchema, LinkSchema,
  ImageSchema, MarkdownSchema, HtmlSchema, JsonViewSchema,
  AlertSchema, SpinnerSchema, ProgressSchema, EmptySchema,
  CardSchema, CardsSchema, MappingSchema, StatusSchema, QrCodeSchema,
  CarouselSchema, AudioSchema, VideoSchema,
  // Structure Nodes
  FragmentSchema, LoopSchema, RecurseSchema, ReactionSchema, DynamicRendererSchema, ScopeDebugSchema,
  // Mobile
  PullRefreshSchema, InfiniteScrollSchema, SwipeCellSchema, CountdownSchema, NoticeBarSchema, NoticeBarVariant,
  // Misc
  TreeOption,
} from './schema';

// ============================================================================
// FluxSchema - 所有组件的联合类型
// ============================================================================

import type {
  PageSchema, DialogSchema, DrawerSchema,
  ContainerSchema, FlexSchema, GridSchema,
  TabsSchema, CollapseSchema, ButtonGroupSchema, DropdownButtonSchema,
  StepsSchema, TimelineSchema, WizardSchema, SeparatorSchema,
  FormSchema, FieldsetSchema,
  InputTextSchema, InputPasswordSchema, InputEmailSchema, InputNumberSchema, TextareaSchema,
  SelectSchema, CheckboxSchema, CheckboxGroupSchema, SwitchSchema, RadioGroupSchema,
  InputDateSchema, InputDatetimeSchema, InputTimeSchema, DateRangeSchema, InputPeriodSchema, MarkdownEditorSchema,
  ComboSchema, InputTreeSchema, TreeSelectSchema, TransferSchema,
  PickerSchema, InputTableSchema, EditorSchema, ConditionBuilderSchema,
  InputFileSchema, InputImageSchema,
  TagListSchema, KeyValueSchema, ArrayEditorSchema, ObjectFieldSchema, ArrayFieldSchema, VariantFieldSchema,
  DetailFieldSchema, DetailViewSchema,
  TableSchema, CrudSchema, ListSchema, TreeSchema, ServiceSchema, PaginationSchema, ChartSchema, DataSourceSchema,
  TextSchema, ButtonSchema, IconSchema, BadgeSchema, LinkSchema,
  ImageSchema, MarkdownSchema, HtmlSchema, JsonViewSchema,
  AlertSchema, SpinnerSchema, ProgressSchema, EmptySchema,
  CardSchema, CardsSchema, MappingSchema, StatusSchema, QrCodeSchema,
  CarouselSchema, AudioSchema, VideoSchema,
  FragmentSchema, LoopSchema, RecurseSchema, ReactionSchema, DynamicRendererSchema, ScopeDebugSchema,
  PullRefreshSchema, InfiniteScrollSchema, SwipeCellSchema, CountdownSchema, NoticeBarSchema,
} from './schema';

export type FluxSchema =
  | PageSchema | DialogSchema | DrawerSchema
  | ContainerSchema | FlexSchema | GridSchema
  | TabsSchema | CollapseSchema | ButtonGroupSchema | DropdownButtonSchema
  | StepsSchema | TimelineSchema | WizardSchema | SeparatorSchema
  | FormSchema | FieldsetSchema
  | InputTextSchema | InputPasswordSchema | InputEmailSchema | InputNumberSchema | TextareaSchema
  | SelectSchema | CheckboxSchema | CheckboxGroupSchema | SwitchSchema | RadioGroupSchema
  | InputDateSchema | InputDatetimeSchema | InputTimeSchema | DateRangeSchema | InputPeriodSchema | MarkdownEditorSchema
  | ComboSchema | InputTreeSchema | TreeSelectSchema | TransferSchema
  | PickerSchema | InputTableSchema | EditorSchema | ConditionBuilderSchema
  | InputFileSchema | InputImageSchema
  | TagListSchema | KeyValueSchema | ArrayEditorSchema | ObjectFieldSchema | ArrayFieldSchema | VariantFieldSchema
  | DetailFieldSchema | DetailViewSchema
  | TableSchema | CrudSchema | ListSchema | TreeSchema | ServiceSchema | PaginationSchema | ChartSchema | DataSourceSchema
  | TextSchema | ButtonSchema | IconSchema | BadgeSchema | LinkSchema
  | ImageSchema | MarkdownSchema | HtmlSchema | JsonViewSchema
  | AlertSchema | SpinnerSchema | ProgressSchema | EmptySchema
  | CardSchema | CardsSchema | MappingSchema | StatusSchema | QrCodeSchema
  | CarouselSchema | AudioSchema | VideoSchema
  | FragmentSchema | LoopSchema | RecurseSchema | ReactionSchema | DynamicRendererSchema | ScopeDebugSchema
  | PullRefreshSchema | InfiniteScrollSchema | SwipeCellSchema | CountdownSchema | NoticeBarSchema;

// ============================================================================
// FluxSchemaByType - type→接口映射
// ============================================================================

export interface FluxSchemaByType {
  'page': PageSchema;
  'dialog': DialogSchema;
  'drawer': DrawerSchema;
  'container': ContainerSchema;
  'flex': FlexSchema;
  'grid': GridSchema;
  'tabs': TabsSchema;
  'collapse': CollapseSchema;
  'button-group': ButtonGroupSchema;
  'dropdown-button': DropdownButtonSchema;
  'steps': StepsSchema;
  'timeline': TimelineSchema;
  'wizard': WizardSchema;
  'separator': SeparatorSchema;
  'form': FormSchema;
  'fieldset': FieldsetSchema;
  'input-text': InputTextSchema;
  'input-password': InputPasswordSchema;
  'input-email': InputEmailSchema;
  'input-number': InputNumberSchema;
  'textarea': TextareaSchema;
  'select': SelectSchema;
  'checkbox': CheckboxSchema;
  'checkbox-group': CheckboxGroupSchema;
  'switch': SwitchSchema;
  'radio-group': RadioGroupSchema;
  'input-date': InputDateSchema;
  'input-datetime': InputDatetimeSchema;
  'input-time': InputTimeSchema;
  'date-range': DateRangeSchema;
  'input-month': InputPeriodSchema;
  'input-quarter': InputPeriodSchema;
  'input-year': InputPeriodSchema;
  'markdown-editor': MarkdownEditorSchema;
  'combo': ComboSchema;
  'input-tree': InputTreeSchema;
  'tree-select': TreeSelectSchema;
  'transfer': TransferSchema;
  'picker': PickerSchema;
  'input-table': InputTableSchema;
  'editor': EditorSchema;
  'condition-builder': ConditionBuilderSchema;
  'input-file': InputFileSchema;
  'input-image': InputImageSchema;
  'tag-list': TagListSchema;
  'key-value': KeyValueSchema;
  'array-editor': ArrayEditorSchema;
  'object-field': ObjectFieldSchema;
  'array-field': ArrayFieldSchema;
  'variant-field': VariantFieldSchema;
  'detail-field': DetailFieldSchema;
  'detail-view': DetailViewSchema;
  'table': TableSchema;
  'crud': CrudSchema;
  'list': ListSchema;
  'tree': TreeSchema;
  'service': ServiceSchema;
  'pagination': PaginationSchema;
  'chart': ChartSchema;
  'data-source': DataSourceSchema;
  'text': TextSchema;
  'button': ButtonSchema;
  'icon': IconSchema;
  'badge': BadgeSchema;
  'link': LinkSchema;
  'image': ImageSchema;
  'markdown': MarkdownSchema;
  'html': HtmlSchema;
  'json-view': JsonViewSchema;
  'alert': AlertSchema;
  'spinner': SpinnerSchema;
  'progress': ProgressSchema;
  'empty': EmptySchema;
  'card': CardSchema;
  'cards': CardsSchema;
  'mapping': MappingSchema;
  'status': StatusSchema;
  'qrcode': QrCodeSchema;
  'carousel': CarouselSchema;
  'audio': AudioSchema;
  'video': VideoSchema;
  'fragment': FragmentSchema;
  'loop': LoopSchema;
  'recurse': RecurseSchema;
  'reaction': ReactionSchema;
  'dynamic-renderer': DynamicRendererSchema;
  'scope-debug': ScopeDebugSchema;
  'pull-refresh': PullRefreshSchema;
  'infinite-scroll': InfiniteScrollSchema;
  'swipe-cell': SwipeCellSchema;
  'countdown': CountdownSchema;
  'notice-bar': NoticeBarSchema;
}
