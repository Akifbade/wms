"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPatchStatuses = exports.loadPatches = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const patchStatuses = new Map();
const defaultConfig = [];
const makeLogger = (patchId) => ({
    info: (message, meta = {}) => console.log(`🔧 [Patch:${patchId}] ${message}`, Object.keys(meta).length ? meta : ''),
    warn: (message, meta = {}) => console.warn(`⚠️ [Patch:${patchId}] ${message}`, Object.keys(meta).length ? meta : ''),
    error: (message, meta = {}) => console.error(`❌ [Patch:${patchId}] ${message}`, Object.keys(meta).length ? meta : ''),
});
const setStatus = (entry, status, extras = {}) => {
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
const loadConfigFile = () => {
    const configPath = path_1.default.join(process.cwd(), 'patches.config.json');
    try {
        const raw = fs_1.default.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.patches)) {
            return parsed.patches;
        }
        console.warn('Patch config file missing "patches" array, falling back to defaults.');
        return defaultConfig;
    }
    catch (error) {
        console.warn('No patch config found or invalid JSON; continuing without external patches.', error);
        return defaultConfig;
    }
};
const resolveModulePath = (moduleName) => {
    const candidate = path_1.default.join(__dirname, 'modules', moduleName);
    if (fs_1.default.existsSync(candidate + '.ts') || fs_1.default.existsSync(candidate + '.js') || fs_1.default.existsSync(candidate)) {
        return candidate;
    }
    return path_1.default.join(__dirname, 'modules', `${moduleName}.js`);
};
const loadPatches = async (app, prisma) => {
    const entries = loadConfigFile();
    for (const entry of entries) {
        if (entry.enabled === false) {
            setStatus(entry, 'DISABLED');
            continue;
        }
        setStatus(entry, 'PENDING');
        try {
            const modulePath = resolveModulePath(entry.module);
            const imported = await Promise.resolve(`${modulePath}`).then(s => __importStar(require(s)));
            const patchModule = imported.default || imported;
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
        }
        catch (error) {
            setStatus(entry, 'FAILED', {
                lastError: error?.message || 'Unknown patch error',
                lastErrorStack: error?.stack,
            });
            console.error(`Patch ${entry.id} failed to load:`, error);
        }
    }
};
exports.loadPatches = loadPatches;
const getPatchStatuses = () => Array.from(patchStatuses.values());
exports.getPatchStatuses = getPatchStatuses;
