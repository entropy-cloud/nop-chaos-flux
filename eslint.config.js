const js = require('@eslint/js');
const react = require('eslint-plugin-react');
const tseslint = require('typescript-eslint');
const reactHooks = require('eslint-plugin-react-hooks');
const reactCompiler = require('eslint-plugin-react-compiler');
const globals = require('globals');

const reactHooksLatest = reactHooks.configs.flat['recommended-latest'];

const react19RestrictedImports = [
  {
    name: 'react-dom',
    importNames: ['findDOMNode', 'hydrate', 'render', 'unmountComponentAtNode'],
    message: 'Use React 19 root APIs from react-dom/client instead of legacy react-dom entry points.'
  },
  {
    name: 'react-dom/test-utils',
    message: 'Use @testing-library/react and modern DOM assertions instead of react-dom/test-utils.'
  },
  {
    name: 'react-test-renderer',
    message: 'Do not reintroduce react-test-renderer into the React 19 workspace baseline.'
  },
  {
    name: 'react-test-renderer/shallow',
    message: 'Shallow rendering is legacy. Use @testing-library/react instead.'
  }
];

module.exports = [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
    linterOptions: {
      reportUnusedDisableDirectives: 'error'
    }
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    settings: {
      react: {
        version: '19.0'
      }
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      react,
      ...reactHooksLatest.plugins,
      'react-compiler': reactCompiler
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
      'react/no-array-index-key': 'warn',
      'react/no-render-return-value': 'error',
      'react/no-string-refs': 'error',
      'react/no-unknown-property': 'error',
      ...reactHooksLatest.rules,
      'react-compiler/react-compiler': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-check': false,
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': true,
        'ts-nocheck': true,
        minimumDescriptionLength: 3
      }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-imports': ['error', { paths: react19RestrictedImports }],
      'no-restricted-properties': [
        'error',
        {
          object: 'ReactDOM',
          property: 'render',
          message: 'Use createRoot(...).render(...) from react-dom/client.'
        },
        {
          object: 'ReactDOM',
          property: 'hydrate',
          message: 'Use hydrateRoot(...) from react-dom/client.'
        },
        {
          object: 'ReactDOM',
          property: 'findDOMNode',
          message: 'findDOMNode is legacy and unsupported in the React 19 workspace baseline.'
        },
        {
          object: 'ReactDOM',
          property: 'unmountComponentAtNode',
          message: 'Use root.unmount() from the React 19 root API instead.'
        },
        {
          object: 'React',
          property: 'createFactory',
          message: 'React.createFactory is legacy and unsupported in the React 19 workspace baseline.'
        }
      ],
      'no-new-func': 'error',
      'no-eval': 'error'
    }
  }
];
