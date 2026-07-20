import { describe, it, expect } from 'vitest';
import { boardDataToJson, boardDataFromJson } from './kanban-export.js';
import type { BoardData } from '../kanban.types.js';

const sampleBoard: BoardData = {
  root: { id: 'root', type: 'root', children: ['col1'], data: {}, meta: {} },
  col1: { id: 'col1', type: 'column', parentId: 'root', children: ['card1'], data: { title: 'To Do' }, meta: {} },
  card1: { id: 'card1', type: 'card', parentId: 'col1', children: [], data: { title: 'Task 1' }, meta: {} },
};

describe('boardDataToJson', () => {
  it('serializes BoardData to JSON string', () => {
    const json = boardDataToJson(sampleBoard);
    const parsed = JSON.parse(json);
    expect(parsed.root).toBeDefined();
    expect(parsed.col1).toBeDefined();
    expect(parsed.card1).toBeDefined();
  });

  it('produces pretty-printed JSON', () => {
    const json = boardDataToJson(sampleBoard);
    expect(json).toContain('\n  ');
  });
});

describe('boardDataFromJson', () => {
  it('deserializes valid JSON', () => {
    const json = JSON.stringify(sampleBoard);
    const result = boardDataFromJson(json);
    expect(result.root).toBeDefined();
    expect(result.root.type).toBe('root');
    expect(result.root.children).toEqual(['col1']);
    expect(result.card1.data.title).toBe('Task 1');
  });

  it('throws for JSON without root', () => {
    expect(() => boardDataFromJson('{"foo": "bar"}')).toThrow('Invalid BoardData snapshot');
  });

  it('throws for malformed JSON', () => {
    expect(() => boardDataFromJson('not json')).toThrow();
  });

  it('round-trips BoardData correctly', () => {
    const json = boardDataToJson(sampleBoard);
    const restored = boardDataFromJson(json);
    expect(restored).toEqual(sampleBoard);
  });
});
