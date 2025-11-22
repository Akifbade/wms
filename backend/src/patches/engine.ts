import fs from 'fs';
import path from 'path';
import type { Application } from 'express';
import type { PrismaClient } from '@prisma/client';
import { PatchConfigEntry, PatchModule, PatchRuntimeStatus, PatchStatusState } from './types';

const patchStatuses: Map<string, PatchRuntimeStatus> = new Map();

const defaultConfig: PatchConfigEntry[] = [];

const makeLogger = (patchId: string) => ({
    info: (message: string, meta: Record<string, unknown> = {}) =>
        console.log(`🔧 [Patch:${patchId}] ${message}`, Object.keys(meta).length ? meta : ''),
    warn: (message: string, meta: Record<string, unknown> = {}) =>
        console.warn(`⚠️ [Patch:${patchId}] ${message}`, Object.keys(meta).length ? meta : ''),
    error: (message: string, meta: Record<string, unknown> = {}) =>
        console.error(`❌ [Patch:${patchId}] ${message}`, Object.keys(meta).length ? meta : ''),
});

const setStatus = (
    entry: PatchConfigEntry,
    status: PatchStatusState,
    extras: Partial<PatchRuntimeStatus> = {}
) => {
    patchStatuses.set(entry.id, {
        id: entry.id,
        description: entry.description,
        version: entry.version,
        status,
        enabled: entry.enabled !== false,
        appliesTo: entry.appliesTo?.length ? entry.appliesTo : ['backend'],
        ...extras,
    });
};

const loadConfigFile = (): PatchConfigEntry[] => {
    const configPath = path.join(process.cwd(), 'patches.config.json');
    try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.patches)) {
            return parsed.patches as PatchConfigEntry[];
        }
        console.warn('Patch config file missing "patches" array, falling back to defaults.');
        return defaultConfig;
    } catch (error) {
        console.warn('No patch config found or invalid JSON; continuing without external patches.', error);
        return defaultConfig;
    }
};

const resolveModulePath = (moduleName: string) => {
    const candidate = path.join(__dirname, 'modules', moduleName);
    if (fs.existsSync(candidate + '.ts') || fs.existsSync(candidate + '.js') || fs.existsSync(candidate)) {
        return candidate;
    }
    return path.join(__dirname, 'modules', `${moduleName}.js`);
};

export const loadPatches = async (app: Application, prisma: PrismaClient) => {
    const entries = loadConfigFile();
    for (const entry of entries) {
        if (entry.enabled === false) {
            setStatus(entry, 'DISABLED');
            continue;
        }

        setStatus(entry, 'PENDING');

        try {
            const modulePath = resolveModulePath(entry.module);
            const imported = await import(modulePath);
            const patchModule: PatchModule = imported.default || imported;

            if (!patchModule || typeof patchModule.apply !== 'function') {
                throw new Error('Patch module missing default export with apply()');
            }

            await patchModule.apply({
                app,
                prisma,
                config: entry,
                logger: makeLogger(entry.id),
            });

            setStatus(entry, 'ACTIVE', { loadedAt: new Date().toISOString() });
        } catch (error: any) {
            setStatus(entry, 'FAILED', {
                lastError: error?.message || 'Unknown patch error',
                lastErrorStack: error?.stack,
            });
            console.error(`Patch ${entry.id} failed to load:`, error);
        }
    }
};

export const getPatchStatuses = () => Array.from(patchStatuses.values());
