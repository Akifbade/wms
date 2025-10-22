import React, { useState } from 'react';
import { AppSettings, User } from '../../types';

interface SettingsViewProps {
    settings: AppSettings;
    onUpdateSettings: (settings: AppSettings) => void;
    users: User[];
}

type Tab = 'general' | 'jobFile' | 'pod' | 'print';

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings, users }) => {
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
    const [activeTab, setActiveTab] = useState<Tab>('general');

    const handleSave = () => {
        onUpdateSettings(localSettings);
        alert('Settings saved successfully!');
    };
    
    const handleGeneralChange = (field: keyof AppSettings['general'], value: string) => {
        setLocalSettings(prev => ({ ...prev, general: { ...prev.general, [field]: value } }));
    };
    
    const handleJobFileChange = (field: keyof AppSettings['jobFile'], value: string) => {
        setLocalSettings(prev => ({ ...prev, jobFile: { ...prev.jobFile, [field]: value } }));
    };

    const handlePodChange = (field: keyof AppSettings['pod'], value: string | boolean) => {
        setLocalSettings(prev => ({ ...prev, pod: { ...prev.pod, [field]: value } }));
    };

    const handlePrintChange = (field: keyof AppSettings['print'], value: string | boolean) => {
        setLocalSettings(prev => ({ ...prev, print: { ...prev.print, [field]: value } }));
    };

    const TabButton: React.FC<{ name: Tab, label: string }> = ({ name, label }) => (
        <button onClick={() => setActiveTab(name)} className={`settings-tab ${activeTab === name ? 'active' : ''}`}>{label}</button>
    );

    return (
        <div className="card">
            <h1 className="text-2xl font-bold mb-4">Application Settings</h1>
            
            <div className="settings-tabs">
                <TabButton name="general" label="General" />
                <TabButton name="jobFile" label="Job File" />
                <TabButton name="pod" label="Proof of Delivery" />
                <TabButton name="print" label="Printing" />
            </div>

            <div className="space-y-6">
                {activeTab === 'general' && (
                    <div className="settings-section space-y-4">
                        <h2 className="text-lg font-bold">Company Information</h2>
                        <div><label>Company Name</label><input type="text" value={localSettings.general.companyName} onChange={e => handleGeneralChange('companyName', e.target.value)} className="input-field" /></div>
                        <div><label>Company Logo URL</label><input type="text" value={localSettings.general.companyLogoUrl} onChange={e => handleGeneralChange('companyLogoUrl', e.target.value)} className="input-field" /></div>
                        <div><label>Company Address</label><textarea rows={3} value={localSettings.general.companyAddress} onChange={e => handleGeneralChange('companyAddress', e.target.value)} className="input-field"></textarea></div>
                    </div>
                )}

                {activeTab === 'jobFile' && (
                    <div className="settings-section space-y-4">
                        <h2 className="text-lg font-bold">Job File Defaults</h2>
                        <div><label>Job File Number Prefix</label><input type="text" value={localSettings.jobFile.jfnPrefix} onChange={e => handleJobFileChange('jfnPrefix', e.target.value)} className="input-field" /></div>
                        <div><label>Default Salesperson</label><select value={localSettings.jobFile.defaultSalespersonId} onChange={e => handleJobFileChange('defaultSalespersonId', e.target.value)} className="input-field">
                            <option value="">None</option>
                            {users.map(user => <option key={user.uid} value={user.uid}>{user.displayName}</option>)}
                        </select></div>
                    </div>
                )}
                
                {activeTab === 'pod' && (
                     <div className="settings-section space-y-4">
                        <h2 className="text-lg font-bold">Proof of Delivery Settings</h2>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={localSettings.pod.isPhotoRequired} onChange={e => handlePodChange('isPhotoRequired', e.target.checked)} className="h-4 w-4" /> Require photo on completion</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={localSettings.pod.isGeolocationRequired} onChange={e => handlePodChange('isGeolocationRequired', e.target.checked)} className="h-4 w-4" /> Require geolocation on completion</label>
                        <div><label>Share Message Template</label><textarea rows={3} value={localSettings.pod.shareMessageTemplate} onChange={e => handlePodChange('shareMessageTemplate', e.target.value)} className="input-field"></textarea><p className="text-xs text-slate-500 mt-1">Use {'{jobId}'} and {'{link}'} as placeholders.</p></div>
                    </div>
                )}

                {activeTab === 'print' && (
                     <div className="settings-section space-y-4">
                        <h2 className="text-lg font-bold">Print Settings</h2>
                         <div><label>Custom Header Text</label><input type="text" value={localSettings.print.headerText} onChange={e => handlePrintChange('headerText', e.target.value)} className="input-field" /></div>
                        <div><label>Custom Footer Text</label><textarea rows={2} value={localSettings.print.footerText} onChange={e => handlePrintChange('footerText', e.target.value)} className="input-field"></textarea></div>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={localSettings.print.showProfitOnPrint} onChange={e => handlePrintChange('showProfitOnPrint', e.target.checked)} className="h-4 w-4" /> Show Profit section on printouts</label>
                    </div>
                )}

                <div className="text-right pt-4">
                    <button onClick={handleSave} className="btn btn-primary px-8 py-3 text-lg">Save All Settings</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
