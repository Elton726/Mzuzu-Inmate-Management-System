import React, { useEffect, useRef, useState } from 'react';
import { API_ERROR_EVENT, API_LOADING_EVENT } from '../utils/apiLoadingEvents';

export default function GlobalLoadingIndicator() {
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const delayRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    const handleLoading = (event) => {
      const isActive = Boolean(event.detail?.active);
      setActive(isActive);

      if (isActive) {
        window.clearTimeout(delayRef.current);
        delayRef.current = window.setTimeout(() => setVisible(true), 160);
        return;
      }

      window.clearTimeout(delayRef.current);
      setVisible(false);
    };

    const handleError = (event) => {
      setErrorMessage(event.detail?.message || 'Unable to load data. Please refresh.');
      window.clearTimeout(errorRef.current);
      errorRef.current = window.setTimeout(() => setErrorMessage(''), 5000);
    };

    window.addEventListener(API_LOADING_EVENT, handleLoading);
    window.addEventListener(API_ERROR_EVENT, handleError);

    return () => {
      window.clearTimeout(delayRef.current);
      window.clearTimeout(errorRef.current);
      window.removeEventListener(API_LOADING_EVENT, handleLoading);
      window.removeEventListener(API_ERROR_EVENT, handleError);
    };
  }, []);

  return (
    <>
      <div
        className={`pointer-events-none fixed left-0 right-0 top-0 z-[70] h-1 bg-transparent transition-opacity duration-200 ${visible && active ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      >
        <div className="h-full w-1/2 animate-global-loader rounded-r-full bg-malawiGreen shadow-lg shadow-malawiGreen/30" />
      </div>

      <div
        className={`pointer-events-none fixed right-4 top-20 z-[70] w-[min(360px,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-4 shadow-lg transition-all duration-200 dark:border-slate-700 dark:bg-slate-800 ${visible && active ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}
        role="status"
        aria-live="polite"
      >
        <p className="mb-3 text-sm font-bold text-gray-900 dark:text-white">Loading latest data...</p>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-3 animate-pulse rounded-full bg-gray-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="fixed right-4 top-20 z-[80] w-[min(380px,calc(100vw-2rem))] rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 shadow-lg dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {errorMessage}
        </div>
      )}
    </>
  );
}
