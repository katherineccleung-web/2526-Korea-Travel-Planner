import React, { useEffect, useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const [show, setShow] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setShow(true);
    else setTimeout(() => setShow(false), 200); // Wait for animation
  }, [isOpen]);

  if (!show) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Content */}
      <div 
        className={`bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-sm p-6 relative z-10 transform transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full sm:translate-y-10'}`}
      >
        {title && <h3 className="font-bold text-xl mb-4 text-muji-text">{title}</h3>}
        {children}
      </div>
    </div>
  );
};