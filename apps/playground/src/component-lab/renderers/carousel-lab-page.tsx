import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import {
  c6c4CarouselAutoSchema,
  c6c4CarouselCtrlSchema,
  registerC6c4Probe,
} from './data-c6c4-host';

const basicCarousel = {
  type: 'page',
  body: [
    {
      type: 'carousel',
      testid: 'demo-carousel-lab',
      items: [
        { image: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120"><rect width="100%" height="100%" fill="#6366f1"/><text x="50%" y="55%" fill="white" font-size="16" text-anchor="middle">Lab 1</text></svg>'), title: 'Lab first' },
        { image: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120"><rect width="100%" height="100%" fill="#10b981"/><text x="50%" y="55%" fill="white" font-size="16" text-anchor="middle">Lab 2</text></svg>'), title: 'Lab second' },
      ],
    },
  ],
};

export function CarouselLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Carousel renderer: embla-backed slides with image/title/caption, indicators and prev/next controls; external component handles (next/prev/setValue) and WCAG 2.2.2 autoplay with hover/focus/offscreen/reduced-motion pauses."
      scenarios={[
        {
          title: 'Basic carousel with slides and indicators',
          description: 'Two data-URI slides with titles, indicators and prev/next controls.',
          schema: basicCarousel,
          data: {},
        },
        {
          title: 'Host carousel external control + onChange payload (C6.4)',
          description:
            'C6.4 Phase 3 host-carousel-ctrl: component:next/prev/setValue buttons drive the active slide and the onChange action args read ${activeIndex} (evaluationBindings) and ${slides.length} (scope).',
          schema: c6c4CarouselCtrlSchema,
          data: {},
          onActionScopeChange: registerC6c4Probe,
        },
        {
          title: 'Host carousel autoplay toggle (C6.4)',
          description:
            'C6.4 Phase 3 host-carousel-auto: autoPlay scope toggle starts/stops interval-driven advancement.',
          schema: c6c4CarouselAutoSchema,
          data: {},
          onActionScopeChange: registerC6c4Probe,
        },
      ]}
    />
  );
}
