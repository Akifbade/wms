import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getAuthToken } from '../services/api';

export interface PatchStatus {
    id: string;
    description?: string;
    version?: string;
    status: 'PENDING' | 'ACTIVE' | 'FAILED' | 'DISABLED';
    enabled: boolean;
    appliesTo: string[];
    lastError?: string;
    lastErrorStack?: string;
    loadedAt?: string;
}

interface PatchContextValue {
    statuses: PatchStatus[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    isPatchEnabled: (id: string) => boolean;
}

const PatchContext = createContext<PatchContextValue>({
    statuses: [],
    isLoading: false,
    error: null,
    refresh: async () => {
        /* no-op */
    },
    isPatchEnabled: () => true,
});

interface PatchProviderProps {
    children: React.ReactNode;
    isAuthenticated: boolean;
}

export const PatchProvider: React.FC<PatchProviderProps> = ({ children, isAuthenticated }) => {
    const [statuses, setStatuses] = useState<PatchStatus[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStatuses = useCallback(async () => {
        const token = getAuthToken();
        if (!token) {
            setStatuses([]);
            setError(null);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/system-patches/status', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`Failed to load patch status (${response.status})`);
            }

            const data = await response.json();
            setStatuses(data.patches || []);
            setError(null);
        } catch (err: any) {
            console.error('Patch status fetch failed:', err);
            setError(err.message || 'Unable to load patch status');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            setStatuses([]);
            setError(null);
            return;
        }

        fetchStatuses();
    }, [isAuthenticated, fetchStatuses]);

    const value = useMemo<PatchContextValue>(() => ({
        statuses,
        isLoading,
        error,
        refresh: fetchStatuses,
        isPatchEnabled: (id: string) => {
            const patch = statuses.find((p) => p.id === id);
            return !!patch && patch.enabled && patch.status === 'ACTIVE';
        },
    }), [statuses, isLoading, error, fetchStatuses]);

    return <PatchContext.Provider value={value}>{children}</PatchContext.Provider>;
};

export const usePatchStatus = () => useContext(PatchContext);

export const usePatchEnabled = (patchId: string) => {
    const { isPatchEnabled } = usePatchStatus();
    return isPatchEnabled(patchId);
};
