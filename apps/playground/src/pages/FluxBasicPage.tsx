import { useEffect, useMemo, useRef, useState } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { NopDebuggerController } from '@nop-chaos/nop-debugger';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { ApiObject, ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import schemaJson from './fluxBasicPageSchema.json';

interface FluxBasicPageProps {
  debuggerController: NopDebuggerController;
  onBack: () => void;
}

const users = [
  { id: 1, username: 'alice', email: 'alice@example.com', role: 'admin' },
  { id: 2, username: 'bob', email: 'bob@example.com', role: 'editor' },
  { id: 3, username: 'carol', email: 'carol@example.com', role: 'viewer' }
];

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);

const SchemaRenderer = createSchemaRenderer();

const formulaCompiler = createFormulaCompiler();

function createAbortError() {
  return Object.assign(new Error('Request aborted'), { name: 'AbortError' });
}

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);

    const handleAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', handleAbort);
      reject(createAbortError());
    };

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    signal?.addEventListener('abort', handleAbort);
  });
}

function formatCountLabel(value: number, noun: string) {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

function filterUsersByQuery(
  sourceUsers: typeof users,
  query: string
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return sourceUsers;
  }

  return sourceUsers.filter(
    (user) =>
      user.username.toLowerCase().includes(normalizedQuery) ||
      user.email.toLowerCase().includes(normalizedQuery) ||
      user.role.toLowerCase().includes(normalizedQuery)
  );
}

export const fluxBasicPageSchema = schemaJson;

export function FluxBasicPage({ debuggerController, onBack }: FluxBasicPageProps) {
  const [directoryUsers, setDirectoryUsers] = useState(users);
  const [searchResults, setSearchResults] = useState(users);
  const [searchQuery, setSearchQuery] = useState('');
  const directoryUsersRef = useRef(directoryUsers);
  const searchQueryRef = useRef(searchQuery);

  useEffect(() => {
    directoryUsersRef.current = directoryUsers;
  }, [directoryUsers]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  const baseEnv = useMemo<RendererEnv>(
    () => ({
      async fetcher<T>(api: ApiObject, ctx: ApiRequestContext) {
        if (api.url === '/api/search') {
          await delay(700, ctx.signal);

          const query = String((api.data as Record<string, unknown> | undefined)?.query ?? '');
          const normalizedQuery = query.trim().toLowerCase();
          const results = filterUsersByQuery(directoryUsersRef.current, normalizedQuery);

          searchQueryRef.current = normalizedQuery;
          setSearchQuery(normalizedQuery);
          setSearchResults(results);

          return {
            ok: true,
            status: 200,
            data: {
              results,
              total: results.length,
              summary: `query=${normalizedQuery || '(all)'} | ${formatCountLabel(results.length, 'record')}`
            } as T
          };
        }

        if (api.url === '/api/users') {
          const scopeData = ctx.scope.readOwn();
          const activeSearchQuery = searchQueryRef.current;
          let createdUser = {
            id: Date.now(),
            username: String(scopeData.username ?? ''),
            email: String(scopeData.email ?? ''),
            role: String(scopeData.role ?? 'viewer')
          };
          let totalUsers = directoryUsersRef.current.length;

          setDirectoryUsers((current) => {
            createdUser = {
              ...createdUser,
              id: current.reduce((max, user) => Math.max(max, user.id), 0) + 1
            };

            const nextUsers = [...current, createdUser];
            const nextResults = filterUsersByQuery(nextUsers, activeSearchQuery);

            totalUsers = nextUsers.length;
            directoryUsersRef.current = nextUsers;
            setSearchResults(nextResults);
            return nextUsers;
          });

          return {
            ok: true,
            status: 200,
            data: {
              user: createdUser,
              total: totalUsers,
              summary: `username=${createdUser.username} | email=${createdUser.email} | role=${createdUser.role}`
            } as T
          };
        }

        if (api.url === '/api/validate-username') {
          await delay(450, ctx.signal);

          const username = String((api.data as Record<string, unknown> | undefined)?.username ?? '').trim().toLowerCase();
          const exists = directoryUsersRef.current.some((user) => user.username.toLowerCase() === username);

          return {
            ok: true,
            status: 200,
            data: {
              valid: !exists,
              message: exists ? 'Username is already taken' : 'Username is available',
              summary: `username=${username || '(empty)'}`
            } as T
          };
        }

        if (api.method?.toLowerCase() === 'post') {
          return {
            ok: true,
            status: 200,
            data: {
              success: true,
              payload: ctx.scope.readOwn()
            } as T
          };
        }

        return {
          ok: true,
          status: 200,
          data: null as T
        };
      },
      notify(level, message) {
        if (level === 'success') {
          return;
        }

        console.info(`[playground notify] ${level}: ${message}`);
      }
    }),
    []
  );

  const env = useMemo(() => debuggerController.decorateEnv(baseEnv), [baseEnv, debuggerController]);

  return (
    <main className="app-shell">
      <section className="hero-card hero-card--wide">
        <button type="button" className="page-back" onClick={onBack}>
          Back to Home
        </button>
        <p className="eyebrow">Flux Basic</p>
        <h1>Renderer Playground</h1>
        <p className="body-copy">
          The first execution slice is live: schema compilation, runtime evaluation, React rendering,
          forms, dialogs, actions, table operations, adaptors, monitoring, and request cancellation all
          run inside the playground.
        </p>
        <p className="body-copy body-copy--compact">
          Submit the user form to append a record into the local directory and watch the table plus monitor
          panel update in real time.
        </p>
        <p className="body-copy body-copy--compact">
          The username field now validates on blur, debounces async uniqueness checks for 500ms, and only
          reveals errors after a field has been touched. Validation timing and error visibility are now
          configured independently at the form or field level.
        </p>
        <p className="body-copy body-copy--compact">
          A first package-based debugger is now mounted as a floating panel. Drag it, minimize it, and reopen it
          from the left-bottom launcher while interacting with the schema.
        </p>
        <p className="body-copy body-copy--compact">
          AI automation can read the structured debugger API from `window.__NOP_FLUX_DEBUGGER_API__` or the
          multi-instance registry at `window.__NOP_FLUX_DEBUGGER_HUB__`.
        </p>
        <div className="nop-ai-debug-card">
          <p className="nop-ai-debug-card__eyebrow">AI Debug Script</p>
          <pre className="nop-ai-debug-card__code">{`const api = window.__NOP_FLUX_DEBUGGER_API__;
const latestError = api?.getLatestError();
const usersRequest = await api?.waitForEvent({ kind: 'api:end', text: '/api/users' });
const nodeReport = api?.getNodeDiagnostics({ nodeId: 'user-form' });
const inferredTrace = api?.getInteractionTrace({ inferFromLatest: true });
const exactTrace = api?.getInteractionTrace({
  eventId: usersRequest?.id,
  mode: 'exact'
});
const exported = api?.exportSession({ eventLimit: 30 }); // redacted snapshot
const diagnostic = api?.createDiagnosticReport({
  eventLimit: 20,
  includeLatestInteractionTrace: true
});
const latestTrace = diagnostic?.latestInteractionTrace;`}</pre>
        </div>
        <div className="playground-layout">
          <div className="playground-stage">
            <SchemaRenderer
              schema={fluxBasicPageSchema}
              data={{
                currentUser: { name: 'Architect' },
                users: directoryUsers,
                searchResults
              }}
              env={env}
              registry={registry}
              formulaCompiler={formulaCompiler}
              plugins={[debuggerController.plugin]}
              onActionError={debuggerController.onActionError}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
