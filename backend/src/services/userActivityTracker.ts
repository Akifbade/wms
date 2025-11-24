import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UserActivity {
  userId: string;
  username: string;
  email: string;
  role: string;
  currentPage: string;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  loginTime: Date;
}

// In-memory store for active users
const activeUsers = new Map<string, UserActivity>();

// Track user activity
export const trackUserActivity = (
  userId: string,
  username: string,
  email: string,
  role: string,
  currentPage: string,
  ipAddress: string,
  userAgent: string,
  loginTime?: Date
) => {
  const activity: UserActivity = {
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

// Get all active users
export const getActiveUsers = () => {
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

// Track user logout
export const trackUserLogout = (userId: string) => {
  activeUsers.delete(userId);
};

// Get user statistics
export const getUserStats = async () => {
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
