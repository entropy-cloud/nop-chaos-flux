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
    <main className="min-h-screen grid place-items-center p-6">
      <section className="max-w-[1100px] p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <button type="button" className="mb-[18px] px-3.5 py-2.5 rounded-full border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-sans text-[13px] font-bold cursor-pointer transition-[transform,box-shadow,border-color] duration-160 hover:-translate-y-px hover:shadow-[var(--nop-nav-shadow-active)] hover:border-[var(--nop-nav-hover-border)]" onClick={onBack}>
          Back to Home
        </button>
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">Flux Basic</p>
        <h1 className="m-0 mb-4">Renderer Playground</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)]">
          The first execution slice is live: schema compilation, runtime evaluation, React rendering,
          forms, dialogs, actions, table operations, adaptors, monitoring, and request cancellation all
          run inside the playground.
        </p>
        <p className="mt-2.5 text-[15px] leading-relaxed text-[var(--nop-body-copy)]">
          Submit the user form to append a record into the local directory and watch the table plus monitor
          panel update in real time.
        </p>
        <p className="mt-2.5 text-[15px] leading-relaxed text-[var(--nop-body-copy)]">
          The form now includes an expression editor field at the bottom. It provides syntax highlighting,
          auto-complete for variables, and real-time validation. Try typing variable names like `username`
          or `role` and combine them with operators.
        </p>
        <p className="mt-2.5 text-[15px] leading-relaxed text-[var(--nop-body-copy)]">
          The username field now validates on blur, debounces async uniqueness checks for 500ms, and only
          reveals errors after a field has been touched. Validation timing and error visibility are now
          configured independently at the form or field level.
        </p>
        <p className="mt-2.5 text-[15px] leading-relaxed text-[var(--nop-body-copy)]">
          A first package-based debugger is now mounted as a floating panel. Drag it, minimize it, and reopen it
          from the left-bottom launcher while interacting with the schema.
        </p>
        <p className="mt-2.5 text-[15px] leading-relaxed text-[var(--nop-body-copy)]">
          AI automation can read the structured debugger API from `window.__NOP_FLUX_DEBUGGER_API__` or the
          multi-instance registry at `window.__NOP_FLUX_DEBUGGER_HUB__`.
        </p>
        <div className="mt-[18px] p-[18px] rounded-[18px] bg-gradient-to-b from-slate-900/94 to-slate-950/98 border border-amber-200/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="mb-2.5 uppercase tracking-[0.14em] text-[11px] font-bold text-amber-300">AI Debug Script</p>
          <pre className="p-3.5 rounded-[14px] bg-black/30 text-sky-200 text-[13px] leading-relaxed overflow-x-auto">{`const api = window.__NOP_FLUX_DEBUGGER_API__;
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
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(280px,360px)] gap-6 items-start">
          <div className="p-6 rounded-[20px] bg-[var(--nop-playground-stage-bg)] border border-[var(--nop-playground-stage-border)]">
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
              onComponentRegistryChange={(componentRegistry) => debuggerController.setComponentRegistry(componentRegistry)}
              onActionError={debuggerController.onActionError}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
