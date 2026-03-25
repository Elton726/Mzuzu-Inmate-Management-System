import { useCallback, useMemo, useState } from 'react';
import Toast from '../components/Toast';
import { normalizeApiError } from '../utils/normalizeApiError';
import { ToastContext } from './ToastContextCreate';

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((toast) => {
    const id = toast?.id || newId();
    const timeoutMs = typeof toast?.timeoutMs === 'number' ? toast.timeoutMs : 7000;
    const next = { id, variant: 'error', ...toast };
    setToasts((prev) => [next, ...prev].slice(0, 4));
    if (timeoutMs > 0) {
      window.setTimeout(() => remove(id), timeoutMs);
    }
    return id;
  }, [remove]);

  const fromError = useCallback((err, overrides = {}) => {
    const normalized = normalizeApiError(err);
    return push({
      title: overrides.title || normalized.title,
      message: overrides.message || normalized.message,
      details: overrides.details || normalized.details,
      variant: overrides.variant || 'error',
      timeoutMs: overrides.timeoutMs
    });
  }, [push]);

  const value = useMemo(() => ({ push, remove, fromError }), [push, remove, fromError]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            title={t.title}
            message={t.message}
            details={t.details}
            variant={t.variant}
            onClose={() => remove(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

