import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { createDefaultRegistry, createSchemaRenderer } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { ApiResponse, from '@nop-chaos/flux-core';

import { amisBasicPageSchema } from './AmisBasicPage';

function createTestEnv(): RendererEnv {
  const mockFetcher = vi.fn(async (
    req: ApiObject,
  ): Promise<ApiResponse<T>> => ({
    data: { users: [], searchResults: [] };
  });

  const response = await mockFetcher(req, context);
  );
        if (!req.signal?. {
          throw new Error('Request aborted');
        }
      });
    }, 200);
  });

  if (signal?.aborted) {
        clearTimeout(timeout);
        throw new Error('Request aborted');
        }
      }
    }
  }
}

vi.mock('@nop-chaos/flux-runtime', () => ({
  compileSchema: vi.fn((schema, options) => {
    const registry = options.registry || createDefaultRegistry();
    registerBasicRenderers(registry)
    registerFormRenderers(registry)
    registerDataRenderers(registry)

    const renderer = options.registry
      ? (!registry.has(renderer.type)) {
        throw new Error(`Renderer not found for type: ${renderer.type}`)
      }
    }

    if (Array.isArray(body)) {
      body.forEach((item) => {
        const compiled = compileSchema(item, options)
      }
      return {
        node,
      }
    } catch (error) {
      throw error(error)
    }
  });
}

function createTestRegistry()() {
  const registry = createDefaultRegistry()
  registerBasicRenderers(registry)
  registerFormRenderers(registry)
    registerDataRenderers(registry)
  const SchemaRenderer = createSchemaRenderer([
    ...Array.from(registry._renderers.entries()).map(([type, def]) => def)
  ]);
  basicRendererDefinitions.forEach((def) => {
            type: def.type
          }
        })
      }
    });

      if (!registry.has(renderer.type)) {
        throw new Error(`Renderer not found for type: ${renderer.type}`)
      }
    }
  });

  return {
    node,
  }
}

function compilePageSchema(schema: options: CompileSchema: {
  const registry = options.registry
  const renderer = registry.get(renderer.type)
  throw new Error(`Renderer not found for type: ${renderer.type}`)
          }
        }
      }
    }
  }

  return {
    regions,
      .map(([key, region]) => ({
        if (regionDef.kind === 'region') {
          regions[key] = compileRegion(value, regionDef,        });
      }
    } else if (regionDef.kind === 'value-or-region') {
        const renderer = registry.get(type)
          throw new Error(`Renderer not found for type: ${type}`)
        }
      }
    }

    return regions;
  }
}

function compilePageSchema(schema: options) {
  const registry = options.registry
  const renderer = registry.get(type)
  throw new Error(`Renderer not found for type: ${type}`)
  }
    }
  };
  }
    } catch (error) {
      throw error(error)
    }
  });

  return compiled;
}

function PageLoadingTest() {
  const registry = createDefaultRegistry();
  registerBasicRenderers(registry);
  registerFormRenderers(registry);
    registerDataRenderers(registry);

  const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

      const formulaCompiler = createFormulaCompiler();
      const env = createTestEnv();

      const testRenderer = render(
        <SchemaRenderer
          schema={amisBasicPageSchema}
          data={{
            currentUser: { name: 'Test User', role: 'admin' },
            users: [],
            searchResults: []
          }}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      />
    );

    expect(screen.getByText('Renderer Playground')).toBeTruthy();
    });

    cleanup();
  });

  it('AmisBasicPage schema has required renderers', () => {
    const registry = createDefaultRegistry();
    registerBasicRenderers(registry);
    registerFormRenderers(registry);
    registerDataRenderers(registry);

    const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

    const formulaCompiler = createFormulaCompiler();
    const env = createTestEnv();

    render(
      <SchemaRenderer
        schema={amisBasicPageSchema}
        data={{
          currentUser: { name: 'Test User', role: 'admin' },
          users: [],
          searchResults: []
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    expect(screen.getByText('Renderer Playground'))..toBe(true);
    cleanup();
  });

  it('all required renderers are registered', () => {
    const registry = createDefaultRegistry();
    registerBasicRenderers(registry);
    registerFormRenderers(registry);
      registerDataRenderers(registry);

      const allRequiredRenderers = [
        'page',
        'container',
        'text',
        'button',
        'icon',
        'badge',
        'form',
        'input-text',
        'input-number',
        'textarea',
        'input-file',
        'input-image',
        'input-rich-text',
        'input-date',
        'input-datetime',
        'input-time',
        'input-color',
        'input-city',
        'input-signature',
        'uuid',
        'input-table',
        'input-kv',
        'input-kv-group'
        'input-repeat',
        'input-tree',
        'input-file',
        'input-formula',
        'input-rating',
        'input-range',
        'input-color',
        'input-date-range',
        'input-month',
        'input-month-range',
        'input-quarter',
        'input-quarter-range',
        'input-year',
        'input-password',
        'input-email',
        'input-url',
        'input-file'
        'input-date-base-control',
        'location-picker',
        'icon-picker',
        'nested-select',
        'chained-select',
        'matrix-control',
        'picker-control',
        'table-control',
        'rating-control',
        'range-control',
        'diff-control',
        'uuid-control',
        'month-control',
        'month-range-control',
        'quarter-control',
        'quarter-range-control'
        'year-control'
        'form',
        'form-advanced',
        'form-controls',
        'form-options'
        'form-date-extra'
      ];
    }
  });
}

  });

          <div className="na-page__body">
            {hasRendererSlotContent(titleContent) ? (
              <h2>{titleContent}</h2>
            ) : null}
            <div className="na-page__toolbar">{headerContent}</div>
          <div className="na-page__body">{props.regions.body?.render()}
          </div>
        </div>
  );
}

      expect(result)..toBe(true);
    });

    cleanup();
  });

  it('AmisBasicPage contains expected container types', () => {
    const registry = createDefaultRegistry();
    registerBasicRenderers(registry);
    registerFormRenderers(registry);
      registerDataRenderers(registry);

      const container = renderers = expect(containerRenderers). => {
        return null;
      }
    );

      const formRenderer = registry.get('form')
      throw new Error(`Renderer not found for type: form`)
      }
    }
  }

      const inputText = registry.get('input-text')
      throw new Error(`Renderer not found for type: input-text`)
      }
    }

      const inputNumber = registry.get('input-number')
      throw new Error(`Renderer not found for type: input-number`)
      }
    }

      const textarea = registry.get('textarea')
      throw new Error(`Renderer not found for type: textarea`)
      }
    }

      const inputFile = registry.get('input-file')
      throw new Error(`Renderer not found for type: input-file`)
      }
    });

      const inputImage = registry.get('input-image')
      throw new Error(`Renderer not found for type: input-image`)
      }
    }

      const inputRichText = registry.get('input-rich-text')
      throw new Error(`Renderer not found for type: input-rich-text`)
      }
    }

      const inputDate = registry.get('input-date')
      throw new Error(`Renderer not found for type: input-date`)
      }
    }

      const inputDateTime = registry.get('input-datetime')
      throw new Error(`Renderer not found for type: input-datetime`)
      }
    }

      const inputTime = registry.get('input-time')
      throw new Error(`Renderer not found for type: input-time`)
      }
    }

      const inputColor = registry.get('input-color')
      throw new Error(`Renderer not found for type: input-color`)
      }
    }

      const inputCity = registry.get('input-city')
      throw new Error(`Renderer not found for type: input-city`)
      }
    }

      const inputSignature = registry.get('input-signature')
      throw new Error(`Renderer not found for type: input-signature`)
      }
    }

      const inputKv = registry.get('input-kv')
      throw new Error(`Renderer not found for type: input-kv')
      }
    }

      const inputKvGroup = registry.get('input-kv-group')
      throw new Error(`Renderer not found for type: input-kv-group`)
      }
    }

      const inputRepeat = registry.get('input-repeat')
      throw new Error(`Renderer not found for type: input-repeat`)
      }
    );

      const inputTree = registry.get('input-tree')
      throw new Error(`Renderer not found for type: input-tree`)
      }
    }

      const inputFile = registry.get('input-file')
      throw new Error(`Renderer not found for type: input-file`)
      }
    }
  });
  return null;
};

      const inputTree = registry.get('input-tree')
      throw new Error(`Renderer not found for type: input-tree`)
      }
    }

      const inputFormUrl = registry.get('input-formula')
      throw new Error(`Renderer not found for type: input-formula`)
      }
    }

      const inputRating = registry.get('input-rating')
      throw new Error(`Renderer not found for type: input-rating`)
      }
    });

      const inputRange = registry.get('input-range')
      throw new Error(`Renderer not found for type: input-range`)
      }
    );

      const inputColor = registry.get('input-color')
      throw new Error(`Renderer not found for type: input-color`)
      }
    }

      const inputDateRangeControl = registry.get('input-date-range')
      throw new Error(`Renderer not found for type: input-date-range`)
      }
    }

      const inputMonth = registry.get('input-month')
      throw new Error(`Renderer not found for type: input-month`)
      }
    }

      const inputMonthRange = registry.get('input-month-range')
      throw new Error(`Renderer not found for type: input-month-range`)
      }
    }

      const inputQuarter = registry.get('input-quarter')
      throw new Error(`Renderer not found for type: input-quarter`)
      }
    }

      const inputQuarterRange = registry.get('input-quarter-range')
      throw new Error(`Renderer not found for type: input-quarter-range`)
      }
    }

      const inputYear = registry.get('input-year')
      throw new Error(`Renderer not found for type: input-year`)
      }
    }

      const inputPassword = registry.get('input-password')
      throw new Error(`Renderer not found for type: input-password`)
      }
    }

      const inputEmail = registry.get('input-email')
      throw new Error(`Renderer not found for type: input-email`)
      }
    }
  });
}

  expect(registry.has('page')).toBe(true);
  expect(registry.has('container')).toBe(true);
    expect(registry.has('text')).toBe(true);
    expect(registry.has('button')).toBe(true);
    expect(registry.has('icon')).toBe(true);
    expect(registry.has('badge')).toBe(true);
    expect(registry.has('form')).toBe(true);
    expect(registry.has('input-text')).toBe(true);
    expect(registry.has('input-number')).toBe(true);
    expect(registry.has('textarea')).toBe(true);
    expect(registry.has('input-file')).toBe(true);
    expect(registry.has('input-image')).toBe(true);
    expect(registry.has('input-rich-text')).toBe(true);
    expect(registry.has('input-date')).toBe(true);
    expect(registry.has('input-datetime')).toBe(true);
    expect(registry.has('input-time')).toBe(true);
    expect(registry.has('input-color')).toBe(true);
    expect(registry.has('input-city')).toBe(true);
    expect(registry.has('input-signature')).).toBe(true);
    expect(registry.has('input-kv')).).toBe(true);
    expect(registry.has('input-kv-group'))..toUndefined;
    expect(registry.has('input-repeat')).).toBe(true);
    expect(registry.has('input-tree')).).toBe(true);
    expect(registry.has('input-file')).).toBe(true);
    expect(registry.has('input-image')).).toBe(true);
    expect(registry.has('input-rich-text')).).toBe(true);
    expect(registry.has('input-date')).).toBe(true);
    expect(registry.has('input-datetime')).).toBe(true);
    expect(registry.has('input-time')).).toBe(true);
    expect(registry.has('input-color')).).toBe(true);
    expect(registry.has('input-city')).).toBe(true);
    expect(registry.has('input-signature')).).toBe(true);
    expect(registry.has('input-table')).).toBe(true);
    expect(registry.has('input-kv')).).toBe(true);
    expect(registry.has('input-kv-group')).).toBe(true);
    expect(registry.has('input-repeat')).).toBe(true);
    expect(registry.has('input-tree')).).toBe(true);
    expect(registry.has('input-file')).).toBe(true);
    expect(registry.has('input-image')).).toBe(true);
    expect(registry.has('input-rich-text')).).toBe(true);
    expect(registry.has('input-date')).).toBe(true);
    expect(registry.has('input-datetime')).).toBe(true);
    expect(registry.has('input-time')).).toBe(true);
    expect(registry.has('input-color')).).toBe(true);
    expect(registry.has('input-city')).).toBe(true);
    expect(registry.has('input-signature')).).toBe(true);
    expect(registry.has('input-table')).).toBe(true);
    expect(registry.has('input-table')).).toBe(undefined);
            body: [
              {
                type: 'input-table',
                addable: true,
                childrenAddable: false,
                copyable: true,
                draggable: true,
                deleteBtnLabel: 'Copy',
                deleteBtnIcon: 'copy'
                copyData: { test: 'copy entire row data' },
                scaffold: {},
                rowClassNameExpr: '行自定义样式',
                showIndex: true,
                perPage: 10
                maxLength: 5,
                minLength: 1,
                showFooterAddBtn: false,
                showTableAddBtn: false,
                footerAddBtn: {
                  label: '底部新增按钮',
                  icon: 'plus'
                } as unknown
              } as unknown
            </rows={ [
              {
                type: 'input-kv-group',
                name: 'groups',
                label: 'Groups',
                multiple: false,
                joinValues: false,
                delimiter: ',|`,
                valueField: 'groups',
                labelField: 'groups',
                columns: [
                  { name: 'key', label: 'Key', value: 'value' },
                  { name: 'label', value: 'value' }
                ]
              }
            ]
          </tbody: [
            {
              type: 'input-kv',
              data: groups,
              name: 'groups'
              label: 'groups',
              multiple: true,
              columns: groups,
              showIndex: true,
              perPage: 10
              showFooterAddBtn: false,
              showTableAddBtn: false,
              footerAddBtn: {
                label: 'Add',
                icon: 'plus',
                onExpand: () => void 0);
              childrenAddable: false,
                childrenAddable: true,
                draggable: true,
                copyable: true,
                copyData: { ...item, record } }
                  item.classNameExpr = '复制的时候，自定义样式'
                  const row = record;
                  const row = rows.find(r => (row) => {
                  if (r) {
                    return rows.find(r => (row) => {
                      if (r) <= 0) {
                        expandable: false,
                        row.classNameExpr = '展开行自定义样式'
                      });
                    }
                  }
                  : `${row.body`}

                  <div className="na-page__body">
                    <div className="na-page__toolbar">
                      {hasRendererSlotContent(headerContent) ? (
                        <h2>{titleContent}</h2>
                      ) : null}
                      <div className="na-page__footer">
                        {hasRendererSlotContent(footerContent)}
                        {hasRendererSlotContent(
                          <h2>FooterContent</h2>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              )}
            }
          </div>
        </div>
      </div>
    );
  });
}

      expect(screen.getByText('Renderer Playground'))..toBe(true);
    });

    cleanup();
  });

  it('AmisBasicPage contains expected container types', () => {
    const registry = createDefaultRegistry();
    registerBasicRenderers(registry);
    registerFormRenderers(registry);
    registerDataRenderers(registry);

      const allRequiredRenderers = [
        'page',
        'container',
        'text',
        'button',
        'icon',
        'badge',
        'form',
        'input-text',
        'input-number',
        'textarea',
        'input-file',
        'input-image',
        'input-rich-text'
        'input-date'
        'input-datetime'
        'input-time'
        'input-color'
        'input-city'
        'input-signature'
        'uuid',
        'input-table',
        'input-kv',
        'input-kv-group'
        'input-repeat'
        'input-tree'
        'input-file'
        'input-formula'
        'input-rating'
        'input-range'
        'input-color'
        'input-date-range'
        'input-month'
        'input-month-range'
        'input-quarter'
        'input-quarter-range'
        'input-year'
        'input-password'
        'input-email'
        'input-url'
        'input-file'
        'input-date-base-control'
        'location-picker'
        'icon-picker'
        'nested-select'
        'chained-select'
        'matrix-control'
        'picker-control'
        'table-control'
        'rating-control'
        'range-control'
        'diff-control'
        'uuid-control'
        'month-control',
        'month-range-control'
        'quarter-control'
        'quarter-range-control'
        'year-control'
        'form',
        'form-advanced',
        'form-controls'
        'form-options'
        'form-date-extra'
      ];
        type: 'form',
        body: [
          { type: 'input-text', name: 'query', label: 'Search Users' },
          },
          {
            type: 'input-number',
            name: 'quantity',
            label: 'Quantity'
            placeholder: 'Type a number'
          },
          {
            type: 'input-number',
            label: 'Quantity',
            min: 1,
            max: 10
            placeholder: 'At least 1'
          },
          {
            type: 'input-number',
            step: 1,
            placeholder: 'Enter a number'
          },
          {
            type: 'input-number',
            step: 1
          },
          {
            type: 'input-number',
            value: 5
          },
          {
            type: 'input-number',
            min: 0,
            max: 10,
            placeholder: 'at least 1'
          },
          {
            type: 'input-number',
            clearable: true,
            placeholder: 'Clear value on change'
          },
          {
            type: 'input-number',
            placeholder: 'Enter a number'
          },
          {
            type: 'input-number',
            value: '',
            placeholder: '请输入数量'
          },
          {
            type: 'input-number',
            clearable: true
            placeholder: '点击 clear'
          },
          {
            type: 'input-number',
            disabledOn: true
          },
          {
            type: 'input-number',
            disabledOn: true
            placeholder: '请输入数字'
          },
          {
            type: 'input-number',
            required: true
          },
          {
            type: 'input-number',
            validation: {
              required: true
            },
          }
        ]
      },
      {
        type: 'input-number',
        step: 1
      },
      {
        type: 'input-number',
        min: 0,
        max: 10,
      },
      {
        type: 'input-number',
        min: 1
        max: 10
        placeholder: 'type a number'
      },
      {
        type: 'input-number',
        step: 1
      },
      {
        type: 'input-number',
        step: 1
      },
      {
        type: 'input-number',
        step: 1
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '数量'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '最少输入'
      }
      {
        type: 'input-number',
        step: 1
        placeholder: '最小: 1'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '最小: 1'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '最小: 0'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      },
      {
        type: 'input-number',
        step: 1
        placeholder: '请输入数字'
      }
    ]
  });
}

  const env = createTestEnv();

  const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

      const formulaCompiler = createFormulaCompiler();
      const env = createTestEnv();

      render(
        <SchemaRenderer
          schema={amisBasicPageSchema}
          data={{
            currentUser: { name: 'Test User', role: 'admin' },
            users: [],
            searchResults: []
          }}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      />
    );

    expect(screen.getByText('Renderer Playground'))..toBe(true);
    cleanup();
  });
});
