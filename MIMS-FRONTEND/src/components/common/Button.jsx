import React from 'react';

const variants = {
  primary: 'bg-malawiGreen text-white hover:opacity-90',
  danger: 'bg-malawiRed text-malawiGold hover:opacity-90',
  outline: 'border border-malawiBlack text-malawiBlack hover:bg-malawiBlack hover:text-malawiGold',
};

export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded shadow-sm transition font-semibold disabled:opacity-60 disabled:cursor-not-allowed ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {loading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-b-transparent" />}
      {children}
    </button>
  );
}

