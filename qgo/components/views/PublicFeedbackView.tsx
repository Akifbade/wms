
import React, { useState, useEffect } from 'react';
import { JobFile, Feedback } from '../../types';

interface PublicFeedbackViewProps {
    allJobs: JobFile[];
    setJobs: React.Dispatch<React.SetStateAction<JobFile[]>>;
    allFeedback: Feedback[];
    setFeedback: React.Dispatch<React.SetStateAction<Feedback[]>>;
    showNotification: (msg: string, isError?: boolean) => void;
}

const StarRating: React.FC<{ rating: number; setRating: (r: number) => void }> = ({ rating, setRating }) => (
    <div className="flex justify-center text-5xl" style={{ direction: 'rtl' }}>
        {[5, 4, 3, 2, 1].map(star => (
            <label key={star} className="cursor-pointer">
                <input type="radio" name="rating" value={star} className="hidden" onClick={() => setRating(star)} />
                <span className={`transition-colors ${rating >= star ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`}>★</span>
            </label>
        ))}
    </div>
);

const PublicFeedbackView: React.FC<PublicFeedbackViewProps> = ({ allJobs, setJobs, allFeedback, setFeedback, showNotification }) => {
    const [job, setJob] = useState<JobFile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const feedbackId = urlParams.get('feedbackId'); // This is the job ID
        if (!feedbackId) {
            setError("Invalid feedback link.");
            setIsLoading(false);
            return;
        }

        const existingFeedback = allFeedback.find(f => f.id === feedbackId);
        if(existingFeedback) {
             setError("You have already submitted feedback for this delivery.");
             setIsLoading(false);
             return;
        }

        const foundJob = allJobs.find(j => j.id === feedbackId);
        if (foundJob) {
            setJob(foundJob);
        } else {
            setError("Delivery details not found.");
        }
        setIsLoading(false);
    }, [allJobs, allFeedback]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            showNotification("Please select a star rating.", true);
            return;
        }
        if (!job) return;

        const newFeedback: Feedback = {
            id: job.id,
            jobFileNo: job.jfn,
            driverUid: job.driverUid,
            driverName: job.driverName,
            rating: rating,
            comment: comment,
            createdAt: new Date().toISOString(),
            deviceInfo: navigator.userAgent,
            ipAddress: 'N/A' // IP address would require a server-side component
        };

        setFeedback(prev => [...prev, newFeedback]);
        setJobs(prev => prev.map(j => j.id === job.id ? {...j, feedbackStatus: 'rated'} : j));
        setIsSubmitted(true);
    };

    if (isLoading) return <div className="p-8 text-center">Loading...</div>;
    if (error) return <div className="p-8 text-center text-red-600 bg-red-100 max-w-md mx-auto mt-8 rounded-md">{error}</div>;
    if (!job) return null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="card max-w-lg w-full text-center">
                 <img src="http://qgocargo.com/logo.png" alt="Q'go Cargo Logo" className="mx-auto h-16 w-auto mb-4" />
                {isSubmitted ? (
                    <div>
                        <h2 className="text-2xl font-bold text-green-600">Thank You!</h2>
                        <p className="mt-2 text-gray-600">Your feedback has been submitted successfully.</p>
                    </div>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold text-gray-800">Rate Your Delivery</h2>
                        <p className="text-gray-500 mt-2">Job File: <span className="font-medium">{job.jfn}</span></p>
                        <p className="text-gray-500">Driver: <span className="font-medium">{job.driverName}</span></p>
                        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                            <StarRating rating={rating} setRating={setRating} />
                            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} className="input-field" placeholder="Tell us about your experience (optional)..."></textarea>
                            <button type="submit" className="btn btn-primary w-full">Submit Feedback</button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default PublicFeedbackView;
