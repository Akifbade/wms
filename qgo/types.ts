
export interface Charge {
  l: string;
  c: string;
  s: string;
  n: string;
}

export interface JobFile {
  id: string;
  jfn: string;
  d: string;
  billingDate?: string;
  po: string;
  cl: string[];
  pt: string[];
  in: string;
  bd: string;
  sm: string;
  sh: string;
  co: string;
  mawb: string;
  hawb: string;
  ts: string;
  or: string;
  pc: string;
  gw: string;
  de: string;
  vw: string;
  dsc: string;
  ca: string;
  tn: string;
  vn: string;
  fv: string;
  cn: string;
  ch: Charge[];
  re: string;
  pb: string;
  status: 'pending' | 'checked' | 'approved' | 'rejected';
  totalCost: number;
  totalSelling: number;
  totalProfit: number;
  createdBy: string;
  createdAt: string;
  lastUpdatedBy: string;
  updatedAt: string;
  checkedBy: string | null;
  checkedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  
  // POD fields
  deliveryAssigned?: boolean;
  deliveryStatus?: 'Pending' | 'Delivered';
  deliveryAssignedAt?: string | null;
  deliveryAssignedBy?: string | null;
  driverUid?: string | null;
  driverName?: string | null;
  driverMobile?: string | null;
  isExternal?: boolean;
  deliveryLocation?: string;
  deliveryNotes?: string;
  completedAt?: string | null;
  receiverName?: string;
  receiverMobile?: string;
  signatureDataUrl?: string;
  photoDataUrl?: string | null;
  geolocation?: { lat: number; lng: number } | null;
  geolocationName?: string | null;
  feedbackStatus?: 'pending' | 'rated';
  isManual?: boolean;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  password?: string;
  role: 'admin' | 'user' | 'checker' | 'driver';
  status: 'active' | 'inactive' | 'blocked';
  createdAt: string;
}

export interface CustomLink {
  name: string;
  url: string;
}

export interface AppSettings {
  general: {
    companyName: string;
    companyLogoUrl: string;
    companyAddress: string;
  };
  jobFile: {
    jfnPrefix: string;
    defaultSalespersonId: string;
  };
  pod: {
    isPhotoRequired: boolean;
    isGeolocationRequired: boolean;
    shareMessageTemplate: string;
  };
  print: {
    headerText: string;
    footerText: string;
    showProfitOnPrint: boolean;
  };
  // Old settings for auto-logout
  autoLogoutEnabled: boolean;
  autoLogoutSeconds: number;
  warningSeconds: number;
}

export interface Client {
  id: string;
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
  type: 'Shipper' | 'Consignee' | 'Both';
  createdAt: string;
  updatedAt: string;
}

export interface Feedback {
  id: string;
  jobFileNo: string;
  driverUid?: string | null;
  driverName?: string | null;
  rating: number;
  comment: string;
  createdAt: string;
  deviceInfo?: string;
  ipAddress?: string;
}

export interface PermissionSet {
  canCreateJob: boolean;
  canEditJob: boolean;
  canDeleteJob: boolean;
  canCheckJob: boolean;
  canApproveJob: boolean;
  canManageClients: boolean;
  canViewAnalytics: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canManagePODs: boolean;
}

export type RolePermissions = {
  [key in User['role']]: PermissionSet;
};