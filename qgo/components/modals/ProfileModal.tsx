import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import Modal from './Modal';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    onUpdateProfile: (user: User) => void;
    onChangePassword: (uid: string, current: string, newP: string) => {success: boolean, message: string};
    showNotification: (message: string, isError?: boolean) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, currentUser, onUpdateProfile, onChangePassword, showNotification }) => {
    const [displayName, setDisplayName] = useState(currentUser.displayName);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (isOpen) {
            setDisplayName(currentUser.displayName);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
    }, [isOpen, currentUser]);

    const handleProfileSave = () => {
        onUpdateProfile({ ...currentUser, displayName });
    };

    const handlePasswordChange = () => {
        if (newPassword !== confirmPassword) {
            showNotification("New passwords do not match.", true);
            return;
        }
        if (newPassword.length < 6) {
            showNotification("Password must be at least 6 characters.", true);
            return;
        }
        const result = onChangePassword(currentUser.uid, currentPassword, newPassword);
        showNotification(result.message, !result.success);
        if (result.success) {
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Your Profile">
             <div className="space-y-6">
                <div className="border rounded-lg p-4">
                    <h4 className="text-lg font-semibold mb-2">Basic Info</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium">Email (read-only)</label>
                            <input type="email" className="input-field w-full" value={currentUser.email} disabled />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Display Name</label>
                            <input type="text" className="input-field w-full" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
                        </div>
                    </div>
                    <div className="text-right mt-3">
                        <button onClick={handleProfileSave} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Save Profile</button>
                    </div>
                </div>

                <div className="border rounded-lg p-4">
                    <h4 className="text-lg font-semibold mb-2">Change Password</h4>
                    <div className="space-y-3">
                        <input value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} type="password" className="input-field w-full" placeholder="Current password" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" className="input-field w-full" placeholder="New password (min 6 chars)" />
                           <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" className="input-field w-full" placeholder="Re-type new password" />
                        </div>
                    </div>
                    <div className="text-right mt-3">
                        <button onClick={handlePasswordChange} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">Change Password</button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ProfileModal;