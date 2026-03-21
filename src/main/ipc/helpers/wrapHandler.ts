import { logger } from "../../logger.js";

/**
 * IPC 핸들러를 에러 래핑 + 실행 시간 측정한다.
 * 에러 발생 시 로깅 후 정규화된 메시지(`[channel] message`)로 reject하여
 * Renderer에서 일관된 에러 처리가 가능하도록 한다.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function wrapHandler<T>(
  channel: string,
  fn: (...args: any[]) => T | Promise<T>,
): (...args: any[]) => Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (...args: any[]): Promise<T> => {
    const start = Date.now();
    try {
      const result = await fn(...args);
      const elapsed = Date.now() - start;
      if (elapsed > 3000) {
        logger.warn({ channel, elapsed }, `IPC 느린 핸들러: ${channel} (${elapsed}ms)`);
      }
      return result;
    } catch (err) {
      const elapsed = Date.now() - start;
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ channel, elapsed, err }, `IPC 핸들러 에러: ${channel}`);
      throw new Error(`[${channel}] ${message}`);
    }
  };
}
