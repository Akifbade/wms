
import React, { useState, useEffect, useRef } from 'react';
import { JobFile } from '../../types';
import { generateReceiptHTML } from '../PodReceipt';
import { normalizeJobData } from '../../services/utils';

declare var QRCode: any;

interface PublicPodViewProps {
    allJobs: JobFile[];
    showNotification: (msg: string, isError?: boolean) => void;
}

const PublicPodView: React.FC<PublicPodViewProps> = ({ allJobs }) => {
    const [job, setJob] = useState<JobFile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const receiptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const jobId = urlParams.get('jobId');

            if (!jobId) {
                setError('No Job ID specified.');
                setLoading(false);
                return;
            }
            
            const foundJob = allJobs.find(j => j.jfn === jobId);

            if (foundJob && foundJob.deliveryStatus === 'Delivered') {
                setJob(foundJob);
            } else if (foundJob) {
                setError('Proof of Delivery is not yet available for this job file.');
            } else {
                setError('Job file not found.');
            }
        } catch (e) {
            setError('An error occurred while loading the data.');
        } finally {
            setLoading(false);
        }
    }, [allJobs]);
    
    useEffect(() => {
        if (job && receiptRef.current) {
            // FIX: Pass null for settings to generateReceiptHTML, as this public view doesn't have app settings context. The function was updated to handle this.
            receiptRef.current.innerHTML = generateReceiptHTML(job, null, false);
            const publicUrl = `${window.location.origin}${window.location.pathname}?jobId=${encodeURIComponent(job.jfn)}`;
            const qrContainer = receiptRef.current.querySelector('#receipt-verification-qrcode');
            if (qrContainer) {
                qrContainer.innerHTML = '';
                new QRCode(qrContainer, { text: publicUrl, width: 80, height: 80 });
            }
        }
    }, [job]);

    if (loading) return <div className="text-center p-8">Loading...</div>;
    if (error) return <div className="text-center p-8 text-red-600 bg-red-100 rounded-md max-w-lg mx-auto mt-10">{error}</div>;
    if (!job) return null;

    return (
        <div className="bg-gray-100 min-h-screen py-10">
            <div ref={receiptRef} className="max-w-4xl mx-auto" />
        </div>
    );
};

export default PublicPodView;