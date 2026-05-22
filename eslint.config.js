const js = require('@eslint/js');
const react = require('eslint-plugin-react');
const tseslint = require('typescript-eslint');
const reactHooks = require('eslint-plugin-react-hooks');
const reactCompiler = require('eslint-plugin-react-compiler');
const i18next = require('eslint-plugin-i18next');
const unicorn = require('eslint-plugin-unicorn').default;
const jsxAlly = require('eslint-plugin-jsx-a11y');
const globals = require('globals');
const eslintConfigPrettier = require('eslint-config-prettier');

const reactHooksLatest = reactHooks.configs.flat['recommended-latest'];

const react19RestrictedImports = [
  {
    name: 'react-dom',
    importNames: ['findDOMNode', 'hydrate', 'render', 'unmountComponentAtNode'],
    message:
      'Use React 19 root APIs from react-dom/client instead of legacy react-dom entry points.',
  },
  {
    name: 'react-dom/test-utils',
    message:
      'Use @testing-library/react and modern DOM assertions instead of react-dom/test-utils.',
  },
  {
    name: 'react-test-renderer',
    message: 'Do not reintroduce react-test-renderer into the React 19 workspace baseline.',
  },
  {
    name: 'react-test-renderer/shallow',
    message: 'Shallow rendering is legacy. Use @testing-library/react instead.',
  },
];

module.exports = [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['**/*.{ts,tsx}'],
    settings: {
      react: {
        version: '19.0',
      },
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react,
      unicorn,
      'jsx-a11y': jsxAlly,
      ...reactHooksLatest.plugins,
      'react-compiler': reactCompiler,
    },
    rules: {
      'react/jsx-key': 'error',
      'react/jsx-no-comment-textnodes': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-constructed-context-values': 'error',
      'react/jsx-no-script-url': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/jsx-no-undef': 'error',
      'react/button-has-type': 'error',
      'react/no-children-prop': 'error',
      'react/no-danger-with-children': 'error',
      'react/no-deprecated': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-is-mounted': 'error',
      'react/no-array-index-key': 'error',
      'react/no-render-return-value': 'error',
      'react/no-string-refs': 'error',
      'react/no-unknown-property': 'error',
      ...reactHooksLatest.rules,
      'react-compiler/react-compiler': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-check': false,
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          minimumDescriptionLength: 3,
        },
      ],
      // Low-code system: appropriate use of any is normal in schema-driven renderers and dynamic evaluation.
      // Disabled to avoid noise in a codebase that intentionally uses any for schema/host boundaries.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [...react19RestrictedImports],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'ImportDeclaration[source.value="react"] > ImportSpecifier[imported.name="forwardRef"]',
          message:
            'forwardRef is no longer needed in React 19. Pass ref as a regular prop instead.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'ReactDOM',
          property: 'render',
          message: 'Use createRoot(...).render(...) from react-dom/client.',
        },
        {
          object: 'ReactDOM',
          property: 'hydrate',
          message: 'Use hydrateRoot(...) from react-dom/client.',
        },
        {
          object: 'ReactDOM',
          property: 'findDOMNode',
          message: 'findDOMNode is legacy and unsupported in the React 19 workspace baseline.',
        },
        {
          object: 'ReactDOM',
          property: 'unmountComponentAtNode',
          message: 'Use root.unmount() from the React 19 root API instead.',
        },
        {
          object: 'React',
          property: 'createFactory',
          message:
            'React.createFactory is legacy and unsupported in the React 19 workspace baseline.',
        },
      ],
      'no-new-func': 'error',
      'no-eval': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'max-lines': ['error', { max: 700, skipBlankLines: true, skipComments: true }],
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
          ignore: [/^[a-z]{2}-[A-Z]{2}(\.\w+)?$/, /^App\.tsx$/],
        },
      ],
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/no-autofocus': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
    },
  },
  // a11y: relax rules in test files
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**', '**/test-support*.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/no-autofocus': 'off',
      'jsx-a11y/label-has-associated-control': 'off',
    },
  },
  // i18n: 检测组件库中的硬编码字符串 (排除 playground、test、apps)
  {
    files: [
      'packages/ui/src/**/*.{ts,tsx}',
      'packages/flux-*/src/**/*.{ts,tsx}',
      'packages/flow-designer-*/src/**/*.{ts,tsx}',
      'packages/spreadsheet-*/src/**/*.{ts,tsx}',
      'packages/report-designer-*/src/**/*.{ts,tsx}',
      'packages/word-editor-*/src/**/*.{ts,tsx}',
      'packages/nop-debugger/src/**/*.{ts,tsx}',
    ],
    ignores: [
      '**/*.test.{ts,tsx}',
      '**/__tests__/**',
      '**/test/**',
      '**/*.spec.{ts,tsx}',
      '**/test-support*.{ts,tsx}',
    ],
    plugins: {
      i18next,
    },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-text-only',
          'jsx-components': {
            // 排除不需要翻译的组件
            exclude: ['Trans', 'code', 'pre', 'Kbd'],
          },
          'jsx-attributes': {
            // 排除不需要翻译的属性
            exclude: [
              'className',
              'class',
              'style',
              'styleName',
              'type',
              'id',
              'name',
              'key',
              'ref',
              'data-testid',
              'data-test-id',
              'testId',
              'data-slot',
              'href',
              'src',
              'srcSet',
              'alt',
              'role',
              'aria-.*',
              'variant',
              'size',
              'color',
              'align',
              'direction',
              'as',
              'asChild',
              'htmlFor',
              'for',
              'autoComplete',
              'autocomplete',
              'inputMode',
              'pattern',
            ],
          },
          words: {
            // 排除技术性字符串
            exclude: [
              // 单字符和符号
              '^[\\s\\d\\W]*$',
              // CSS 类名模式
              '^[a-z-]+$',
              '^nop-.*',
              // 代码/技术标识符
              '^[A-Z_][A-Z0-9_]*$',
            ],
          },
          callees: {
            // 排除不需要翻译的函数调用
            exclude: [
              't',
              'i18next.t',
              'i18n.t',
              'useTranslation',
              'useFluxTranslation',
              'console.*',
              'log',
              'warn',
              'error',
              'debug',
              'info',
              'cn',
              'clsx',
              'classNames',
              'cva',
              'require',
              'import',
              'createElement',
              'createRef',
              'Object.*',
              'Array.*',
              'String.*',
              'JSON.*',
              'addEventListener',
              'removeEventListener',
              'querySelector',
              'querySelectorAll',
              'getElementById',
              'setAttribute',
              'getAttribute',
              'removeAttribute',
              'Error',
              'TypeError',
              'RangeError',
            ],
          },
        },
      ],
    },
  },
];
