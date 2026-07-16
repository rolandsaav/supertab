import browser from 'webextension-polyfill';

/** Envelope every content→background call is packed into. */
export interface RpcRequest {
  module: string;
  op: string;
  args: unknown[];
}

/** Reply shape: the unwrapped return value, or a serialized error. */
export type RpcResponse =
  { ok: true; value: unknown } | { ok: false; error: string };

/**
 * A remote stand-in for a module's background API. Every property access returns a
 * function that forwards its call to the background worker and resolves with the
 * handler's return value (or throws its error) — so `api.query(...)` in content
 * reads like a local call but runs across the IPC boundary.
 */
export function defineProxy<T extends object>(module: string): T {
  const handler: ProxyHandler<T> = {
    get(_target, property) {
      const op = String(property);
      // Accessing `api.query` yields this function; calling it sends { module, op: 'query', args }.
      return (...args: unknown[]) => sendRequest({ module, op, args });
    },
  };
  return new Proxy({} as T, handler);
}

/** Send one RPC envelope to the background and unwrap its reply. */
async function sendRequest(request: RpcRequest): Promise<unknown> {
  const response = (await browser.runtime.sendMessage(request)) as RpcResponse;
  if (!response.ok) {
    throw new Error(response.error);
  }
  return response.value;
}
