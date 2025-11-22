import { Application } from 'express';
import { PrismaClient } from '@prisma/client';

export type PatchStatusState = 'PENDING' | 'ACTIVE' | 'FAILED' | 'DISABLED';

export interface PatchConfigEntry {
    id: string;
    module: string;
    description?: string;
    version?: string;
    enabled?: boolean;
    appliesTo?: Array<'backend' | 'frontend'>;
    allowFrontendFallback?: boolean;
}

export interface PatchRuntimeStatus {
    id: string;
    description?: string;
    version?: string;
    status: PatchStatusState;
    enabled: boolean;
    appliesTo: Array<'backend' | 'frontend'>;
    lastError?: string;
    lastErrorStack?: string;
    loadedAt?: string;
}

export interface PatchLogger {
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
}

export interface PatchContext {
    app: Application;
    prisma: PrismaClient;
    config: PatchConfigEntry;
    logger: PatchLogger;
}

export interface PatchModule {
    id: string;
    description?: string;
    version?: string;
    appliesTo?: Array<'backend' | 'frontend'>;
    apply: (ctx: PatchContext) => Promise<void> | void;
}
