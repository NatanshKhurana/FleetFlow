import { readErrorKind } from '../lib/requestErrors.js';

// Shared read lifecycle. Keep data only when it still belongs to this request.
export function createRequestResource(fetchData, { canRetainData = () => true } = {}) {
  let snapshot = { status: 'loading', data: null };
  let currentRequest;
  const listeners = new Set();

  function publish(next) {
    snapshot = next;
    for (const listener of listeners) listener();
  }

  function cancel() {
    currentRequest?.abort();
    currentRequest = undefined;
    if (snapshot.status === 'loading') publish({ status: 'cancelled', data: snapshot.data });
  }

  async function load({ keepData = true } = {}) {
    currentRequest?.abort();
    const request = new AbortController();
    currentRequest = request;
    const data = keepData && canRetainData(snapshot.data) ? snapshot.data : null;
    publish({ status: 'loading', data });
    try {
      const data = await fetchData({ signal: request.signal });
      if (currentRequest !== request || request.signal.aborted) return;
      currentRequest = undefined;
      publish({ status: 'success', data });
    } catch (error) {
      if (currentRequest !== request || request.signal.aborted) return;
      request.abort();
      currentRequest = undefined;
      publish(error?.code === 'ERR_CANCELED'
        ? { status: 'cancelled', data }
        : { status: 'error', data, errorKind: readErrorKind(error) });
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load,
    cancel,
  };
}
