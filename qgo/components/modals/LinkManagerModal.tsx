
import React, { useState } from 'react';
import { CustomLink } from '../../types';
import Modal from './Modal';

interface LinkManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    links: CustomLink[];
    setLinks: React.Dispatch<React.SetStateAction<CustomLink[]>>;
    onDelete: (link: CustomLink) => void;
}

const LinkManagerModal: React.FC<LinkManagerModalProps> = ({ isOpen, onClose, links, setLinks, onDelete }) => {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    
    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (name && url) {
            setLinks(prev => [...prev, { name, url }]);
            setName('');
            setUrl('');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Custom Links">
            <div className="space-y-6">
                 <div>
                    <h4 className="text-lg font-semibold mb-2">Add New Link</h4>
                    <form onSubmit={handleAdd} className="space-y-3">
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Link Name" required />
                        <input type="url" value={url} onChange={e => setUrl(e.target.value)} className="input-field" placeholder="Full URL" required />
                        <button type="submit" className="w-full btn btn-primary">Add Link</button>
                    </form>
                </div>
                <div>
                    <h4 className="text-lg font-semibold mb-2">Existing Links</h4>
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                        {links.map((link, index) => (
                             <div key={index} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                                <div><p className="font-semibold">{link.name}</p><p className="text-xs text-gray-500">{link.url}</p></div>
                                <button onClick={() => onDelete(link)} className="text-red-500 hover:text-red-700 font-bold text-xl">&times;</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
export default LinkManagerModal;