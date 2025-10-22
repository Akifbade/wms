import React from 'react';
import { JobFile, AppSettings } from '../types';

interface PodReceiptProps {
    job: JobFile;
    settings: AppSettings;
}

const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
    } catch {
        return 'N/A';
    }
}

// FIX: Allow settings to be optional to support public views.
export const generateReceiptHTML = (job: JobFile, settings: AppSettings | null, isCopy: boolean): string => {
    const copyWatermark = isCopy ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 8rem; color: rgba(255, 0, 0, 0.1); font-weight: bold; z-index: 1000; pointer-events: none;">COPY</div>` : '';
    const partnersLogo = "https://akifbade.github.io/qgocargo/LOGO.jpg";

    let photoHTML = '';
    if (job.photoDataUrl) {
        photoHTML = `
        <div class="mt-4 pt-4 border-t">
            <p class="text-gray-500 text-sm font-bold mb-1">Delivery Photo:</p>
            <img src="${job.photoDataUrl}" alt="Delivery Photo" class="max-w-xs w-full border-2 p-1 rounded-md shadow-inner"/>
        </div>`;
    }

    const locationInfo = job.geolocationName || (job.geolocation ? `${job.geolocation.lat}, ${job.geolocation.lng}` : 'Not Captured.');
    
    const companyLogoUrl = settings?.general?.companyLogoUrl || "http://qgocargo.com/logo.png";
    const companyAddress = settings?.general?.companyAddress || "A/F Cargo Complex, Waha Mall, Ground Floor, Office # 28, Kuwait";
    
    return `
    <div class="p-4 bg-white text-xs font-sans text-black" style="font-family: 'Inter', sans-serif; position: relative;">
        ${copyWatermark}
        <!-- Header -->
        <header class="flex flex-col sm:flex-row justify-between items-start pb-4 border-b-2 border-gray-200">
            <div>
                <img src="${companyLogoUrl}" alt="Company Logo" style="height: 4rem;">
                <p class="text-xs text-gray-500 italic">Formerly known as Boodai Aviation Group</p>
            </div>
            <div class="text-right text-xs mt-4 sm:mt-0">
                <p class="font-bold">CARGO DIVISION</p>
                <p>${companyAddress}</p>
                <p>Tel: 1887887, 22087411/2 | Email: cargo@qgoaviation.com</p>
            </div>
        </header>

        <!-- Title and QR Code -->
        <div class="flex flex-wrap justify-between items-start pt-2 gap-4 my-4">
            <h2 class="text-2xl font-bold text-gray-700">PROOF OF DELIVERY</h2>
            <div class="text-center p-2 rounded-lg bg-gray-100">
                <p class="text-sm font-bold text-gray-800">Verify POD</p>
                <div id="receipt-verification-qrcode" class="p-1 bg-white border rounded-md inline-block mt-1"></div>
            </div>
        </div>

        <!-- Job Details -->
        <div class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
            <div><strong>Job File No:</strong> <span style="font-family: monospace;">${job.jfn || 'N/A'}</span></div>
            <div><strong>Invoice No:</strong> <span style="font-family: monospace;">${job.in || 'N/A'}</span></div>
            <div><strong>AWB / MAWB:</strong> <span style="font-family: monospace;">${job.mawb || 'N/A'}</span></div>
            <div><strong>Airlines:</strong> ${job.ca || 'N/A'}</div>
            <div><strong>Shipper:</strong> ${job.sh || 'N/A'}</div>
            <div><strong>Consignee:</strong> ${job.co || 'N/A'}</div>
            <div class="col-span-2"><strong>Description:</strong> ${job.dsc || 'N/A'}</div>
        </div>

        <!-- Delivery Details -->
        <div class="bg-gray-50 p-4 rounded-lg border">
            <h4 class="font-bold text-lg mb-3">Delivery Confirmation</h4>
            <div class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div><strong>Delivered To:</strong> ${job.receiverName}</div>
                <div><strong>Contact:</strong> ${job.receiverMobile}</div>
                <div class="col-span-2"><strong>Date & Time:</strong> ${formatDate(job.completedAt)}</div>
                <div class="col-span-2"><strong>Delivery Address:</strong> ${job.deliveryLocation}</div>
                <div class="col-span-2"><strong>GPS Location:</strong> ${locationInfo}</div>
                <div class="col-span-2"><strong>POD Confirmed By (Driver):</strong> ${job.driverName}</div>
                <div class="col-span-2"><strong>POD Issued By:</strong> ${job.deliveryAssignedBy || 'N/A'}</div>
            </div>
            <div class="mt-4 pt-4 border-t">
                <p class="text-gray-500 text-sm font-bold mb-1">Receiver's Signature:</p>
                <img src="${job.signatureDataUrl}" alt="Signature" class="w-48 bg-white border-2 p-1 rounded-md shadow-inner"/>
            </div>
            ${photoHTML}
        </div>
        
        <!-- Footer -->
        <footer class="pt-4 mt-4 border-t-2 border-gray-200 text-xs text-gray-600 space-y-3">
            <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                <img src="${partnersLogo}" alt="Partners Logo" style="height: 3rem; object-fit: contain;">
                <p class="font-semibold text-center sm:text-right">We are your one-stop-shop for logistics solutions.</p>
            </div>
            <div class="text-center border-t pt-3 mt-3">
                <p class="font-bold">Q'GO TRAVEL & TOURISM COMPANY W.L.L</p>
                <p>Address: P.O. Box 5798 Safat 13058 Kuwait | Tel: 1 887 887 | Fax: 22087419</p>
            </div>
        </footer>
    </div>
    `;
};


const PodReceipt: React.FC<PodReceiptProps> = ({ job, settings }) => {
    if (!job.deliveryStatus || job.deliveryStatus !== 'Delivered') {
        return <div className="text-center p-8">Proof of Delivery not yet available for this job.</div>;
    }
    
    // The actual rendering is now handled by the modal/public view to support QR code generation
    return (
        <div dangerouslySetInnerHTML={{ __html: generateReceiptHTML(job, settings, false) }} />
    );
};

export default PodReceipt;