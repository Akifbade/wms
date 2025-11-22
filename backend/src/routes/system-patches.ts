import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getPatchStatuses } from '../patches/engine';
import fs from 'fs';
import path from 'path';

const router = Router();

// Get all patch statuses
router.get('/status', authenticateToken as any, (req, res) => {
    const statuses = getPatchStatuses();
    res.json({ patches: statuses, count: statuses.length, timestamp: new Date().toISOString() });
});

// Toggle patch enable/disable (ADMIN ONLY)
router.post('/toggle/:patchId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
    try {
        // Check if user is admin
        const userRole = (req.user as any)?.role;
        if (userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Only admins can manage patches' });
        }

        const { patchId } = req.params;
        const { enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: 'enabled field must be boolean' });
        }

        // Read config file
        const configPath = path.join(process.cwd(), 'backend', 'patches.config.json');
        let config = { patches: [] };

        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, 'utf-8');
            config = JSON.parse(raw);
        }

        // Find and update patch entry
        const patchIndex = config.patches.findIndex((p: any) => p.id === patchId);
        if (patchIndex === -1) {
            return res.status(404).json({ error: `Patch "${patchId}" not found in config` });
        }

        config.patches[patchIndex].enabled = enabled;

        // Write updated config
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

        res.json({
            message: `Patch "${patchId}" ${enabled ? 'enabled' : 'disabled'}`,
            patch: config.patches[patchIndex],
            note: 'Restart server to apply changes',
        });
    } catch (error: any) {
        console.error('Error toggling patch:', error);
        res.status(500).json({ error: 'Failed to toggle patch', details: error?.message });
    }
});

export default router;
