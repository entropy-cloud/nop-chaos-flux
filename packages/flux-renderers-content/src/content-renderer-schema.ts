import type {
  SeparatorSchema,
  SpinnerSchema,
  ProgressSchema,
  EmptySchema,
  CardSchema,
  LinkSchema,
  ImageSchema,
  JsonViewSchema,
  MarkdownSchema,
  HtmlSchema,
  CardsSchema,
  AlertSchema,
  AmountInWordsSchema,
  MappingSchema,
  StatusSchema,
  AudioSchema,
  VideoSchema,
  CarouselSchema,
  QrCodeSchema,
  ResultSchema,
  DiffViewSchema,
} from './schemas.js';

export type ContentRendererSchema =
  | SeparatorSchema
  | SpinnerSchema
  | ProgressSchema
  | EmptySchema
  | CardSchema
  | LinkSchema
  | ImageSchema
  | JsonViewSchema
  | MarkdownSchema
  | HtmlSchema
  | CardsSchema
  | AlertSchema
  | AmountInWordsSchema
  | MappingSchema
  | StatusSchema
  | AudioSchema
  | VideoSchema
  | CarouselSchema
  | QrCodeSchema
  | ResultSchema
  | DiffViewSchema;
