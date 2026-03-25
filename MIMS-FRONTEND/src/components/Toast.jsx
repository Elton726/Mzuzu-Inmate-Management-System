
import { MdClose } from 'react-icons/md';

const variantStyles = {
  error: 'bg-malawiRed text-malawiGold',
  warning: 'bg-malawiGold text-malawiBlack',
  success: 'bg-malawiGreen text-white',
  info: 'bg-malawiBlack text-malawiGold'
};

const Toast = ({ title, message, details = [], variant = 'error', onClose }) => (
  <div className={`w-[min(420px,calc(100vw-3rem))] ${variantStyles[variant] || variantStyles.error} px-4 py-3 rounded shadow-lg animate-fade-in`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {title && <div className="font-semibold leading-tight mb-1">{title}</div>}
        {message && <div className="text-sm whitespace-pre-wrap break-words">{message}</div>}
        {Array.isArray(details) && details.length > 0 && (
          <ul className="mt-2 text-sm list-disc pl-5 space-y-1">
            {details.slice(0, 8).map((d, idx) => (
              <li key={`${idx}-${d}`} className="break-words">{d}</li>
            ))}
            {details.length > 8 && <li>…and {details.length - 8} more</li>}
          </ul>
        )}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 bg-malawiGold text-malawiRed rounded-full p-1 hover:bg-white hover:text-malawiBlack transition"
        aria-label="Close"
      >
        <MdClose className="text-lg" />
      </button>
    </div>
  </div>
);

export default Toast;
