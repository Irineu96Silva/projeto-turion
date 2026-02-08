import { stableStringify } from '@turion/shared';

describe('stableStringify', () => {
  it('sorts top-level keys alphabetically', () => {
    const a = stableStringify({ b: 2, a: 1 });
    const b = stableStringify({ a: 1, b: 2 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":1,"b":2}');
  });

  it('sorts nested object keys recursively', () => {
    const result = stableStringify({
      z: { b: 2, a: 1 },
      a: { d: 4, c: 3 },
    });
    expect(result).toBe('{"a":{"c":3,"d":4},"z":{"a":1,"b":2}}');
  });

  it('preserves array order', () => {
    const result = stableStringify({ arr: [3, 1, 2] });
    expect(result).toBe('{"arr":[3,1,2]}');
  });

  it('handles null and undefined values', () => {
    const result = stableStringify({ b: null, a: undefined });
    // undefined values are dropped by JSON.stringify
    expect(result).toBe('{"b":null}');
  });

  it('handles deeply nested objects', () => {
    const a = stableStringify({
      guardrails: { on: true, blocked_topics: [], max_tokens: 256 },
      tone: 'formal',
    });
    const b = stableStringify({
      tone: 'formal',
      guardrails: { max_tokens: 256, on: true, blocked_topics: [] },
    });
    expect(a).toBe(b);
  });

  it('handles empty objects and arrays', () => {
    expect(stableStringify({})).toBe('{}');
    expect(stableStringify([])).toBe('[]');
  });

  it('handles strings, numbers, booleans', () => {
    expect(stableStringify('hello')).toBe('"hello"');
    expect(stableStringify(42)).toBe('42');
    expect(stableStringify(true)).toBe('true');
  });
});
