import React from 'react';
import { JobFile, AppSettings } from '../types';

// Utility to safely format dates to DD/MM/YYYY
const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return '';
    }
}

export const PrintLayout = ({ job, settings }: { job: JobFile, settings: AppSettings }): string => {
    // --- Data Calculation ---
    const totals = job.ch.reduce((acc, charge) => {
        acc.cost += parseFloat(charge.c) || 0;
        acc.selling += parseFloat(charge.s) || 0;
        return acc;
    }, { cost: 0, selling: 0 });
    const totalProfit = totals.selling - totals.cost;

    // --- Helper Functions for Rendering ---
    const checkedSymbol = '☑';
    const uncheckedSymbol = '☐';

    const renderCheckboxes = (all: string[], selected: string[]) => all.map(item =>
        `<div class="flex items-center"><span class="mr-2">${selected.includes(item) ? checkedSymbol : uncheckedSymbol}</span> ${item}</div>`
    ).join('');
    
    const detailRow = (label: string, value: string | undefined | null) => `
        <tr>
            <td class="font-bold p-1 pr-2 align-top w-1/4">${label}</td>
            <td class="p-1 border-b border-gray-300">${value || ''}</td>
        </tr>
    `;
    
    const profitSection = settings.print.showProfitOnPrint ? `
        <section class="my-4">
            <h3 class="text-lg font-bold mb-2">Charges</h3>
            <table class="w-full border-collapse border border-gray-400">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="border border-gray-300 p-1 text-left">Description</th>
                        <th class="border border-gray-300 p-1 text-right">Cost (KD)</th>
                        <th class="border border-gray-300 p-1 text-right">Selling (KD)</th>
                        <th class="border border-gray-300 p-1 text-right">Profit (KD)</th>
                        <th class="border border-gray-300 p-1 text-left">Notes</th>
                    </tr>
                </thead>
                <tbody>
                    ${job.ch.filter(c => c.l && c.l.trim()).map(c => `
                        <tr>
                            <td class="border border-gray-300 p-1">${c.l}</td>
                            <td class="border border-gray-300 p-1 text-right">${(parseFloat(c.c) || 0).toFixed(3)}</td>
                            <td class="border border-gray-300 p-1 text-right">${(parseFloat(c.s) || 0).toFixed(3)}</td>
                            <td class="border border-gray-300 p-1 text-right">${((parseFloat(c.s) || 0) - (parseFloat(c.c) || 0)).toFixed(3)}</td>
                            <td class="border border-gray-300 p-1">${c.n}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot class="font-bold bg-gray-100">
                    <tr>
                        <td class="border border-gray-300 p-1 text-right" colspan="1">TOTAL</td>
                        <td class="border border-gray-300 p-1 text-right">${totals.cost.toFixed(3)}</td>
                        <td class="border border-gray-300 p-1 text-right">${totals.selling.toFixed(3)}</td>
                        <td class="border border-gray-300 p-1 text-right">${totalProfit.toFixed(3)}</td>
                        <td class="border border-gray-300 p-1"></td>
                    </tr>
                </tfoot>
            </table>
        </section>
    ` : `
         <section class="my-4">
            <h3 class="text-lg font-bold mb-2">Charges</h3>
            <table class="w-full border-collapse border border-gray-400">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="border border-gray-300 p-1 text-left">Description</th>
                        <th class="border border-gray-300 p-1 text-right">Amount (KD)</th>
                        <th class="border border-gray-300 p-1 text-left">Notes</th>
                    </tr>
                </thead>
                <tbody>
                    ${job.ch.filter(c => c.l && c.l.trim()).map(c => `
                        <tr>
                            <td class="border border-gray-300 p-1">${c.l}</td>
                            <td class="border border-gray-300 p-1 text-right">${(parseFloat(c.s) || 0).toFixed(3)}</td>
                            <td class="border border-gray-300 p-1">${c.n}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot class="font-bold bg-gray-100">
                    <tr>
                        <td class="border border-gray-300 p-1 text-right" colspan="1">TOTAL</td>
                        <td class="border border-gray-300 p-1 text-right">${totals.selling.toFixed(3)}</td>
                        <td class="border border-gray-300 p-1"></td>
                    </tr>
                </tfoot>
            </table>
        </section>
    `;

    // --- Signature Data Preparation ---
    const preparedByText = `${job.pb || job.createdBy || ''} <br> <span class="text-gray-500 text-xs">${formatDate(job.createdAt)}</span>`;
    let checkedByText = 'Pending';
    if (job.checkedBy) {
        checkedByText = `${job.checkedBy} <br> <span class="text-gray-500 text-xs">${formatDate(job.checkedAt)}</span>`;
    }

    let approvedByText = 'Pending Approval';
    if (job.status === 'approved' && job.approvedBy) {
        approvedByText = `${job.approvedBy} <br> <span class="text-gray-500 text-xs">${formatDate(job.approvedAt)}</span>`;
    } else if (job.status === 'rejected' && job.rejectedBy) {
        approvedByText = `<span class="text-red-600">REJECTED by ${job.rejectedBy}</span> <br> <span class="text-gray-500 text-xs">${formatDate(job.rejectedAt)}</span>`;
    }
    
    // --- Main HTML Structure ---
    return `
    <div class="p-4 bg-white text-xs font-sans text-black" style="width: 100%; margin: auto; display: flex; flex-direction: column;">
        <!-- Header -->
        <header class="flex justify-between items-start pb-4 border-b-2 border-black">
            <div class="flex items-center">
                <img src="${settings.general.companyLogoUrl}" alt="Company Logo" class="h-16 w-auto mr-4">
                <div>
                    <h1 class="text-2xl font-bold">${settings.general.companyName}</h1>
                    <p>${settings.general.companyAddress}</p>
                </div>
            </div>
            <div class="text-right">
                <h2 class="text-3xl font-bold uppercase">Job File</h2>
                <p class="text-xl mt-1"><strong>Job No:</strong> ${job.jfn || ''}</p>
                <p class="mt-1"><strong>Opening Date:</strong> ${formatDate(job.d)}</p>
                <p class="mt-1"><strong>Billing Date:</strong> ${formatDate(job.billingDate)}</p>
                <p class="mt-1"><strong>Salesman:</strong> ${job.sm || 'N/A'}</p>
            </div>
        </header>
        ${settings.print.headerText ? `<div class="text-center font-bold text-lg my-2">${settings.print.headerText}</div>` : ''}

        <!-- Main Details Table -->
        <section class="my-4">
            <table class="w-full text-left">
                <tbody>
                    <tr>
                        <td class="w-1/2 pr-2 align-top">
                            <table class="w-full border-collapse">
                                ${detailRow('Shipper:', job.sh)}
                                ${detailRow('Origin:', job.or)}
                                ${detailRow('MAWB/OBL:', job.mawb)}
                                ${detailRow('Carrier:', job.ca)}
                                ${detailRow('Pieces:', job.pc)}
                                ${detailRow('Gross Wt:', job.gw)}
                            </table>
                        </td>
                        <td class="w-1/2 pl-2 align-top">
                             <table class="w-full border-collapse">
                                ${detailRow('Consignee:', job.co)}
                                ${detailRow('Destination:', job.de)}
                                ${detailRow('HAWB/HBL:', job.hawb)}
                                ${detailRow('Vessel/Flight:', job.vn || job.fv)}
                                ${detailRow('Container:', job.cn)}
                                ${detailRow('Volume Wt:', job.vw)}
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>

         <!-- Classification -->
        <section class="grid grid-cols-2 gap-4 my-4">
             <div class="border p-2 rounded">
                <h3 class="font-bold mb-1">Clearance Type</h3>
                ${renderCheckboxes(['Export', 'Import', 'Clearance', 'Local Move'], job.cl)}
            </div>
            <div class="border p-2 rounded">
                <h3 class="font-bold mb-1">Product Type</h3>
                ${renderCheckboxes(['Air Freight', 'Sea Freight', 'Land Freight', 'Others'], job.pt)}
            </div>
        </section>
        
        <!-- Description -->
        <section class="border p-2 rounded my-4">
            <h3 class="font-bold mb-1">Description of Goods</h3>
            <p>${job.dsc || 'N/A'}</p>
        </section>

        <!-- Charges Table -->
        ${profitSection}
        
        <!-- Remarks -->
        <section class="border p-2 rounded my-4">
            <h3 class="font-bold mb-1">Remarks</h3>
            <p class="whitespace-pre-wrap">${job.re || 'N/A'}</p>
        </section>

        <!-- Footer -->
        <footer class="mt-auto pt-8">
             ${settings.print.footerText ? `<div class="text-center text-sm my-4">${settings.print.footerText}</div>` : ''}
            <div class="grid grid-cols-4 gap-4 text-center">
                <div class="pt-8 border-t border-gray-400">
                    <p class="h-8">&nbsp;</p> <!-- Space for signature -->
                    <p class="font-bold">${preparedByText}</p>
                    <p class="text-sm text-gray-600">Prepared By</p>
                </div>
                <div class="pt-8 border-t border-gray-400 relative">
                    ${job.status === 'checked' || job.status === 'approved' || job.status === 'rejected' ? '<div class="stamp stamp-checked" style="display:block;top:-20px;right:5px;">Checked</div>' : ''}
                    <p class="h-8">&nbsp;</p> <!-- Space for signature -->
                    <p class="font-bold">${checkedByText}</p>
                    <p class="text-sm text-gray-600">Checked By</p>
                </div>
                <div class="pt-8 border-t border-gray-400 relative">
                    ${job.status === 'approved' ? '<div class="stamp stamp-approved" style="display:block;top:-20px;right:5px;">Approved</div>' : ''}
                    ${job.status === 'rejected' ? '<div class="stamp stamp-rejected" style="display:block;top:-20px;right:5px;">Rejected</div>' : ''}
                    <p class="h-8">&nbsp;</p> <!-- Space for signature -->
                    <p class="font-bold">${approvedByText}</p>
                    <p class="text-sm text-gray-600">Approved By</p>
                </div>
                <div class="flex justify-center items-center">
                    <div id="qrcode-print"></div>
                </div>
            </div>
        </footer>
    </div>
    `;
};