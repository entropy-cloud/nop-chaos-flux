import { describe, expect, it } from 'vitest';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { compileReaction, isReactionFullyStatic } from './reaction-compiler';
import type { ReactionSchema } from '@nop-chaos/flux-core';

describe('compileReaction', () => {
  const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

  describe('basic reactions', () => {
    it('compiles a basic reaction with single watch template', () => {
      const schema: ReactionSchema = {
        type: 'reaction',
        watch: '${selectedId}',
        actions: {
          action: 'reload',
          targetId: 'details-panel'
        }
      };

      const compiled = compileReaction('rx-1', schema, expressionCompiler);

      expect(compiled.id).toBe('rx-1');
      // watch is now a CompiledRuntimeValue
      expect(compiled.watch.isStatic).toBe(false);
      expect(compiled.action).toBeDefined();
      expect(compiled.action.nodes).toHaveLength(1);
      expect(compiled.action.nodes[0].action).toBe('reload');
    });

    it('compiles a reaction with static watch value', () => {
      const schema: ReactionSchema = {
        type: 'reaction',
        watch: 'staticValue',
        actions: {
          action: 'reload'
        }
      };

      const compiled = compileReaction('rx-2', schema, expressionCompiler);

      // Non-template string is compiled as static
      expect(compiled.watch.isStatic).toBe(true);
      if (compiled.watch.isStatic) {
        expect(compiled.watch.value).toBe('staticValue');
      }
    });

    it('compiles a reaction with array watch (uses first element)', () => {
      const schema: ReactionSchema = {
        type: 'reaction',
        watch: ['${userId}', '${filters}', '${page}'],
        actions: {
          action: 'reload'
        }
      };

      const compiled = compileReaction('rx-3', schema, expressionCompiler);

      // Only first watch template is compiled
      expect(compiled.watch.isStatic).toBe(false);
    });

    it('treats array root-path watch entries as dynamic scope reads', () => {
      const schema: ReactionSchema = {
        type: 'reaction',
        watch: ['counter'],
        actions: {
          action: 'reload'
        }
      };

      const compiled = compileReaction('rx-3b', schema, expressionCompiler);

      expect(compiled.watch.isStatic).toBe(false);
    });

    it('compiles a reaction with when condition', () => {
      const schema: ReactionSchema = {
        type: 'reaction',
        watch: '${formData}',
        // when is a raw expression (not a template)
        when: 'formData.status === "ready"',
        actions: {
          action: 'submit'
        }
      };

      const compiled = compileReaction('rx-4', schema, expressionCompiler);

      expect(compiled.when).toBeDefined();
      // when is a CompiledExpression with exec method
      expect(typeof compiled.when?.exec).toBe('function');
    });
  });

  describe('timing options', () => {
    it('preserves immediate flag', () => {
      const schema: ReactionSchema = {
        type: 'reaction',
        watch: '${config}',
        immediate: true,
        actions: {
          action: 'initialize'
        }
      };

      const compiled = compileReaction('rx-5', schema, expressionCompiler);

      expect(compiled.immediate).toBe(true);
    });

    it('preserves debounce value', () => {
      const schema: ReactionSchema = {
        type: 'reaction',
        watch: '${searchQuery}',
        debounce: 300,
        actions: {
          action: 'search'
        }
      };

      const compiled = compileReaction('rx-6', schema, expressionCompiler);

      expect(compiled.debounce).toBe(300);
    });

    it('preserves once flag', () => {
      const schema: ReactionSchema = {
        type: 'reaction',
        watch: '${initialized}',
        once: true,
        actions: {
          action: 'setup'
        }
      };

      const compiled = compileReaction('rx-7', schema, expressionCompiler);

      expect(compiled.once).toBe(true);
    });
  });

  describe('dependencies', () => {
    it('preserves dependsOn array', () => {
      const schema: ReactionSchema = {
        type: 'reaction',
        watch: '${data}',
        dependsOn: ['source-1', 'source-2'],
        actions: {
          action: 'process'
        }
      };

      const compiled = compileReaction('rx-8', schema, expressionCompiler);

      expect(compiled.dependsOn).toEqual(['source-1', 'source-2']);
    });
  });

  describe('complex actions', () => {
    it('compiles reaction with multiple actions', () => {
      const schema: ReactionSchema = {
        type: 'reaction',
        watch: '${selection}',
        actions: [
          { action: 'validate' },
          { action: 'save' },
          { action: 'notify', args: { message: 'Saved!' } }
        ] as unknown as import('@nop-chaos/flux-core').ActionSchema
      };

      const compiled = compileReaction('rx-9', schema, expressionCompiler);

      expect(compiled.action.nodes).toHaveLength(3);
    });

    it('compiles reaction with action containing expressions', () => {
      const schema: ReactionSchema = {
        type: 'reaction',
        watch: '${value}',
        actions: {
          action: 'setValue',
          args: {
            path: 'computed',
            value: '${value * 2}'
          }
        }
      };

      const compiled = compileReaction('rx-10', schema, expressionCompiler);

      expect(compiled.action.isFullyStatic).toBe(false);
    });
  });

  describe('isReactionFullyStatic', () => {
    it('returns true for fully static reaction with static watch', () => {
      const schema: ReactionSchema = {
        type: 'reaction',
        watch: 'trigger',
        actions: {
          action: 'doSomething',
          args: { key: 'value' }
        }
      };

      const compiled = compileReaction('rx-11', schema, expressionCompiler);

      expect(isReactionFullyStatic(compiled)).toBe(true);
    });

    it('returns false when watch has expression', () => {
      const schema: ReactionSchema = {
        type: 'reaction',
        watch: '${data}',
        actions: {
          action: 'process'
        }
      };

      const compiled = compileReaction('rx-12', schema, expressionCompiler);

      expect(isReactionFullyStatic(compiled)).toBe(false);
    });

    it('returns false when when condition exists', () => {
      const schema: ReactionSchema = {
        type: 'reaction',
        watch: 'data',
        when: 'data.ready',
        actions: {
          action: 'process'
        }
      };

      const compiled = compileReaction('rx-13', schema, expressionCompiler);

      // when expressions always need runtime evaluation
      expect(isReactionFullyStatic(compiled)).toBe(false);
    });

    it('returns false when action has expressions', () => {
      const schema: ReactionSchema = {
        type: 'reaction',
        watch: 'input',
        actions: {
          action: 'transform',
          args: {
            result: '${input.toUpperCase()}'
          }
        }
      };

      const compiled = compileReaction('rx-14', schema, expressionCompiler);

      expect(isReactionFullyStatic(compiled)).toBe(false);
    });
  });
});
