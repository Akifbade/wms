
import React from 'react';
import { User } from '../../types';
import Modal from './Modal';

interface WelcomeNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    pendingCheckCount: number;
    pendingApproveCount: number;
}

const WelcomeNotificationModal: React.FC<WelcomeNotificationModalProps> = ({ isOpen, onClose, user, pendingCheckCount, pendingApproveCount }) => {
    
    const isChecker = user.role === 'checker';
    const isAdmin = user.role === 'admin';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Welcome, ${user.displayName}!`} maxWidth="max-w-lg">
            <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p className="text-lg text-slate-800 font-semibold">Here's a summary of tasks needing your attention:</p>
                <div className="mt-4 space-y-2 text-left bg-slate-50 p-4 rounded-md">
                    {(isChecker || isAdmin) && pendingCheckCount > 0 && (
                        <p>
                            You have <strong className="text-red-600">{pendingCheckCount}</strong> job file(s) pending your <strong className="text-red-600">review</strong>.
                        </p>
                    )}
                    {isAdmin && pendingApproveCount > 0 && (
                        <p>
                            You have <strong className="text-green-600">{pendingApproveCount}</strong> job file(s) waiting for final <strong className="text-green-600">approval</strong>.
                        </p>
                    )}
                </div>
                <div className="mt-6">
                    <button onClick={onClose} className="btn btn-primary px-6">
                        Let's Go!
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default WelcomeNotificationModal;
