import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface Permission {
  resource: string;
  action: string;
}

interface PermissionContextType {
  permissions: Permission[];
  loading: boolean;
  hasPermission: (resource: string, action: string) => boolean;
  canView: (resource: string) => boolean;
  canCreate: (resource: string) => boolean;
  canEdit: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  canApprove: (resource: string) => boolean;
  canExport: (resource: string) => boolean;
  canManage: (resource: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      const response = await axios.get('/api/permissions/my-permissions', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setPermissions(response.data.data.permissions);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const hasPermission = (resource: string, action: string): boolean => {
    return permissions.some(
      p => p.resource === resource && p.action === action
    );
  };

  const canView = (resource: string) => hasPermission(resource, 'VIEW');
  const canCreate = (resource: string) => hasPermission(resource, 'CREATE');
  const canEdit = (resource: string) => hasPermission(resource, 'EDIT');
  const canDelete = (resource: string) => hasPermission(resource, 'DELETE');
  const canApprove = (resource: string) => hasPermission(resource, 'APPROVE');
  const canExport = (resource: string) => hasPermission(resource, 'EXPORT');
  const canManage = (resource: string) => hasPermission(resource, 'MANAGE');

  const refreshPermissions = async () => {
    setLoading(true);
    await fetchPermissions();
  };

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        loading,
        hasPermission,
        canView,
        canCreate,
        canEdit,
        canDelete,
        canApprove,
        canExport,
        canManage,
        refreshPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

// Higher-order component for permission-based rendering
export const withPermission = (
  resource: string,
  action: string,
  fallback?: React.ReactNode
) => {
  return (Component: React.ComponentType<any>) => {
    return (props: any) => {
      const { hasPermission } = usePermissions();
      
      if (!hasPermission(resource, action)) {
        return <>{fallback || null}</>;
      }
      
      return <Component {...props} />;
    };
  };
};

// Component for conditional rendering based on permission
export const IfHasPermission: React.FC<{
  resource: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ resource, action, children, fallback }) => {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission(resource, action)) {
    return <>{fallback || null}</>;
  }
  
  return <>{children}</>;
};
