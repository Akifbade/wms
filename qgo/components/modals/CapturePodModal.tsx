
import React, { useState } from 'react';
import { JobFile } from '../../types';
import Modal from './Modal';
import SignaturePad from '../SignaturePad';

interface CapturePodModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: JobFile;
    onSave: (jobId: string, recipientName: string, signature: string) => void;
}

const CapturePodModal: React.FC<CapturePodModalProps> = ({ isOpen, onClose, job, onSave }) => {
    const [recipientName, setRecipientName] = useState('');
    const [signature, setSignature] = useState('');

    const handleSave = () => {
        if (!recipientName.trim()) {
            alert('Please enter the recipient\'s name.');
            return;
        }
        if (!signature) {
            alert('Please capture a signature.');
            return;
        }
        onSave(job.id, recipientName, signature);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Capture POD for ${job.jfn}`} maxWidth="max-w-lg">
            <div className="space-y-4">
                <div>
                    <label htmlFor="recipient-name" className="block text-sm font-medium text-gray-700">Recipient Name</label>
                    <input
                        id="recipient-name"
                        type="text"
                        value={recipientName}
                        onChange={e => setRecipientName(e.target.value)}
                        className="input-field mt-1 w-full"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Signature</label>
                    <SignaturePad onEnd={setSignature} onClear={() => setSignature('')} />
                </div>
                <div className="text-right space-x-2 pt-4">
                    <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                    <button onClick={handleSave} className="btn btn-primary">Save POD</button>
                </div>
            </div>
        </Modal>
    );
};

export default CapturePodModal;
