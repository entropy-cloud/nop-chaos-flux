/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: {
        circular: true
      }
    },
    {
      name: 'no-cross-package-src-imports',
      severity: 'error',
      from: {
        path: '^packages/([^/]+)/src/'
      },
      to: {
        path: '^packages/([^/]+)/src/',
        pathNot: '^packages/$1/src/'
      }
    },
    {
      name: 'no-app-to-package-internals',
      severity: 'error',
      from: {
        path: '^apps/'
      },
      to: {
        path: '^packages/[^/]+/src/'
      }
    }
  ],
  options: {
    tsPreCompilationDeps: true,
    doNotFollow: {
      path: 'node_modules'
    },
    includeOnly: '^(apps|packages|scripts)/',
    exclude: {
      path: '(^|/)(dist|coverage|test-results|node_modules|docs|\\.opencode)/'
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+'
      }
    }
  }
};
