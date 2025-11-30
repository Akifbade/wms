"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityTrackerMiddleware = void 0;
const userActivityTracker_1 = require("../services/userActivityTracker");
const activityTrackerMiddleware = (req, res, next) => {
    if (req.user) {
        const currentPage = req.path;
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        (0, userActivityTracker_1.trackUserActivity)(req.user.id, req.user.name || req.user.email, req.user.email, req.user.role, currentPage, ipAddress, userAgent);
    }
    next();
};
exports.activityTrackerMiddleware = activityTrackerMiddleware;
