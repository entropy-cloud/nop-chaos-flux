import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

let requestOwnedFetchCount = 0;
let clientModeFetchCount = 0;

const crudLabEnv = {
  fetcher: async <T,>(api: { url?: string }) => {
    if (api.url === '/api/mock/users') {
      requestOwnedFetchCount += 1;
      return {
        ok: true,
        status: 200,
        data: {
          items: [
            {
              id: requestOwnedFetchCount,
              name: `User-${requestOwnedFetchCount}`,
              owner: `Owner-${requestOwnedFetchCount}`,
              status: requestOwnedFetchCount % 2 === 0 ? 'draft' : 'active',
            },
          ],
          total: 42 + requestOwnedFetchCount,
        } as T,
      };
    }

    if (api.url === '/api/mock/client-mode') {
      clientModeFetchCount += 1;
      return {
        ok: true,
        status: 200,
        data: {
          items: [
            {
              id: clientModeFetchCount,
              name: `Client-${clientModeFetchCount}`,
              owner: `Owner-${clientModeFetchCount}`,
              status: clientModeFetchCount % 2 === 0 ? 'draft' : 'active',
            },
          ],
          total: clientModeFetchCount,
        } as T,
      };
    }

    return {
      ok: true,
      status: 200,
      data: null as T,
    };
  },
};

const records = [
  { id: 1, name: 'Alpha', status: 'active', owner: 'Alice', category: 'Platform' },
  { id: 2, name: 'Beta', status: 'draft', owner: 'Bob', category: 'Design' },
  { id: 3, name: 'Gamma', status: 'archived', owner: 'Carol', category: 'Ops' },
];

const basicCrud = {
  type: 'page',
  body: [
    {
      type: 'crud',
      source: '${records}',
      rowKey: 'id',
      columns: [
        { label: 'ID', name: 'id' },
        { label: 'Name', name: 'name', fixed: 'left', width: 160 },
        { label: 'Status', name: 'status' },
      ],
      toolbar: [{ type: 'button', label: 'Create' }],
    },
  ],
};

const queryCrud = {
  type: 'page',
  body: [
    {
      type: 'crud',
      source: '${records}',
      rowKey: 'id',
      selection: {},
      queryForm: {
        body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
      },
      footerToolbar: [{ type: 'text', text: 'Visible rows: ${$crud.itemCount}' }],
      toolbarLayout: {
        header: ['listActions', 'pagination'],
        footer: ['statistics', 'switch-per-page'],
      },
      toolbar: [{ type: 'button', label: 'Refresh' }],
      listActions: [{ type: 'button', label: 'Delete Selected' }],
      columnSettings: {
        enabled: true,
        overlay: false,
        align: 'left',
      },
      columns: [
        { label: 'ID', name: 'id', fixed: 'left', width: 120 },
        { label: 'Name', name: 'name', width: 180, searchable: true },
        {
          label: 'Owner',
          name: 'owner',
          width: 160,
          filterable: {
            options: [
              { label: 'Alice', value: 'Alice' },
              { label: 'Bob', value: 'Bob' },
              { label: 'Carol', value: 'Carol' },
            ],
          },
        },
        {
          type: 'operation',
          label: 'Actions',
          fixed: 'right',
          width: 180,
          buttons: [{ type: 'button', label: 'Inspect' }],
        },
      ],
    },
  ],
};

const responsiveCrud = {
  type: 'page',
  body: [
    {
      type: 'crud',
      source: '${records}',
      rowKey: 'id',
      responsive: {
        mode: 'expand',
        breakpoint: 1400,
        expandTrigger: 'row',
      },
      columns: [
        { label: 'Name', name: 'name', fixed: 'left', width: 180 },
        { label: 'Status', name: 'status' },
        { label: 'Owner', name: 'owner' },
        { label: 'Category', name: 'category' },
      ],
    },
  ],
};

const sourceResultCrud = {
  type: 'page',
  body: [
    {
      type: 'crud',
      source: '${pagedRecords}',
      rowKey: 'id',
      queryForm: {
        body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
      },
      footerToolbar: [
        { type: 'text', text: 'Visible rows: ${$crud.itemCount}; Total: ${$crud.total}' },
      ],
      columns: [
        { label: 'Name', name: 'name' },
        { label: 'Owner', name: 'owner' },
        { label: 'Status', name: 'status' },
      ],
    },
  ],
};

const requestOwnedCrud = {
  type: 'page',
  body: [
    {
      type: 'data-source',
      id: 'crud-users-source',
      name: 'pagedRecords',
      action: 'ajax',
      args: {
        url: '/api/mock/users',
      },
      initialData: {
        items: records,
        total: 42,
      },
    },
    {
      type: 'crud',
      id: 'request-owned-crud',
      source: '${pagedRecords}',
      onRefresh: {
        action: 'refreshSource',
        targetId: 'crud-users-source',
      },
      footerToolbar: [
        { type: 'text', text: 'Visible rows: ${$crud.itemCount}; Total: ${$crud.total}' },
      ],
      toolbar: [
        {
          type: 'button',
          label: 'Refresh source owner',
          onClick: {
            action: 'component:refresh',
            componentId: 'request-owned-crud',
          },
        },
      ],
      columns: [
        { label: 'Name', name: 'name' },
        { label: 'Owner', name: 'owner' },
        { label: 'Status', name: 'status' },
      ],
    },
  ],
};

const quickEditCrud = {
  type: 'page',
  body: [
    {
      type: 'crud',
      source: '${records}',
      rowKey: 'id',
      quickSaveItemAction: {
        action: 'showToast',
        args: {
          level: 'success',
          message: 'Saved item',
        },
      },
      columns: [
        { label: 'ID', name: 'id', width: 120 },
        { label: 'Inline Name', name: 'name', quickEdit: true },
        {
          label: 'Dialog Status',
          name: 'status',
          quickEdit: {
            mode: 'dialog',
            body: {
              type: 'input-text',
              name: 'record.status',
              label: 'Status',
              frameWrap: false,
            },
          },
        },
      ],
      footerToolbar: [
        {
          type: 'text',
          text: 'Edit the row inline or through the dialog-backed quick-edit shell.',
        },
      ],
    },
  ],
};

const selectionRefreshCrud = {
  type: 'page',
  body: [
    {
      type: 'crud',
      id: 'selection-refresh-crud',
      source: '${records}',
      rowKey: 'id',
      autoClearSelectionOnRefresh: true,
      selection: {},
      toolbar: [
        {
          type: 'button',
          label: 'Refresh current list',
          onClick: {
            action: 'component:refresh',
            componentId: 'selection-refresh-crud',
          },
        },
      ],
      listActions: [
        {
          type: 'button',
          label: 'Bulk Delete',
          disabled: '${!$crud.hasSelection}',
        },
      ],
      footerToolbar: [{ type: 'text', text: 'Selected rows: ${$crud.selectionCount}' }],
      columns: [
        { label: 'Name', name: 'name' },
        { label: 'Owner', name: 'owner' },
        { label: 'Status', name: 'status' },
      ],
    },
  ],
};

const radioSelectionCrud = {
  type: 'page',
  body: [
    {
      type: 'crud',
      id: 'radio-selection-crud',
      source: '${records}',
      rowKey: 'id',
      selection: { type: 'radio' },
      listActions: [
        {
          type: 'button',
          label: 'Inspect Selected',
          disabled: '${!$crud.hasSelection}',
        },
      ],
      footerToolbar: [
        {
          type: 'text',
          text: 'Selected rows: ${$crud.selectionCount}; Keys: ${$crud.selectedRowKeys}',
        },
      ],
      columns: [
        { label: 'Name', name: 'name' },
        { label: 'Owner', name: 'owner' },
        { label: 'Status', name: 'status' },
      ],
    },
  ],
};

const clientModeCrud = {
  type: 'page',
  body: [
    {
      type: 'crud',
      source: '${pagedRecords}',
      rowKey: 'id',
      clientMode: {
        loadDataOnce: true,
        fetchOnFilter: false,
      },
      queryForm: {
        body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
      },
      footerToolbar: [
        {
          type: 'text',
          text: 'Visible rows: ${$crud.itemCount}; Total: ${$crud.total}; Query: ${$crud.query.keyword || "none"}',
        },
      ],
      columns: [
        { label: 'Name', name: 'name' },
        { label: 'Owner', name: 'owner' },
        { label: 'Status', name: 'status' },
      ],
    },
  ],
};

const clientModeFetchOnFilterCrud = {
  type: 'page',
  body: [
    {
      type: 'data-source',
      id: 'client-mode-source',
      name: 'clientModeRecords',
      action: 'ajax',
      args: {
        url: '/api/mock/client-mode',
      },
      initialData: {
        items: records,
        total: 42,
      },
    },
    {
      type: 'crud',
      id: 'client-mode-fetch-crud',
      source: '${clientModeRecords}',
      clientMode: {
        loadDataOnce: true,
        fetchOnFilter: true,
      },
      queryForm: {
        body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
      },
      onQuerySubmit: {
        action: 'refreshSource',
        targetId: 'client-mode-source',
      },
      footerToolbar: [
        {
          type: 'text',
          text: 'Visible rows: ${$crud.itemCount}; Total: ${$crud.total}; Query: ${$crud.query.keyword || "none"}',
        },
      ],
      columns: [
        { label: 'Name', name: 'name' },
        { label: 'Owner', name: 'owner' },
        { label: 'Status', name: 'status' },
      ],
    },
  ],
};

export function CrudLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Composite data workflow renderer that combines optional query form, toolbar, bulk actions, and table presentation into one owner surface."
      scenarios={[
        {
          title: 'Basic CRUD shell',
          description:
            'Minimal CRUD configuration with toolbar and a plain status column rendered through the shared table bridge.',
          schema: basicCrud,
          data: { records },
        },
        {
          title: 'CRUD workflow with query, toolbars, and fixed columns',
          description:
            'Shows query-driven workflow, inline column settings (`overlay: false`), basic header search/filter controls, and fixed left/right columns including an operation column. Drag reorder is intentionally not shown because `draggable` is still deferred.',
          schema: queryCrud,
          data: { records },
        },
        {
          title: 'CRUD responsive expand baseline',
          description:
            'Shows the CRUD-owned responsive more-columns baseline. Below the configured breakpoint, the primary column stays in the main row while secondary columns move into the expandable detail row via the internal table bridge.',
          schema: responsiveCrud,
          data: { records },
        },
        {
          title: 'CRUD source-result baseline',
          description:
            'Shows the first request-owned/source-owned baseline: CRUD consumes a scope-resolved source result object with `items` and `total`, keeps upstream total in `$crud.total`, and still applies local query filtering to the visible rows.',
          schema: sourceResultCrud,
          data: { pagedRecords: { items: records, total: 42 } },
        },
        {
          title: 'CRUD request-owned refresh baseline',
          description:
            'Shows the landed upstream owner cooperation path: CRUD consumes a data-source result object and `component:refresh` re-enters the source owner through `refreshSource` instead of inventing a CRUD-private fetch protocol.',
          schema: requestOwnedCrud,
          data: { records },
          env: crudLabEnv,
        },
        {
          title: 'CRUD quick-edit baseline',
          description:
            'Shows the landed quick-edit runtime slice: inline scalar editing plus the local dialog-backed quick-edit shell, both reusing the same row-scope and quick-save bridge.',
          schema: quickEditCrud,
          data: { records },
        },
        {
          title: 'CRUD selection refresh baseline',
          description:
            'Shows selection-driven list-action state and the current auto-clear-on-refresh behavior on the CRUD owner surface.',
          schema: selectionRefreshCrud,
          data: { records },
        },
        {
          title: 'CRUD radio selection baseline',
          description:
            'Shows single-row selection through the CRUD selection bridge, using radio-style row selectors and selection-aware list actions.',
          schema: radioSelectionCrud,
          data: { records },
        },
        {
          title: 'CRUD client-mode baseline',
          description:
            'Shows the landed `clientMode.loadDataOnce` meaning in the current runtime: CRUD consumes a preloaded source-result object once, then query submit stays local and filters the visible rows without re-entering a request owner.',
          schema: clientModeCrud,
          data: { pagedRecords: { items: records, total: 42 } },
        },
        {
          title: 'CRUD client-mode fetch-on-filter baseline',
          description:
            'Shows the opt-in `fetchOnFilter` path: with `loadDataOnce` enabled, CRUD still owns local visible-row filtering, but query submit can re-enter the upstream source owner when explicitly configured.',
          schema: clientModeFetchOnFilterCrud,
          data: { records },
          env: crudLabEnv,
        },
      ]}
    />
  );
}
