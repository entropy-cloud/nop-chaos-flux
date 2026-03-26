import { useEffect, useMemo, useRef, useState } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { NopDebuggerController } from '@nop-chaos/nop-debugger';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { ApiObject, ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';

interface AmisBasicPageProps {
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

const schema = {
  type: 'page',
  title: 'Renderer Playground',
  body: [
    {
      type: 'container',
      body: [
        {
          type: 'text',
          body: 'Welcome, ${currentUser.name}. The renderer stack is live inside this playground.'
        },
        {
          type: 'text',
          body: 'Try the live search below. Click Search repeatedly to trigger debounce, request cancellation, and monitor events.'
        },
        {
          type: 'form',
          id: 'search-form',
          data: {
            query: ''
          },
          body: [
            {
              type: 'input-text',
              name: 'query',
              label: 'Search Users',
              placeholder: 'Type a username or role'
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Search Directory',
              disabled: '${!query}',
              onClick: {
                action: 'ajax',
                debounce: 350,
                api: {
                  method: 'post',
                  url: '/api/search',
                  requestAdaptor: 'return {data: {query: scope.query}};',
                  responseAdaptor: 'return payload.results;'
                },
                dataPath: 'searchResults'
              }
            }
          ]
        },
        {
          type: 'form',
          id: 'user-form',
          validateOn: 'blur',
          showErrorOn: ['touched', 'submit'],
          data: {
            username: '',
            email: '',
            role: 'viewer',
            adminCode: '',
            approved: false,
            status: 'draft',
            notes: '',
            featured: false,
            tags: ['stable'],
            labels: [],
            metadata: [],
            reviewers: []
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
              placeholder: 'Enter username',
              required: true,
              minLength: 3,
              validateOn: ['blur', 'change', 'submit'],
              validate: {
                debounce: 500,
                api: {
                  method: 'post',
                  url: '/api/validate-username',
                  requestAdaptor: 'return {data: {username: scope.username}};'
                },
                message: 'Username is already taken'
              }
            },
            {
              type: 'input-email',
              name: 'email',
              label: 'Email',
              placeholder: 'Enter email',
              required: true
            },
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [
                { label: 'Viewer', value: 'viewer' },
                { label: 'Editor', value: 'editor' },
                { label: 'Admin', value: 'admin' }
              ]
            },
            {
              type: 'input-password',
              name: 'adminCode',
              label: 'Admin Code',
              placeholder: 'Only required for admin submissions',
              visible: '${role === "admin"}',
              minLength: 4
            },
            {
              type: 'checkbox',
              name: 'approved',
              label: 'Review Status',
              option: {
                label: 'Approved for submission'
              }
            },
            {
              type: 'radio-group',
              name: 'status',
              label: 'Publication Status',
              options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Ready', value: 'ready' }
              ]
            },
            {
              type: 'textarea',
              name: 'notes',
              label: 'Reviewer Notes',
              placeholder: 'Add internal notes for the submission review',
              rows: 4,
              minLength: 5,
              showErrorOn: 'dirty'
            },
            {
              type: 'switch',
              name: 'featured',
              label: 'Publishing Toggle',
              option: {
                onLabel: 'Featured',
                offLabel: 'Standard'
              }
            },
            {
              type: 'checkbox-group',
              name: 'tags',
              label: 'Release Tags',
              options: [
                { label: 'Stable', value: 'stable' },
                { label: 'Beta', value: 'beta' },
                { label: 'Internal', value: 'internal' }
              ]
            },
            {
              type: 'tag-list',
              name: 'labels',
              label: 'Content Labels',
              tags: ['Docs', 'API', 'Urgent'],
              showErrorOn: ['touched', 'submit']
            },
            {
              type: 'key-value',
              name: 'metadata',
              label: 'Metadata',
              addLabel: 'Add metadata pair',
              showErrorOn: 'submit'
            },
            {
              type: 'array-editor',
              name: 'reviewers',
              label: 'Reviewers',
              itemLabel: 'Reviewer',
              showErrorOn: 'submit'
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Open Preview Dialog',
              visible: '${currentUser.name === "Architect"}',
              onClick: {
                action: 'dialog',
                dialog: {
                  title: 'Form Preview',
                  body: {
                    type: 'container',
                    body: [
                      {
                        type: 'text',
                        body: 'Dialog scope username: ${username}'
                      },
                      {
                        type: 'button',
                        label: 'Close Dialog',
                        onClick: {
                          action: 'closeDialog'
                        }
                      }
                    ]
                  }
                }
              }
            },
            {
              type: 'button',
              label: 'Submit Form',
              onClick: {
                action: 'submitForm',
                formId: 'user-form',
                api: {
                  method: 'post',
                  url: '/api/users'
                },
                then: {
                  action: 'refreshTable'
                }
              }
            }
          ]
        },
        {
          type: 'container',
          direction: 'column',
          className: 'na-composite-lab',
          body: [
            {
              type: 'text',
              className: 'na-section-kicker',
              body: 'Composite Validation Lab'
            },
            {
              type: 'text',
              className: 'na-section-title',
              body: 'Child-path visibility in isolation'
            },
            {
              type: 'text',
              className: 'na-section-copy',
              body: 'These focused forms isolate how composite controls reveal validation for specific cells and items. The left card shows touched-based visibility; the right card waits until submit and then fans errors out to child paths.'
            },
            {
              type: 'container',
              className: 'na-demo-grid',
              body: [
                {
                  type: 'container',
                  direction: 'column',
                  className: 'na-demo-card',
                  body: [
                    {
                      type: 'text',
                      className: 'na-demo-card__eyebrow',
                      body: 'Touched + submit'
                    },
                    {
                      type: 'text',
                      className: 'na-demo-card__title',
                      body: 'Key-value child cells'
                    },
                    {
                      type: 'text',
                      className: 'na-demo-card__copy',
                      body: 'Focus and blur the empty Key cell to surface a child-level error without submitting the form.'
                    },
                    {
                      type: 'form',
                      id: 'kv-visibility-form',
                      showErrorOn: ['touched', 'submit'],
                      data: {
                        metadata: [{ key: '', value: 'prod' }]
                      },
                      body: [
                        {
                          type: 'key-value',
                          name: 'metadata',
                          label: 'Metadata cells',
                          addLabel: 'Add metadata pair'
                        }
                      ],
                      actions: [
                        {
                          type: 'button',
                          label: 'Submit key-value demo',
                          onClick: {
                            action: 'submitForm',
                            formId: 'kv-visibility-form',
                            api: {
                              method: 'post',
                              url: '/api/composite-demo'
                            }
                          }
                        }
                      ]
                    }
                  ]
                },
                {
                  type: 'container',
                  direction: 'column',
                  className: 'na-demo-card',
                  body: [
                    {
                      type: 'text',
                      className: 'na-demo-card__eyebrow',
                      body: 'Submit only'
                    },
                    {
                      type: 'text',
                      className: 'na-demo-card__title',
                      body: 'Array child items'
                    },
                    {
                      type: 'text',
                      className: 'na-demo-card__copy',
                      body: 'This form stays quiet while you type, then marks child item paths touched on submit so the error lands on the exact reviewer row.'
                    },
                    {
                      type: 'form',
                      id: 'array-visibility-form',
                      showErrorOn: 'submit',
                      data: {
                        reviewers: [{ value: '' }]
                      },
                      body: [
                        {
                          type: 'array-editor',
                          name: 'reviewers',
                          label: 'Reviewers',
                          itemLabel: 'Reviewer'
                        }
                      ],
                      actions: [
                        {
                          type: 'button',
                          label: 'Submit array demo',
                          onClick: {
                            action: 'submitForm',
                            formId: 'array-visibility-form',
                            api: {
                              method: 'post',
                              url: '/api/composite-demo'
                            }
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: 'table',
          source: '${searchResults}',
          columns: [
            { label: 'ID', name: 'id' },
            { label: 'Username', name: 'username' },
            { label: 'Email', name: 'email' },
            { label: 'Role', name: 'role' },
            {
              label: 'Actions',
              type: 'operation',
              buttons: [
                {
                  type: 'button',
                  label: 'Inspect',
                  onClick: {
                    action: 'dialog',
                    dialog: {
                      title: 'User Details',
                      body: {
                        type: 'container',
                        body: [
                          { type: 'text', body: 'User: ${record.username}' },
                          { type: 'text', body: 'Email: ${record.email}' },
                          {
                            type: 'button',
                            label: 'Close',
                            onClick: {
                              action: 'closeDialog'
                            }
                          }
                        ]
                      }
                    }
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

export function AmisBasicPage({ debuggerController, onBack }: AmisBasicPageProps) {
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
        <div className="na-ai-debug-card">
          <p className="na-ai-debug-card__eyebrow">AI Debug Script</p>
          <pre className="na-ai-debug-card__code">{`const api = window.__NOP_FLUX_DEBUGGER_API__;
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
              schema={schema}
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

