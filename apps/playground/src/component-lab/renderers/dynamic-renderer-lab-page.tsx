import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const dynamicRendererEnv = {
  fetcher: async <T,>(api: { url?: string; params?: { schemaType?: string } }) => {
    if (api.url === '/api/component-lab/dynamic-renderer/static-schema') {
      return {
        ok: true,
        status: 200,
        data: {
          type: 'badge',
          text: 'Rendered from schemaApi',
          level: 'info'
        } as T
      };
    }

    if (api.url === '/api/component-lab/dynamic-renderer/by-type') {
      return {
        ok: true,
        status: 200,
        data: {
          type: 'badge',
          text: 'Dynamically rendered badge',
          level: 'success'
        } as T
      };
    }

    if (api.url === '/api/component-lab/dynamic-renderer/by-type/text') {
      return {
        ok: true,
        status: 200,
        data: { type: 'text', text: 'Dynamically rendered text content.' } as T
      };
    }

    if (api.url === '/api/component-lab/dynamic-renderer/by-type/button') {
      return {
        ok: true,
        status: 200,
        data: { type: 'button', label: 'A button from dynamic schema', variant: 'secondary' } as T
      };
    }

    return {
      ok: true,
      status: 200,
      data: null as T
    };
  }
};

const staticFromApi = {
  type: 'page',
  body: [
    { type: 'text', text: 'The dynamic-renderer loads its schema from schemaApi at runtime.' },
    {
      type: 'dynamic-renderer',
      schemaApi: {
        url: '/api/component-lab/dynamic-renderer/static-schema'
      },
      body: {
        type: 'text',
        text: 'Loading dynamic schema...'
      }
    }
  ]
};

const schemaSwitcher = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'row',
      gap: 2,
      body: [
        {
          type: 'button',
          label: 'Show Badge',
          variant: 'outline',
          onClick: {
            action: 'setValue',
            args: { path: 'schemaType', value: 'badge' }
          }
        },
        {
          type: 'button',
          label: 'Show Text',
          variant: 'outline',
          onClick: {
            action: 'setValue',
            args: { path: 'schemaType', value: 'text' }
          }
        },
        {
          type: 'button',
          label: 'Show Button',
          variant: 'outline',
          onClick: {
            action: 'setValue',
            args: { path: 'schemaType', value: 'button' }
          }
        }
      ]
    },
    { type: 'text', text: 'Currently rendering: ${schemaType ?? "(none)"}' },
    {
      type: 'dynamic-renderer',
      schemaApi: {
        url: '${schemaType === "text" ? "/api/component-lab/dynamic-renderer/by-type/text" : schemaType === "button" ? "/api/component-lab/dynamic-renderer/by-type/button" : "/api/component-lab/dynamic-renderer/by-type"}'
      },
      body: {
        type: 'text',
        text: 'Loading switched schema...'
      }
    }
  ]
};

export function DynamicRendererLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Renders a schema node loaded at runtime through schemaApi. Suitable for delayed or remote schema assembly, not direct scope-injected schema objects."
      scenarios={[
        {
          title: 'Static schema loaded through schemaApi',
          description: 'The renderer shows a loading placeholder first, then replaces it with the schema returned by schemaApi.',
          schema: staticFromApi,
          env: dynamicRendererEnv
        },
        {
          title: 'Runtime schema switching via buttons',
          description: 'Click a button to update schemaType in scope. schemaApi re-runs and the dynamic-renderer swaps to the returned schema fragment.',
          schema: schemaSwitcher,
          data: {
            schemaType: 'badge'
          },
          env: dynamicRendererEnv
        }
      ]}
    />
  );
}
