
import React, { useState, useEffect } from 'react';
import Modal from './Modal';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText }) => {
    const [inputValue, setInputValue] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(!confirmText);

    useEffect(() => {
        if (isOpen) {
            setInputValue('');
            setIsConfirmed(!confirmText);
        }
    }, [isOpen, confirmText]);

    useEffect(() => {
        if (confirmText) {
            setIsConfirmed(inputValue === confirmText);
        }
    }, [inputValue, confirmText]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
            <p className="mb-4">{message}</p>
            {confirmText && (
                <div className="mb-4">
                    <label className="text-sm font-medium">Type "<span className="font-bold">{confirmText}</span>" to confirm:</label>
                    <input 
                        type="text" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="input-field mt-1"
                    />
                </div>
            )}
            <div className="text-right space-x-2">
                <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                <button 
                    onClick={onConfirm} 
                    className="btn btn-danger"
                    disabled={!isConfirmed}
                >
                    Confirm
                </button>
            </div>
        </Modal>
    );
};

export default ConfirmModal;
