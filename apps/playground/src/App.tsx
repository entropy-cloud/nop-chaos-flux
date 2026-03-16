import { createFormulaCompiler } from '@nop-chaos/amis-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/amis-react';
import type { ApiObject, ApiRequestContext, RendererEnv } from '@nop-chaos/amis-schema';
import { registerBasicRenderers } from '@nop-chaos/amis-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/amis-renderers-form';
import { registerDataRenderers } from '@nop-chaos/amis-renderers-data';

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

const env: RendererEnv = {
  async fetcher<T>(api: ApiObject, ctx: ApiRequestContext) {
    if (api.url === '/api/users') {
      return {
        ok: true,
        status: 200,
        data: {
          users,
          total: users.length
        } as T
      };
    }

    if (api.method?.toLowerCase() === 'post') {
      return {
        ok: true,
        status: 200,
        data: {
          success: true,
          payload: ctx.scope.read()
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
    console.log(`[${level}] ${message}`);
  }
};

const schema = {
  type: 'page',
  title: 'Renderer Playground',
  body: [
    {
      type: 'container',
      body: [
        {
          type: 'tpl',
          tpl: 'Welcome, ${currentUser.name}. Renderer refresh tick: ${refreshTick}'
        },
        {
          type: 'form',
          id: 'user-form',
          data: {
            username: '',
            email: '',
            role: 'viewer'
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
              placeholder: 'Enter username'
            },
            {
              type: 'input-email',
              name: 'email',
              label: 'Email',
              placeholder: 'Enter email'
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
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Open Preview Dialog',
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
                          action: 'closeDialog',
                          dialogId: '${dialogId}'
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
          source: '${users}',
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
                              action: 'closeDialog',
                              dialogId: '${dialogId}'
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
  return (
    <main className="app-shell">
      <section className="hero-card hero-card--wide">
        <p className="eyebrow">NOP Chaos AMIS</p>
        <h1>Renderer Playground</h1>
        <p className="body-copy">
          The first execution slice is live: schema compilation, runtime evaluation, React rendering,
          forms, dialogs, actions, and table operations all run inside the playground.
        </p>
        <div className="playground-stage">
          <SchemaRenderer
            schema={schema}
            data={{
              currentUser: { name: 'Architect' },
              refreshTick: 0,
              users
            }}
            env={env}
            registry={registry}
            formulaCompiler={formulaCompiler}
          />
        </div>
      </section>
    </main>
  );
}
