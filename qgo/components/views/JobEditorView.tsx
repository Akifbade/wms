

import React, { useState, useEffect } from 'react';
import { JobFile, Charge, Client, User, AppSettings } from '../../types';
import { generateRemarks, suggestCharges } from '../../services/geminiService';

const getInitialBlankJob = (settings: AppSettings, users: User[]): JobFile => {
    const defaultSalesperson = users.find(u => u.uid === settings.jobFile.defaultSalespersonId);
    return {
        id: `job-${Date.now()}`, 
        jfn: settings.jobFile.jfnPrefix || '', 
        d: new Date().toISOString().split('T')[0], 
        billingDate: '', 
        po: '', 
        cl: [], 
        pt: [], 
        in: '', 
        bd: '', 
        sm: defaultSalesperson?.displayName || '', 
        sh: '', 
        co: '', 
        mawb: '', 
        hawb: '', 
        ts: '', 
        or: '', 
        pc: '', 
        gw: '', 
        de: '', 
        vw: '', 
        dsc: '', 
        ca: '', 
        tn: '', 
        vn: '', 
        fv: '', 
        cn: '', 
        ch: Array.from({ length: 5 }, () => ({ l: '', c: '0', s: '0', n: '' })), 
        re: '', 
        pb: '', 
        status: 'pending', 
        totalCost: 0, 
        totalSelling: 0, 
        totalProfit: 0, 
        createdBy: '', 
        createdAt: new Date().toISOString(), 
        lastUpdatedBy: '', 
        updatedAt: new Date().toISOString(), 
        checkedBy: null, 
        checkedAt: null, 
        approvedBy: null, 
        approvedAt: null, 
        rejectedBy: null, 
        rejectedAt: null, 
        rejectionReason: null
    };
};

interface JobEditorViewProps {
    job: JobFile | null;
    onSave: (job: JobFile) => void;
    chargeDescriptions: string[];
    clients: Client[];
    users: User[];
    settings: AppSettings;
}

const JobEditorView: React.FC<JobEditorViewProps> = ({ job, onSave, chargeDescriptions, clients, users, settings }) => {
    const [jobData, setJobData] = useState<JobFile>(getInitialBlankJob(settings, users));
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        if (job) {
            // Ensure charges array is sufficiently long for the UI
            const paddedCharges = [...job.ch];
            while (paddedCharges.length < 5) {
                paddedCharges.push({ l: '', c: '0', s: '0', n: '' });
            }
            setJobData({ ...job, ch: paddedCharges });
        } else {
            setJobData(getInitialBlankJob(settings, users));
        }
    }, [job, settings, users]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setJobData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (field: 'cl' | 'pt', value: string) => {
        setJobData(prev => {
            const currentValues = prev[field] as string[];
            const newValues = currentValues.includes(value)
                ? currentValues.filter(v => v !== value)
                : [...currentValues, value];
            return { ...prev, [field]: newValues };
        });
    };

    const handleChargeChange = (index: number, field: keyof Charge, value: string) => {
        const newCharges = [...jobData.ch];
        newCharges[index] = { ...newCharges[index], [field]: value };
        setJobData(prev => ({ ...prev, ch: newCharges }));
    };
    
    const handleAddChargeRow = () => {
        setJobData(prev => ({
            ...prev,
            ch: [...prev.ch, { l: '', c: '0', s: '0', n: '' }]
        }));
    };
    
    const handleRemoveEmptyCharges = () => {
        setJobData(prev => {
            const nonEmptyCharges = prev.ch.filter(c => c.l.trim() !== '');
            return { ...prev, ch: nonEmptyCharges };
        });
    };

    const calculateTotals = (charges: Charge[]) => {
        const totalCost = charges.reduce((sum, c) => sum + (parseFloat(c.c) || 0), 0);
        const totalSelling = charges.reduce((sum, c) => sum + (parseFloat(c.s) || 0), 0);
        return { totalCost, totalSelling, totalProfit: totalSelling - totalCost };
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalCharges = jobData.ch.filter(c => c.l && c.l.trim() !== '');
        const totals = calculateTotals(finalCharges);
        onSave({ ...jobData, ...totals, ch: finalCharges });
    };

    const handleGenerateRemarks = async () => {
        setIsAiLoading(true);
        try {
            const remarks = await generateRemarks(jobData);
            setJobData(prev => ({ ...prev, re: remarks }));
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setIsAiLoading(false);
        }
    };
    
    const handleSuggestCharges = async () => {
        setIsAiLoading(true);
        try {
            const suggested = await suggestCharges(jobData, chargeDescriptions);
            const newCharges: Charge[] = [...jobData.ch];
            suggested.forEach(sug => {
                const existingIndex = newCharges.findIndex(c => c.l === sug.chargeName);
                const targetIndex = existingIndex > -1 ? existingIndex : newCharges.findIndex(c => !c.l);
                if(targetIndex > -1) {
                    newCharges[targetIndex] = { l: sug.chargeName, c: sug.cost.toString(), s: sug.selling.toString(), n: 'AI Suggested' };
                }
            });
            setJobData(prev => ({ ...prev, ch: newCharges }));
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setIsAiLoading(false);
        }
    };

    const totals = calculateTotals(jobData.ch);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card">
                <h2 className="text-xl font-bold mb-4">{job ? 'Edit Job File' : 'Create New Job File'} - {jobData.jfn}</h2>
                {/* Header Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <label>Job File No.</label>
                        <input name="jfn" value={jobData.jfn} onChange={handleChange} className="input-field" required/>
                    </div>
                    <div>
                        <label>Opening Date</label>
                        <input name="d" type="date" value={jobData.d} onChange={handleChange} className="input-field" />
                    </div>
                    <div>
                        <label>Billing Date</label>
                        <input name="billingDate" type="date" value={jobData.billingDate || ''} onChange={handleChange} className="input-field" />
                    </div>
                    <div>
                        <label>P.O. No.</label>
                        <input name="po" value={jobData.po} onChange={handleChange} className="input-field" />
                    </div>
                    <div>
                        <label>Invoice No.</label>
                        <input name="in" value={jobData.in} onChange={handleChange} className="input-field" />
                    </div>
                    <div>
                        <label>Salesman</label>
                        <input list="salesmen" name="sm" value={jobData.sm} onChange={handleChange} className="input-field" />
                         <datalist id="salesmen">
                            {users.map(user => <option key={user.uid} value={user.displayName} />)}
                        </datalist>
                    </div>
                </div>
            </div>

            {/* Main Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Left Column */}
                <div className="card space-y-4">
                    <h3 className="font-bold">Shipment Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label>Shipper</label>
                            <input list="shippers" name="sh" value={jobData.sh} onChange={handleChange} className="input-field mt-1" />
                            <datalist id="shippers">{clients.filter(c => c.type !== 'Consignee').map(c => <option key={c.id} value={c.name} />)}</datalist>
                        </div>
                        <div>
                            <label>Consignee</label>
                            <input list="consignees" name="co" value={jobData.co} onChange={handleChange} className="input-field mt-1" />
                            <datalist id="consignees">{clients.filter(c => c.type !== 'Shipper').map(c => <option key={c.id} value={c.name} />)}</datalist>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input name="or" value={jobData.or} onChange={handleChange} placeholder="Origin" className="input-field" />
                        <input name="de" value={jobData.de} onChange={handleChange} placeholder="Destination" className="input-field" />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <input name="mawb" value={jobData.mawb} onChange={handleChange} placeholder="MAWB/OBL" className="input-field" />
                        <input name="hawb" value={jobData.hawb} onChange={handleChange} placeholder="HAWB/HBL" className="input-field" />
                    </div>
                    <div>
                        <label>Description of Goods</label>
                        <textarea name="dsc" value={jobData.dsc} onChange={handleChange} rows={3} className="input-field mt-1" />
                    </div>
                </div>

                {/* Right Column */}
                <div className="card space-y-4">
                    <h3 className="font-bold">Classification & Vitals</h3>
                    <div className="flex flex-col sm:flex-row gap-6 border-b pb-4">
                        <div className="flex-1">
                            <label className="font-medium text-slate-700">Product Type</label>
                            <div className="mt-2 space-y-2">
                                {['Air Freight', 'Sea Freight', 'Land Freight', 'Others'].map(val => <label key={val} className="flex items-center gap-2 font-normal"><input type="checkbox" id={`pt-${val}`} checked={jobData.pt.includes(val)} onChange={() => handleCheckboxChange('pt', val)} className="h-4 w-4" /><span className="text-sm">{val}</span></label>)}
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="font-medium text-slate-700">Clearance Type</label>
                             <div className="mt-2 space-y-2">
                                {['Export', 'Import', 'Clearance', 'Local Move'].map(val => <label key={val} className="flex items-center gap-2 font-normal"><input type="checkbox" id={`cl-${val}`} checked={jobData.cl.includes(val)} onChange={() => handleCheckboxChange('cl', val)} className="h-4 w-4" /><span className="text-sm">{val}</span></label>)}
                            </div>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4 pt-4">
                        <input name="pc" value={jobData.pc} onChange={handleChange} placeholder="Pieces" className="input-field" />
                        <input name="gw" value={jobData.gw} onChange={handleChange} placeholder="Gross Wt." className="input-field" />
                        <input name="vw" value={jobData.vw} onChange={handleChange} placeholder="Volume Wt." className="input-field" />
                        <input name="ca" value={jobData.ca} onChange={handleChange} placeholder="Carrier" className="input-field" />
                    </div>
                </div>
            </div>
            
            {/* Charges */}
            <div className="card">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold">Charges</h3>
                     <div className="flex items-center gap-2">
                        <button type="button" onClick={handleRemoveEmptyCharges} className="btn btn-danger text-sm" disabled={isAiLoading}>
                            Remove Empty
                        </button>
                        <button type="button" onClick={handleAddChargeRow} className="btn btn-secondary text-sm" disabled={isAiLoading}>
                            + Add Row
                        </button>
                        <button type="button" onClick={handleSuggestCharges} className="btn bg-purple-500 hover:bg-purple-600 text-white text-sm" disabled={isAiLoading}>
                            {isAiLoading ? 'Loading...' : '✨ Suggest Charges'}
                        </button>
                    </div>
                </div>
                {/* Charge Table */}
                <div className="overflow-x-auto charges-table-container">
                    <table className="w-full charges-table">
                        <thead>
                            <tr className="text-left text-xs text-gray-500 uppercase">
                                <th className="p-2 w-2/5">Description</th>
                                <th className="p-2">Cost (KD)</th>
                                <th className="p-2">Selling (KD)</th>
                                <th className="p-2">Profit (KD)</th>
                                <th className="p-2">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobData.ch.map((charge, index) => (
                                <tr key={index} className="border-t">
                                    <td data-label="Description" className="p-1"><input list="charge-descs" value={charge.l} onChange={e => handleChargeChange(index, 'l', e.target.value)} className="input-field-sm" /></td>
                                    <td data-label="Cost (KD)" className="p-1"><input type="number" step="0.001" value={charge.c} onChange={e => handleChargeChange(index, 'c', e.target.value)} className="input-field-sm" /></td>
                                    <td data-label="Selling (KD)" className="p-1"><input type="number" step="0.001" value={charge.s} onChange={e => handleChargeChange(index, 's', e.target.value)} className="input-field-sm" /></td>
                                    <td data-label="Profit (KD)" className="p-1 text-right font-mono text-sm">{((parseFloat(charge.s) || 0) - (parseFloat(charge.c) || 0)).toFixed(3)}</td>
                                    <td data-label="Notes" className="p-1"><input value={charge.n} onChange={e => handleChargeChange(index, 'n', e.target.value)} className="input-field-sm" /></td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 font-bold">
                                <td className="p-2 text-right">TOTAL</td>
                                <td data-label="Total Cost" className="p-2 font-mono">{totals.totalCost.toFixed(3)}</td>
                                <td data-label="Total Selling" className="p-2 font-mono">{totals.totalSelling.toFixed(3)}</td>
                                <td data-label="Total Profit" className="p-2 font-mono">{totals.totalProfit.toFixed(3)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                    <datalist id="charge-descs">{chargeDescriptions.map(d => <option key={d} value={d} />)}</datalist>
                </div>
            </div>

            {/* Remarks and Save */}
            <div className="card">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold">Remarks</h3>
                     <button type="button" onClick={handleGenerateRemarks} className="btn bg-blue-500 hover:bg-blue-600 text-white text-sm" disabled={isAiLoading}>
                        {isAiLoading ? 'Loading...' : '✨ Generate Remarks'}
                    </button>
                </div>
                <textarea name="re" value={jobData.re} onChange={handleChange} rows={4} className="input-field w-full" />
            </div>

            <div className="text-right">
                <button type="submit" className="btn btn-primary text-lg px-8 py-3">Save Job File</button>
            </div>
        </form>
    );
};

export default JobEditorView;