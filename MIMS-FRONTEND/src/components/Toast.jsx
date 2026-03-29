
import { MdClose } from 'react-icons/md';

/**
 * Toast notification component for displaying messages to users
 *
 * Features:
 * - Multiple variants (error, warning, success, info) with Malawi-themed colors
 * - Support for title, message, and detailed error lists
 * - Responsive design with max width constraints
 * - Close button with accessibility features
 * - Fade-in animation
 */

// Style variants using Malawi national colors
const variantStyles = {
  error: 'bg-malawiRed text-malawiGold',      // Red background with gold text
  warning: 'bg-malawiGold text-malawiBlack',  // Gold background with black text
  success: 'bg-malawiGreen text-white',       // Green background with white text
  info: 'bg-malawiBlack text-malawiGold'      // Black background with gold text
};

/**
 * Toast Component
 *
 * @param {Object} props - Component props
 * @param {string} [props.title] - Optional title text displayed prominently
 * @param {string} [props.message] - Main message content
 * @param {string[]} [props.details=[]] - Array of detailed messages (limited to 8 items)
 * @param {'error'|'warning'|'success'|'info'} [props.variant='error'] - Visual style variant
 * @param {Function} props.onClose - Callback function when close button is clicked
 * @returns {JSX.Element} Toast notification component
 */
const Toast = ({ title, message, details = [], variant = 'error', onClose }) => (
  <div className={`w-[min(420px,calc(100vw-3rem))] ${variantStyles[variant] || variantStyles.error} px-4 py-3 rounded shadow-lg animate-fade-in`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {/* Optional title with bold styling */}
        {title && <div className="font-semibold leading-tight mb-1">{title}</div>}

        {/* Main message with word wrapping */}
        {message && <div className="text-sm whitespace-pre-wrap break-words">{message}</div>}

        {/* Detailed error/messages list (limited to prevent overflow) */}
        {Array.isArray(details) && details.length > 0 && (
          <ul className="mt-2 text-sm list-disc pl-5 space-y-1">
            {details.slice(0, 8).map((d, idx) => (
              <li key={`${idx}-${d}`} className="break-words">{d}</li>
            ))}
            {/* Show count of additional items if truncated */}
            {details.length > 8 && <li>…and {details.length - 8} more</li>}
          </ul>
        )}
      </div>

      {/* Close button with hover effects and accessibility */}
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
