import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c6c1ImageLifecycleSchema } from './data-c6c1-host';
import type { RendererEnv } from '@nop-chaos/flux-core';

const DATA_URI_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="100%" height="100%" fill="#6366f1"/><text x="50%" y="55%" fill="white" font-size="14" text-anchor="middle">demo</text></svg>',
  );

const basicImage = {
  type: 'page',
  body: [
    {
      type: 'image',
      testid: 'demo-image-lab',
      src: DATA_URI_IMAGE,
      alt: 'lab image',
      lazy: true,
      fit: 'cover',
      width: 160,
      height: 90,
    },
  ],
};

const fetcherImage = {
  type: 'page',
  body: [
    {
      type: 'image',
      testid: 'demo-image-lab-fetcher',
      alt: 'fetcher image',
      fetcher: { action: 'ajax', args: { url: '/api/protected-image' } },
      width: 160,
      height: 90,
    },
  ],
};

const protectedImageFetcher = (async (api: { url?: string }) => {
  if ((api.url ?? '').includes('protected-image')) {
    return { ok: true, status: 200, data: { url: DATA_URI_IMAGE } };
  }
  return { ok: true, status: 200, data: null };
}) as unknown as RendererEnv['fetcher'];

export function ImageLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Image display renderer: src/alt/title, object-fit, size, native lazy loading, click preview, error fallback, and the auth-protected fetcher mode (dispatch → data URI). Error state clears when src changes (retry)."
      scenarios={[
        {
          title: 'Basic image with lazy',
          description: 'Native loading=lazy on a data-URI source with cover fit.',
          schema: basicImage,
          data: {},
        },
        {
          title: 'Host image fail + retry on src update (C6.1 host-img-lifecycle)',
          description:
            'C6.1 Phase 3: a missing src shows the error fallback; switching the scope-bound src to a valid data URI clears the error and renders the image (no stuck fallback).',
          schema: c6c1ImageLifecycleSchema,
          data: { imgSrc: '/c6c1-does-not-exist.png' },
        },
        {
          title: 'Fetcher-backed image',
          description: 'fetcher dispatch returns {url} → rendered as the img src (auth-protected path).',
          schema: fetcherImage,
          data: {},
          env: { fetcher: protectedImageFetcher } as Partial<RendererEnv>,
        },
      ]}
    />
  );
}
