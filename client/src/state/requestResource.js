// Shared request lifecycle for the overview and agents pages, independent of React.
export function createRequestResource(fetchData) {
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
  }

  async function load() {
    cancel();
    const request = new AbortController();
    currentRequest = request;
    publish({ status: 'loading', data: null });
    try {
      const data = await fetchData({ signal: request.signal });
      if (currentRequest !== request || request.signal.aborted) return;
      publish({ status: 'success', data });
    } catch {
      if (currentRequest !== request || request.signal.aborted) return;
      request.abort();
      publish({ status: 'error', data: null });
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
