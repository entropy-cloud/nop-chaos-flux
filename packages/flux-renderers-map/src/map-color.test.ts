import { describe, expect, it } from 'vitest';
import { buildColorScale } from './map-color.js';

const DATA_RANGE = { min: 0, max: 100 };

describe('buildColorScale', () => {
  it('interpolates across colors between min and max', () => {
    const scale = buildColorScale(
      { min: 0, max: 100, colors: ['#ff0000', '#0000ff'] },
      null,
    );
    expect(scale.color(0)).toBe('#ff0000');
    expect(scale.color(100)).toBe('#0000ff');
    expect(scale.color(50)).toBe('#800080');
  });

  it('clamps values outside the declared range', () => {
    const scale = buildColorScale({ min: 10, max: 20, colors: ['#000000', '#ffffff'] }, null);
    expect(scale.color(5)).toBe('#000000');
    expect(scale.color(200)).toBe('#ffffff');
  });

  it('uses the data range when visualMap lacks min/max', () => {
    const scale = buildColorScale({ colors: ['#111111', '#eeeeee'] }, DATA_RANGE);
    expect(scale.color(0)).toBe('#111111');
    expect(scale.color(100)).toBe('#eeeeee');
  });

  it('returns defaultColor for missing, NaN or infinite values', () => {
    const scale = buildColorScale(
      { min: 0, max: 100, colors: ['#111111', '#eeeeee'], defaultColor: '#888888' },
      null,
    );
    expect(scale.color(undefined)).toBe('#888888');
    expect(scale.color(Number.NaN)).toBe('#888888');
    expect(scale.color(Number.POSITIVE_INFINITY)).toBe('#888888');
  });

  it('falls back to the scale default color when no defaultColor is configured', () => {
    const scale = buildColorScale({ min: 0, max: 100, colors: ['#111111', '#eeeeee'] }, null);
    expect(scale.color(undefined)).toBe('#dddddd');
  });

  it('renders a flat scale when min equals max', () => {
    const scale = buildColorScale({ min: 5, max: 5, colors: ['#ff0000', '#0000ff'] }, null);
    expect(scale.color(5)).toBe('#ff0000');
  });

  it('renders a single configured color for every value', () => {
    const scale = buildColorScale({ min: 0, max: 10, colors: ['#00ff00'] }, null);
    expect(scale.color(0)).toBe('#00ff00');
    expect(scale.color(5)).toBe('#00ff00');
    expect(scale.color(10)).toBe('#00ff00');
  });

  it('falls back to a default palette when no colors are configured', () => {
    const scale = buildColorScale({ min: 0, max: 10 }, DATA_RANGE);
    const first = scale.color(0);
    const last = scale.color(10);
    expect(first).not.toBe(last);
    expect(first).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('is fully flat (defaultColor) when no range is derivable', () => {
    const scale = buildColorScale(undefined, null);
    expect(scale.color(1)).toBe('#dddddd');
    expect(scale.color(undefined)).toBe('#dddddd');
  });

  it('handles multi-stop interpolation across middle colors', () => {
    const scale = buildColorScale(
      { min: 0, max: 100, colors: ['#000000', '#ff0000', '#ffffff'] },
      null,
    );
    expect(scale.color(50)).toBe('#ff0000');
    expect(scale.color(25)).toBe('#800000');
    expect(scale.color(75)).toBe('#ff8080');
  });
});
