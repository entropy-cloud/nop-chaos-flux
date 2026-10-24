import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const horizontalCompare = {
  type: 'page',
  body: [
    {
      type: 'image-compare',
      testid: 'demo-image-compare',
      before:
        'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=800&q=60',
      after:
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=60',
      alt: 'Before and after',
      defaultPosition: 50,
      orientation: 'horizontal',
    },
    { type: 'text', text: '拖动分隔线（或聚焦手柄后使用方向键）对比双图。' },
  ],
};

const verticalCompare = {
  type: 'page',
  body: [
    {
      type: 'image-compare',
      testid: 'demo-image-compare-vertical',
      before:
        'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=800&q=60',
      after:
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=60',
      alt: 'Before and after (vertical)',
      defaultPosition: 35,
      orientation: 'vertical',
    },
  ],
};

export function ImageCompareLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Before/after dual-image compare slider. Drag the divider (or use arrow keys on the handle, role=slider) to reveal the overlay image; per-side load failure degrades independently."
      scenarios={[
        {
          title: 'Horizontal compare slider',
          description:
            'Drag the divider left/right — the before layer is clipped via clip-path; ArrowLeft/Right move 1%, PageUp/Down 10%, Home/End jump to edges.',
          schema: horizontalCompare,
        },
        {
          title: 'Vertical compare slider',
          description: 'orientation=vertical pairs ArrowUp/ArrowDown and crops from the top.',
          schema: verticalCompare,
        },
      ]}
    />
  );
}
