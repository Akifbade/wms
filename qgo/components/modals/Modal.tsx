import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: 'max-w-md' | 'max-w-lg' | 'max-w-xl' | 'max-w-2xl' | 'max-w-4xl' | 'max-w-5xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
    if (!isOpen) return null;

    return (
        <div className="overlay visible" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className={`modal-content ${maxWidth}`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 id="modal-title" className="text-2xl font-bold">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl" aria-label="Close modal">&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
};

export default Modal;
