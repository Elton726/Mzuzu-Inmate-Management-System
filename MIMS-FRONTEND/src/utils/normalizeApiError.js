const statusTitle = (status) => {
  switch (status) {
    case 400:
      return 'Bad request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Validation error';
    case 429:
      return 'Too many requests';
    default:
      if (typeof status === 'number' && status >= 500) return 'Server error';
      return 'Request error';
  }
};

const flattenValidationErrors = (errors) => {
  if (!errors || typeof errors !== 'object') return [];
  const details = [];
  for (const [field, messages] of Object.entries(errors)) {
    if (Array.isArray(messages)) {
      for (const msg of messages) {
        if (typeof msg === 'string' && msg.trim()) details.push(`${field}: ${msg}`);
      }
    } else if (typeof messages === 'string' && messages.trim()) {
      details.push(`${field}: ${messages}`);
    }
  }
  return details;
};

export const normalizeApiError = (err) => {
  const status = err?.status ?? null;
  const retryAfter =
    err?.rateLimit?.retryAfter ??
    (typeof err?.data?.retry_after === 'number' ? err.data.retry_after : null);

  const rawMessage = err?.data?.message || err?.message || 'An unexpected error occurred';
  const title = statusTitle(status);
  const details = flattenValidationErrors(err?.data?.errors);

  let message = rawMessage;
  if (status === 429 && typeof retryAfter === 'number' && retryAfter > 0) {
    if (!/retry in\s+\d+s/i.test(message)) message = `${message}. Retry in ${retryAfter}s.`;
  }

  return {
    title,
    message,
    details,
    status,
    retryAfter,
    data: err?.data ?? null
  };
};

