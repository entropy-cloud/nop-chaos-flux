import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import type { RendererEnv } from '@nop-chaos/flux-core';

const resizableDemo = {
  type: 'page',
  body: [
    {
      type: 'resizable',
      testid: 'demo-resizable',
      direction: 'horizontal',
      persistStatePath: '$layout.resizableDemo',
      panels: [
        {
          key: 'left',
          defaultSize: 6,
          min: 2,
          max: 40,
          body: [{ type: 'text', text: 'Left panel (6%, clamp 2–40%; persisted to $layout.resizableDemo)' }],
        },
        { key: 'main', defaultSize: 60, min: 10, body: [{ type: 'text', text: 'Main panel (60%, min 10%)' }] },
        {
          key: 'side',
          defaultSize: 20,
          min: 10,
          body: [{ type: 'text', text: 'Side panel (20%, min 10%)' }],
        },
      ],
    },
  ],
};

const resizableEnv = {
  fetcher: async <T,>() => ({ status: 0, data: null as T }),
} as unknown as Partial<RendererEnv>;

export function ResizableLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Resizable layout: schema-driven split panes (L4.6) over the ui react-resizable-panels wrapper — drag the handle between panels; sizes persist to the declared scope path."
      scenarios={[
        {
          title: 'Three-pane split with persistence (L4.6 resizable)',
          description:
            'direction horizontal with min/max clamps; dragging a handle writes the size array to $layout.resizableDemo and it is seeded back on remount.',
          schema: resizableDemo,
          env: resizableEnv,
        },
      ]}
    />
  );
}
