import browser from 'webextension-polyfill';
import type { RpcRequest, RpcResponse } from './rpc';

/**
 * A single background operation. Its arguments arrive over IPC as `unknown`, so
 * they are typed loosely here; the module's own `api` interface is what keeps the
 * caller and this implementation honest about their real shapes.
 */
type OperationHandler = (...args: unknown[]) => Promise<unknown>;

/** One module's operations, keyed by operation name (e.g. `query`, `closeTab`). */
type ModuleHandlers = Record<string, OperationHandler>;

/** Every registered module's handlers, keyed by module name. Rebuilt on each worker wake. */
const modules: Record<string, ModuleHandlers> = {};

/**
 * Register a module's background handlers. `handlers` is the module's `api`
 * implementation — an object of async methods. It is typed as `object` because
 * each module's method signatures are specific; we store it under the uniform
 * handler shape and trust the module's `api` interface to match both sides.
 */
export function registerModule(name: string, handlers: object): void {
  modules[name] = handlers as ModuleHandlers;
}

/** True when a message is one of our RPC envelopes. */
function isRpcRequest(message: unknown): message is RpcRequest {
  const candidate = message as Partial<RpcRequest>;
  return (
    typeof candidate?.module === 'string' && typeof candidate?.op === 'string'
  );
}

/** Find the handler an RpcRequest names, run it, and report the outcome. */
async function runOperation(request: RpcRequest): Promise<RpcResponse> {
  const handlers = modules[request.module];
  if (!handlers) {
    return { ok: false, error: `Unknown module: ${request.module}` };
  }

  const handler = handlers[request.op];
  if (!handler) {
    return {
      ok: false,
      error: `Unknown operation: ${request.module}.${request.op}`,
    };
  }

  try {
    const value = await handler(...request.args);
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

// Non-RPC messages are ignored: returning undefined leaves them for any other
// onMessage listener to claim.
browser.runtime.onMessage.addListener((message: unknown) => {
  if (!isRpcRequest(message)) {
    return undefined;
  }
  return runOperation(message);
});
