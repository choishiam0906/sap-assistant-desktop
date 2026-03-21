import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { wrapHandler } from '../helpers/wrapHandler.js';

// Mock logger
vi.mock('../../logger.js', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logger } from '../../logger.js';

describe('wrapHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns result from successful handler', async () => {
    const handler = vi.fn().mockResolvedValue({ data: 'test' });
    const wrapped = wrapHandler('test-channel', handler);

    const result = await wrapped('arg1', 'arg2');

    expect(result).toEqual({ data: 'test' });
    expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('throws Error with [channel] message format on failure', async () => {
    const error = new Error('original error message');
    const handler = vi.fn().mockRejectedValue(error);
    const wrapped = wrapHandler('test-channel', handler);

    await expect(wrapped()).rejects.toThrow('[test-channel] original error message');
  });

  it('logs error with channel name when handler throws', async () => {
    const error = new Error('handler failed');
    const handler = vi.fn().mockRejectedValue(error);
    const wrapped = wrapHandler('my-channel', handler);

    try {
      await wrapped();
    } catch {
      // Expected
    }

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'my-channel',
        err: error,
      }),
      expect.stringContaining('my-channel'),
    );
  });

  it('logs warning for slow handlers (>3000ms)', async () => {
    const handler = vi.fn().mockImplementation(() => {
      vi.advanceTimersByTime(3100);
      return Promise.resolve('result');
    });
    const wrapped = wrapHandler('slow-channel', handler);

    await wrapped();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'slow-channel',
        elapsed: expect.any(Number),
      }),
      expect.stringContaining('느린 핸들러'),
    );
  });

  it('handles non-Error throws (string)', async () => {
    const handler = vi.fn().mockRejectedValue('string error');
    const wrapped = wrapHandler('string-channel', handler);

    await expect(wrapped()).rejects.toThrow('[string-channel] string error');
  });

  it('handles non-Error throws (number)', async () => {
    const handler = vi.fn().mockRejectedValue(42);
    const wrapped = wrapHandler('number-channel', handler);

    await expect(wrapped()).rejects.toThrow('[number-channel] 42');
  });

  it('preserves async behavior', async () => {
    const handler = vi.fn(async () => {
      vi.advanceTimersByTime(100);
      return 'async result';
    });
    const wrapped = wrapHandler('async-channel', handler);

    const resultPromise = wrapped();
    expect(resultPromise).toBeInstanceOf(Promise);

    const result = await resultPromise;
    expect(result).toBe('async result');
  });

  it('passes arguments through correctly', async () => {
    const handler = vi.fn((...args: unknown[]) => {
      return Promise.resolve(args);
    });
    const wrapped = wrapHandler('args-channel', handler);

    const testObj = { key: 'value' };
    const result = await wrapped(42, 'hello', testObj);

    expect(handler).toHaveBeenCalledWith(42, 'hello', testObj);
    expect(result).toEqual([42, 'hello', testObj]);
  });

  it('does not log warning for handlers <=3000ms', async () => {
    const handler = vi.fn().mockImplementation(() => {
      vi.advanceTimersByTime(3000);
      return Promise.resolve('result');
    });
    const wrapped = wrapHandler('fast-channel', handler);

    await wrapped();

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs elapsed time in error context', async () => {
    const handler = vi.fn().mockImplementation(() => {
      vi.advanceTimersByTime(500);
      return Promise.reject(new Error('timeout'));
    });
    const wrapped = wrapHandler('timed-channel', handler);

    try {
      await wrapped();
    } catch {
      // Expected
    }

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        elapsed: expect.any(Number),
      }),
      expect.any(String),
    );
  });

  it('supports synchronous handlers', async () => {
    const handler = vi.fn().mockReturnValue('sync result');
    const wrapped = wrapHandler('sync-channel', handler);

    const result = await wrapped();

    expect(result).toBe('sync result');
    expect(handler).toHaveBeenCalled();
  });

  it('maintains error context through wrapped call', async () => {
    const originalError = new Error('original context');
    originalError.stack = 'custom stack trace';
    const handler = vi.fn().mockRejectedValue(originalError);
    const wrapped = wrapHandler('context-channel', handler);

    try {
      await wrapped();
    } catch (err) {
      const thrownError = err as Error;
      expect(thrownError.message).toContain('[context-channel]');
      expect(thrownError.message).toContain('original context');
    }

    const errorCall = (logger.error as any).mock.calls[0];
    expect(errorCall[0].err).toBe(originalError);
  });
});
