import { useCallback, useMemo, useState } from 'react';
import { createFormulaCompiler } from '@nop-chaos/amis-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/amis-react';
import type { ApiObject, ApiRequestContext, RendererEnv } from '@nop-chaos/amis-schema';
import { registerBasicRenderers } from '@nop-chaos/amis-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/amis-renderers-form';
import { registerDataRenderers } from '@nop-chaos/amis-renderers-data';

type ActivityKind = 'render' | 'action' | 'api' | 'notify';

interface ActivityEntry {
  id: number;
  kind: ActivityKind;
  message: string;
  detail?: string;
  timestamp: string;
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

function formatActionResult(result: unknown) {
  if (!result || typeof result !== 'object') {
    return 'unknown';
  }

  const candidate = result as { ok?: boolean; cancelled?: boolean };

  if (candidate.cancelled) {
    return 'cancelled';
  }

  if (candidate.ok) {
    return 'ok';
  }

  return 'error';
}

function formatCountLabel(value: number, noun: string) {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

function formatTimestamp(date: Date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

const schema = {
  type: 'page',
  title: 'Renderer Playground',
  body: [
    {
      type: 'container',
      body: [
        {
          type: 'tpl',
          tpl: 'Welcome, ${currentUser.name}. The renderer stack is live inside this playground.'
        },
        {
          type: 'tpl',
          tpl: 'Try the live search below. Click Search repeatedly to trigger debounce, request cancellation, and monitor events.'
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
            metadata: []
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
                        type: 'tpl',
                        tpl: 'Dialog scope username: ${username}'
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
                          { type: 'tpl', tpl: 'User: ${record.username}' },
                          { type: 'tpl', tpl: 'Email: ${record.email}' },
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

export function App() {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activeKinds, setActiveKinds] = useState<ActivityKind[]>(['render', 'action', 'api', 'notify']);
  const [activityPaused, setActivityPaused] = useState(false);
  const [directoryUsers, setDirectoryUsers] = useState(users);
  const [searchResults, setSearchResults] = useState(users);
  const [searchQuery, setSearchQuery] = useState('');

  const pushActivity = useCallback((kind: ActivityKind, message: string, detail?: string) => {
    if (activityPaused) {
      return;
    }

    const now = new Date();

    setActivity((current) => [
      {
        id: now.getTime() + current.length,
        kind,
        message,
        detail,
        timestamp: formatTimestamp(now)
      },
      ...current
    ].slice(0, 16));
  }, [activityPaused]);

  const env = useMemo<RendererEnv>(
    () => ({
      async fetcher<T>(api: ApiObject, ctx: ApiRequestContext) {
        if (api.url === '/api/search') {
          await delay(700, ctx.signal);

          const query = String((api.data as Record<string, unknown> | undefined)?.query ?? '')
            .trim()
            .toLowerCase();
          const results = query
            ? directoryUsers.filter(
                (user) =>
                  user.username.toLowerCase().includes(query) ||
                  user.email.toLowerCase().includes(query) ||
                  user.role.toLowerCase().includes(query)
              )
            : directoryUsers;

          setSearchQuery(query);
          setSearchResults(results);

          pushActivity(
            'api',
            `response /api/search -> ${results.length} match(es)`,
            `query=${query || '(all)'} | ${formatCountLabel(results.length, 'record')}`
          );

          return {
            ok: true,
            status: 200,
            data: {
              results,
              total: results.length
            } as T
          };
        }

        if (api.url === '/api/users') {
          const scopeData = ctx.scope.readOwn();
          let createdUser = {
            id: Date.now(),
            username: String(scopeData.username ?? ''),
            email: String(scopeData.email ?? ''),
            role: String(scopeData.role ?? 'viewer')
          };

          setDirectoryUsers((current) => {
            createdUser = {
              ...createdUser,
              id: current.reduce((max, user) => Math.max(max, user.id), 0) + 1
            };

            const nextUsers = [...current, createdUser];
            const nextResults = searchQuery
              ? nextUsers.filter(
                  (user) =>
                    user.username.toLowerCase().includes(searchQuery) ||
                    user.email.toLowerCase().includes(searchQuery) ||
                    user.role.toLowerCase().includes(searchQuery)
                )
              : nextUsers;

            setSearchResults(nextResults);
            return nextUsers;
          });

          pushActivity(
            'api',
            `response /api/users -> created ${createdUser.username || 'user'}`,
            `username=${createdUser.username} | email=${createdUser.email} | role=${createdUser.role}`
          );
          pushActivity('notify', `success: ${createdUser.username || 'User'} added to the local directory`);

          return {
            ok: true,
            status: 200,
            data: {
              user: createdUser,
              total: directoryUsers.length + 1
            } as T
          };
        }

        if (api.url === '/api/validate-username') {
          await delay(450, ctx.signal);

          const username = String((api.data as Record<string, unknown> | undefined)?.username ?? '').trim().toLowerCase();
          const exists = directoryUsers.some((user) => user.username.toLowerCase() === username);

          pushActivity(
            'api',
            `response /api/validate-username -> ${exists ? 'duplicate' : 'available'}`,
            `username=${username || '(empty)'}`
          );

          return {
            ok: true,
            status: 200,
            data: {
              valid: !exists,
              message: exists ? 'Username is already taken' : 'Username is available'
            } as T
          };
        }

        if (api.method?.toLowerCase() === 'post') {
          pushActivity('api', `response ${api.url} -> saved payload snapshot`, JSON.stringify(ctx.scope.readOwn()));

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
        pushActivity('notify', `${level}: ${message}`);
      },
      monitor: {
        onRenderEnd(payload) {
          pushActivity('render', `${payload.type} rendered in ${payload.durationMs}ms`, `nodeId=${payload.nodeId} | path=${payload.path}`);
        },
        onActionStart(payload) {
          pushActivity('action', `${payload.actionType} started`, `nodeId=${payload.nodeId ?? 'n/a'} | path=${payload.path ?? 'n/a'}`);
        },
        onActionEnd(payload) {
          pushActivity(
            'action',
            `${payload.actionType} ${formatActionResult(payload.result)} in ${payload.durationMs}ms`,
            `nodeId=${payload.nodeId ?? 'n/a'} | path=${payload.path ?? 'n/a'}`
          );
        },
        onApiRequest(payload) {
          pushActivity(
            'api',
            `${payload.api.method ?? 'get'} ${payload.api.url}`,
            `nodeId=${payload.nodeId ?? 'n/a'} | path=${payload.path ?? 'n/a'}`
          );
        }
      }
    }),
    [directoryUsers, pushActivity, searchQuery]
  );

  const visibleActivity = useMemo(
    () => activity.filter((entry) => activeKinds.includes(entry.kind)),
    [activity, activeKinds]
  );

  const toggleKind = useCallback((kind: ActivityKind) => {
    setActiveKinds((current) => {
      if (current.includes(kind)) {
        return current.length === 1 ? current : current.filter((entry) => entry !== kind);
      }

      return [...current, kind];
    });
  }, []);

  return (
    <main className="app-shell">
      <section className="hero-card hero-card--wide">
        <p className="eyebrow">NOP Chaos AMIS</p>
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
            />
          </div>
          <aside className="activity-panel">
            <div className="activity-panel__header">
              <p className="eyebrow">Live Monitor</p>
              <h2>Runtime Activity</h2>
              <p>Render, action, and API events stream here while you interact with the schema.</p>
            </div>
            <div className="activity-toolbar">
              <button
                type="button"
                className={`activity-control ${activityPaused ? 'activity-control--active' : ''}`}
                onClick={() => setActivityPaused((current) => !current)}
              >
                {activityPaused ? 'Resume Stream' : 'Pause Stream'}
              </button>
              <button type="button" className="activity-control" onClick={() => setActivity([])}>
                Clear Log
              </button>
            </div>
            <div className="activity-filters" aria-label="Activity filters">
              {(['render', 'action', 'api', 'notify'] as ActivityKind[]).map((kind) => {
                const active = activeKinds.includes(kind);

                return (
                  <button
                    key={kind}
                    type="button"
                    className={`activity-filter ${active ? 'activity-filter--active' : ''}`}
                    onClick={() => toggleKind(kind)}
                  >
                    {kind}
                  </button>
                );
              })}
            </div>
            <div className="activity-list">
              {visibleActivity.length === 0 ? <p className="activity-empty">No events match the current filter. Re-enable a kind or trigger a new interaction.</p> : null}
              {visibleActivity.map((entry, index) => (
                <article key={entry.id} className={`activity-entry ${index === 0 ? 'activity-entry--fresh' : ''}`}>
                  <div className="activity-entry__topline">
                    <span className={`activity-badge activity-badge--${entry.kind}`}>{entry.kind}</span>
                    <time className="activity-time">{entry.timestamp}</time>
                  </div>
                  <span className="activity-message">{entry.message}</span>
                  {entry.detail ? <code className="activity-detail">{entry.detail}</code> : null}
                </article>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
