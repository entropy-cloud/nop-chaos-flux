import { useLayoutEffect, useMemo, useState } from 'react';

function isDevRuntime() {
  const importMeta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  return importMeta.env?.DEV === true;
}

type MeasurableCell = {
  dataset: DOMStringMap;
  getBoundingClientRect: () => { width: number; height: number; top: number; left: number };
};

type MeasurableTable = {
  querySelectorAll: (selector: string) => ArrayLike<MeasurableCell> | MeasurableCell[];
};

const COLUMN_WIDTH_KEY_SELECTOR = '[data-column-width-key]';

export function measureColumnWidthsFromTable(
  table: MeasurableTable | null | undefined,
): { widths: Map<string, number>; missingKeys: string[] } {
  const widths = new Map<string, number>();
  const missingKeys: string[] = [];

  if (!table?.querySelectorAll) {
    return { widths, missingKeys };
  }

  const cells = table.querySelectorAll(COLUMN_WIDTH_KEY_SELECTOR);
  for (const cell of Array.from(cells)) {
    const key = cell.dataset?.columnWidthKey;
    if (!key) {
      continue;
    }
    const width = cell.getBoundingClientRect()?.width ?? 0;
    if (Number.isFinite(width) && width > 0) {
      const rounded = Math.round(width);
      const previous = widths.get(key);
      if (previous === undefined || rounded > previous) {
        widths.set(key, rounded);
      }
    } else if (!widths.has(key)) {
      missingKeys.push(key);
    }
  }

  return { widths, missingKeys };
}

function sameWidths(a: Map<string, number>, b: Map<string, number>) {
  if (a.size !== b.size) {
    return false;
  }
  for (const [key, width] of a) {
    if (b.get(key) !== width) {
      return false;
    }
  }
  return true;
}

export function useTableColumnWidths(
  targetRef: { current: HTMLElement | null | undefined } | null | undefined,
  digest: unknown[],
) {
  const [widths, setWidths] = useState<Map<string, number>>(() => new Map());
  // digest 是调用方构造的「重测信号」数组（列显隐/列宽拖拽/容器可访问）。内容级序列化
  // 成稳定 key 作为 effect 依赖（useScopeSelector pathsKey 同款模式）——内容不变则
  // 无需重测，避免非字面量依赖数组触发 react-hooks/exhaustive-deps。
  const digestKey = useMemo(() => JSON.stringify(digest), [digest]);

  useLayoutEffect(() => {
    const table = targetRef?.current?.querySelector?.('table') ?? null;
    const { widths: nextWidths, missingKeys } = measureColumnWidthsFromTable(table);
    // 仅「部分失败」告警：全部缺失 = jsdom/happy-dom 无布局能力或首帧不可见的
    // 预期瞬态（digest 重测自愈），否则 playground 等 jsdom 测试渲染表格即告警
    // （plan 2026-08-09-1140-1 收口的 WIP 引入的噪音回归）。
    if (missingKeys.length > 0 && nextWidths.size > 0 && isDevRuntime()) {
      console.warn(
        `[flux-table] 列宽测量失败（首帧不可见或 jsdom）：${missingKeys.join(', ')}，回退声明宽/默认宽`,
      );
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 布局测量回填（fp-measure-resize）：同步读 DOM 布局后写回状态供 sticky 偏移/colgroup 使用，rAF 延迟会让固定列偏移晚一帧
    setWidths((previous) => (sameWidths(previous, nextWidths) ? previous : nextWidths));
  }, [digestKey, targetRef]);

  return widths;
}