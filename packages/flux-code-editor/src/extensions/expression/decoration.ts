import { Decoration, ViewPlugin, type PluginValue, type ViewUpdate, WidgetType, EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { RangeSetBuilder } from '@codemirror/state';
import type { VariableItem } from '../../types';

class FriendlyNameWidget extends WidgetType {
  constructor(
    readonly label: string,
    readonly rawValue: string,
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'nop-code-editor-friendly-name';
    span.textContent = this.label;
    span.title = this.rawValue;
    span.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    span.style.borderRadius = '3px';
    span.style.padding = '0 3px';
    span.style.whiteSpace = 'nowrap';
    return span;
  }

  eq(other: FriendlyNameWidget): boolean {
    return this.label === other.label && this.rawValue === other.rawValue;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

function buildVariableMap(variables: VariableItem[]): Map<string, VariableItem> {
  const map = new Map<string, VariableItem>();
  const flatten = (items: VariableItem[]) => {
    for (const item of items) {
      map.set(item.value, item);
      if (item.children?.length) {
        flatten(item.children);
      }
    }
  };
  flatten(variables);
  return map;
}

function createFriendlyNamePlugin(variables: VariableItem[]): Extension {
  const varMap = buildVariableMap(variables);
  if (varMap.size === 0) return [];

  const sortedPaths = Array.from(varMap.keys()).sort((a, b) => b.length - a.length);

  return ViewPlugin.fromClass(
    class FriendlyNamePluginValue implements PluginValue {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.focusChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        if (view.hasFocus) {
          return Decoration.none;
        }

        const doc = view.state.doc.toString();
        const builder = new RangeSetBuilder<Decoration>();

        const matches: { from: number; to: number; label: string; value: string }[] = [];

        for (const path of sortedPaths) {
          const item = varMap.get(path)!;
          let searchFrom = 0;
          while (searchFrom < doc.length) {
            const idx = doc.indexOf(path, searchFrom);
            if (idx === -1) break;

            const overlaps = matches.some(
              m => (idx >= m.from && idx < m.to) || (idx + path.length > m.from && idx + path.length <= m.to),
            );
            if (!overlaps) {
              matches.push({ from: idx, to: idx + path.length, label: item.label, value: item.value });
            }
            searchFrom = idx + 1;
          }
        }

        matches.sort((a, b) => a.from - b.from);

        for (const m of matches) {
          builder.add(
            m.from,
            m.to,
            Decoration.replace({
              widget: new FriendlyNameWidget(m.label, m.value),
            }),
          );
        }

        return builder.finish();
      }
    },
    { decorations: (v) => v.decorations },
  );
}

type DecorationSet = import('@codemirror/state').RangeSet<import('@codemirror/view').Decoration>;

export function createFriendlyNameDecoration(variables: VariableItem[]): Extension {
  if (!variables.length) return [];
  return createFriendlyNamePlugin(variables);
}
