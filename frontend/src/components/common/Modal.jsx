import React from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white text-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-gray-500 hover:text-gray-900"
            aria-label="Đóng"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
