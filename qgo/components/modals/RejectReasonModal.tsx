import React, { useState } from 'react';
import Modal from './Modal';

interface RejectReasonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}

const RejectReasonModal: React.FC<RejectReasonModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');

    const handleConfirm = () => {
        if (reason.trim()) {
            onConfirm(reason.trim());
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Rejection Reason" maxWidth="max-w-md">
            <p className="mb-4">Please provide a reason for rejecting this job file.</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)} className="input-field w-full" rows={3}></textarea>
            <div className="text-right mt-6 space-x-2">
                <button onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded">Cancel</button>
                <button onClick={handleConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Confirm Rejection</button>
            </div>
        </Modal>
    );
};

export default RejectReasonModal;