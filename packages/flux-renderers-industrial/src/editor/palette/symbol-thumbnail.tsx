import type { ScadaSymbolCategory } from '../../symbols/symbol-types.js';

interface SymbolThumbnailProps {
  type: string;
  category?: ScadaSymbolCategory;
}

type IconPaths = { stroke: string[]; fill?: string[]; extra?: string[] };

/**
 * 形状级缩略图（ux-r10 SC-2）：palette 条目的几何预览，非逐图元精绘。
 * type 后缀 → SVG path 映射；未命中按 category 兜底，再退化为通用方块。
 */
const ICONS: Record<string, IconPaths> = {
  rect: { stroke: ['M2 4h20v12H2z'] },
  'round-rect': { stroke: ['M4 4h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'] },
  ellipse: { stroke: ['M12 3a9 7 0 1 0 0 14 9 7 0 1 0 0-14z'] },
  line: { stroke: ['M2 12L22 12'] },
  arrow: { stroke: ['M2 16L16 16M16 16l-4-4M16 16l-4 4'], extra: ['M2 12h8v8H2z'] },
  polygon: { stroke: ['M12 3l8 6-3 9H7L4 9z'] },
  text: { stroke: ['M4 5h16M12 5v14M8 19h8'] },
  image: { stroke: ['M2 4h20v12H2z'], extra: ['M6 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM4 16l5-5 4 4 3-3 4 4'] },
  video: { stroke: ['M2 4h14v12H2z'], extra: ['M16 8l6-3v10l-6-3'] },
  group: { stroke: ['M2 2h8v8H2zM14 10h8v8h-8z'], extra: ['M6 6h2v2H6z M18 14h2v2h-2z'] },
  pipe: { stroke: ['M2 9h20M2 15h20M2 9v6M22 9v6'] },
  'pipe-junction': { stroke: ['M2 9h20M2 15h20M12 2v20'], extra: ['M9 9a3 3 0 1 0 6 0 3 3 0 0 0-6 0zM9 15a3 3 0 1 0 6 0 3 3 0 0 0-6 0z'] },
  motor: { stroke: ['M4 5h12a4 4 0 0 1 4 4v2a4 4 0 0 1-4 4H4z'], extra: ['M2 5v10M18 9l4-3v8l-4-3'] },
  pump: { stroke: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z'], extra: ['M12 7v5l4 2M2 20h6'] },
  valve: { stroke: ['M3 8l9 4 9-4M12 12v8'], extra: ['M8 20h8M6 6h12'] },
  fan: { stroke: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z'], extra: ['M12 12c-4-1-5-4-4-7 3 0 5 3 4 7zM12 12c1-4 4-5 7-4 0 3-3 5-7 4zM12 12c4 1 5 4 4 7-3 0-5-3-4-7zM12 12c-1 4-4 5-7 4 0-3 3-5 7-4z'] },
  gauge: { stroke: ['M3 17a9 9 0 1 1 18 0'], extra: ['M12 17l4-6M4 17h2M18 17h2'] },
  level: { stroke: ['M4 3h16v14H4z'], extra: ['M4 11h16M7 13v2M11 13v2M15 13v2'] },
  thermometer: { stroke: ['M10 3h4v10a4 4 0 1 1-4 0z'], extra: ['M12 8v7'] },
  progress: { stroke: ['M2 9h20v6H2z'], extra: ['M4 11h9v2H4z'] },
  switch: { stroke: ['M3 8a5 5 0 0 1 5-5h8a5 5 0 0 1 0 10H8a5 5 0 0 1-5-5z'], extra: ['M16 8m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0'] },
  button: { stroke: ['M4 6h16v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z'], extra: ['M8 10h8'] },
  indicator: { stroke: ['M12 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12z'], extra: ['M5 2L7 5M19 2l-2 3M2 10h3M19 10h3'] },
  sensor: { stroke: ['M8 3h8v6a4 4 0 0 1-8 0z', 'M12 13v4'], extra: ['M8 20h8M10 6h4'] },
};

const CATEGORY_ICONS: Record<ScadaSymbolCategory, IconPaths> = {
  shape: { stroke: ['M2 4h20v12H2z'] },
  device: { stroke: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z'], extra: ['M12 8v4l3 2'] },
  instrument: { stroke: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z'], extra: ['M12 17l4-6'] },
  'sensor-control': { stroke: ['M3 8a5 5 0 0 1 5-5h8a5 5 0 0 1 0 10H8a5 5 0 0 1-5-5z'] },
  pipe: { stroke: ['M2 9h20M2 15h20M2 9v6M22 9v6'] },
};

function resolveIcon(type: string, category: ScadaSymbolCategory | undefined): IconPaths {
  const suffix = type.replace(/^scada-/, '').replace(/^(device|instrument|sensor-control|pipe)-/, '');
  const specific = ICONS[suffix];
  if (specific) return specific;
  if (category && CATEGORY_ICONS[category]) return CATEGORY_ICONS[category];
  return CATEGORY_ICONS.shape;
}

export function SymbolThumbnail({ type, category }: SymbolThumbnailProps) {
  const icon = resolveIcon(type, category);
  return (
    <span
      data-slot="scada-palette-thumb"
      className="nop-scada-editor-palette-thumb"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 20" width={26} height={20} fill="none">
        {icon.stroke.map((d) => (
          <path key={`s-${d}`} d={d} stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {(icon.extra ?? []).map((d) => (
          <path key={`e-${d}`} d={d} stroke="currentColor" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} />
        ))}
      </svg>
    </span>
  );
}
