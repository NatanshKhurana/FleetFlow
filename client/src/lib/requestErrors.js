// Classify failures without retaining URLs, response bodies, or raw error messages.
export function readErrorKind(error) {
  if (['ECONNABORTED', 'ETIMEDOUT'].includes(error?.code)) return 'timeout';
  if (['ERR_NETWORK', 'ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET'].includes(error?.code)) return 'network';
  return 'unavailable';
}

export function readErrorMessage(kind) {
  if (kind === 'timeout') return 'The request took too long. Please try again.';
  if (kind === 'network') return 'We could not reach the API. Check your connection and try again.';
  return 'Your agent data is temporarily unavailable. Please try again.';
}
