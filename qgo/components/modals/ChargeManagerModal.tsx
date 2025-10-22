import React, { useState } from 'react';
import Modal from './Modal';

interface ChargeManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    descriptions: string[];
    setDescriptions: React.Dispatch<React.SetStateAction<string[]>>;
    onDelete: (description: string) => void;
}

const ChargeManagerModal: React.FC<ChargeManagerModalProps> = ({ isOpen, onClose, descriptions, setDescriptions, onDelete }) => {
    const [newDesc, setNewDesc] = useState('');

    const handleAdd = () => {
        if (newDesc && !descriptions.includes(newDesc)) {
            setDescriptions(prev => [...prev, newDesc].sort());
            setNewDesc('');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Charge Descriptions" maxWidth="max-w-lg">
            <div className="space-y-4">
                <div>
                    <h4 className="text-lg font-semibold mb-2">Add New Description</h4>
                    <div className="flex gap-2">
                        <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="input-field" placeholder="E.g., Customs Duty" />
                        <button onClick={handleAdd} className="btn btn-primary">Add</button>
                    </div>
                </div>
                <div>
                    <h4 className="text-lg font-semibold mb-2">Existing Descriptions</h4>
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                        {descriptions.map(desc => (
                            <div key={desc} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                                <span>{desc}</span>
                                <button onClick={() => onDelete(desc)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ChargeManagerModal;
