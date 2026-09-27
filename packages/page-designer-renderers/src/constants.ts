/**
 * 画布 DOM marker 约定（S1 §5.2）与拖拽 MIME。
 *
 * - `nop-page-designer-canvas`：画布根（class）；
 * - `data-psid`：节点锚点属性（编辑态专属，编辑装配投影）；
 * - `data-page-designer-overlay`：覆盖层根；
 * - `data-drop-hint="inside|before|after|invalid"`：插入指示。
 */

/** palette 拖拽 MIME（HTML5 dataTransfer 通道）。 */
export const PAGE_DESIGNER_DRAG_MIME = 'application/x-nop-page-designer';

/** 画布根 class（S1 §5.2 marker 约定）。 */
export const PAGE_DESIGNER_CANVAS_CLASS = 'nop-page-designer-canvas';

/** 节点锚点属性（S1 §5.2：`data-psid="<SessionNodeId>"`）。 */
export const NODE_ANCHOR_ATTRIBUTE = 'data-psid';

/**
 * 编辑装配投影通道：运行时 meta.testid 是既有 frame 通道（field-frame/auto-renderer
 * 均投影 `data-testid`），编辑装配把 `xui:sid` 投影为 `testid`，桥再把
 * `[data-testid^="psid-"]` 同步为 `data-psid` 锚点属性。仅编辑态装配，预览态剥离。
 */
export const ANCHOR_TESTID_PREFIX = 'psid-';
