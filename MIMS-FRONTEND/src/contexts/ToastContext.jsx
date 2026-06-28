import { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Toast from '../components/Toast';
import { normalizeApiError } from '../utils/normalizeApiError';
import { ToastContext } from './ToastContextCreate';
import { useNotification } from './useNotification';
import { getModuleFromPathname } from '../utils/helpers';

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const { addNotification } = useNotification();
  const location = useLocation();
  const currentModule = getModuleFromPathname(location.pathname);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((toast) => {
    const id = toast?.id || newId();
    const timeoutMs = typeof toast?.timeoutMs === 'number' ? toast.timeoutMs : 7000;
    const activeModule = getModuleFromPathname();
    const next = { id, variant: 'error', module: activeModule, ...toast };
    setToasts((prev) => [next, ...prev].slice(0, 4));
    addNotification({
      title: next.title || notificationTitle(next.variant),
      message: next.message || next.details || 'System activity recorded.',
      type: next.variant,
      module: activeModule,
    });
    if (timeoutMs > 0) {
      window.setTimeout(() => remove(id), timeoutMs);
    }
    return id;
  }, [addNotification, remove]);

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

  const success = useCallback((message, options = {}) => push({
    title: options.title || 'Success',
    message,
    variant: 'success',
    timeoutMs: options.timeoutMs,
  }), [push]);

  const error = useCallback((message, options = {}) => push({
    title: options.title || 'Error',
    message,
    variant: 'error',
    timeoutMs: options.timeoutMs,
  }), [push]);

  const warning = useCallback((message, options = {}) => push({
    title: options.title || 'Warning',
    message,
    variant: 'warning',
    timeoutMs: options.timeoutMs,
  }), [push]);

  const info = useCallback((message, options = {}) => push({
    title: options.title || 'Information',
    message,
    variant: 'info',
    timeoutMs: options.timeoutMs,
  }), [push]);

  const value = useMemo(() => ({
    push,
    remove,
    fromError,
    success,
    error,
    warning,
    info,
  }), [push, remove, fromError, success, error, warning, info]);

  const visibleToasts = toasts.filter(t => !t.module || t.module === currentModule || t.module === 'global');

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
        {visibleToasts.map((t) => (
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

const notificationTitle = (variant) => {
  switch (variant) {
    case 'success':
      return 'Success';
    case 'warning':
      return 'Warning';
    case 'info':
      return 'Information';
    default:
      return 'Error';
  }
};
