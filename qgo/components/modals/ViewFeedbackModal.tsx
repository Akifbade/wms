
import React from 'react';
import { Feedback, JobFile } from '../../types';
import Modal from './Modal';

interface ViewFeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    driverName: string;
    driverId: string;
    feedback: Feedback[];
    jobs: JobFile[];
    isAdmin: boolean;
}

const ViewFeedbackModal: React.FC<ViewFeedbackModalProps> = ({ isOpen, onClose, driverName, driverId, feedback, jobs, isAdmin }) => {
    
    const driverFeedback = feedback
        .filter(f => f.driverUid === driverId || f.driverName === driverName)
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Feedback for ${driverName}`} maxWidth="max-w-2xl">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {driverFeedback.length > 0 ? driverFeedback.map(f => (
                    <div key={f.id} className="p-3 border rounded-lg bg-gray-50">
                        <div className="flex justify-between items-center">
                            <div>
                               <p className="text-xl text-yellow-500">{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</p>
                               <p className="text-xs text-gray-500 mt-1">For Job: <strong>{f.jobFileNo}</strong></p>
                            </div>
                            <p className="text-xs text-gray-400">{new Date(f.createdAt).toLocaleString()}</p>
                        </div>
                        <p className="mt-2 text-gray-700">{f.comment || <i>No comment left.</i>}</p>
                        {isAdmin && (
                             <div className="mt-2 pt-2 border-t text-xs text-gray-500 space-y-1">
                                <p><strong>Device:</strong> {f.deviceInfo}</p>
                                <p><strong>IP Address:</strong> {f.ipAddress}</p>
                            </div>
                        )}
                    </div>
                )) : <p className="text-gray-500 text-center p-4">This driver has no feedback yet.</p>}
            </div>
        </Modal>
    );
};

export default ViewFeedbackModal;
