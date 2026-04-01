import React from 'react';
import { MdClose } from 'react-icons/md';

export default function Modal({ title, children, onClose, widthClass = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className={`w-full ${widthClass} bg-white rounded-lg shadow-xl`}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-gray-100 transition"
            aria-label="Close modal"
          >
            <MdClose className="text-xl" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

