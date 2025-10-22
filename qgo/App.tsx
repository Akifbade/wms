
import React, { useState, useMemo, useEffect, useRef } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import { JobFile, User, AppSettings, CustomLink, Client, Feedback, RolePermissions } from './types';
import { mockJobs, mockUsers, mockClients, mockChargeDescriptions, mockLinks, mockSettings, mockFeedback, MOCK_PERMISSIONS } from './services/mockData';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Notification from './components/Notification';
import LoginScreen from './components/auth/LoginScreen';

// Views
import DashboardView from './components/views/DashboardView';
import JobEditorView from './components/views/JobEditorView';
import FileManagerView from './components/views/FileManagerView';
import ClientManagerView from './components/views/ClientManagerView';
import AnalyticsDashboardView from './components/views/AnalyticsDashboardView';
import PodManagerView from './components/views/PodManagerView';
import DriverDashboardView from './components/views/DriverDashboardView';
import SettingsView from './components/views/SettingsView';

// Modals
import {
    AdminPanelModal, ProfileModal, ChargeManagerModal, LinkManagerModal,
    ConfirmModal, PreviewModal, RejectReasonModal, UserJobsModal, ViewEditPodModal,
    DeliveryCompletionModal, ShareDeliveryModal, DriverPerformanceModal, ViewFeedbackModal, PodReceiptModal, SuccessModal, WelcomeNotificationModal
} from './components/modals/index';

import * as authService from './services/authService';
import { normalizeJobData } from './services/utils';

type View = 'dashboard' | 'editor' | 'files' | 'clients' | 'analytics' | 'pod' | 'settings';

const App: React.FC = () => {
    // State management
    const [users, setUsers] = useLocalStorage<User[]>('qgo_users', mockUsers);
    const [jobFiles, setJobFiles] = useLocalStorage<JobFile[]>('qgo_jobs', mockJobs.map(normalizeJobData));
    const [clients, setClients] = useLocalStorage<Client[]>('qgo_clients', mockClients);
    const [chargeDescriptions, setChargeDescriptions] = useLocalStorage<string[]>('qgo_charges', mockChargeDescriptions);
    const [customLinks, setCustomLinks] = useLocalStorage<CustomLink[]>('qgo_links', mockLinks);
    const [settings, setSettings] = useLocalStorage<AppSettings>('qgo_settings', mockSettings);
    const [feedback, setFeedback] = useLocalStorage<Feedback[]>('qgo_feedback', mockFeedback);
    const [rolePermissions, setRolePermissions] = useLocalStorage<RolePermissions>('qgo_permissions', MOCK_PERMISSIONS);

    const [currentUser, setCurrentUser] = useState<User | null>(authService.getCurrentUser());
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    const [activeJob, setActiveJob] = useState<JobFile | null>(null);
    const [jobToPreview, setJobToPreview] = useState<JobFile | null>(null);
    const [jobToDelete, setJobToDelete] = useState<JobFile | null>(null);
    
    const [notification, setNotification] = useState<{ message: string; isError?: boolean } | null>(null);
    const [activeModal, setActiveModal] = useState<string | null>(null);

    // Confirmation and Success Modal State
    const [successModalContent, setSuccessModalContent] = useState<{ title: string; message: string } | null>(null);
    const [jobToUpdateStatus, setJobToUpdateStatus] = useState<{ job: JobFile; status: 'checked' | 'approved' } | null>(null);
    const [jobToReject, setJobToReject] = useState<JobFile | null>(null);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [chargeToDelete, setChargeToDelete] = useState<string | null>(null);
    const [linkToDelete, setLinkToDelete] = useState<CustomLink | null>(null);
    const [jobToOverwrite, setJobToOverwrite] = useState<JobFile | null>(null);
    
    const [userJobsModalData, setUserJobsModalData] = useState<{title: string, jobs: JobFile[]}>({title: '', jobs: []});
    const [podModalMode, setPodModalMode] = useState<'view' | 'edit' | 'assign'>('assign');
    const [viewingDriver, setViewingDriver] = useState<{driverId: string, driverName: string} | null>(null);
    
    const restoreInputRef = useRef<HTMLInputElement>(null);

    // Welcome notification state
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [welcomeModalData, setWelcomeModalData] = useState({ pendingCheck: 0, pendingApprove: 0 });

    useEffect(() => {
        if (currentUser) {
            const hasSeenWelcome = sessionStorage.getItem('welcome_seen');
            if (!hasSeenWelcome) {
                let pendingCheck = 0;
                let pendingApprove = 0;

                if (currentUser.role === 'checker' || currentUser.role === 'admin') {
                    pendingCheck = jobFiles.filter(j => j.status === 'pending').length;
                }
                if (currentUser.role === 'admin') {
                    pendingApprove = jobFiles.filter(j => j.status === 'checked').length;
                }
                
                if (pendingCheck > 0 || pendingApprove > 0) {
                    setWelcomeModalData({ pendingCheck, pendingApprove });
                    setShowWelcomeModal(true);
                    sessionStorage.setItem('welcome_seen', 'true');
                }
            }
        }
    }, [currentUser, jobFiles]);


    const showNotification = (message: string, isError = false) => {
        setNotification({ message, isError });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleLogin = (user: User) => {
        setCurrentUser(user);
    };

    const handleLogout = () => {
        authService.logout();
        sessionStorage.removeItem('welcome_seen'); // Clear welcome flag on logout
        setCurrentUser(null);
    };
    
    const unassignedJobs = useMemo(() => jobFiles.filter(j => !j.deliveryAssigned), [jobFiles]);
    const drivers = useMemo(() => users.filter(u => u.role === 'driver' && u.status === 'active'), [users]);

    const handleSaveJob = (job: JobFile) => {
        const now = new Date().toISOString();
        const isNew = !jobFiles.some(j => j.id === job.id);
        const jobToSave: JobFile = {
            ...job,
            updatedAt: now,
            lastUpdatedBy: currentUser?.displayName || 'Unknown',
            ...(isNew && { createdAt: now, createdBy: currentUser?.displayName || 'Unknown' })
        };

        setJobFiles(prev => isNew ? [...prev, jobToSave] : prev.map(j => j.id === job.id ? jobToSave : j));
        showNotification(`Job file '${job.jfn}' saved successfully.`);
        setActiveJob(null);
        setCurrentView('files');
    };
    
    const handleNewJob = () => {
        setActiveJob(null);
        setCurrentView('editor');
    };
    
    const handleEditJob = (job: JobFile) => {
        setActiveJob(job);
        setCurrentView('editor');
    };

    const handleDeleteJob = () => {
        if(jobToDelete) {
            setJobFiles(prev => prev.filter(j => j.id !== jobToDelete.id));
            showNotification(`Job file '${jobToDelete.jfn}' deleted.`);
            setJobToDelete(null);
            setActiveModal(null);
        }
    };

    const handleViewJobs = (title: string, jobs: JobFile[]) => {
        setUserJobsModalData({ title, jobs });
        setActiveModal('userJobs');
    };
    
    const handleSavePod = (podData: JobFile) => {
        const driverName = podData.isExternal ? podData.driverName : drivers.find(d => d.uid === podData.driverUid)?.displayName;
        const updatedJob: JobFile = {
            ...podData,
            deliveryAssigned: true,
            deliveryStatus: 'Pending',
            deliveryAssignedAt: new Date().toISOString(),
            deliveryAssignedBy: currentUser?.displayName,
            driverName: driverName || 'Unknown',
        };

        setJobFiles(prev => {
            const exists = prev.some(j => j.id === updatedJob.id);
            return exists ? prev.map(j => j.id === updatedJob.id ? updatedJob : j) : [...prev, updatedJob];
        });
        showNotification(`POD for ${updatedJob.jfn} has been assigned.`);
    };

    const handleCompleteDelivery = (completionData: Partial<JobFile>) => {
        setJobFiles(prev => prev.map(j => j.id === completionData.id ? { ...j, ...completionData, deliveryStatus: 'Delivered', completedAt: new Date().toISOString() } as JobFile : j));
        setActiveModal(null);
        setSuccessModalContent({
            title: 'Delivery Complete!',
            message: `The delivery for job file ${completionData.jfn || ''} has been successfully recorded.`
        });
    };
    
    const handleOpenPodAssignment = (job: JobFile | null) => {
        setActiveJob(job);
        setPodModalMode('assign');
        setActiveModal('viewEditPod');
    };

    const handleViewDeliveryDetails = (job: JobFile) => {
        setActiveJob(job);
        setPodModalMode('view');
        setActiveModal('viewEditPod');
    };

    const handleEditDeliveryDetails = (job: JobFile) => {
        setActiveJob(job);
        setPodModalMode('edit');
        setActiveModal('viewEditPod');
    };

    const handleRestoreClick = () => {
        restoreInputRef.current?.click();
    };

    const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const jsonData = JSON.parse(text);
                const restoredJob = normalizeJobData(jsonData);

                const existingJob = jobFiles.find(j => j.id === restoredJob.id || j.jfn === restoredJob.jfn);
                if (existingJob) {
                    setJobToOverwrite(restoredJob);
                    setActiveModal('confirmOverwrite');
                } else {
                    setJobFiles(prev => [...prev, restoredJob]);
                    showNotification(`Job file '${restoredJob.jfn}' restored successfully.`);
                }
            } catch (error) {
                console.error("Restore error:", error);
                showNotification("Failed to restore file. Ensure it is a valid job file JSON.", true);
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input to allow re-uploading the same file
    };
    
    const handleConfirmOverwrite = () => {
        if (jobToOverwrite) {
            setJobFiles(prev => prev.map(j => (j.id === jobToOverwrite.id || j.jfn === jobToOverwrite.jfn) ? jobToOverwrite : j));
            showNotification(`Job file '${jobToOverwrite.jfn}' has been overwritten.`);
            setJobToOverwrite(null);
            setActiveModal(null);
        }
    };

    // --- Status Update and Deletion Handlers ---
    // Fix: Added functions to handle status updates from modals.
    const handleOpenCheckConfirm = (job: JobFile) => {
        setJobToUpdateStatus({ job, status: 'checked' });
    };

    const handleOpenApproveConfirm = (job: JobFile) => {
        setJobToUpdateStatus({ job, status: 'approved' });
    };

    const handleOpenRejectModal = (job: JobFile) => {
        setJobToReject(job);
        setActiveModal('rejectReason');
    };

    const handleStatusUpdate = (jobId: string, status: JobFile['status'], user: User, updates: Partial<JobFile> = {}) => {
        const now = new Date().toISOString();
        let statusUpdates: Partial<JobFile> = { status, updatedAt: now, lastUpdatedBy: user.displayName };
        if (status === 'checked') {
            statusUpdates = { ...statusUpdates, checkedBy: user.displayName, checkedAt: now };
        } else if (status === 'approved') {
            statusUpdates = { ...statusUpdates, approvedBy: user.displayName, approvedAt: now };
        } else if (status === 'rejected') {
            statusUpdates = { ...statusUpdates, rejectedBy: user.displayName, rejectedAt: now, rejectionReason: updates.rejectionReason };
        }
        
        // Fix: Find the job to get its `jfn` for the notification message.
        const job = jobFiles.find(j => j.id === jobId);
        setJobFiles(prev => prev.map(j => j.id === jobId ? { ...j, ...statusUpdates, ...updates } : j));
        showNotification(`Job ${job?.jfn || ''} ${status} successfully.`);
    };

    const handleConfirmStatusUpdate = () => {
        if (jobToUpdateStatus && currentUser) {
            handleStatusUpdate(jobToUpdateStatus.job.id, jobToUpdateStatus.status, currentUser);
            setJobToUpdateStatus(null);
        }
    };

    const handleConfirmRejection = (reason: string) => {
        if (jobToReject && currentUser) {
            handleStatusUpdate(jobToReject.id, 'rejected', currentUser, { rejectionReason: reason });
            setJobToReject(null);
            setActiveModal(null);
        }
    };

    const handleConfirmDeleteClient = () => {
        if (clientToDelete) {
            setClients(prev => prev.filter(c => c.id !== clientToDelete.id));
            showNotification(`Client '${clientToDelete.name}' deleted.`);
            setClientToDelete(null);
        }
    };

    const handleConfirmDeleteCharge = () => {
        if(chargeToDelete) {
            setChargeDescriptions(prev => prev.filter(d => d !== chargeToDelete));
            showNotification(`Charge '${chargeToDelete}' deleted.`);
            setChargeToDelete(null);
        }
    };

    const handleConfirmDeleteLink = () => {
        if(linkToDelete) {
            setCustomLinks(prev => prev.filter(l => l.name !== linkToDelete.name && l.url !== linkToDelete.url));
            showNotification(`Link '${linkToDelete.name}' deleted.`);
            setLinkToDelete(null);
        }
    };


    if (!currentUser) {
        return <LoginScreen onLogin={handleLogin} users={users} setUsers={setUsers} showNotification={showNotification} />;
    }
    
    const currentUserPermissions = rolePermissions[currentUser.role];
    
     if (currentUser.role === 'driver') {
        return (
            <div className="h-screen bg-slate-100">
                <DriverDashboardView
                    jobs={jobFiles}
                    currentUser={currentUser}
                    feedback={feedback}
                    onCompleteDelivery={(job) => { setActiveJob(job); setActiveModal('deliveryCompletion'); }}
                    onViewReceipt={(job) => { setActiveJob(job); setActiveModal('podReceipt'); }}
                    onViewFeedback={() => { setViewingDriver({ driverId: currentUser.uid, driverName: currentUser.displayName }); setActiveModal('viewFeedback'); }}
                    isStandalone={true}
                    onLogout={handleLogout}
                />
            </div>
        );
    }
    
    const setViewAndCloseSidebar = (view: View) => {
        setCurrentView(view);
        setIsSidebarOpen(false);
    }

    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return <DashboardView jobFiles={jobFiles} onViewJobs={handleViewJobs} onEditJob={handleEditJob} onPreviewJob={(job) => { setJobToPreview(job); setActiveModal('preview')}} currentUser={currentUser} onViewDeliveryDetails={handleViewDeliveryDetails} />;
            case 'editor':
                return <JobEditorView job={activeJob} onSave={handleSaveJob} chargeDescriptions={chargeDescriptions} clients={clients} users={users} settings={settings} />;
            case 'files':
                return <FileManagerView jobs={jobFiles} onEdit={handleEditJob} onPreview={(job) => { setJobToPreview(job); setActiveModal('preview')}} onDelete={(id) => { const job = jobFiles.find(j => j.id === id); if(job) { setJobToDelete(job); setActiveModal('confirmDelete'); }}} currentUser={currentUser} permissions={currentUserPermissions}/>;
            case 'clients':
                return <ClientManagerView clients={clients} setClients={setClients} onDelete={setClientToDelete} showNotification={showNotification} />;
            case 'analytics':
                 return <AnalyticsDashboardView jobFiles={jobFiles} currentUser={currentUser} onLoadJob={handleEditJob} onPreview={(job) => { setJobToPreview(job); setActiveModal('preview')}} setJobToDelete={(job) => { setJobToDelete(job); setActiveModal('confirmDelete'); }} onViewJobs={handleViewJobs} />;
            case 'pod':
                return <PodManagerView jobs={jobFiles} onAssign={handleOpenPodAssignment} onComplete={(job) => { setActiveJob(job); setActiveModal('deliveryCompletion'); }} onViewReceipt={(job) => { setActiveJob(job); setActiveModal('podReceipt'); }} onShare={(job) => { setActiveJob(job); setActiveModal('shareDelivery'); }} onEditDetails={handleEditDeliveryDetails} onViewDetails={handleViewDeliveryDetails} />;
            case 'settings':
                return <SettingsView settings={settings} onUpdateSettings={setSettings} users={users} />;
            default:
                return <div>View not implemented yet.</div>;
        }
    };

    return (
        <div className="app-layout">
            {isSidebarOpen && <div className="sidebar-overlay md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
            <Sidebar 
                currentView={currentView} 
                onSetView={setViewAndCloseSidebar}
                onNewJob={() => {
                    handleNewJob();
                    setIsSidebarOpen(false);
                }} 
                currentUser={currentUser} 
                permissions={currentUserPermissions} 
                isOpen={isSidebarOpen}
            />
            <div className="main-content-area">
                <Header 
                    view={currentView} 
                    currentUser={currentUser} 
                    onLogout={handleLogout} 
                    onOpenModal={setActiveModal}
                    onSetView={setViewAndCloseSidebar}
                    onRestore={handleRestoreClick}
                    customLinks={customLinks} 
                    permissions={currentUserPermissions} 
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                />
                <div className="page-content">
                    {renderView()}
                </div>
            </div>
            <Notification message={notification?.message || null} isError={notification?.isError} />
            
            <input type="file" accept=".json" ref={restoreInputRef} onChange={handleFileSelected} className="hidden" />

            {/* --- Modals --- */}
            <WelcomeNotificationModal 
                isOpen={showWelcomeModal}
                onClose={() => setShowWelcomeModal(false)}
                user={currentUser}
                pendingCheckCount={welcomeModalData.pendingCheck}
                pendingApproveCount={welcomeModalData.pendingApprove}
            />
            <AdminPanelModal isOpen={activeModal === 'adminPanel'} onClose={() => setActiveModal(null)} users={users} onUpdateUsers={setUsers} permissions={rolePermissions} onUpdatePermissions={setRolePermissions} />
            <ChargeManagerModal isOpen={activeModal === 'chargeManager'} onClose={() => setActiveModal(null)} descriptions={chargeDescriptions} setDescriptions={setChargeDescriptions} onDelete={setChargeToDelete} />
            <PreviewModal isOpen={activeModal === 'preview'} onClose={() => setActiveModal(null)} job={jobToPreview} settings={settings} />
            <RejectReasonModal isOpen={activeModal === 'rejectReason'} onClose={() => setActiveModal(null)} onConfirm={handleConfirmRejection} />
            <ProfileModal isOpen={activeModal === 'profile'} onClose={() => setActiveModal(null)} currentUser={currentUser} onUpdateProfile={(updatedUser) => { setUsers(users.map(u => u.uid === updatedUser.uid ? updatedUser : u)); authService.updateCurrentUserInSession(updatedUser); setCurrentUser(authService.getCurrentUser()); showNotification('Profile updated successfully.'); }} onChangePassword={(uid, current, newP) => { const result = authService.changePassword(uid, current, newP, users); if (result.success && result.users) { setUsers(result.users); } return result; }} showNotification={showNotification} />
            <LinkManagerModal isOpen={activeModal === 'linkManager'} onClose={() => setActiveModal(null)} links={customLinks} setLinks={setCustomLinks} onDelete={setLinkToDelete} />
            <UserJobsModal isOpen={activeModal === 'userJobs'} onClose={() => setActiveModal(null)} title={userJobsModalData.title} jobs={userJobsModalData.jobs} onEdit={handleEditJob} onPreview={(job) => { setJobToPreview(job); setActiveModal('preview')}} permissions={currentUserPermissions} onCheck={handleOpenCheckConfirm} onApprove={handleOpenApproveConfirm} onReject={handleOpenRejectModal} onDelete={(job) => {setJobToDelete(job); setActiveModal('confirmDelete');}} />
            <ViewEditPodModal isOpen={activeModal === 'viewEditPod'} onClose={() => setActiveModal(null)} job={activeJob} drivers={drivers} onSave={handleSavePod} unassignedJobs={unassignedJobs} mode={podModalMode} />
            <DeliveryCompletionModal isOpen={activeModal === 'deliveryCompletion'} onClose={() => setActiveModal(null)} job={activeJob} onComplete={handleCompleteDelivery} settings={settings} />
            <PodReceiptModal isOpen={activeModal === 'podReceipt'} onClose={() => setActiveModal(null)} job={activeJob} settings={settings} />
            <ShareDeliveryModal isOpen={activeModal === 'shareDelivery'} onClose={() => setActiveModal(null)} job={activeJob} settings={settings}/>
            <DriverPerformanceModal isOpen={activeModal === 'driverPerformance'} onClose={() => setActiveModal(null)} jobs={jobFiles} users={users} feedback={feedback} onViewJobs={handleViewJobs} onViewFeedback={(driverId) => { const driver = users.find(u => u.uid === driverId); if (driver) { setViewingDriver({ driverId, driverName: driver.displayName }); setActiveModal('viewFeedback'); } }} />
            {viewingDriver && <ViewFeedbackModal isOpen={activeModal === 'viewFeedback'} onClose={() => setActiveModal(null)} driverId={viewingDriver.driverId} driverName={viewingDriver.driverName} feedback={feedback} jobs={jobFiles} isAdmin={currentUser.role === 'admin'} />}
            
            {/* --- Confirmation & Success Modals --- */}
            <SuccessModal isOpen={!!successModalContent} onClose={() => setSuccessModalContent(null)} title={successModalContent?.title || ''} message={successModalContent?.message || ''} />
            <ConfirmModal isOpen={!!jobToUpdateStatus} onClose={() => setJobToUpdateStatus(null)} onConfirm={handleConfirmStatusUpdate} title={`Confirm ${jobToUpdateStatus?.status}`} message={`Are you sure you want to mark job ${jobToUpdateStatus?.job.jfn} as ${jobToUpdateStatus?.status}?`} />
            <ConfirmModal isOpen={activeModal === 'confirmDelete'} onClose={() => {setJobToDelete(null); setActiveModal(null);}} onConfirm={handleDeleteJob} title="Confirm Deletion" message={`Are you sure you want to delete job file ${jobToDelete?.jfn}? This action cannot be undone.`} confirmText={jobToDelete?.jfn} />
            <ConfirmModal isOpen={!!clientToDelete} onClose={() => setClientToDelete(null)} onConfirm={handleConfirmDeleteClient} title="Confirm Client Deletion" message={`Are you sure you want to delete client '${clientToDelete?.name}'?`} />
            <ConfirmModal isOpen={!!chargeToDelete} onClose={() => setChargeToDelete(null)} onConfirm={handleConfirmDeleteCharge} title="Confirm Charge Deletion" message={`Are you sure you want to delete the charge description '${chargeToDelete}'?`} />
            <ConfirmModal isOpen={!!linkToDelete} onClose={() => setLinkToDelete(null)} onConfirm={handleConfirmDeleteLink} title="Confirm Link Deletion" message={`Are you sure you want to delete the link '${linkToDelete?.name}'?`} />
            <ConfirmModal 
                isOpen={activeModal === 'confirmOverwrite'} 
                onClose={() => { setJobToOverwrite(null); setActiveModal(null); }} 
                onConfirm={handleConfirmOverwrite}
                title="Confirm Overwrite" 
                message={`A job file with JFN '${jobToOverwrite?.jfn}' already exists. Do you want to overwrite it with the restored data?`} 
            />
        </div>
    );
};

export default App;