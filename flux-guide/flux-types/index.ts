/**
 * Flux Schema 类型索引
 * 所有组件的联合类型 + type→接口映射
 */

export type { BaseSchema, BoundFieldSchemaBase, FormFieldSchema, ApiSchema, Option, SchemaInput, SchemaExpression, SchemaTpl, SchemaBoolean, SchemaValue, FieldRemarkSchema, XuiImportSpec, OperationControlConfig } from './common';
export type { ActionSchema, ActionShapeFields, AjaxActionSchema, SubmitFormActionSchema, OpenDialogActionSchema, OpenDrawerActionSchema, CloseDialogActionSchema, CloseDrawerActionSchema, CloseSurfaceActionSchema, RefreshTableActionSchema, RefreshSourceActionSchema, SetValueActionSchema, SetValuesActionSchema, ShowToastActionSchema, ConfirmActionSchema, AlertActionSchema, NavigateActionSchema, ComponentActionSchema, NamespacedActionSchema } from './common';

export type {
  // Page / Layout
  PageSchema, ContainerSchema, FlexSchema, TabsSchema, GridSchema, SeparatorSchema,
  FragmentSchema, LoopSchema, RecurseSchema, ReactionSchema, DynamicRendererSchema, ScopeDebugSchema,
  // Dialog / Drawer
  DialogSchema, DrawerSchema,
  // Form
  FormSchema, FieldsetSchema, InputTextSchema, InputPasswordSchema, InputEmailSchema, InputNumberSchema, TextareaSchema,
  SelectSchema, CheckboxSchema, CheckboxGroupSchema, SwitchSchema, RadioGroupSchema,
  InputDateSchema, DateRangeSchema, InputMonthSchema, InputQuarterSchema, InputYearSchema, MarkdownEditorSchema,
  // Advanced Form
  ComboSchema, InputTreeSchema, TreeSelectSchema, TransferSchema,
  ConditionBuilderSchema, InputFileSchema, InputImageSchema,
  TagListSchema, KeyValueSchema, ArrayEditorSchema, ObjectFieldSchema, ArrayFieldSchema, VariantFieldSchema,
  DetailFieldSchema, DetailViewSchema, EditorSchema, InputTableSchema, PickerSchema,
  // Data
  TableSchema, CrudSchema, ListSchema, ChartSchema, PaginationSchema, TreeSchema,
  DataSourceSchema, ServiceSchema,
  // Display
  TextSchema, ButtonSchema, ButtonGroupSchema, DropdownButtonSchema, IconSchema, BadgeSchema,
  ImageSchema, MarkdownSchema, HtmlSchema, LinkSchema,
  AlertSchema, SpinnerSchema, ProgressSchema, EmptySchema,
  CardSchema, CardsSchema, MappingSchema, StatusSchema, JsonViewSchema,
  QrcodeSchema, CarouselSchema, AudioSchema, VideoSchema,
  // Layout Components
  CollapseSchema, StepsSchema, TimelineSchema, WizardSchema,
  // Mobile
  PullRefreshSchema, InfiniteScrollSchema, SwipeCellSchema, CountdownSchema, NoticeBarSchema, NoticeBarVariant,
  // Misc
  TreeOption,
} from './schema';

// ============================================================================
// FluxSchema - 所有组件的联合类型
// ============================================================================

import type {
  PageSchema, ContainerSchema, FlexSchema, TabsSchema, GridSchema, SeparatorSchema,
  FragmentSchema, LoopSchema, RecurseSchema, ReactionSchema, DynamicRendererSchema, ScopeDebugSchema,
  DialogSchema, DrawerSchema,
  FormSchema, FieldsetSchema, InputTextSchema, InputPasswordSchema, InputEmailSchema, InputNumberSchema, TextareaSchema,
  SelectSchema, CheckboxSchema, CheckboxGroupSchema, SwitchSchema, RadioGroupSchema,
  InputDateSchema, DateRangeSchema, InputMonthSchema, InputQuarterSchema, InputYearSchema, MarkdownEditorSchema,
  ComboSchema, InputTreeSchema, TreeSelectSchema, TransferSchema,
  ConditionBuilderSchema, InputFileSchema, InputImageSchema,
  TagListSchema, KeyValueSchema, ArrayEditorSchema, ObjectFieldSchema, ArrayFieldSchema, VariantFieldSchema,
  DetailFieldSchema, DetailViewSchema, EditorSchema, InputTableSchema, PickerSchema,
  TableSchema, CrudSchema, ListSchema, ChartSchema, PaginationSchema, TreeSchema,
  DataSourceSchema, ServiceSchema,
  TextSchema, ButtonSchema, ButtonGroupSchema, DropdownButtonSchema, IconSchema, BadgeSchema,
  ImageSchema, MarkdownSchema, HtmlSchema, LinkSchema,
  AlertSchema, SpinnerSchema, ProgressSchema, EmptySchema,
  CardSchema, CardsSchema, MappingSchema, StatusSchema, JsonViewSchema,
  QrcodeSchema, CarouselSchema, AudioSchema, VideoSchema,
  CollapseSchema, StepsSchema, TimelineSchema, WizardSchema,
  PullRefreshSchema, InfiniteScrollSchema, SwipeCellSchema, CountdownSchema, NoticeBarSchema,
} from './schema';

export type FluxSchema =
  | PageSchema | ContainerSchema | FlexSchema | TabsSchema | GridSchema | SeparatorSchema
  | FragmentSchema | LoopSchema | RecurseSchema | ReactionSchema | DynamicRendererSchema | ScopeDebugSchema
  | DialogSchema | DrawerSchema
  | FormSchema | FieldsetSchema | InputTextSchema | InputPasswordSchema | InputEmailSchema | InputNumberSchema | TextareaSchema
  | SelectSchema | CheckboxSchema | CheckboxGroupSchema | SwitchSchema | RadioGroupSchema
  | InputDateSchema | DateRangeSchema | InputMonthSchema | InputQuarterSchema | InputYearSchema | MarkdownEditorSchema
  | ComboSchema | InputTreeSchema | TreeSelectSchema | TransferSchema
  | ConditionBuilderSchema | InputFileSchema | InputImageSchema
  | TagListSchema | KeyValueSchema | ArrayEditorSchema | ObjectFieldSchema | ArrayFieldSchema | VariantFieldSchema
  | DetailFieldSchema | DetailViewSchema | EditorSchema | InputTableSchema | PickerSchema
  | TableSchema | CrudSchema | ListSchema | ChartSchema | PaginationSchema | TreeSchema
  | DataSourceSchema | ServiceSchema
  | TextSchema | ButtonSchema | ButtonGroupSchema | DropdownButtonSchema | IconSchema | BadgeSchema
  | ImageSchema | MarkdownSchema | HtmlSchema | LinkSchema
  | AlertSchema | SpinnerSchema | ProgressSchema | EmptySchema
  | CardSchema | CardsSchema | MappingSchema | StatusSchema | JsonViewSchema
  | QrcodeSchema | CarouselSchema | AudioSchema | VideoSchema
  | CollapseSchema | StepsSchema | TimelineSchema | WizardSchema
  | PullRefreshSchema | InfiniteScrollSchema | SwipeCellSchema | CountdownSchema | NoticeBarSchema;

// ============================================================================
// FluxSchemaByType - type→接口映射
// ============================================================================

export interface FluxSchemaByType {
  'page': PageSchema;
  'container': ContainerSchema;
  'flex': FlexSchema;
  'tabs': TabsSchema;
  'grid': GridSchema;
  'separator': SeparatorSchema;
  'fragment': FragmentSchema;
  'loop': LoopSchema;
  'recurse': RecurseSchema;
  'reaction': ReactionSchema;
  'dynamic-renderer': DynamicRendererSchema;
  'scope-debug': ScopeDebugSchema;
  'dialog': DialogSchema;
  'drawer': DrawerSchema;
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
  'input-datetime': InputDateSchema;
  'input-time': InputDateSchema;
  'date-range': DateRangeSchema;
  'input-month': InputMonthSchema;
  'input-quarter': InputQuarterSchema;
  'input-year': InputYearSchema;
  'markdown-editor': MarkdownEditorSchema;
  'combo': ComboSchema;
  'input-tree': InputTreeSchema;
  'tree-select': TreeSelectSchema;
  'transfer': TransferSchema;
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
  'editor': EditorSchema;
  'input-table': InputTableSchema;
  'picker': PickerSchema;
  'table': TableSchema;
  'crud': CrudSchema;
  'list': ListSchema;
  'chart': ChartSchema;
  'pagination': PaginationSchema;
  'tree': TreeSchema;
  'data-source': DataSourceSchema;
  'service': ServiceSchema;
  'text': TextSchema;
  'button': ButtonSchema;
  'button-group': ButtonGroupSchema;
  'dropdown-button': DropdownButtonSchema;
  'icon': IconSchema;
  'badge': BadgeSchema;
  'image': ImageSchema;
  'markdown': MarkdownSchema;
  'html': HtmlSchema;
  'link': LinkSchema;
  'alert': AlertSchema;
  'spinner': SpinnerSchema;
  'progress': ProgressSchema;
  'empty': EmptySchema;
  'card': CardSchema;
  'cards': CardsSchema;
  'mapping': MappingSchema;
  'status': StatusSchema;
  'json-view': JsonViewSchema;
  'qrcode': QrcodeSchema;
  'carousel': CarouselSchema;
  'audio': AudioSchema;
  'video': VideoSchema;
  'collapse': CollapseSchema;
  'steps': StepsSchema;
  'timeline': TimelineSchema;
  'wizard': WizardSchema;
  'pull-refresh': PullRefreshSchema;
  'infinite-scroll': InfiniteScrollSchema;
  'swipe-cell': SwipeCellSchema;
  'countdown': CountdownSchema;
  'notice-bar': NoticeBarSchema;
}
