const API_LOADING_EVENT = 'mims:api-loading';
const API_ERROR_EVENT = 'mims:api-error';

let activeRequestCount = 0;

const emitLoading = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(API_LOADING_EVENT, {
    detail: { active: activeRequestCount > 0, count: activeRequestCount },
  }));
};

export const beginApiRequest = () => {
  activeRequestCount += 1;
  emitLoading();
};

export const endApiRequest = () => {
  activeRequestCount = Math.max(0, activeRequestCount - 1);
  emitLoading();
};

export const emitApiError = (error) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(API_ERROR_EVENT, {
    detail: {
      message: error?.message || 'Unable to load data. Please refresh.',
      status: error?.status || error?.response?.status || null,
    },
  }));
};

export { API_LOADING_EVENT, API_ERROR_EVENT };
