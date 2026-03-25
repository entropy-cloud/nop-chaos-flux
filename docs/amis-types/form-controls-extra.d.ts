import { FormBaseControl, FormOptionsSchema, SchemaApi, SchemaClassName, SchemaTpl } from './common';

/**
 * PickerControl 选择器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/picker
 */
export interface PickerControlSchema extends FormOptionsSchema {
  /** 指定为 picker 渲染器 */
  type: 'picker';
  /** 可用来生成选中的值的描述文字 */
  labelTpl?: SchemaTpl;
  /** 选中字段名用来作为值的描述文字 */
  labelField?: string;
  /** 选一个可以用来作为值的字段 */
  valueField?: string;
  /** 弹窗选择框详情 */
  pickerSchema?: unknown;
  /** 弹窗模式，dialog 或者 drawer */
  modalMode?: 'dialog' | 'drawer';
  /** 弹窗的尺寸 */
  modalSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** 弹窗的标题 */
  modalTitle?: string;
  /** 内嵌模式 */
  embed?: boolean;
  /** 开启最大标签展示数量的相关配置 */
  overflowConfig?: {
    /** 标签的最大展示数量 */
    maxTagCount?: number;
    /** 收纳标签生效的位置 */
    displayPosition?: Array<'select' | 'crud'>;
    /** 选择器内收纳标签的Popover配置 */
    overflowTagPopover?: unknown;
    /** CRUD顶部内收纳标签的Popover配置 */
    overflowTagPopoverInCRUD?: unknown;
  };
  /** 选中项可删除 */
  itemClearable?: boolean;
}

/**
 * NestedSelectControl 嵌套选择器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/nested-select
 */
export interface NestedSelectControlSchema extends FormOptionsSchema {
  /** 指定为 nested-select 渲染器 */
  type: 'nested-select';
  /** 边框模式 */
  borderMode?: 'full' | 'half' | 'none';
  /** 弹框的 css 类 */
  menuClassName?: SchemaClassName;
  /** 父子之间是否完全独立 */
  cascade?: boolean;
  /** 选父级的时候是否把子节点的值也包含在内 */
  withChildren?: boolean;
  /** 选父级的时候，是否只把子节点的值包含在内 */
  onlyChildren?: boolean;
  /** 只允许选择叶子节点 */
  onlyLeaf?: boolean;
  /** 是否隐藏选择框中已选中节点的祖先节点的文本信息 */
  hideNodePathLabel?: boolean;
  /** 标签的最大展示数量 */
  maxTagCount?: number;
  /** 收纳标签的Popover配置 */
  overflowTagPopover?: unknown;
}

/**
 * ChainedSelectControl 链式选择器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/chain-select
 */
export interface ChainedSelectControlSchema extends FormOptionsSchema {
  /** 指定为 chained-select 渲染器 */
  type: 'chained-select';
  /** 拆分符 */
  delimiter?: string;
  /** 是否拼接值 */
  joinValues?: boolean;
  /** 是否提取值 */
  extractValue?: boolean;
  /** 选择 API */
  source?: SchemaApi;
}

/**
 * MatrixControl 矩阵选择
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/matrix
 */
export interface MatrixControlSchema extends FormBaseControl {
  /** 指定为 matrix-checkboxes 渲染器 */
  type: 'matrix-checkboxes';
  /** 配置singleSelectMode时设置为false */
  multiple?: boolean;
  /** 设置单选模式，multiple为false时有效 */
  singleSelectMode?: boolean;
  /** 可用来通过 API 拉取 options */
  source?: SchemaApi;
  /** 列配置 */
  columns?: Array<{ label: string; [key: string]: unknown }>;
  /** 行配置 */
  rows?: Array<{ label: string; [key: string]: unknown }>;
  /** 行标题说明 */
  rowLabel?: string;
}

/**
 * LocationControl 位置选择器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/location
 */
export interface LocationControlSchema extends FormBaseControl {
  /** 指定为 location-picker 渲染器 */
  type: 'location-picker';
  /** 选择地图类型 */
  vendor?: 'baidu' | 'gaode' | 'tenxun';
  /** 有的地图需要设置 ak 信息 */
  ak?: string;
  /** 是否自动选中当前地理位置 */
  autoSelectCurrentLoc?: boolean;
  /** 是否限制只能选中当前地理位置 */
  onlySelectCurrentLoc?: boolean;
  /** 开启只读模式后的占位提示 */
  getLocationPlaceholder?: string;
  /** 是否隐藏地图控制组件 */
  hideViewControl?: boolean;
}

/**
 * IconPickerControl 图标选择器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/icon-picker
 */
export interface IconPickerControlSchema extends FormBaseControl {
  /** 指定为 icon-picker 渲染器 */
  type: 'icon-picker';
}

/**
 * InputCityControl 城市选择器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/city
 */
export interface InputCityControlSchema extends FormBaseControl {
  /** 指定为 input-city 渲染器 */
  type: 'input-city';
  /** 开启后只会存城市的 code 信息 */
  extractValue?: boolean;
  /** 是否将各个信息拼接成字符串 */
  joinValues?: boolean;
  /** 拼接的符号 */
  delimiter?: string;
  /** 允许选择城市 */
  allowCity?: boolean;
  /** 允许选择地区 */
  allowDistrict?: boolean;
  /** 允许选择街道 */
  allowStreet?: boolean;
  /** 是否显示搜索框 */
  searchable?: boolean;
  /** 下拉框className */
  itemClassName?: SchemaClassName;
}

/**
 * InputColorControl 颜色选择器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/color
 */
export interface InputColorControlSchema extends FormBaseControl {
  /** 指定为 input-color 渲染器 */
  type: 'input-color';
  /** 是否显示清除按钮 */
  clearable?: boolean;
  /** 颜色格式 */
  format?: 'hex' | 'hexa' | 'rgb' | 'rgba' | 'hsl';
  /** 选中颜色后是否关闭弹出层 */
  closeOnSelect?: boolean;
  /** 预设颜色 */
  presetColors?: Array<{ label?: string; value?: string }>;
  /** 是否允许用户输入颜色 */
  allowCustomColor?: boolean;
  /** 弹窗容器选择器 */
  popOverContainerSelector?: string;
}

/**
 * InputSignatureControl 签名控件
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/signature
 */
export interface InputSignatureSchema extends FormBaseControl {
  /** 指定为 input-signature 渲染器 */
  type: 'input-signature';
  /** 组件宽度 */
  width?: number;
  /** 组件高度 */
  height?: number;
  /** 组件字段颜色 */
  color?: string;
  /** 组件背景颜色 */
  bgColor?: string;
  /** 清空按钮名称 */
  clearBtnLabel?: string;
  /** 清空按钮图标 */
  clearBtnIcon?: string;
  /** 撤销按钮名称 */
  undoBtnLabel?: string;
  /** 撤销按钮图标 */
  undoBtnIcon?: string;
  /** 确认按钮名称 */
  confirmBtnLabel?: string;
  /** 确认按钮图标 */
  confirmBtnIcon?: string;
  /** 是否内嵌 */
  embed?: boolean;
  /** 弹窗确认按钮名称 */
  embedConfirmLabel?: string;
  /** 弹窗确认按钮图标 */
  embedConfirmIcon?: string;
  /** 弹窗取消按钮名称 */
  embedCancelLabel?: string;
  /** 弹窗取消按钮图标 */
  embedCancelIcon?: string;
  /** 弹窗按钮图标 */
  embedBtnIcon?: string;
  /** 弹窗按钮文案 */
  embedBtnLabel?: string;
  /** 上传签名图片api */
  uploadApi?: SchemaApi;
}

/**
 * UUIDControl UUID 控件
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/uuid
 */
export interface UUIDControlSchema extends FormBaseControl {
  /** 指定为 uuid 渲染器 */
  type: 'uuid';
}

/**
 * TableControl 输入表格
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/input-table
 */
export interface TableControlSchema extends FormBaseControl {
  /** 指定为 input-table 渲染器 */
  type: 'input-table';
  /** 可新增 */
  addable?: boolean;
  /** 是否可以新增子项 */
  childrenAddable?: boolean;
  /** 可复制新增 */
  copyable?: boolean;
  /** 复制按钮文字 */
  copyBtnLabel?: string;
  /** 复制按钮图标 */
  copyBtnIcon?: string;
  /** 是否显示复制按钮 */
  copyAddBtn?: boolean;
  /** 复制的时候用来配置复制映射的数据 */
  copyData?: Record<string, unknown>;
  /** 是否可以拖拽排序 */
  draggable?: boolean;
  /** 新增 API */
  addApi?: SchemaApi;
  /** 新增按钮文字 */
  addBtnLabel?: string;
  /** 新增按钮图标 */
  addBtnIcon?: string;
  /** 孩子新增按钮文字 */
  subAddBtnLabel?: string;
  /** 孩子新增按钮图标 */
  subAddBtnIcon?: string;
  /** 可否删除 */
  removable?: boolean;
  /** 删除 API */
  deleteApi?: SchemaApi;
  /** 可否编辑 */
  editable?: boolean;
  /** 更新按钮名称 */
  editBtnLabel?: string;
  /** 更新按钮图标 */
  editBtnIcon?: string;
  /** 确认按钮文字 */
  confirmBtnLabel?: string;
  /** 确认按钮图标 */
  confirmBtnIcon?: string;
  /** 取消按钮文字 */
  cancelBtnLabel?: string;
  /** 取消按钮图标 */
  cancelBtnIcon?: string;
  /** 删除按钮文字 */
  deleteBtnLabel?: string;
  /** 删除按钮图标 */
  deleteBtnIcon?: string;
  /** 更新 API */
  updateApi?: SchemaApi;
  /** 初始值，新增的时候 */
  scaffold?: Record<string, unknown>;
  /** 删除确认文字 */
  deleteConfirmText?: string;
  /** 值字段 */
  valueField?: string;
  /** 是否为确认的编辑模式 */
  needConfirm?: boolean;
  /** 是否可以访问父级数据 */
  canAccessSuperData?: boolean;
  /** 是否显示序号 */
  showIndex?: boolean;
  /** 分页个数，默认不分页 */
  perPage?: number;
  /** 限制最大个数 */
  maxLength?: number | string;
  /** 限制最小个数 */
  minLength?: number | string;
  /** 是否显示底部新增按钮 */
  showFooterAddBtn?: boolean;
  /** 是否显示表格操作栏新增按钮 */
  showTableAddBtn?: boolean;
  /** 底部新增按钮配置 */
  footerAddBtn?: unknown;
  /** 是否开启 static 状态切换 */
  enableStaticTransform?: boolean;
  /** 底部工具栏CSS样式类 */
  toolbarClassName?: SchemaClassName;
  /** 自定义搜索匹配函数 */
  matchFunc?: string | unknown;
  /** 列配置 */
  columns?: unknown[];
}

/**
 * RatingControl 评分控件
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/rating
 */
export interface RatingControlSchema extends FormBaseControl {
  /** 指定为 rating 渲染器 */
  type: 'rating';
  /** 星星总数 */
  count?: number;
  /** 是否允许半星 */
  half?: boolean;
  /** 自定义字符 */
  char?: string;
  /** 星星大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 未选中颜色 */
  inactiveColor?: string;
  /** 选中颜色 */
  colors?: Record<string, string>;
  /** 自定义图标 */
  icon?: string;
}

/**
 * RangeControl 滑块控件
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/input-range
 */
export interface RangeControlSchema extends FormBaseControl {
  /** 指定为 input-range 渲染器 */
  type: 'input-range';
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 步长 */
  step?: number;
  /** 是否显示步长刻度 */
  showSteps?: boolean;
  /** 是否显示滑块标签 */
  showLabel?: boolean;
  /** 自定义滑块标签 */
  tipFormatter?: string;
  /** 是否显示输入框 */
  showInput?: boolean;
  /** 是否显示刻度 */
  marks?: Record<string, string | { style?: Record<string, unknown>; label?: string }>;
  /** 单位 */
  unit?: string;
  /** 是否多选 (范围) */
  multiple?: boolean;
}

/**
 * DiffControl 差异对比控件
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/diff
 */
export interface DiffControlSchema extends FormBaseControl {
  /** 指定为 diff 渲染器 */
  type: 'diff';
  /** 语言 */
  language?: string;
  /** 旧值字段 */
  diffValue?: string;
  /** 主题 */
  theme?: string;
  /** 背景 */
  gutter?: boolean;
}

/**
 * FormulaControl 公式编辑器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/formula
 */
export interface FormulaControlSchema extends FormBaseControl {
  /** 指定为 formula 渲染器 */
  type: 'formula';
  /** 公式 */
  formula?: string;
  /** 自动填充 */
  autoSet?: boolean;
  /** 变量 */
  variables?: Array<{ label: string; value: string }>;
  /** 允许输入 */
  allowInput?: boolean;
  /** 评估模式 */
  evalMode?: boolean;
}
