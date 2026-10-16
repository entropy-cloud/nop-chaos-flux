import { Facet } from '@codemirror/state';

/**
 * 当前文档的 sourcePath 锚点（plan 617 F3：CM 文档无内建元数据，装配层 item 19
 * 经 extensions 提供值；扩展以此过滤 store 下行数据——不匹配即不落地装饰/标记）。
 */
export const sourcePathFacet: Facet<string, string> = Facet.define({
  combine: (values) => (values.length ? values[values.length - 1] : ''),
});
