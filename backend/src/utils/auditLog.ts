import { prisma } from '../lib/prisma';
import { Request } from 'express';

/**
 * Log user activity to the database
 * @param userId - ID of the user performing the action
 * @param action - Action performed (e.g., 'LOGIN', 'CREATE_USER', 'UPDATE_PROFILE')
 * @param entityType - Type of entity affected (e.g., 'USER', 'SHIPMENT', 'RACK')
 * @param entityId - ID of the entity affected (optional)
 * @param details - Additional details about the action (optional)
 * @param req - Express request object to extract IP and User Agent (optional)
 */
export const logUserActivity = async (
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  details?: string,
  req?: Request
) => {
  try {
    let ipAddress = req?.ip || req?.socket?.remoteAddress;
    // Handle ::ffff: prefix for IPv6 mapped IPv4 addresses
    if (ipAddress && ipAddress.includes('::ffff:')) {
      ipAddress = ipAddress.split('::ffff:')[1];
    }

    const userAgent = req?.headers?.['user-agent'];

    await prisma.userActivity.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        details,
        ipAddress: ipAddress ? String(ipAddress) : undefined,
        userAgent: userAgent ? String(userAgent) : undefined,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to prevent blocking the main action
  }
};
