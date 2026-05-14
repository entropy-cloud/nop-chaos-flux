import React from 'react';
import { FormContext } from '../contexts.js';
import { useRenderScope, useScopeSelector } from '../hooks.js';

export const containerRenderer = {
  type: 'container',
  component: (props: { regions: { body?: { render(): React.ReactNode } } }) => (
    <div>{props.regions.body?.render()}</div>
  ),
  fields: [{ key: 'body', kind: 'region' as const, regionKey: 'body' }],
};

export const importedSummaryProbeRenderer = {
  type: 'imported-summary-probe',
  component: function ImportedSummaryProbe() {
    const name = useScopeSelector(
      (data: { summary?: { name?: string } }) => data.summary?.name ?? '',
      Object.is,
      { paths: ['summary.name'] },
    );
    const status = useScopeSelector(
      (data: { summary?: { status?: string } }) => data.summary?.status ?? '',
      Object.is,
      { paths: ['summary.status'] },
    );

    return (
      <div>
        <span data-testid="import-probe-name">{name}</span>
        <span data-testid="import-probe-status">{status}</span>
      </div>
    );
  },
};

export const importedLocalStateHostRenderer = {
  type: 'imported-local-state-host',
  component: function ImportedLocalStateHost(props: {
    regions: { body?: { render(): React.ReactNode } };
  }) {
    const currentForm = React.useContext(FormContext);
    const [, bumpTick] = React.useReducer((value: number) => value + 1, 0);

    return (
      <div>
        {props.regions.body?.render()}
        <button
          type="button"
          onClick={() => {
            currentForm?.setValues({
              'summary.name': 'Changed Name',
              'summary.status': 'published',
            });
            bumpTick();
          }}
        >
          Update imported host summary
        </button>
      </div>
    );
  },
  fields: [{ key: 'body', kind: 'region' as const, regionKey: 'body' }],
};

export const detailViewLikeRenderer = {
  type: 'detail-view-like',
  component: function DetailViewLike(props: {
    regions: { viewer?: { render(): React.ReactNode } };
  }) {
    const currentForm = React.useContext(FormContext);
    const [, bumpTick] = React.useReducer((value: number) => value + 1, 0);

    return (
      <div>
        <div data-testid="detail-like-viewer">{props.regions.viewer?.render()}</div>
        <button
          type="button"
          onClick={() => {
            currentForm?.setValues({
              'summary.name': 'Changed Name',
              'summary.status': 'published',
            });
            bumpTick();
          }}
        >
          Confirm detail-like edit
        </button>
      </div>
    );
  },
  fields: [{ key: 'viewer', kind: 'region' as const, regionKey: 'viewer' }],
};

export const asyncPublisherRenderer = {
  type: 'async-scope-publisher',
  component: function AsyncScopePublisher() {
    const scope = useRenderScope();

    React.useEffect(() => {
      void Promise.resolve().then(() => {
        scope.update('user', { name: 'Alice' });
      });
    }, [scope]);

    return null;
  },
};

export const asyncPublisherWithRefreshRenderer = {
  type: 'async-scope-publisher-with-refresh',
  component: function AsyncScopePublisherWithRefresh(props: any) {
    const scope = useRenderScope();

    React.useEffect(() => {
      props.helpers.dispatch({ action: 'refreshTable' });
      void Promise.resolve().then(() => {
        scope.update('user', { name: 'Alice' });
      });
    }, [props.helpers, scope]);

    return null;
  },
};
