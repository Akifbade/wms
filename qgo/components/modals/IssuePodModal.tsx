
import React, { useState } from 'react';
import { JobFile, User } from '../../types';
import Modal from './Modal';

interface IssuePodModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: JobFile;
    drivers: User[];
    onIssue: (jobId: string, driverName: string) => void;
}

const IssuePodModal: React.FC<IssuePodModalProps> = ({ isOpen, onClose, job, drivers, onIssue }) => {
    const [selectedDriver, setSelectedDriver] = useState<string>('');

    const handleIssue = () => {
        if (selectedDriver) {
            onIssue(job.id, selectedDriver);
            onClose();
        } else {
            alert('Please select a driver.');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Issue POD for ${job.jfn}`}>
            <div className="space-y-4">
                <p>Assign a driver to this job file for Proof of Delivery.</p>
                <div>
                    <label htmlFor="driver-select" className="block text-sm font-medium text-gray-700">Select Driver</label>
                    <select
                        id="driver-select"
                        value={selectedDriver}
                        onChange={e => setSelectedDriver(e.target.value)}
                        className="input-field mt-1 w-full"
                    >
                        <option value="">-- Choose a driver --</option>
                        {drivers.map(driver => (
                            <option key={driver.uid} value={driver.displayName}>
                                {driver.displayName}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="text-right space-x-2">
                    <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                    <button onClick={handleIssue} className="btn btn-primary">Issue POD</button>
                </div>
            </div>
        </Modal>
    );
};

export default IssuePodModal;
