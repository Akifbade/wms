"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserStats = exports.trackUserLogout = exports.getActiveUsers = exports.trackUserActivity = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// In-memory store for active users
const activeUsers = new Map();
// Track user activity
const trackUserActivity = (userId, username, email, role, currentPage, ipAddress, userAgent, loginTime) => {
    const activity = {
        userId,
        username,
        email,
        role,
        currentPage,
        lastActivity: new Date(),
        ipAddress,
        userAgent,
        loginTime: loginTime || activeUsers.get(userId)?.loginTime || new Date()
    };
    activeUsers.set(userId, activity);
    // Auto-cleanup inactive users after 5 minutes
    setTimeout(() => {
        const user = activeUsers.get(userId);
        if (user && Date.now() - user.lastActivity.getTime() > 5 * 60 * 1000) {
            activeUsers.delete(userId);
        }
    }, 5 * 60 * 1000);
};
exports.trackUserActivity = trackUserActivity;
// Get all active users
const getActiveUsers = () => {
    const now = Date.now();
    const activeThreshold = 5 * 60 * 1000; // 5 minutes
    // Clean up inactive users
    for (const [userId, activity] of activeUsers.entries()) {
        if (now - activity.lastActivity.getTime() > activeThreshold) {
            activeUsers.delete(userId);
        }
    }
    return Array.from(activeUsers.values()).map(user => ({
        ...user,
        sessionDuration: Math.floor((now - user.loginTime.getTime()) / 1000), // in seconds
        idleTime: Math.floor((now - user.lastActivity.getTime()) / 1000) // in seconds
    }));
};
exports.getActiveUsers = getActiveUsers;
// Track user logout
const trackUserLogout = (userId) => {
    activeUsers.delete(userId);
};
exports.trackUserLogout = trackUserLogout;
// Get user statistics
const getUserStats = async () => {
    const [totalUsers, activeCount, recentLogins] = await Promise.all([
        prisma.user.count(),
        Promise.resolve(activeUsers.size),
        prisma.user.findMany({
            where: {
                lastLoginAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                lastLoginAt: true
            },
            orderBy: {
                lastLoginAt: 'desc'
            },
            take: 10
        })
    ]);
    return {
        totalUsers,
        activeNow: activeCount,
        last24Hours: recentLogins.length,
        recentLogins
    };
};
exports.getUserStats = getUserStats;
