"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const router = (0, express_1.Router)();
const execAsync = util_1.default.promisify(child_process_1.exec);
router.use(auth_1.authenticateToken);
router.use((0, auth_1.authorizeRoles)('ADMIN'));
router.get('/vps-live', async (req, res) => {
    try {
        const topCmd = 'top -b -n 1 | head -5';
        const { stdout: topOut } = await execAsync(topCmd);
        const cpuLine = topOut.split('\n').find(l => l.includes('%Cpu'));
        let cpu = { user: 0, system: 0, nice: 0, idle: 0, total: 0 };
        if (cpuLine) {
            const pattern = /(\d+\.?\d*)\s*us,\s*(\d+\.?\d*)\s*sy,\s*(\d+\.?\d*)\s*ni,\s*(\d+\.?\d*)\s*id/;
            const m = cpuLine.match(pattern);
            if (m) {
                cpu.user = parseFloat(m[1]);
                cpu.system = parseFloat(m[2]);
                cpu.nice = parseFloat(m[3]);
                cpu.idle = parseFloat(m[4]);
                cpu.total = cpu.user + cpu.system + cpu.nice;
            }
        }
        const dockerCmd = 'docker stats --no-stream --format " table {.Name},{.CPUPerc},{.MemUsage} \ | tail -n +2';
        const { stdout: dockerOut } = await execAsync(dockerCmd);
        const containers = dockerOut.trim().split('\n').filter(l => l).map(line => {
            const parts = line.split(',');
            return { name: parts[0], cpu: parts[1], memory: parts[2] };
        });
        res.json({ cpu, containers, timestamp: new Date() });
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
exports.default = router;
