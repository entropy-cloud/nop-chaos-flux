# NOP Chaos Frontend Technical Architecture and Naming Conventions

## 1. Scope

This document summarizes the current technical architecture and naming conventions of the `nop-frontend-template` project. It is intended to be used as a baseline when continuing development, extracting common capabilities into `nop-amis`, or adding new applications, pages, plugins, and shared packages.

## 2. Project Overview

The project is a `pnpm` monorepo built around a shell application plus reusable packages.

```text
apps/
  main/           Main shell application
  plugin-demo/    SystemJS remote plugin demo
packages/
  shared/         Shared types and cross-package helpers
  ui/             Shared UI component exports and styling primitives
  core/           Runtime shell capabilities, guards, plugin loader
  plugin-bridge/  Host-to-plugin bridge contract
tests/
  e2e/            Cross-app Playwright tests
```

Workspace declaration is driven by `pnpm-workspace.yaml`, with `apps/*` and `packages/*` as the primary units.

## 3. Core Technology Stack

| Area | Current Choice | Notes |
| --- | --- | --- |
| Monorepo | `pnpm` workspaces | Unified dependency and package management |
| Language | TypeScript | Used across apps and packages |
| App framework | React 19 | Main UI runtime |
| Bundler | Vite 7 | Local dev and production build |
| Routing | React Router 7 | Shell routes and page rendering |
| Server state | TanStack React Query | Query client configured at app bootstrap |
| Client state | Zustand | Local state stores with persistence where needed |
| UI system | `@nop-chaos/ui` + Tailwind CSS | Shared component exports and theme tokens |
| Charts | Recharts | Dashboard and analytics rendering |
| Flow canvas | `@xyflow/react` | Flow editor canvas, nodes, edges, minimap |
| Notifications | Sonner | Global toast feedback |
| I18n | i18next + react-i18next | Runtime translation support |
| Plugin runtime | SystemJS | Remote plugin loading |
| Unit tests | Vitest | Local page or utility tests |
| E2E tests | Playwright | Browser-level workflow verification |

## 4. Application Runtime Architecture

### 4.1 Bootstrap

The main application bootstrap is centered in `apps/main/src/main.tsx`.

- `React.StrictMode` wraps the app in development.
- `QueryClientProvider` is mounted once with shared query defaults.
- `BrowserRouter` provides client-side routing.
- `Toaster` is mounted globally for user feedback.
- `./config/i18n` and `./styles/index.css` are loaded at the entry point.

### 4.2 App shell responsibilities

The root app component in `apps/main/src/App.tsx` is responsible for:

- bootstrapping auth state
- applying theme tokens to the document
- registering host shared modules for plugins
- publishing the plugin bridge onto `globalThis`

This means the shell owns cross-cutting runtime concerns, while individual pages stay focused on feature behavior.

### 4.3 Layering model

The current frontend is best understood as four layers:

1. `Shell layer`: routing, auth gate, layout, theme, plugin loading
2. `Feature page layer`: dashboard, AI workbench, flow editor, master-detail, plugin management
3. `Shared runtime layer`: stores, services, utils, hooks, route rendering
4. `Package layer`: reusable types, UI exports, core runtime utilities, plugin bridge contract

## 5. Package Responsibilities

### 5.1 `@nop-chaos/shared`

Purpose:

- shared TypeScript types
- cross-package domain contracts
- menu and icon related definitions
- user and plugin model definitions

Rule:

- put pure shared contracts here
- avoid app-only UI logic here

### 5.2 `@nop-chaos/ui`

Purpose:

- shared UI components
- styling primitives
- toast exports
- reusable visual building blocks

Rule:

- shared presentation components belong here
- feature-specific composed screens stay in app code

### 5.3 `@nop-chaos/core`

Purpose:

- shell runtime helpers
- permission guard support
- plugin slot loader
- SystemJS runtime integration

Rule:

- infrastructure that serves multiple apps or plugin hosts belongs here

### 5.4 `@nop-chaos/plugin-bridge`

Purpose:

- define the stable host-plugin API contract
- expose host i18n, notifications, stores, and utility getters to plugins

Rule:

- plugin-facing host APIs should be typed here before use in plugins

### 5.5 `@nop-chaos/main`

Purpose:

- host shell application
- main navigation, feature pages, stores, mock services
- ownership of plugin bridge setup

### 5.6 `@nop-chaos/plugin-demo`

Purpose:

- reference remote plugin implementation
- validates SystemJS integration and shared module usage

## 6. Routing and Page Registration Conventions

Routing is metadata-driven.

### 6.1 Menu-driven route source

`apps/main/src/config/routes/menu-config.ts` is the single source of truth for shell navigation metadata.

Each menu item usually defines:

- `id`
- `titleKey`
- `path`
- `icon`
- `pageType`
- `componentId`
- optional `children`, `roles`, `hideInMenu`, `pluginUrl`

### 6.2 Route rendering flow

Runtime flow:

1. `menuConfig` is sorted and flattened
2. role filtering is applied
3. `AppRoutes` creates routes from menu items
4. `RouteRenderer` decides whether to render a builtin page or a plugin page

### 6.3 Builtin page registry

Builtin pages are mapped in `apps/main/src/router/pageRegistry.tsx`.

Convention:

- `componentId` values in route config must match keys in `builtinPageRegistry`
- page modules are lazy-loaded with `lazy(() => import(...))`

### 6.4 Dynamic route pages

Dynamic detail/edit pages use directory names like `[id]`.

Examples:

- `apps/main/src/pages/flow-editor/[id]/index.tsx`
- `apps/main/src/pages/data-management/master-detail/[id]/index.tsx`

This convention keeps route structure visually aligned with file structure.

## 7. State Management Conventions

Zustand is the default client-state solution.

### 7.1 Store location

Application stores live in `apps/main/src/store/`.

Examples:

- `authStore.ts`
- `themeStore.ts`
- `tabStore.ts`
- `layoutStore.ts`
- `pluginStore.ts`

### 7.2 Store naming

Conventions:

- hook export name: `useXxxStore`
- internal state interface: `XxxState` or `XxxStore`
- actions use verb-first names such as `setThemeId`, `setPlugins`, `updatePlugin`, `logout`

### 7.3 Persistence

Persistent stores use Zustand `persist` with `createJSONStorage(() => localStorage)`.

Current key pattern:

- `auth:v1`
- `theme:v1`
- `plugins:v1`

Rule:

- local storage keys should use `domain:vN`
- bump the version suffix when breaking persisted shape

## 8. Data Access and Mock Strategy

The project currently uses an in-app mock service layer centered on `apps/main/src/services/mockApi.ts`.

Characteristics:

- mock availability is controlled by environment rules
- feature-rich seed data is provided for dashboard, AI workbench, flow editor, plugin manifests, and master-detail records
- some datasets are persisted back into local storage for interactive demos

Storage key examples in the mock layer:

- `plugins:manifests:v1`
- `flows:documents:v1`
- `orders:details:v1`

Utility wrapper functions live in `apps/main/src/utils/storage.ts` and abstract local storage reads and writes with a small cache layer.

## 9. Plugin Architecture Definition

The plugin system is based on SystemJS remote loading plus a host bridge.

### 9.1 Plugin route model

Plugin pages are declared in menu config with:

- `pageType: 'plugin'`
- `componentId`
- `pluginUrl`

### 9.2 Plugin runtime loading

`RouteRenderer` delegates plugin pages to `PluginSlot` from `@nop-chaos/core`.

`PluginSlot`:

- optionally runs a `beforeLoad` hook
- loads the remote module from URL
- renders a loading card until resolved
- shows a failure card if loading fails

### 9.3 Host-plugin bridge

`@nop-chaos/plugin-bridge` defines `PluginBridge`, including:

- `i18n`
- `notifications`
- `stores`
- `getCurrentUser`
- `getThemeConfig`
- `getPluginManifest`

The host shell publishes this bridge through `setPluginBridge(...)` in `apps/main/src/App.tsx`.

Rule:

- any new host capability exposed to plugins should first be added to the typed bridge contract

## 10. UI, Theme, and I18n Conventions

### 10.1 UI placement

- app-specific reusable components go under `apps/main/src/components/`
- shared package-level UI exports go under `packages/ui/src/`

### 10.2 Theme handling

Theme state is managed in `themeStore.ts` using a `themeConfig` object.

Current shape includes:

- `themeId`
- `displayMode`

Theme changes are applied centrally by `applyThemeToDocument(...)` in the shell.

### 10.3 I18n usage

Translation keys are referenced through `titleKey` and page-level `useTranslation()` calls.

Rule:

- menu labels should use translation keys, not hardcoded UI copy

## 11. Testing and Quality Gates

### 11.1 Workspace scripts

Root scripts in `package.json` provide:

- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:e2e`

### 11.2 Unit test conventions

Local feature tests are placed next to the source file when they are tightly coupled.

Example:

- `apps/main/src/pages/flow-editor/[id]/index.test.ts`

Convention:

- use `*.test.ts` or `*.test.tsx` beside the tested source when the scope is local

### 11.3 E2E test conventions

Cross-page browser flows live under `tests/e2e/`.

Examples:

- `tests/e2e/login.spec.ts`
- `tests/e2e/flow-editor.spec.ts`

Convention:

- use `*.spec.ts` for Playwright scenarios
- prefer user-visible workflow coverage over implementation details

## 12. Naming Conventions

### 12.1 Directory and file naming

- directories use `kebab-case`
- feature page paths use `kebab-case`
- dynamic directories use `[param]`
- common single-entry page files use `index.tsx`

Examples:

- `ai-workbench`
- `flow-editor`
- `master-detail`
- `[id]`

### 12.2 React component naming

- component identifiers use `PascalCase`
- page component names commonly end with `Page`
- exported React hooks use `useXxx`

Examples:

- `DashboardPage`
- `FlowEditorPage`
- `useAuth`
- `usePluginStore`

### 12.3 Type naming

- interfaces and types use `PascalCase`
- prop types should use `XxxProps`
- state/store contracts should use `XxxState` or `XxxStore`

Examples:

- `PluginBridge`
- `PluginBridgeStores`
- `RouteRendererProps`
- `ThemeState`

### 12.4 Variable and constant naming

- runtime variables use `camelCase`
- arrays and maps should use semantic plural names
- configuration objects should clearly describe their domain

Examples:

- `menuConfig`
- `assistantCatalog`
- `seedWorkbenchSessions`
- `builtinPageRegistry`

### 12.5 Package naming

- workspace package names use the `@nop-chaos/*` scope

Examples:

- `@nop-chaos/main`
- `@nop-chaos/shared`
- `@nop-chaos/core`
- `@nop-chaos/ui`
- `@nop-chaos/plugin-bridge`

### 12.6 Route and menu identifiers

- `id`, `componentId`, and menu-oriented identifiers should use stable kebab-case values
- paths should mirror functional hierarchy

Examples:

- `flow-editor-edit`
- `plugins-management`
- `settings-language`

### 12.7 Storage key naming

- local storage keys use lowercase domain-oriented names
- colon separators are preferred
- version suffixes are explicit

Recommended format:

```text
<domain>:<subdomain>:v<version>
```

Examples:

- `auth:v1`
- `theme:v1`
- `plugins:manifests:v1`

## 13. Recommended Rules for New Modules

When adding a new feature module, follow this structure:

1. add route metadata to `menu-config.ts`
2. create the page under `apps/main/src/pages/<feature>/`
3. register the builtin page in `pageRegistry.tsx` if it is host-rendered
4. add store logic under `apps/main/src/store/` only if page-local component state is no longer sufficient
5. place API or mock logic under `apps/main/src/services/`
6. add local tests beside the feature and e2e tests under `tests/e2e/` when the workflow is critical

Suggested example for a new builtin feature named `audit-center`:

```text
apps/main/src/pages/audit-center/index.tsx
apps/main/src/pages/audit-center/[id]/index.tsx
apps/main/src/services/auditCenter.ts
apps/main/src/store/auditCenterStore.ts
tests/e2e/audit-center.spec.ts
```

Suggested route metadata style:

```ts
{
  id: 'audit-center',
  titleKey: 'menu.auditCenter',
  path: '/audit-center',
  icon: 'shield-check',
  pageType: 'builtin',
  componentId: 'audit-center'
}
```

## 14. Practical Baseline Decisions

For the current codebase, the following should be treated as stable architectural defaults unless there is a clear reason to change them:

- use monorepo package extraction for genuinely shared concerns
- keep route metadata centralized in `menu-config.ts`
- use `pageRegistry.tsx` as the builtin page binding layer
- prefer Zustand for client state and React Query for async server-state workflows
- expose plugin capabilities through the typed bridge instead of ad hoc globals
- keep names kebab-case in filesystem and identifiers PascalCase in React/type symbols
- version persisted keys explicitly
- require both local tests and e2e coverage for complex interactive modules

## 15. Reference Files

The conclusions in this document are derived from the current implementation, especially:

- `package.json`
- `pnpm-workspace.yaml`
- `apps/main/package.json`
- `apps/main/src/main.tsx`
- `apps/main/src/App.tsx`
- `apps/main/src/router/AppRoutes.tsx`
- `apps/main/src/router/RouteRenderer.tsx`
- `apps/main/src/router/pageRegistry.tsx`
- `apps/main/src/config/routes/menu-config.ts`
- `apps/main/src/store/authStore.ts`
- `apps/main/src/store/themeStore.ts`
- `apps/main/src/store/pluginStore.ts`
- `apps/main/src/services/mockApi.ts`
- `apps/main/src/utils/storage.ts`
- `packages/core/src/components/PluginSlot.tsx`
- `packages/plugin-bridge/src/index.ts`
- `tests/e2e/flow-editor.spec.ts`

This document should be updated whenever package responsibilities, routing conventions, persistence contracts, or plugin integration rules materially change.
