import { JobFile, User, Client, CustomLink, AppSettings, Feedback, RolePermissions } from '../types';
import { simpleHash } from './utils';

export const MOCK_PERMISSIONS: RolePermissions = {
    admin: {
        canCreateJob: true, canEditJob: true, canDeleteJob: true, canCheckJob: true,
        canApproveJob: true, canManageClients: true, canViewAnalytics: true,
        canManageUsers: true, canManageSettings: true, canManagePODs: true,
    },
    checker: {
        canCreateJob: true, canEditJob: true, canDeleteJob: false, canCheckJob: true,
        canApproveJob: false, canManageClients: true, canViewAnalytics: true,
        canManageUsers: false, canManageSettings: false, canManagePODs: true,
    },
    user: {
        canCreateJob: true, canEditJob: true, canDeleteJob: false, canCheckJob: false,
        canApproveJob: false, canManageClients: false, canViewAnalytics: false,
        canManageUsers: false, canManageSettings: false, canManagePODs: false,
    },
    driver: {
        canCreateJob: false, canEditJob: false, canDeleteJob: false, canCheckJob: false,
        canApproveJob: false, canManageClients: false, canViewAnalytics: false,
        canManageUsers: false, canManageSettings: false, canManagePODs: false, // Driver interacts via a separate flow
    }
};

export const mockUsers: User[] = [
    { uid: 'admin-1', email: 'admin@qgo.com', displayName: 'Admin User', password: simpleHash('admin123'), role: 'admin', status: 'active', createdAt: new Date().toISOString() },
    { uid: 'user-1', email: 'user@qgo.com', displayName: 'Regular User', password: simpleHash('password'), role: 'user', status: 'active', createdAt: new Date().toISOString() },
    { uid: 'checker-1', email: 'checker@qgo.com', displayName: 'Checker User', password: simpleHash('password'), role: 'checker', status: 'active', createdAt: new Date().toISOString() },
    { uid: 'driver-1', email: 'driver1@qgo.com', displayName: 'John Doe (Driver)', password: simpleHash('password'), role: 'driver', status: 'active', createdAt: new Date().toISOString() },
    { uid: 'driver-2', email: 'driver2@qgo.com', displayName: 'Jane Smith (Driver)', password: simpleHash('password'), role: 'driver', status: 'active', createdAt: new Date().toISOString() },
];

export const mockJobs: any[] = [
    { id: 'job-1', jfn: 'QGO/A/001/24', d: '2024-05-20', billingDate: '2024-05-22', sh: 'Global Imports Co.', co: 'Kuwait Retailers', status: 'approved', ch: [{l: 'Freight', c: '100', s: '120', n: ''}], totalProfit: 20, sm: 'Admin User', updatedAt: new Date().toISOString() },
    { id: 'job-2', jfn: 'QGO/S/002/24', d: '2024-05-18', billingDate: '2024-05-20', sh: 'Oceanic Goods', co: 'Eastern Market', status: 'checked', ch: [{l: 'Sea Freight', c: '500', s: '600', n: ''}], totalProfit: 100, sm: 'Checker User', updatedAt: new Date('2024-05-19').toISOString() },
    { id: 'job-3', jfn: 'QGO/L/003/24', d: '2024-05-15', billingDate: '2024-05-16', sh: 'Regional Supplies', co: 'Local Hardware', status: 'pending', ch: [{l: 'Transport', c: '50', s: '65', n: ''}], totalProfit: 15, sm: 'Regular User', updatedAt: new Date('2024-05-18').toISOString() },
    { id: 'job-4', jfn: 'QGO/A/004/24', d: '2024-05-21', billingDate: '2024-05-23', sh: 'Tech Innovators', co: 'Future Gadgets', status: 'rejected', rejectionReason: 'Incorrect paperwork', ch: [{l: 'Air Freight', c: '250', s: '300', n: ''}], totalProfit: 50, sm: 'Admin User', updatedAt: new Date('2024-05-22').toISOString() }
];

export const mockClients: Client[] = [
    { id: 'client-1', name: 'Global Imports Co.', address: '123 Industrial Rd', contactPerson: 'John Smith', phone: '555-1234', type: 'Shipper', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'client-2', name: 'Kuwait Retailers', address: '456 Market St', contactPerson: 'Jane Doe', phone: '555-5678', type: 'Consignee', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

export const mockChargeDescriptions: string[] = ['Freight', 'Customs Duty', 'Handling Fee', 'Delivery Charge', 'Storage'];

export const mockLinks: CustomLink[] = [{ name: 'Company Website', url: 'http://qgocargo.com' }];

export const mockSettings: AppSettings = { 
    general: {
        companyName: "Q'GO CARGO",
        companyLogoUrl: "http://qgocargo.com/logo.png",
        companyAddress: "A/F Cargo Complex, Waha Mall, Ground Floor, Office # 28, Kuwait"
    },
    jobFile: {
        jfnPrefix: "QGO/",
        defaultSalespersonId: "admin-1" // Default to Admin User
    },
    pod: {
        isPhotoRequired: false,
        isGeolocationRequired: true,
        shareMessageTemplate: "Hello, please complete the delivery for Job File {jobId} using this link: {link}"
    },
    print: {
        headerText: "CONFIDENTIAL",
        footerText: "Thank you for your business.",
        showProfitOnPrint: true
    },
    autoLogoutEnabled: true, 
    autoLogoutSeconds: 900, 
    warningSeconds: 60 
};

export const mockFeedback: Feedback[] = [];