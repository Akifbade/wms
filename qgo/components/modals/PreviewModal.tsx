import React, { useEffect, useRef, useState } from 'react';
import { JobFile, AppSettings } from '../../types';
import Modal from './Modal';
import { PrintLayout } from '../PrintLayout';

// Declare external script variables for TypeScript
declare var QRCode: any;
declare var html2canvas: any;
declare var jspdf: any;

interface PreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: JobFile | null;
    settings: AppSettings;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, job, settings }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isCopy, setIsCopy] = useState(false);

    const generateQRCodeInContainer = (container: HTMLElement) => {
        if (!job) return;
        const qrPlaceholder = container.querySelector('#qrcode-print');
        if (qrPlaceholder) {
            qrPlaceholder.innerHTML = ''; // Clear previous QR code
            const publicUrl = `${window.location.origin}${window.location.pathname}?jobId=${encodeURIComponent(job.jfn)}`;
            new QRCode(qrPlaceholder, { text: publicUrl, width: 80, height: 80, correctLevel: QRCode.CorrectLevel.H });
        }
    };

    useEffect(() => {
        if (isOpen && job && contentRef.current) {
            // NOTE: The `PrintLayout` function now needs to accept an `isCopy` flag, which it currently does not.
            // This will be a silent no-op for now but could be added to PrintLayout later.
            contentRef.current.innerHTML = PrintLayout({ job, settings });
            generateQRCodeInContainer(contentRef.current);
        }
    }, [isOpen, job, isCopy, settings]);

    if (!job) return null;

    const getPrintCanvas = async () => {
        if (!job) throw new Error("Job data is missing.");
        
        const printContainer = document.createElement('div');
        printContainer.style.position = 'absolute';
        printContainer.style.left = '-9999px';
        printContainer.style.width = '210mm';
        printContainer.style.backgroundColor = 'white';
        printContainer.style.boxSizing = 'border-box';
        printContainer.innerHTML = PrintLayout({ job, settings });
        document.body.appendChild(printContainer);

        generateQRCodeInContainer(printContainer);

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
            const canvas = await getPrintCanvas();
            const printWindow = window.open('', '', 'height=842,width=595');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Print Job File</title></head><body>');
                printWindow.document.write(`<img src="${canvas.toDataURL()}" style="width:100%;">`);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.onload = () => {
                    printWindow.print();
                    printWindow.close();
                };
            }
        } catch (error) {
            console.error("Failed to generate job file for printing:", error);
            alert("Could not generate job file for printing. An image may have failed to load. Please check the console for details.");
        }
    };

    const handleDownloadPdf = async () => {
        if (!job) return;
        try {
            const { jsPDF } = jspdf;
            const canvas = await getPrintCanvas();
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            let finalWidth = pdfWidth - 40;
            let finalHeight = finalWidth / ratio;
            if (finalHeight > pdfHeight - 40) {
                finalHeight = pdfHeight - 40;
                finalWidth = finalHeight * ratio;
            }

            const x = (pdfWidth - finalWidth) / 2;
            const y = (pdfHeight - finalHeight) / 2;

            pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
            pdf.save(`JobFile-${job.jfn.replace('/', '-')}.pdf`);
        } catch (error) {
            console.error("Failed to generate PDF for download:", error);
            alert("Could not generate PDF for download. An image may have failed to load. Please check the console for details.");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Preview: ${job.jfn}`} maxWidth="max-w-4xl">
            <div className="no-print mb-4 flex justify-end items-center gap-2">
                {/* <div className="flex items-center mr-auto">
                    <input type="checkbox" id="print-as-copy" checked={isCopy} onChange={e => setIsCopy(e.target.checked)} className="h-4 w-4 rounded" />
                    <label htmlFor="print-as-copy" className="ml-2 block text-sm">Mark Document as Copy</label>
                </div> */}
                 <button onClick={handleDownloadPdf} className="btn btn-secondary">Download PDF</button>
                <button onClick={handlePrint} className="btn btn-primary">
                    🖨️ Print
                </button>
            </div>
            <div className="print-preview-wrapper">
                <div ref={contentRef} />
            </div>
        </Modal>
    );
};

export default PreviewModal;