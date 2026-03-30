import type { Extension } from '@codemirror/state';
import { StreamLanguage } from '@codemirror/language';
import { autocompletion } from '@codemirror/autocomplete';
import type { StringStream } from '@codemirror/language';
import { expressionCompletionSource } from './completion';
import type { VariableItem, FuncGroup } from '../../types';

const templateTokenizer = {
  name: 'template',

  startState() {
    return { inExpr: false, braceDepth: 0 };
  },

  token(stream: StringStream, state: { inExpr: boolean; braceDepth: number }) {
    if (!state.inExpr) {
      if (stream.match('${')) {
        state.inExpr = true;
        state.braceDepth = 1;
        return 'meta';
      }
      stream.next();
      return null;
    }

    if (stream.match('}')) {
      state.braceDepth--;
      if (state.braceDepth === 0) {
        state.inExpr = false;
        return 'meta';
      }
      return 'punctuation';
    }

    if (stream.match('${')) {
      state.braceDepth++;
      return 'meta';
    }

    if (stream.match(/^(?:true|false|null|undefined)\b/)) {
      return 'atom';
    }

    if (stream.match(/^\d+(\.\d+)?\b/)) {
      return 'number';
    }

    if (stream.match(/^"(?:[^"\\]|\\.)*"/)) {
      return 'string';
    }

    if (stream.match(/^'(?:[^'\\]|\\.)*'/)) {
      return 'string';
    }

    if (stream.match(/^\/\/.*/)) {
      return 'lineComment';
    }

    if (stream.match(/^\/\*/)) {
      while (!stream.eol()) {
        if (stream.match('*/')) break;
        stream.next();
      }
      return 'blockComment';
    }

    if (stream.match(/^(?:function|return|var|let|const|if|else|for|while|do|switch|case|break|continue|new|typeof|instanceof|in|of|throw|try|catch|finally|class|extends|import|export|default|void|delete|yield|async|await)\b/)) {
      return 'keyword';
    }

    if (stream.match(/^\w+/)) {
      return 'variableName';
    }

    if (stream.match(/^[+\-*/%=<>!&|^~?:]/)) {
      return 'operator';
    }

    if (stream.match(/^[()[\],;.]/)) {
      return 'punctuation';
    }

    stream.next();
    return null;
  },

  blankLine(state: { inExpr: boolean; braceDepth: number }) {
    void state;
  },
};

export function createTemplateModeExtension(
  variables: VariableItem[],
  functions: FuncGroup[],
): Extension {
  const lang = StreamLanguage.define(templateTokenizer);

  const completion = autocompletion({
    override: [
      (context: import('@codemirror/autocomplete').CompletionContext) => {
        const pos = context.pos;
        const text = context.state.doc.sliceString(0, pos);
        let depth = 0;
        let insideInterpolation = false;

        for (let i = text.length - 1; i >= 0; i--) {
          if (i >= 1 && text[i - 1] === '$' && text[i] === '{') {
            depth++;
            if (depth > 0) {
              insideInterpolation = true;
            }
            i--;
            continue;
          }
          if (text[i] === '}') {
            depth--;
            if (depth <= 0) {
              insideInterpolation = false;
              break;
            }
          }
        }

        if (!insideInterpolation) return null;

        return expressionCompletionSource(variables, functions)(context);
      },
    ],
  });

  return [lang, completion];
}
