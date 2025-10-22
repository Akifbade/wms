import React from 'react';
import { JobFile, AppSettings } from '../../types';
import Modal from './Modal';

interface ShareDeliveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: JobFile | null;
    settings: AppSettings;
}

const ShareDeliveryModal: React.FC<ShareDeliveryModalProps> = ({ isOpen, onClose, job, settings }) => {
    if (!job) return null;

    const link = `${window.location.origin}${window.location.pathname}?deliveryId=${job.id}`;
    
    const whatsappMessage = settings.pod.shareMessageTemplate
        .replace('{jobId}', job.jfn)
        .replace('{link}', link);

    const whatsappUrl = `https://api.whatsapp.net/send?text=${encodeURIComponent(whatsappMessage)}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Share Delivery Link" maxWidth="max-w-md">
            <p className="text-sm text-gray-600 mb-4">Share this unique link with the external driver to allow them to complete the delivery.</p>
            <input type="text" value={link} readOnly className="input-field" />
            <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => navigator.clipboard.writeText(link)} className="btn btn-secondary">Copy Link</button>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn bg-green-500 hover:bg-green-600 text-white">Share on WhatsApp</a>
            </div>
        </Modal>
    );
};

export default ShareDeliveryModal;