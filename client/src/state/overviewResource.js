// A small observable request state lets React and Node tests use the same load/retry logic.
export function createOverviewResource(fetchOverview) {
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
      const data = await fetchOverview({ signal: request.signal });
      if (currentRequest !== request || request.signal.aborted) return;
      publish({ status: 'success', data });
    } catch {
      if (currentRequest !== request || request.signal.aborted) return;
      request.abort(); // Stop sibling requests if one of the three failed.
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
