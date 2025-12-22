import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GRANULAR PERMISSION SYSTEM
 * Complete control over every page and every action
 */

// Define all pages/features with their possible actions
const GRANULAR_PERMISSIONS = [
    // ==================== DASHBOARD ====================
    { resource: 'DASHBOARD', action: 'VIEW', description: 'View Dashboard' },
    { resource: 'DASHBOARD_STATS', action: 'VIEW', description: 'View Dashboard Statistics' },
    { resource: 'DASHBOARD_CHARTS', action: 'VIEW', description: 'View Dashboard Charts' },
    { resource: 'DASHBOARD_QUICK_ACTIONS', action: 'VIEW', description: 'View Quick Actions' },

    // ==================== FINANCE TAB ====================
    { resource: 'FINANCE', action: 'VIEW', description: 'View Finance Page' },
    { resource: 'FINANCE_OVERVIEW', action: 'VIEW', description: 'View Financial Overview' },
    { resource: 'FINANCE_CHARTS', action: 'VIEW', description: 'View Financial Charts' },
    { resource: 'FINANCE_EXPORT', action: 'EXPORT', description: 'Export Financial Data' },
    { resource: 'FINANCE_ANALYTICS', action: 'VIEW', description: 'View Financial Analytics' },
    { resource: 'FINANCE_PROFIT_LOSS', action: 'VIEW', description: 'View Profit & Loss' },

    // ==================== COMPANIES ====================
    { resource: 'COMPANIES', action: 'VIEW', description: 'View Companies List' },
    { resource: 'COMPANIES', action: 'CREATE', description: 'Create New Company' },
    { resource: 'COMPANIES', action: 'EDIT', description: 'Edit Company Details' },
    { resource: 'COMPANIES', action: 'DELETE', description: 'Delete Company' },
    { resource: 'COMPANIES', action: 'EXPORT', description: 'Export Companies' },
    { resource: 'COMPANIES', action: 'VIEW_ANALYTICS', description: 'View Company Analytics' },
    { resource: 'COMPANIES', action: 'VIEW_INVOICES', description: 'View Company Invoices' },
    { resource: 'COMPANIES', action: 'VIEW_PAYMENTS', description: 'View Company Payments' },

    // ==================== COMPANY PROFILE ====================
    { resource: 'COMPANY_PROFILE', action: 'VIEW', description: 'View Company Profile Page' },
    { resource: 'COMPANY_PROFILE', action: 'EDIT', description: 'Edit Company Profile' },
    { resource: 'COMPANY_PROFILE_ANALYTICS', action: 'VIEW', description: 'View Profile Analytics' },
    { resource: 'COMPANY_PROFILE_INVOICES', action: 'VIEW', description: 'View Profile Invoices' },
    { resource: 'COMPANY_PROFILE_PAYMENTS', action: 'VIEW', description: 'View Profile Payments' },
    { resource: 'COMPANY_PROFILE_SHIPMENTS', action: 'VIEW', description: 'View Profile Shipments' },

    // ==================== SHIPMENTS ====================
    { resource: 'SHIPMENTS', action: 'VIEW', description: 'View Shipments List' },
    { resource: 'SHIPMENTS', action: 'CREATE', description: 'Create New Shipment' },
    { resource: 'SHIPMENTS', action: 'EDIT', description: 'Edit Shipment Details' },
    { resource: 'SHIPMENTS', action: 'DELETE', description: 'Delete Shipment' },
    { resource: 'SHIPMENTS', action: 'EXPORT', description: 'Export Shipments' },
    { resource: 'SHIPMENTS', action: 'PRINT_QR', description: 'Print QR Codes' },
    { resource: 'SHIPMENTS', action: 'SCAN', description: 'Scan Shipments' },
    { resource: 'SHIPMENTS', action: 'RELEASE', description: 'Release Shipment' },
    { resource: 'SHIPMENTS', action: 'PARTIAL_RELEASE', description: 'Partial Release' },
    { resource: 'SHIPMENTS', action: 'VIEW_HISTORY', description: 'View Shipment History' },
    { resource: 'SHIPMENTS', action: 'BULK_UPLOAD', description: 'Bulk Upload Shipments' },

    // ==================== RACKS ====================
    { resource: 'RACKS', action: 'VIEW', description: 'View Racks List' },
    { resource: 'RACKS', action: 'CREATE', description: 'Create New Rack' },
    { resource: 'RACKS', action: 'EDIT', description: 'Edit Rack Details' },
    { resource: 'RACKS', action: 'DELETE', description: 'Delete Rack' },
    { resource: 'RACKS', action: 'PRINT_QR', description: 'Print Rack QR' },
    { resource: 'RACKS', action: 'EXPORT', description: 'Export Racks' },
    { resource: 'RACKS', action: 'VIEW_CAPACITY', description: 'View Rack Capacity' },
    { resource: 'RACKS', action: 'MANAGE_SHIPMENTS', description: 'Manage Rack Shipments' },

    // ==================== INVOICES ====================
    { resource: 'INVOICES', action: 'VIEW', description: 'View Invoices List' },
    { resource: 'INVOICES', action: 'CREATE', description: 'Create New Invoice' },
    { resource: 'INVOICES', action: 'EDIT', description: 'Edit Invoice' },
    { resource: 'INVOICES', action: 'DELETE', description: 'Delete Invoice' },
    { resource: 'INVOICES', action: 'EXPORT', description: 'Export Invoices' },
    { resource: 'INVOICES', action: 'PRINT', description: 'Print Invoice' },
    { resource: 'INVOICES', action: 'SEND_EMAIL', description: 'Send Invoice by Email' },
    { resource: 'INVOICES', action: 'MARK_PAID', description: 'Mark as Paid' },
    { resource: 'INVOICES', action: 'VIEW_DETAILS', description: 'View Invoice Details' },

    // ==================== PAYMENTS ====================
    { resource: 'PAYMENTS', action: 'VIEW', description: 'View Payments' },
    { resource: 'PAYMENTS', action: 'CREATE', description: 'Record Payment' },
    { resource: 'PAYMENTS', action: 'EDIT', description: 'Edit Payment' },
    { resource: 'PAYMENTS', action: 'DELETE', description: 'Delete Payment' },
    { resource: 'PAYMENTS', action: 'EXPORT', description: 'Export Payments' },
    { resource: 'PAYMENTS', action: 'VIEW_HISTORY', description: 'View Payment History' },

    // ==================== EXPENSES ====================
    { resource: 'EXPENSES', action: 'VIEW', description: 'View Expenses' },
    { resource: 'EXPENSES', action: 'CREATE', description: 'Create Expense' },
    { resource: 'EXPENSES', action: 'EDIT', description: 'Edit Expense' },
    { resource: 'EXPENSES', action: 'DELETE', description: 'Delete Expense' },
    { resource: 'EXPENSES', action: 'APPROVE', description: 'Approve Expense' },
    { resource: 'EXPENSES', action: 'REJECT', description: 'Reject Expense' },
    { resource: 'EXPENSES', action: 'EXPORT', description: 'Export Expenses' },
    { resource: 'EXPENSES', action: 'VIEW_ALL', description: 'View All Company Expenses' },

    // ==================== MOVING JOBS ====================
    { resource: 'MOVING_JOBS', action: 'VIEW', description: 'View Moving Jobs' },
    { resource: 'MOVING_JOBS', action: 'CREATE', description: 'Create New Job' },
    { resource: 'MOVING_JOBS', action: 'EDIT', description: 'Edit Job Details' },
    { resource: 'MOVING_JOBS', action: 'DELETE', description: 'Delete Job' },
    { resource: 'MOVING_JOBS', action: 'ASSIGN_TEAM', description: 'Assign Team Members' },
    { resource: 'MOVING_JOBS', action: 'VIEW_MATERIALS', description: 'View Material Usage' },
    { resource: 'MOVING_JOBS', action: 'ISSUE_MATERIALS', description: 'Issue Materials to Job' },
    { resource: 'MOVING_JOBS', action: 'RETURN_MATERIALS', description: 'Return Materials from Job' },
    { resource: 'MOVING_JOBS', action: 'APPROVE_COMPLETION', description: 'Approve Job Completion' },
    { resource: 'MOVING_JOBS', action: 'UPLOAD_FILES', description: 'Upload Physical Reports' },
    { resource: 'MOVING_JOBS', action: 'VIEW_ALL', description: 'View All Jobs' },

    // ==================== MATERIALS ====================
    { resource: 'MATERIALS', action: 'VIEW', description: 'View Materials Inventory' },
    { resource: 'MATERIALS', action: 'CREATE', description: 'Add New Material' },
    { resource: 'MATERIALS', action: 'EDIT', description: 'Edit Material' },
    { resource: 'MATERIALS', action: 'DELETE', description: 'Delete Material' },
    { resource: 'MATERIALS', action: 'ADJUST_STOCK', description: 'Adjust Stock Levels' },
    { resource: 'MATERIALS', action: 'VIEW_TRANSACTIONS', description: 'View Transaction History' },
    { resource: 'MATERIALS', action: 'EXPORT', description: 'Export Materials' },

    // ==================== MATERIALS REPORT ====================
    { resource: 'MATERIALS_REPORT', action: 'VIEW', description: 'View Materials Report' },
    { resource: 'MATERIALS_REPORT', action: 'EXPORT', description: 'Export Materials Report' },
    { resource: 'MATERIALS_REPORT', action: 'VIEW_USAGE', description: 'View Material Usage' },
    { resource: 'MATERIALS_REPORT', action: 'VIEW_RETURNS', description: 'View Material Returns' },
    { resource: 'MATERIALS_REPORT', action: 'VIEW_STOCK', description: 'View Stock Levels' },

    // ==================== CUSTOMER MATERIALS ====================
    { resource: 'CUSTOMER_MATERIALS', action: 'VIEW', description: 'View Customer Materials' },
    { resource: 'CUSTOMER_MATERIALS', action: 'CREATE', description: 'Add Customer Material' },
    { resource: 'CUSTOMER_MATERIALS', action: 'EDIT', description: 'Edit Customer Material' },
    { resource: 'CUSTOMER_MATERIALS', action: 'DELETE', description: 'Delete Customer Material' },

    // ==================== SCANNER ====================
    { resource: 'SCANNER', action: 'VIEW', description: 'View Scanner Page' },
    { resource: 'SCANNER', action: 'SCAN_SHIPMENT', description: 'Scan Shipment QR' },
    { resource: 'SCANNER', action: 'SCAN_RACK', description: 'Scan Rack QR' },
    { resource: 'SCANNER', action: 'SCAN_MATERIAL', description: 'Scan Material QR' },
    { resource: 'SCANNER', action: 'QUICK_ASSIGN', description: 'Quick Assign Shipment' },

    // ==================== ANALYTICS ====================
    { resource: 'ANALYTICS', action: 'VIEW', description: 'View Analytics Page' },
    { resource: 'ANALYTICS', action: 'VIEW_SHIPMENTS', description: 'View Shipment Analytics' },
    { resource: 'ANALYTICS', action: 'VIEW_REVENUE', description: 'View Revenue Analytics' },
    { resource: 'ANALYTICS', action: 'VIEW_TRENDS', description: 'View Trends' },
    { resource: 'ANALYTICS', action: 'EXPORT', description: 'Export Analytics Data' },

    // ==================== SHIPMENT REPORT ====================
    { resource: 'SHIPMENT_REPORT', action: 'VIEW', description: 'View Shipment Report' },
    { resource: 'SHIPMENT_REPORT', action: 'EXPORT', description: 'Export Shipment Report' },
    { resource: 'SHIPMENT_REPORT', action: 'GENERATE', description: 'Generate Custom Report' },

    // ==================== WORKER DASHBOARD ====================
    { resource: 'WORKER_DASHBOARD', action: 'VIEW', description: 'View Worker Dashboard' },
    { resource: 'WORKER_DASHBOARD', action: 'VIEW_TASKS', description: 'View Assigned Tasks' },
    { resource: 'WORKER_DASHBOARD', action: 'VIEW_PENDING', description: 'View Pending Items' },

    // ==================== MOBILE UPLOAD ====================
    { resource: 'MOBILE_UPLOAD', action: 'VIEW', description: 'View Mobile Upload Page' },
    { resource: 'MOBILE_UPLOAD', action: 'UPLOAD', description: 'Upload Photos/Files' },

    // ==================== BACKUP MANAGEMENT ====================
    { resource: 'BACKUP_MANAGEMENT', action: 'VIEW', description: 'View Backup Management' },
    { resource: 'BACKUP_MANAGEMENT', action: 'CREATE', description: 'Create Backup' },
    { resource: 'BACKUP_MANAGEMENT', action: 'RESTORE', description: 'Restore Backup' },
    { resource: 'BACKUP_MANAGEMENT', action: 'DELETE', description: 'Delete Backup' },

    // ==================== SYSTEM MONITOR ====================
    { resource: 'SYSTEM_MONITOR', action: 'VIEW', description: 'View System Monitor' },
    { resource: 'SYSTEM_MONITOR', action: 'VIEW_LOGS', description: 'View System Logs' },
    { resource: 'SYSTEM_MONITOR', action: 'VIEW_PERFORMANCE', description: 'View Performance Metrics' },

    // ==================== USERS ====================
    { resource: 'USERS', action: 'VIEW', description: 'View Users List' },
    { resource: 'USERS', action: 'CREATE', description: 'Create New User' },
    { resource: 'USERS', action: 'EDIT', description: 'Edit User Details' },
    { resource: 'USERS', action: 'DELETE', description: 'Delete User' },
    { resource: 'USERS', action: 'CHANGE_ROLE', description: 'Change User Role' },
    { resource: 'USERS', action: 'RESET_PASSWORD', description: 'Reset User Password' },
    { resource: 'USERS', action: 'VIEW_ACTIVITY', description: 'View User Activity' },

    // ==================== SETTINGS ====================
    // Split settings into individual permissions
    { resource: 'SETTINGS_COMPANY_PROFILE', action: 'VIEW', description: 'View Company Profile' },
    { resource: 'SETTINGS_COMPANY_PROFILE', action: 'EDIT', description: 'Edit Company Profile' },

    { resource: 'SETTINGS_QR_CONFIG', action: 'VIEW', description: 'View QR Settings' },
    { resource: 'SETTINGS_QR_CONFIG', action: 'EDIT', description: 'Edit QR Settings' },

    { resource: 'SETTINGS_BILLING', action: 'VIEW', description: 'View Billing Settings' },
    { resource: 'SETTINGS_BILLING', action: 'EDIT', description: 'Edit Billing Settings' },

    { resource: 'SETTINGS_CUSTOM_FIELDS', action: 'VIEW', description: 'View Custom Fields' },
    { resource: 'SETTINGS_CUSTOM_FIELDS', action: 'EDIT', description: 'Manage Custom Fields' },

    { resource: 'SETTINGS_NOTIFICATIONS', action: 'VIEW', description: 'View Notifications Settings' },
    { resource: 'SETTINGS_NOTIFICATIONS', action: 'EDIT', description: 'Edit Notification Settings' },

    { resource: 'SETTINGS_SYSTEM', action: 'VIEW', description: 'View System Settings' },
    { resource: 'SETTINGS_SYSTEM', action: 'EDIT', description: 'Edit System Settings' },

    // ==================== REPORTS ====================
    { resource: 'REPORTS', action: 'VIEW', description: 'View Reports Page' },
    { resource: 'REPORTS', action: 'EXPORT', description: 'Export Reports' },
    { resource: 'REPORTS_FINANCIAL', action: 'VIEW', description: 'View Financial Reports' },
    { resource: 'REPORTS_INVENTORY', action: 'VIEW', description: 'View Inventory Reports' },
    { resource: 'REPORTS_JOBS', action: 'VIEW', description: 'View Jobs Reports' },
    { resource: 'REPORTS_CUSTOM', action: 'CREATE', description: 'Create Custom Reports' },

    // ==================== ROLE MANAGEMENT ====================
    { resource: 'ROLE_MANAGEMENT', action: 'VIEW', description: 'View Roles & Permissions' },
    { resource: 'ROLE_MANAGEMENT', action: 'EDIT', description: 'Edit Role Permissions' },

    // ==================== BILLING ====================
    { resource: 'BILLING', action: 'VIEW', description: 'View Billing Dashboard' },
    { resource: 'BILLING', action: 'CREATE', description: 'Create Billing Entry' },
    { resource: 'BILLING', action: 'EDIT', description: 'Edit Billing Entry' },
    { resource: 'BILLING', action: 'DELETE', description: 'Delete Billing Entry' },
    { resource: 'BILLING', action: 'EXPORT', description: 'Export Billing Data' },

    // ==================== PROFILE ====================
    { resource: 'PROFILE', action: 'VIEW', description: 'View Profile' },
    { resource: 'PROFILE', action: 'EDIT', description: 'Edit Profile' },
    { resource: 'PROFILE', action: 'CHANGE_PASSWORD', description: 'Change Password' },
    { resource: 'PROFILE', action: 'VIEW_ACTIVITY', description: 'View Activity Log' },
];

// Define default role permissions
const ROLE_PERMISSIONS = {
    ADMIN: GRANULAR_PERMISSIONS.map(p => ({ resource: p.resource, action: p.action })),

    MANAGER: [
        // Dashboard
        { resource: 'DASHBOARD', action: 'VIEW' },
        { resource: 'DASHBOARD_STATS', action: 'VIEW' },
        { resource: 'DASHBOARD_CHARTS', action: 'VIEW' },
        { resource: 'DASHBOARD_QUICK_ACTIONS', action: 'VIEW' },

        // Shipments - Full control
        { resource: 'SHIPMENTS', action: 'VIEW' },
        { resource: 'SHIPMENTS', action: 'CREATE' },
        { resource: 'SHIPMENTS', action: 'EDIT' },
        { resource: 'SHIPMENTS', action: 'DELETE' },
        { resource: 'SHIPMENTS', action: 'EXPORT' },
        { resource: 'SHIPMENTS', action: 'PRINT_QR' },
        { resource: 'SHIPMENTS', action: 'SCAN' },
        { resource: 'SHIPMENTS', action: 'RELEASE' },
        { resource: 'SHIPMENTS', action: 'PARTIAL_RELEASE' },
        { resource: 'SHIPMENTS', action: 'VIEW_HISTORY' },
        { resource: 'SHIPMENTS', action: 'BULK_UPLOAD' },

        // Racks
        { resource: 'RACKS', action: 'VIEW' },
        { resource: 'RACKS', action: 'CREATE' },
        { resource: 'RACKS', action: 'EDIT' },
        { resource: 'RACKS', action: 'PRINT_QR' },
        { resource: 'RACKS', action: 'EXPORT' },
        { resource: 'RACKS', action: 'VIEW_CAPACITY' },
        { resource: 'RACKS', action: 'MANAGE_SHIPMENTS' },

        // Invoices - Full control
        { resource: 'INVOICES', action: 'VIEW' },
        { resource: 'INVOICES', action: 'CREATE' },
        { resource: 'INVOICES', action: 'EDIT' },
        { resource: 'INVOICES', action: 'DELETE' },
        { resource: 'INVOICES', action: 'EXPORT' },
        { resource: 'INVOICES', action: 'PRINT' },
        { resource: 'INVOICES', action: 'SEND_EMAIL' },
        { resource: 'INVOICES', action: 'MARK_PAID' },
        { resource: 'INVOICES', action: 'VIEW_DETAILS' },

        // Payments
        { resource: 'PAYMENTS', action: 'VIEW' },
        { resource: 'PAYMENTS', action: 'CREATE' },
        { resource: 'PAYMENTS', action: 'EDIT' },
        { resource: 'PAYMENTS', action: 'EXPORT' },
        { resource: 'PAYMENTS', action: 'VIEW_HISTORY' },

        // Expenses
        { resource: 'EXPENSES', action: 'VIEW' },
        { resource: 'EXPENSES', action: 'CREATE' },
        { resource: 'EXPENSES', action: 'EDIT' },
        { resource: 'EXPENSES', action: 'APPROVE' },
        { resource: 'EXPENSES', action: 'REJECT' },
        { resource: 'EXPENSES', action: 'EXPORT' },
        { resource: 'EXPENSES', action: 'VIEW_ALL' },

        // Moving Jobs - Full control
        { resource: 'MOVING_JOBS', action: 'VIEW' },
        { resource: 'MOVING_JOBS', action: 'CREATE' },
        { resource: 'MOVING_JOBS', action: 'EDIT' },
        { resource: 'MOVING_JOBS', action: 'DELETE' },
        { resource: 'MOVING_JOBS', action: 'ASSIGN_TEAM' },
        { resource: 'MOVING_JOBS', action: 'VIEW_MATERIALS' },
        { resource: 'MOVING_JOBS', action: 'ISSUE_MATERIALS' },
        { resource: 'MOVING_JOBS', action: 'RETURN_MATERIALS' },
        { resource: 'MOVING_JOBS', action: 'APPROVE_COMPLETION' },
        { resource: 'MOVING_JOBS', action: 'UPLOAD_FILES' },
        { resource: 'MOVING_JOBS', action: 'VIEW_ALL' },

        // Materials
        { resource: 'MATERIALS', action: 'VIEW' },
        { resource: 'MATERIALS', action: 'CREATE' },
        { resource: 'MATERIALS', action: 'EDIT' },
        { resource: 'MATERIALS', action: 'ADJUST_STOCK' },
        { resource: 'MATERIALS', action: 'VIEW_TRANSACTIONS' },
        { resource: 'MATERIALS', action: 'EXPORT' },

        // Users - View only
        { resource: 'USERS', action: 'VIEW' },
        { resource: 'USERS', action: 'VIEW_ACTIVITY' },

        // Settings - View Company Profile, can edit their own profile
        { resource: 'SETTINGS_COMPANY_PROFILE', action: 'VIEW' },
        { resource: 'SETTINGS_QR_CONFIG', action: 'VIEW' },
        { resource: 'SETTINGS_BILLING', action: 'VIEW' },
        { resource: 'SETTINGS_CUSTOM_FIELDS', action: 'VIEW' },

        // Reports - View and export
        { resource: 'REPORTS', action: 'VIEW' },
        { resource: 'REPORTS', action: 'EXPORT' },
        { resource: 'REPORTS_FINANCIAL', action: 'VIEW' },
        { resource: 'REPORTS_INVENTORY', action: 'VIEW' },
        { resource: 'REPORTS_JOBS', action: 'VIEW' },

        // Billing
        { resource: 'BILLING', action: 'VIEW' },
        { resource: 'BILLING', action: 'CREATE' },
        { resource: 'BILLING', action: 'EDIT' },
        { resource: 'BILLING', action: 'EXPORT' },

        // Finance (NEW)
        { resource: 'FINANCE', action: 'VIEW' },
        { resource: 'FINANCE_OVERVIEW', action: 'VIEW' },
        { resource: 'FINANCE_CHARTS', action: 'VIEW' },
        { resource: 'FINANCE_EXPORT', action: 'EXPORT' },
        { resource: 'FINANCE_ANALYTICS', action: 'VIEW' },
        { resource: 'FINANCE_PROFIT_LOSS', action: 'VIEW' },

        // Companies (NEW)
        { resource: 'COMPANIES', action: 'VIEW' },
        { resource: 'COMPANIES', action: 'VIEW_ANALYTICS' },
        { resource: 'COMPANIES', action: 'VIEW_INVOICES' },
        { resource: 'COMPANIES', action: 'VIEW_PAYMENTS' },
        { resource: 'COMPANIES', action: 'EXPORT' },

        // Company Profile (NEW)
        { resource: 'COMPANY_PROFILE', action: 'VIEW' },
        { resource: 'COMPANY_PROFILE', action: 'EDIT' },

        // Materials Report (NEW)
        { resource: 'MATERIALS_REPORT', action: 'VIEW' },
        { resource: 'MATERIALS_REPORT', action: 'EXPORT' },
        { resource: 'MATERIALS_REPORT', action: 'VIEW_USAGE' },
        { resource: 'MATERIALS_REPORT', action: 'VIEW_RETURNS' },
        { resource: 'MATERIALS_REPORT', action: 'VIEW_STOCK' },

        // Customer Materials (NEW)
        { resource: 'CUSTOMER_MATERIALS', action: 'VIEW' },
        { resource: 'CUSTOMER_MATERIALS', action: 'CREATE' },
        { resource: 'CUSTOMER_MATERIALS', action: 'EDIT' },
        { resource: 'CUSTOMER_MATERIALS', action: 'DELETE' },

        // Scanner (NEW)
        { resource: 'SCANNER', action: 'VIEW' },
        { resource: 'SCANNER', action: 'SCAN_SHIPMENT' },
        { resource: 'SCANNER', action: 'SCAN_RACK' },
        { resource: 'SCANNER', action: 'SCAN_MATERIAL' },
        { resource: 'SCANNER', action: 'QUICK_ASSIGN' },

        // Analytics (NEW)
        { resource: 'ANALYTICS', action: 'VIEW' },
        { resource: 'ANALYTICS', action: 'VIEW_SHIPMENTS' },
        { resource: 'ANALYTICS', action: 'VIEW_REVENUE' },
        { resource: 'ANALYTICS', action: 'VIEW_TRENDS' },
        { resource: 'ANALYTICS', action: 'EXPORT' },

        // Shipment Report (NEW)
        { resource: 'SHIPMENT_REPORT', action: 'VIEW' },
        { resource: 'SHIPMENT_REPORT', action: 'EXPORT' },
        { resource: 'SHIPMENT_REPORT', action: 'GENERATE' },

        // Profile (NEW)
        { resource: 'PROFILE', action: 'VIEW' },
        { resource: 'PROFILE', action: 'EDIT' },
        { resource: 'PROFILE', action: 'CHANGE_PASSWORD' },
    ],

    WORKER: [
        // Dashboard - Limited
        { resource: 'DASHBOARD', action: 'VIEW' },
        { resource: 'DASHBOARD_STATS', action: 'VIEW' },

        // Shipments - Limited
        { resource: 'SHIPMENTS', action: 'VIEW' },
        { resource: 'SHIPMENTS', action: 'CREATE' },
        { resource: 'SHIPMENTS', action: 'EDIT' },
        { resource: 'SHIPMENTS', action: 'SCAN' },
        { resource: 'SHIPMENTS', action: 'VIEW_HISTORY' },

        // Racks - View only
        { resource: 'RACKS', action: 'VIEW' },
        { resource: 'RACKS', action: 'VIEW_CAPACITY' },

        // Invoices - View only
        { resource: 'INVOICES', action: 'VIEW' },
        { resource: 'INVOICES', action: 'VIEW_DETAILS' },

        // Moving Jobs - View and edit assigned
        { resource: 'MOVING_JOBS', action: 'VIEW' },
        { resource: 'MOVING_JOBS', action: 'EDIT' },
        { resource: 'MOVING_JOBS', action: 'VIEW_MATERIALS' },
        { resource: 'MOVING_JOBS', action: 'UPLOAD_FILES' },

        // Materials - View only
        { resource: 'MATERIALS', action: 'VIEW' },
        { resource: 'MATERIALS', action: 'VIEW_TRANSACTIONS' },

        // Expenses - Create own expenses
        { resource: 'EXPENSES', action: 'CREATE' },
        { resource: 'EXPENSES', action: 'VIEW' },

        // Scanner (NEW)
        { resource: 'SCANNER', action: 'VIEW' },
        { resource: 'SCANNER', action: 'SCAN_SHIPMENT' },
        { resource: 'SCANNER', action: 'SCAN_RACK' },
        { resource: 'SCANNER', action: 'SCAN_MATERIAL' },
        { resource: 'SCANNER', action: 'QUICK_ASSIGN' },

        // Worker Dashboard (NEW)
        { resource: 'WORKER_DASHBOARD', action: 'VIEW' },
        { resource: 'WORKER_DASHBOARD', action: 'VIEW_TASKS' },
        { resource: 'WORKER_DASHBOARD', action: 'VIEW_PENDING' },

        // Mobile Upload (NEW)
        { resource: 'MOBILE_UPLOAD', action: 'VIEW' },
        { resource: 'MOBILE_UPLOAD', action: 'UPLOAD' },

        // Profile (NEW)
        { resource: 'PROFILE', action: 'VIEW' },
        { resource: 'PROFILE', action: 'EDIT' },
        { resource: 'PROFILE', action: 'CHANGE_PASSWORD' },
    ]
};

async function seedGranularPermissions() {
    console.log('🌱 Seeding granular permissions system...\n');

    try {
        // 1. Create all permissions
        console.log('📝 Creating permissions...');
        const permissionMap = new Map<string, string>();

        for (const perm of GRANULAR_PERMISSIONS) {
            const permission = await prisma.permission.upsert({
                where: {
                    resource_action: {
                        resource: perm.resource,
                        action: perm.action
                    }
                },
                update: {
                    description: perm.description
                },
                create: {
                    resource: perm.resource,
                    action: perm.action,
                    description: perm.description
                }
            });

            permissionMap.set(`${perm.resource}:${perm.action}`, permission.id);
        }

        console.log(`✅ Created ${permissionMap.size} granular permissions\n`);

        // 2. Get all companies
        const companies = await prisma.company.findMany();

        if (companies.length === 0) {
            console.log('⚠️  No companies found. Permissions created but not assigned.');
            console.log('   Role permissions will be created when companies are added.\n');
            return;
        }

        console.log(`👥 Found ${companies.length} company(ies)\n`);

        // 3. Assign default permissions for each role in each company
        for (const company of companies) {
            console.log(`🏢 Setting up permissions for: ${company.name}`);

            for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
                console.log(`\n  🎭 Role: ${role}`);
                let count = 0;

                // Delete existing permissions for this role
                await prisma.rolePermission.deleteMany({
                    where: {
                        role,
                        companyId: company.id
                    }
                });

                for (const { resource, action } of permissions) {
                    const permissionId = permissionMap.get(`${resource}:${action}`);

                    if (!permissionId) {
                        console.warn(`    ⚠️  Permission not found: ${resource}:${action}`);
                        continue;
                    }

                    await prisma.rolePermission.create({
                        data: {
                            role,
                            permissionId,
                            companyId: company.id
                        }
                    });

                    count++;
                }

                console.log(`    ✓ Assigned ${count} permissions to ${role}`);
            }

            console.log('');
        }

        console.log('\n✅ Granular permission seeding completed!');
        console.log(`\n📊 Summary:`);
        console.log(`   • Total Granular Permissions: ${permissionMap.size}`);
        console.log(`   • Roles: ${Object.keys(ROLE_PERMISSIONS).length}`);
        console.log(`   • ADMIN: Full access (${ROLE_PERMISSIONS.ADMIN.length} permissions)`);
        console.log(`   • MANAGER: ${ROLE_PERMISSIONS.MANAGER.length} permissions`);
        console.log(`   • WORKER: ${ROLE_PERMISSIONS.WORKER.length} permissions`);
        console.log(`\n💡 You now have complete control over every page and action!`);

    } catch (error) {
        console.error('❌ Error seeding granular permissions:', error);
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    seedGranularPermissions()
        .then(() => {
            console.log('\n✅ Done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Fatal error:', error);
            process.exit(1);
        });
}

export { seedGranularPermissions, GRANULAR_PERMISSIONS, ROLE_PERMISSIONS };
