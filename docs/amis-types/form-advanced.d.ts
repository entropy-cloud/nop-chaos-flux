import { FormBaseControl, FormOptionsSchema, SchemaApi, SchemaClassName } from './common';

/**
 * ComboControl 组合输入框
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/combo
 */
export interface ComboControlSchema extends FormBaseControl {
  /** 指定为 combo 渲染器 */
  type: 'combo';
  /** 单组表单项初始值 */
  scaffold?: Record<string, unknown>;
  /** 是否含有边框 */
  noBorder?: boolean;
  /** 确认删除提示 */
  deleteConfirmText?: string;
  /** 删除 API */
  deleteApi?: SchemaApi;
  /** 是否可切换条件 */
  typeSwitchable?: boolean;
  /** 条件配置 */
  conditions?: unknown[];
  /** 内部表单 CSS 类名 */
  formClassName?: SchemaClassName;
  /** 新增按钮 CSS 类名 */
  addButtonClassName?: SchemaClassName;
  /** 新增按钮文字 */
  addButtonText?: string;
  /** 是否可新增 */
  addable?: boolean;
  /** 在顶部添加 */
  addattop?: boolean;
  /** 子项配置 */
  items?: unknown[];
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 拖拽提示 */
  draggableTip?: string;
  /** 扁平化模式 */
  flat?: boolean;
  /** 分隔符 */
  delimiter?: string;
  /** 是否拼接值 */
  joinValues?: boolean;
  /** 最大数量 */
  maxLength?: number | string;
  /** 最小数量 */
  minLength?: number | string;
  /** 是否多行模式 */
  multiLine?: boolean;
  /** 是否可删除 */
  removable?: boolean;
  /** 子表单模式 */
  subFormMode?: 'normal' | 'horizontal' | 'inline';
  /** 子表单水平布局 */
  subFormHorizontal?: unknown;
  /** 是否可访问父级数据 */
  canAccessSuperData?: boolean;
  /** 是否使用 Tabs */
  tabsMode?: boolean;
  /** Tabs 样式 */
  tabsStyle?: '' | 'line' | 'card' | 'radio';
  /** Tab 标题模板 */
  tabsLabelTpl?: string;
  /** 懒加载 */
  lazyLoad?: boolean;
  /** 每页数量 */
  perPage?: number;
  /** 严格模式 */
  strictMode?: boolean;
  /** 同步字段 */
  syncFields?: string[];
  /** 允许为空 */
  nullable?: boolean;
  /** 消息配置 */
  messages?: {
    validateFailed?: string;
    minLengthValidateFailed?: string;
    maxLengthValidateFailed?: string;
  };
}

/**
 * ArrayControl 数组输入框
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/array
 */
export interface ArrayControlSchema extends FormBaseControl {
  /** 指定为 input-array 渲染器 */
  type: 'input-array';
  /** 子项配置 */
  items?: unknown;
  /** 单组表单项初始值 */
  scaffold?: Record<string, unknown>;
  /** 是否可新增 */
  addable?: boolean;
  /** 是否可删除 */
  removable?: boolean;
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 最小数量 */
  minLength?: number;
  /** 最大数量 */
  maxLength?: number;
  /** 是否拼接值 */
  joinValues?: boolean;
  /** 分隔符 */
  delimiter?: string;
  /** 是否可清除 */
  clearable?: boolean;
}

/**
 * TransferControl 穿梭框
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/transfer
 */
export interface TransferControlSchema extends FormOptionsSchema {
  /** 指定为 transfer 渲染器 */
  type: 'transfer';
  /** 穿梭框模式 */
  selectMode?: 'list' | 'table' | 'tree' | 'chained' | 'associated';
  /** 左侧标题 */
  selectTitle?: string;
  /** 右侧标题 */
  resultTitle?: string;
  /** 列表搜索 */
  search?: boolean;
  /** 右侧搜索 */
  resultListModeFollowSelect?: boolean;
  /** 表格列配置 */
  columns?: unknown[];
  /** 自定义结果展示 */
  resultItemSchema?: unknown;
  /** 最大数量 */
  maxLength?: number;
}

/**
 * TreeControl 树选择
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/input-tree
 */
export interface TreeControlSchema extends FormOptionsSchema {
  /** 指定为 input-tree 渲染器 */
  type: 'input-tree';
  /** 树模式 */
  treeMode?: 'normal' | 'radio' | 'checkbox';
  /** 初始展开级别 */
  initiallyOpen?: boolean;
  /** 自动展开父节点 */
  autoExpandParent?: boolean;
  /** 级联选择 */
  cascade?: boolean;
  /** 单选时是否可取消 */
  rootCreatable?: boolean;
  /** 是否可新增 */
  creatable?: boolean;
  /** 新增按钮文案 */
  createTip?: string;
  /** 新增 API */
  addApi?: SchemaApi;
  /** 是否可编辑 */
  editable?: boolean;
  /** 编辑 API */
  editApi?: SchemaApi;
  /** 是否可删除 */
  removable?: boolean;
  /** 删除 API */
  deleteApi?: SchemaApi;
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 保存排序 API */
  saveOrderApi?: SchemaApi;
  /** 节点名称字段 */
  labelField?: string;
  /** 值字段 */
  valueField?: string;
  /** 是否显示图标 */
  showIcon?: boolean;
  /** 是否显示 Radio */
  showRadio?: boolean;
  /** 是否显示 Checkbox */
  showOutline?: boolean;
  /** 是否显示路径 */
  showPathLabel?: boolean;
  /** 是否仅显示叶子节点 */
  onlyLeaf?: boolean;
  /** 是否可搜索 */
  searchable?: boolean;
  /** 搜索 API */
  searchApi?: SchemaApi;
}

/**
 * TreeSelectControl 树下拉选择
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/tree-select
 */
export interface TreeSelectControlSchema extends FormOptionsSchema {
  /** 指定为 tree-select 渲染器 */
  type: 'tree-select';
  /** 树模式 */
  treeMode?: 'normal' | 'radio' | 'checkbox';
  /** 初始展开级别 */
  initiallyOpen?: boolean;
  /** 自动展开父节点 */
  autoExpandParent?: boolean;
  /** 级联选择 */
  cascade?: boolean;
  /** 节点名称字段 */
  labelField?: string;
  /** 值字段 */
  valueField?: string;
  /** 是否显示图标 */
  showIcon?: boolean;
  /** 是否显示路径 */
  showPathLabel?: boolean;
  /** 是否仅显示叶子节点 */
  onlyLeaf?: boolean;
  /** 是否可搜索 */
  searchable?: boolean;
  /** 搜索 API */
  searchApi?: SchemaApi;
  /** 是否可新增 */
  creatable?: boolean;
  /** 新增 API */
  addApi?: SchemaApi;
  /** 是否可编辑 */
  editable?: boolean;
  /** 编辑 API */
  editApi?: SchemaApi;
  /** 是否可删除 */
  removable?: boolean;
  /** 删除 API */
  deleteApi?: SchemaApi;
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 下拉框宽度 */
  dropdownWidth?: number;
  /** 下拉框高度 */
  dropdownHeight?: number;
}

/**
 * FileControl 文件上传
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/input-file
 */
export interface FileControlSchema extends FormBaseControl {
  /** 指定为 input-file 渲染器 */
  type: 'input-file';
  /** 上传 API */
  receiver?: SchemaApi;
  /** 文件上传 URL */
  url?: SchemaApi;
  /** 上传按钮文案 */
  btnLabel?: string;
  /** 拖拽上传提示文案 */
  drag?: boolean;
  /** 拖拽提示 */
  dragTip?: string;
  /** 文件类型限制 */
  accept?: string;
  /** 最大文件大小 (字节) */
  maxSize?: number;
  /** 最小文件大小 (字节) */
  minLength?: number;
  /** 最大文件数量 */
  maxLength?: number;
  /** 是否自动填充 */
  autoUpload?: boolean;
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 是否多选 */
  multiple?: boolean;
  /** 是否可下载 */
  downloadUrl?: SchemaApi;
  /** 使用文件名作为值 */
  useChunk?: boolean;
  /** 分片大小 */
  chunkSize?: number;
  /** 并发数 */
  concurrency?: number;
  /** 文件字段名 */
  name?: string;
  /** 文件名称字段 */
  fileNameField?: string;
  /** 值字段 */
  valueField?: string;
  /** 描述字段 */
  descriptionField?: string;
  /** 状态字段 */
  statusField?: string;
  /** 进度字段 */
  progressField?: string;
}

/**
 * ImageControl 图片上传
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/input-image
 */
export interface ImageControlSchema extends FormBaseControl {
  /** 指定为 input-image 渲染器 */
  type: 'input-image';
  /** 上传 API */
  receiver?: SchemaApi;
  /** 文件上传 URL */
  url?: SchemaApi;
  /** 是否可裁剪 */
  crop?: boolean;
  /** 裁剪配置 */
  cropFormat?: 'image/png' | 'image/jpeg' | 'image/webp';
  /** 裁剪质量 */
  cropQuality?: number;
  /** 最小裁剪宽度 */
  cropMinWidth?: number;
  /** 最小裁剪高度 */
  cropMinHeight?: number;
  /** 是否保持比例 */
  cropRotatable?: boolean;
  /** 是否可缩放 */
  cropScalable?: boolean;
  /** 自动裁剪 */
  autoCrop?: boolean;
  /** 文件类型限制 */
  accept?: string;
  /** 最大文件大小 (字节) */
  maxSize?: number;
  /** 最小文件数量 */
  minLength?: number;
  /** 最大文件数量 */
  maxLength?: number;
  /** 是否自动上传 */
  autoUpload?: boolean;
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 是否多选 */
  multiple?: boolean;
  /** 是否可下载 */
  downloadUrl?: SchemaApi;
  /** 图片尺寸限制 */
  limit?: {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  };
  /** 图片压缩 */
  compress?: boolean;
  /** 压缩配置 */
  compressOptions?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  };
  /** 占位图 */
  frameImage?: string;
  /** 上传按钮文案 */
  uploadBtnText?: string;
  /** 上传按钮图标 */
  uploadBtnIcon?: string;
  /** 上传区域 CSS 类名 */
  uploadBtnClassName?: SchemaClassName;
  /** 是否显示上传按钮 */
  showUploadBtn?: boolean;
  /** 图片分割符 */
  delimiter?: string;
}

/**
 * RichTextControl 富文本编辑器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/input-rich-text
 */
export interface RichTextControlSchema extends FormBaseControl {
  /** 指定为 input-rich-text 渲染器 */
  type: 'input-rich-text';
  /** 富文本编辑器框架 */
  vendor?: 'tinymce' | 'quill' | 'froala';
  /** 编辑器配置 */
  options?: Record<string, unknown>;
  /** 图片上传 API */
  receiver?: SchemaApi;
  /** 视频上传 API */
  videoReceiver?: SchemaApi;
  /** 文件上传 API */
  fileField?: string;
  /** 图片字段名 */
  imageFieldName?: string;
  /** 粘贴图片 */
  pasteImage?: boolean;
}

/**
 * EditorControl 代码编辑器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/editor
 */
export interface EditorControlSchema extends FormBaseControl {
  /** 指定为 editor 渲染器 */
  type: 'editor' | string;
  /** 语言 */
  language?: string;
  /** 编辑器主题 */
  theme?: string;
  /** 编辑器配置 */
  options?: Record<string, unknown>;
  /** 是否支持全屏 */
  allowFullscreen?: boolean;
  /** 是否显示迷你地图 */
  minimap?: boolean;
  /** 编辑器大小 */
  size?: 'sm' | 'md' | 'lg';
  /**
   * 编辑器语言 (别名)
   */
  editorTheme?: string;
}
