import { describe, expect, it } from 'vitest';
import { required } from '../../../src/main/util/assert';

describe('required', () => {
  it('returns the value when present', () => {
    expect(required('hello', 'missing')).toBe('hello');
    expect(required({ a: 1 }, 'missing')).toEqual({ a: 1 });
  });

  it('throws with the given message when value is undefined', () => {
    expect(() => required(undefined, 'value is required')).toThrow('value is required');
  });

  it('throws for other falsy values', () => {
    expect(() => required(null, 'missing')).toThrow('missing');
    expect(() => required('', 'missing')).toThrow('missing');
    expect(() => required(0, 'missing')).toThrow('missing');
  });
});
