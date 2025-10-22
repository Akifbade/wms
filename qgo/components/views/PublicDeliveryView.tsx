
import React, { useState, useEffect, useRef } from 'react';
import { JobFile } from '../../types';
import SignaturePadWrapper from '../SignaturePad';

interface PublicDeliveryViewProps {
    allJobs: JobFile[];
    onComplete: React.Dispatch<React.SetStateAction<JobFile[]>>;
    showNotification: (msg: string, isError?: boolean) => void;
}

const PublicDeliveryView: React.FC<PublicDeliveryViewProps> = ({ allJobs, onComplete, showNotification }) => {
    const [job, setJob] = useState<JobFile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);

    const [receiverName, setReceiverName] = useState('');
    const [receiverMobile, setReceiverMobile] = useState('');
    const [signatureDataUrl, setSignatureDataUrl] = useState('');
    const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
    const [locationStatus, setLocationStatus] = useState('');
    const [geolocation, setGeolocation] = useState<any>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const deliveryId = urlParams.get('deliveryId');
        if (!deliveryId) {
            setError("Invalid delivery link.");
            setIsLoading(false);
            return;
        }

        const foundJob = allJobs.find(j => j.id === deliveryId);
        if (foundJob) {
            if (foundJob.deliveryStatus === 'Delivered') {
                setError("This delivery has already been completed.");
            } else {
                setJob(foundJob);
            }
        } else {
            setError("Delivery details not found.");
        }
        setIsLoading(false);
    }, [allJobs]);

    const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setPhotoDataUrl(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setLocationStatus('Geolocation is not supported.');
            return;
        }
        setLocationStatus('Getting location...');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
                setGeolocation({ coords });
                setLocationStatus(`Location captured: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
            },
            () => setLocationStatus('Unable to retrieve location.')
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!receiverName || !receiverMobile || !signatureDataUrl) {
            showNotification("Receiver name, mobile, and signature are required.", true);
            return;
        }
        if (!job) return;

        const updatedJob: JobFile = {
            ...job,
            receiverName,
            receiverMobile,
            signatureDataUrl,
            photoDataUrl: photoDataUrl || undefined,
            geolocation: geolocation?.coords,
            geolocationName: geolocation?.displayName,
            deliveryStatus: 'Delivered',
            completedAt: new Date().toISOString()
        };

        onComplete(prevJobs => prevJobs.map(j => j.id === updatedJob.id ? updatedJob : j));
        setIsCompleted(true);
    };

    if (isLoading) return <div className="p-8 text-center">Loading...</div>;
    if (error) return <div className="p-8 text-center text-red-600 bg-red-100 max-w-md mx-auto mt-8 rounded-md">{error}</div>;
    if (!job) return null;

    if(isCompleted) {
        return (
             <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="card max-w-md w-full text-center">
                    <h2 className="text-2xl font-bold text-green-600">Delivery Completed!</h2>
                    <p className="mt-2 text-gray-600">Thank you. The details have been recorded.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="card max-w-lg w-full">
                <div className="text-center mb-6">
                    <img src="http://qgocargo.com/logo.png" alt="Q'go Cargo Logo" className="mx-auto h-16 w-auto" />
                    <h2 className="mt-4 text-2xl font-bold text-gray-800">Complete Delivery</h2>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-md">
                        <p><strong>Job File:</strong> {job.jfn}</p>
                        <p><strong>Location:</strong> {job.deliveryLocation}</p>
                        <p><strong>Driver:</strong> {job.driverName}</p>
                    </div>
                    <input type="text" value={receiverName} onChange={e => setReceiverName(e.target.value)} placeholder="Receiver's Name" className="input-field" required />
                    <input type="tel" value={receiverMobile} onChange={e => setReceiverMobile(e.target.value)} placeholder="Receiver's Mobile Number" className="input-field" required />
                    <div>
                        <label>Receiver's Signature</label>
                        <SignaturePadWrapper onEnd={setSignatureDataUrl} onClear={() => setSignatureDataUrl('')} />
                    </div>
                     <div>
                        <label>Upload Delivery Photo (Optional)</label>
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoSelect} className="input-field" />
                        {photoDataUrl && <img src={photoDataUrl} alt="Preview" className="mt-2 max-h-40 rounded border p-1" />}
                    </div>
                    <div>
                        <button type="button" onClick={handleGetLocation} className="btn btn-secondary w-full">Get Current Location</button>
                        <p className="text-xs text-center mt-1">{locationStatus}</p>
                    </div>
                    <button type="submit" className="btn btn-primary w-full">Mark as Delivered</button>
                </form>
            </div>
        </div>
    );
};

export default PublicDeliveryView;
