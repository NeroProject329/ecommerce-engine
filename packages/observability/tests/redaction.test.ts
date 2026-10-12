import { describe, expect, it } from 'vitest';
import { redactContext } from '../src';

describe('redactContext', () => {
  it('redacts known secret fields without mutating safe metadata', () => {
    expect(redactContext({ token: 'secret-value', requestId: 'req-1' })).toEqual({
      token: '[REDACTED]',
      requestId: 'req-1',
    });
  });
});
