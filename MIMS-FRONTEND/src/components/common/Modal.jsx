import React from 'react';
import { MdClose } from 'react-icons/md';

export default function Modal({ title, children, onClose, widthClass = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div className={`w-full ${widthClass} bg-white rounded-lg shadow-xl my-8`}>
        {/* Sticky header so the title + close button are always visible */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white rounded-t-lg z-10">
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

