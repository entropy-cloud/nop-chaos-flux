const CHART_COLOR_VARS = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'];

const FALLBACK_PALETTE = ['#2563eb', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
const FALLBACK_FOREGROUND = '#0f172a';
const FALLBACK_MUTED_FOREGROUND = '#64748b';
const FALLBACK_BORDER = '#e2e8f0';
const FALLBACK_POPOVER = '#ffffff';

const COLOR_FUNCTION_PREFIX = /^(#|rgb|hsl|color\(|lab\(|lch\(|oklab\(|oklch\()/i;

function readCssVar(name: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw ? raw : undefined;
}

function readColor(name: string, fallback: string): string {
  const raw = readCssVar(name);
  if (!raw) {
    return fallback;
  }
  return COLOR_FUNCTION_PREFIX.test(raw) ? raw : `hsl(${raw})`;
}

/**
 * flux 注册主题：recharts 侧的 CSS 变量 token 体系（`hsl(var(--chart-1..5))`、
 * --foreground/--muted-foreground/--border/--popover/--popover-foreground）映射为
 * ECharts 主题对象，使双渲染器视觉一致。CSS 变量为 shadcn HSL 通道值约定，
 * 消费时包 `hsl(...)`；变量缺失（SSR/jsdom/未注入 token 的宿主）回退静态调色板。
 * 主题在 echarts-setup 模块加载时经 `registerTheme('flux', ...)` 注册，init 时
 * 解析——CSS 变量运行时切换需重挂载图表（与「CSS variables + stable class names」
 * 架构现状一致）。
 */
export function resolveFluxEChartsTheme(): Record<string, unknown> {
  return {
    color: CHART_COLOR_VARS.map((name, index) =>
      readColor(name, FALLBACK_PALETTE[index % FALLBACK_PALETTE.length]),
    ),
    textStyle: {
      color: readColor('--foreground', FALLBACK_FOREGROUND),
      fontFamily:
        "inter, -apple-system, blinkmacsystemfont, 'Segoe UI', roboto, 'Helvetica Neue', arial, sans-serif",
    },
    legend: {
      textStyle: { color: readColor('--muted-foreground', FALLBACK_MUTED_FOREGROUND) },
    },
    categoryAxis: {
      axisLine: { lineStyle: { color: readColor('--border', FALLBACK_BORDER) } },
      axisTick: { lineStyle: { color: readColor('--border', FALLBACK_BORDER) } },
      axisLabel: { color: readColor('--muted-foreground', FALLBACK_MUTED_FOREGROUND) },
      splitLine: { lineStyle: { color: readColor('--border', FALLBACK_BORDER) } },
    },
    valueAxis: {
      axisLine: { lineStyle: { color: readColor('--border', FALLBACK_BORDER) } },
      axisTick: { lineStyle: { color: readColor('--border', FALLBACK_BORDER) } },
      axisLabel: { color: readColor('--muted-foreground', FALLBACK_MUTED_FOREGROUND) },
      splitLine: { lineStyle: { color: readColor('--border', FALLBACK_BORDER) } },
    },
    tooltip: {
      backgroundColor: readColor('--popover', FALLBACK_POPOVER),
      borderColor: readColor('--border', FALLBACK_BORDER),
      borderWidth: 1,
      textStyle: {
        color: readColor('--popover-foreground', FALLBACK_FOREGROUND),
      },
    },
  };
}
