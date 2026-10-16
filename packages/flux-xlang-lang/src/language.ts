import { bracketMatching, LRLanguage, LanguageSupport, foldNodeProp, indentNodeProp } from '@codemirror/language';
import { styleTags, tags as t } from '@lezer/highlight';
import type { LRParser } from '@lezer/lr';
import { parser } from '../generated/xlang.parser.js';

// lezer-generator 不产 d.ts：shim 类型抽象为 Parser，运行时形态为 LRParser
const configurableParser = parser as unknown as LRParser;

const parserWithMetadata = configurableParser.configure({
  props: [
    styleTags({
      ImportStatement: t.namespace,
      LetStatement: t.definitionKeyword,
      FunctionDeclaration: t.definition(t.variableName),
      IfStatement: t.controlKeyword,
      ForStatement: t.controlKeyword,
      WhileStatement: t.controlKeyword,
      ReturnStatement: t.controlKeyword,
      KwNew: t.operatorKeyword,
      KwAwait: t.controlKeyword,
      KwOf: t.controlKeyword,
      KwTrue: t.bool,
      KwFalse: t.bool,
      KwNull: t.null,
      LineComment: t.lineComment,
      BlockComment: t.blockComment,
      StringLiteral: t.string,
      TemplateString: t.special(t.string),
      MacroExpr: t.macroName,
      Number: t.number,
      BinaryOp: t.operator,
      AssignOp: t.operator,
      UpdateOp: t.operator,
      UnaryOp: t.operator,
      'Identifier': t.variableName,
      propertyName: t.propertyName,
    }),
    foldNodeProp.add({
      Block: (node) => ({ from: node.from + 1, to: node.to - 1 }),
      FunctionDeclaration: (node) => ({ from: node.from + 1, to: node.to - 1 }),
      IfStatement: (node) => ({ from: node.from + 1, to: node.to - 1 }),
    }),
    indentNodeProp.add({
      Block: (context) => context.unit,
    }),
  ],
});

const xlangLanguage = LRLanguage.define({
  name: 'xlang',
  // pnpm 隔离下 @lezer/lr 可能存在多实例（XL 直依赖与 @codemirror/language 传递依赖
  // 版本不同）——LRParser 无私有品牌，结构等价，define 入口处跨实例收窄
  parser: parserWithMetadata as unknown as Parameters<typeof LRLanguage.define>[0]['parser'],
  languageData: {
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
    indentOnInput: /^\s*[}\]]$/,
    closeBrackets: { brackets: ['(', '[', '{', "'", '"'] },
  },
});

/**
 * XLang script 层语言支持（plan 616，D5 §3.3）：parser + 高亮样式映射 + 折叠 +
 * 缩进 + 注释 token。closeBrackets 属 flux-code-editor 全局基础扩展，不在此重复。
 */
export function xlang(): LanguageSupport {
  return new LanguageSupport(xlangLanguage, bracketMatching());
}

export { xlangLanguage };
