import React, { useState, useRef, useEffect } from 'react';
import { JobFile, AppSettings } from '../../types';
import Modal from './Modal';
import SignaturePadWrapper from '../SignaturePad';

interface DeliveryCompletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: JobFile | null;
    onComplete: (completionData: Partial<JobFile>) => void;
    settings: AppSettings;
}

const DeliveryCompletionModal: React.FC<DeliveryCompletionModalProps> = ({ isOpen, onClose, job, onComplete, settings }) => {
    const [receiverName, setReceiverName] = useState('');
    const [receiverMobile, setReceiverMobile] = useState('');
    const [signatureDataUrl, setSignatureDataUrl] = useState('');
    const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
    const [locationStatus, setLocationStatus] = useState('');
    const [geolocation, setGeolocation] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if(isOpen) {
            setReceiverName('');
            setReceiverMobile('');
            setSignatureDataUrl('');
            setPhotoDataUrl(null);
            setLocationStatus('');
            setGeolocation(null);
            setError(null);
        }
    }, [isOpen]);

    const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setPhotoDataUrl(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleGetLocation = () => {
        setError(null);
        if (!navigator.geolocation) {
            setLocationStatus('Geolocation is not supported by your browser.');
            return;
        }
        setLocationStatus('Getting location...');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
                setGeolocation({ coords });
                setLocationStatus(`Location captured: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
            },
            () => setLocationStatus('Unable to retrieve your location.')
        );
    };

    const handleSubmit = () => {
        if (!job) return;
        if (!receiverName.trim() || !receiverMobile.trim() || !signatureDataUrl) {
            setError("Receiver name, mobile, and signature are required.");
            return;
        }
        if (settings.pod.isPhotoRequired && !photoDataUrl) {
            setError("A delivery photo is required by your current settings.");
            return;
        }
        if (settings.pod.isGeolocationRequired && !geolocation) {
            setError("Geolocation is required by your current settings. Please capture the location.");
            return;
        }
        setError(null);
        onComplete({
            id: job.id,
            jfn: job.jfn,
            receiverName,
            receiverMobile,
            signatureDataUrl,
            photoDataUrl: photoDataUrl || undefined,
            geolocation: geolocation?.coords,
            geolocationName: geolocation?.displayName
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={job ? `Complete Delivery for ${job.jfn}` : 'Complete Delivery'} maxWidth="max-w-lg">
            {job ? (
                <form onSubmit={e => {e.preventDefault(); handleSubmit();}} className="space-y-4">
                    <input type="text" value={receiverName} onChange={e => { setReceiverName(e.target.value); setError(null); }} placeholder="Receiver's Name" className="input-field" required />
                    <input type="tel" value={receiverMobile} onChange={e => { setReceiverMobile(e.target.value); setError(null); }} placeholder="Receiver's Mobile Number" className="input-field" required />
                    <div>
                        <label>Receiver's Signature</label>
                        <SignaturePadWrapper onEnd={(data) => { setSignatureDataUrl(data); setError(null); }} onClear={() => setSignatureDataUrl('')} />
                    </div>
                    <div>
                        <label>Upload Delivery Photo {settings.pod.isPhotoRequired && <span className="text-red-500">*</span>}</label>
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoSelect} className="input-field" />
                        {photoDataUrl && <img src={photoDataUrl} alt="Preview" className="mt-2 max-h-40 rounded border p-1" />}
                    </div>
                    <div>
                        <button type="button" onClick={handleGetLocation} className="btn btn-secondary w-full">Get Current Location {settings.pod.isGeolocationRequired && <span className="text-red-500 ml-1">*</span>}</button>
                        <p className="text-xs text-center mt-1">{locationStatus}</p>
                    </div>
                    
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

                    <div className="text-right pt-2">
                        <button type="submit" className="btn btn-primary">Mark as Delivered</button>
                    </div>
                </form>
            ) : (
                <p>Loading delivery details...</p>
            )}
        </Modal>
    );
};

export default DeliveryCompletionModal;