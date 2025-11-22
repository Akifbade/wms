"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const engine_1 = require("../patches/engine");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
// Get all patch statuses
router.get('/status', auth_1.authenticateToken, (req, res) => {
    const statuses = (0, engine_1.getPatchStatuses)();
    res.json({ patches: statuses, count: statuses.length, timestamp: new Date().toISOString() });
});
// Toggle patch enable/disable (ADMIN ONLY)
router.post('/toggle/:patchId', auth_1.authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        const userRole = req.user?.role;
        if (userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Only admins can manage patches' });
        }
        const { patchId } = req.params;
        const { enabled } = req.body;
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: 'enabled field must be boolean' });
        }
        // Read config file
        const configPath = path_1.default.join(process.cwd(), 'backend', 'patches.config.json');
        let config = { patches: [] };
        if (fs_1.default.existsSync(configPath)) {
            const raw = fs_1.default.readFileSync(configPath, 'utf-8');
            config = JSON.parse(raw);
        }
        // Find and update patch entry
        const patchIndex = config.patches.findIndex((p) => p.id === patchId);
        if (patchIndex === -1) {
            return res.status(404).json({ error: `Patch "${patchId}" not found in config` });
        }
        config.patches[patchIndex].enabled = enabled;
        // Write updated config
        fs_1.default.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        res.json({
            message: `Patch "${patchId}" ${enabled ? 'enabled' : 'disabled'}`,
            patch: config.patches[patchIndex],
            note: 'Restart server to apply changes',
        });
    }
    catch (error) {
        console.error('Error toggling patch:', error);
        res.status(500).json({ error: 'Failed to toggle patch', details: error?.message });
    }
});
exports.default = router;
