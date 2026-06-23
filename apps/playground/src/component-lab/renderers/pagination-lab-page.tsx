import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const simplePagination = {
  type: 'page',
  body: [
    {
      type: 'pagination',
      testid: 'demo-pagination-simple',
      currentPage: 1,
      pageSize: 10,
      total: 95,
    },
  ],
};

const withPageSize = {
  type: 'page',
  body: [
    {
      type: 'pagination',
      testid: 'demo-pagination-with-size',
      currentPage: 2,
      pageSize: 20,
      total: 200,
      mode: 'with-page-size',
      pageSizeOptions: [10, 20, 50, 100],
    },
  ],
};

const boundaryClamp = {
  type: 'page',
  body: [
    {
      type: 'pagination',
      testid: 'demo-pagination-clamp',
      currentPage: 999,
      pageSize: 10,
      total: 25,
    },
  ],
};

export function PaginationLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Standalone pagination interaction owner. Reuses ui Pagination. Normalizes out-of-range currentPage to the last page; page-size change resets currentPage to 1."
      scenarios={[
        {
          title: 'Simple pagination',
          description: 'Page numbers + prev/next, no page-size selector.',
          schema: simplePagination,
          data: {},
        },
        {
          title: 'With page size selector',
          description: 'mode=with-page-size adds a page-size selector that resets currentPage to 1 on change.',
          schema: withPageSize,
          data: {},
        },
        {
          title: 'Boundary clamp',
          description: 'currentPage=999 with total=25/pageSize=10 clamps to the last page (3).',
          schema: boundaryClamp,
          data: {},
        },
      ]}
    />
  );
}
