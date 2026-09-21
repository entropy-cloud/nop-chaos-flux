import {
  EditorZone,
  ListStyle,
  ListType,
  PageMode,
  PaperDirection,
  RowFlex,
  TitleLevel,
} from '@hufe921/canvas-editor';
import type {
  ICatalog,
  ICatalogItem,
  IEditorData,
  IEditorOption,
  IEditorResult,
  IElement,
  IRangeStyle,
  IWatermark,
} from '@hufe921/canvas-editor';

export {
  EditorZone,
  RowFlex,
  TitleLevel,
  ListType,
  ListStyle,
  PageMode,
  PaperDirection,
};

export type WordEditorElement = IElement;
export type WordEditorData = IEditorData;
export type WordEditorResult = IEditorResult;
export type WordEditorRangeStyle = IRangeStyle;
export type WordEditorWatermark = IWatermark;
export type WordEditorCatalog = ICatalog;
export type WordEditorCatalogItem = ICatalogItem;
export type { IEditorOption };
