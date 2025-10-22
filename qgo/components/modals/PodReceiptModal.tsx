import React, { useRef, useEffect } from 'react';
import { JobFile, AppSettings } from '../../types';
import Modal from './Modal';
import { generateReceiptHTML } from '../PodReceipt';

declare var QRCode: any;
declare var html2canvas: any;
declare var jspdf: any;

interface PodReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: JobFile | null;
    settings: AppSettings;
}

const PodReceiptModal: React.FC<PodReceiptModalProps> = ({ isOpen, onClose, job, settings }) => {
    const receiptContentRef = useRef<HTMLDivElement>(null);
    const shareQrCodeRef = useRef<HTMLDivElement>(null);
    const [isCopy, setIsCopy] = React.useState(false);

    const generateQRCodes = (container: HTMLElement) => {
        if (!job) return;
        const publicUrl = `${window.location.origin}${window.location.pathname}?jobId=${encodeURIComponent(job.jfn)}`;
        const qrVerifyContainer = container.querySelector('#receipt-verification-qrcode');
        if (qrVerifyContainer) {
            qrVerifyContainer.innerHTML = '';
            new QRCode(qrVerifyContainer, { text: publicUrl, width: 80, height: 80 });
        }
    };

    useEffect(() => {
        if (isOpen && job && receiptContentRef.current) {
            receiptContentRef.current.innerHTML = generateReceiptHTML(job, settings, isCopy);
            generateQRCodes(receiptContentRef.current);
        }
    }, [isOpen, job, isCopy, settings]);

    useEffect(() => {
        if (isOpen && job && shareQrCodeRef.current) {
            shareQrCodeRef.current.innerHTML = ''; // Clear previous QR
            const publicUrl = `${window.location.origin}${window.location.pathname}?jobId=${encodeURIComponent(job.jfn)}`;
            new QRCode(shareQrCodeRef.current, {
                text: publicUrl,
                width: 160,
                height: 160,
                correctLevel: QRCode.CorrectLevel.H,
            });
        }
    }, [isOpen, job]);

    const getReceiptCanvas = async (forCopy: boolean) => {
        if (!job) throw new Error("Job data is missing.");
        const receiptHTML = generateReceiptHTML(job, settings, forCopy);
        const printContainer = document.createElement('div');
        printContainer.style.position = 'absolute';
        printContainer.style.left = '-9999px';
        printContainer.style.width = '210mm';
        printContainer.style.padding = '15mm';
        printContainer.style.backgroundColor = 'white';
        printContainer.style.boxSizing = 'border-box';
        printContainer.innerHTML = receiptHTML;
        document.body.appendChild(printContainer);

        generateQRCodes(printContainer);
        
        // Wait for images inside the container to load before capturing the canvas
        const images = Array.from(printContainer.getElementsByTagName('img'));
        const imageLoadPromises = images.map(img => new Promise((resolve, reject) => {
            if (img.complete) resolve(true);
            else {
                img.onload = () => resolve(true);
                img.onerror = () => reject(new Error(`Failed to load image: ${img.src}`));
            }
        }));
        await Promise.all(imageLoadPromises);

        const canvas = await html2canvas(printContainer, { scale: 2 });
        document.body.removeChild(printContainer);
        return canvas;
    };

    const handlePrint = async () => {
        try {
            const canvas = await getReceiptCanvas(isCopy);
            const printWindow = window.open('', '', 'height=842,width=595');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Print Receipt</title></head><body>');
                printWindow.document.write('<img src="' + canvas.toDataURL() + '" style="width:100%;">');
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.onload = () => {
                    printWindow.print();
                    printWindow.close();
                };
            }
        } catch (error) {
            console.error("Failed to generate receipt for printing:", error);
            alert("Could not generate receipt for printing. An image may have failed to load. Please check the console for details.");
        }
    };

    const handleDownloadPdf = async () => {
        if (!job) return;
        try {
            const { jsPDF } = jspdf;
            const canvas = await getReceiptCanvas(isCopy);
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const ratio = canvas.width / canvas.height;
            const finalWidth = pdfWidth - 40;
            const finalHeight = finalWidth / ratio;
            pdf.addImage(imgData, 'PNG', 20, 20, finalWidth, finalHeight);
            pdf.save(`Receipt-${job.jfn}${isCopy ? '-COPY' : ''}.pdf`);
        } catch (error) {
             console.error("Failed to generate PDF for download:", error);
            alert("Could not generate PDF for download. An image may have failed to load. Please check the console for details.");
        }
    };
    
    const handleCopyLink = () => {
        if (!job) return;
        const publicUrl = `${window.location.origin}${window.location.pathname}?jobId=${encodeURIComponent(job.jfn)}`;
        navigator.clipboard.writeText(publicUrl).then(() => {
            alert("Link copied to clipboard!");
        });
    }

    const whatsappUrl = job ? `https://api.whatsapp.net/send?text=${encodeURIComponent(`Hello, here is the proof of delivery receipt for Job File ${job.jfn}: ${window.location.origin}${window.location.pathname}?jobId=${encodeURIComponent(job.jfn)}`)}` : '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={job ? `POD Receipt: ${job.jfn}` : 'POD Receipt'} maxWidth="max-w-5xl">
            {job ? (
                <>
                    <div className="no-print mb-4 flex flex-wrap justify-between items-center gap-2">
                        <div className="flex items-center">
                            <input type="checkbox" id="generate-as-copy" checked={isCopy} onChange={e => setIsCopy(e.target.checked)} className="h-4 w-4 rounded" />
                            <label htmlFor="generate-as-copy" className="ml-2 block text-sm">Mark Document as Copy</label>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                            <button onClick={handleDownloadPdf} className="btn btn-secondary">Download PDF</button>
                            <button onClick={handlePrint} className="btn btn-primary">Print</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Receipt Preview */}
                        <div className="lg:col-span-3 border rounded-lg p-2 overflow-auto" style={{ maxHeight: '70vh' }}>
                            <div ref={receiptContentRef} />
                        </div>

                        {/* Share with Recipient section */}
                        <div className="lg:col-span-2 recipient-share-section">
                             <h4 className="text-lg font-bold text-center">Share with Recipient</h4>
                             <p className="text-sm text-center text-slate-600 mb-4">Let the recipient scan the code or use the buttons below to view and download their copy of the receipt.</p>
                             <div ref={shareQrCodeRef} className="p-2 bg-white border rounded-lg inline-block mx-auto"></div>
                             <div className="flex flex-col gap-2 mt-4 w-full max-w-xs">
                                <button onClick={handleCopyLink} className="btn btn-secondary w-full">Copy Link</button>
                                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn bg-green-500 hover:bg-green-600 text-white w-full">Share on WhatsApp</a>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <p>Loading receipt data...</p>
            )}
        </Modal>
    );
};

export default PodReceiptModal;