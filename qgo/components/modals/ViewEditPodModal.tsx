import React, { useState, useEffect, useMemo } from 'react';
import { JobFile, User } from '../../types';
import Modal from './Modal';

interface ViewEditPodModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: JobFile | null;
    drivers: User[];
    onSave: (job: JobFile) => void;
    unassignedJobs: JobFile[];
    mode: 'view' | 'edit' | 'assign';
}

const BLANK_JOB_FOR_POD: Partial<JobFile> = {
    jfn: '', sh: '', co: '', mawb: '', pc: '', gw: '', dsc: '', isManual: true,
    ch: [], status: 'pending', cl: [], pt: [],
    d: new Date().toISOString().split('T')[0],
};

const ViewEditPodModal: React.FC<ViewEditPodModalProps> = ({ isOpen, onClose, job, drivers, onSave, unassignedJobs, mode }) => {
    const [formData, setFormData] = useState<Partial<JobFile>>({});
    const [jobSearch, setJobSearch] = useState('');
    const [isManualMode, setIsManualMode] = useState(false);

    const isReadOnly = mode === 'view';

    useEffect(() => {
        if (isOpen) {
            const initialIsManual = !job && mode === 'assign';
            setIsManualMode(initialIsManual);
            
            let initialFormData: Partial<JobFile> = {};
            if (job) {
                initialFormData = { ...job };
            } else if (initialIsManual) {
                initialFormData = { ...BLANK_JOB_FOR_POD, id: `job-${Date.now()}` };
            }
            
            // Ensure deliveryLocation is pre-filled from consignee if empty
            if (!initialFormData.deliveryLocation && initialFormData.co) {
                initialFormData.deliveryLocation = initialFormData.co;
            }
            
            setFormData(initialFormData);
            setJobSearch('');
        }
    }, [isOpen, job, mode]);
    
    const handleFieldChange = (field: keyof JobFile, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSelectJob = (selectedJob: JobFile) => {
        setFormData({
            ...selectedJob,
            deliveryLocation: selectedJob.deliveryLocation || selectedJob.co || '', // Prioritize existing delivery location, fallback to consignee
        });
        setJobSearch('');
    };
    
    const handleToggleManual = (isManual: boolean) => {
        setIsManualMode(isManual);
        if (isManual) {
            setFormData({ ...BLANK_JOB_FOR_POD, id: `job-${Date.now()}` });
        } else {
            setFormData({});
        }
    }

    const filteredUnassignedJobs = useMemo(() => {
        if (!jobSearch) return [];
        return unassignedJobs.filter(j =>
            j.jfn.toLowerCase().includes(jobSearch.toLowerCase()) ||
            j.sh.toLowerCase().includes(jobSearch.toLowerCase()) ||
            j.co.toLowerCase().includes(jobSearch.toLowerCase())
        ).slice(0, 5);
    }, [jobSearch, unassignedJobs]);

    const handleSave = () => {
        if (!formData.jfn) {
            alert('Job File Number is required.');
            return;
        }
        const driverName = formData.isExternal ? formData.driverName : drivers.find(d => d.uid === formData.driverUid)?.displayName;
        if (!formData.deliveryLocation || !driverName) {
            alert('Delivery location and a driver are required.');
            return;
        }

        onSave(formData as JobFile);
        onClose();
    };

    const modalTitle =
        mode === 'view' ? `View Details: ${formData?.jfn}` :
        mode === 'edit' ? `Edit Assignment: ${formData?.jfn}` :
        isManualMode ? 'Create Manual POD' :
        formData.jfn ? `POD Assignment for ${formData.jfn}` : 'Assign New Delivery';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="max-w-2xl">
            <div className="space-y-4">
                {mode === 'assign' && (
                    <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-md">
                        <input type="checkbox" id="is-manual-mode" checked={isManualMode} onChange={e => handleToggleManual(e.target.checked)} className="h-4 w-4" />
                        <label htmlFor="is-manual-mode">Create Manual Jobfile for POD</label>
                    </div>
                )}

                {/* --- Job Selector/Manual Form --- */}
                {!isManualMode && !formData.jfn ? (
                    <div className="space-y-2">
                         <input type="text" value={jobSearch} onChange={e => setJobSearch(e.target.value)} placeholder="Search for existing job file..." className="input-field"/>
                         <div className="space-y-2 max-h-60 overflow-y-auto">{filteredUnassignedJobs.map(j => (
                            <button key={j.id} onClick={() => handleSelectJob(j)} className="w-full text-left p-2 rounded-md hover:bg-slate-100">
                                <p className="font-semibold">{j.jfn}</p><p className="text-sm text-slate-600">{j.sh} to {j.co}</p>
                            </button>
                        ))}</div>
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto p-2">
                        {/* --- Job Details Section --- */}
                        <div className="p-4 bg-slate-50 rounded-lg border">
                            <h4 className="font-semibold mb-2">Job File Details</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><label>Job File No.</label><input type="text" value={formData.jfn || ''} onChange={e => handleFieldChange('jfn', e.target.value)} className="input-field" disabled={isReadOnly || (!isManualMode && mode !== 'edit')} /></div>
                                <div><label>Shipper</label><input type="text" value={formData.sh || ''} onChange={e => handleFieldChange('sh', e.target.value)} className="input-field" disabled={isReadOnly} /></div>
                                <div className="sm:col-span-2"><label>Consignee</label><input type="text" value={formData.co || ''} onChange={e => handleFieldChange('co', e.target.value)} className="input-field" disabled={isReadOnly} /></div>
                                <div><label>AWB/MAWB</label><input type="text" value={formData.mawb || ''} onChange={e => handleFieldChange('mawb', e.target.value)} className="input-field" disabled={isReadOnly} /></div>
                                <div><label>Pieces</label><input type="text" value={formData.pc || ''} onChange={e => handleFieldChange('pc', e.target.value)} className="input-field" disabled={isReadOnly} /></div>
                                <div><label>Gross Wt.</label><input type="text" value={formData.gw || ''} onChange={e => handleFieldChange('gw', e.target.value)} className="input-field" disabled={isReadOnly} /></div>
                                <div className="sm:col-span-2"><label>Description</label><textarea value={formData.dsc || ''} onChange={e => handleFieldChange('dsc', e.target.value)} rows={2} className="input-field" disabled={isReadOnly} /></div>
                            </div>
                        </div>
                        {/* --- Delivery Assignment Section --- */}
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                             <h4 className="font-semibold mb-2">Delivery & Driver Assignment</h4>
                             <div className="space-y-4">
                                <div><label>Delivery Location</label><input type="text" value={formData.deliveryLocation || ''} onChange={e => handleFieldChange('deliveryLocation', e.target.value)} className="input-field" disabled={isReadOnly} /></div>
                                <div><label>Assignment Notes</label><textarea value={formData.deliveryNotes || ''} onChange={e => handleFieldChange('deliveryNotes', e.target.value)} rows={2} className="input-field" disabled={isReadOnly} /></div>
                                <div className="flex items-center gap-2 pt-2"><input type="checkbox" id="is-external-driver" checked={formData.isExternal || false} onChange={e => handleFieldChange('isExternal', e.target.checked)} className="h-4 w-4" disabled={isReadOnly} /><label htmlFor="is-external-driver">Assign to External Driver</label></div>
                                {formData.isExternal ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" value={formData.driverName || ''} onChange={e => handleFieldChange('driverName', e.target.value)} placeholder="External Driver Name" className="input-field" disabled={isReadOnly} />
                                        <input type="text" value={formData.driverMobile || ''} onChange={e => handleFieldChange('driverMobile', e.target.value)} placeholder="Driver Mobile" className="input-field" disabled={isReadOnly} />
                                    </div>
                                ) : (
                                    <div><label>Select Driver</label><select value={formData.driverUid || ''} onChange={e => handleFieldChange('driverUid', e.target.value)} className="input-field" disabled={isReadOnly}>
                                        <option value="">-- Choose a driver --</option>
                                        {drivers.map(d => <option key={d.uid} value={d.uid}>{d.displayName}</option>)}
                                    </select></div>
                                )}
                             </div>
                        </div>
                    </div>
                )}

                {/* --- Actions --- */}
                {formData.jfn && (
                    <div className="text-right mt-6 space-x-2">
                        {isReadOnly ? (
                            <button onClick={onClose} className="btn btn-secondary">Close</button>
                        ) : (
                            <>
                                <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                                <button onClick={handleSave} className="btn btn-primary">{mode === 'edit' ? 'Update Assignment' : 'Assign & Issue POD'}</button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ViewEditPodModal;