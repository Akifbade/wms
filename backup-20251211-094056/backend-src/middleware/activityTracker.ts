import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { trackUserActivity } from '../services/userActivityTracker';

export const activityTrackerMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user) {
    const currentPage = req.path;
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    trackUserActivity(
      req.user.id,
      req.user.name || req.user.email,
      req.user.email,
      req.user.role,
      currentPage,
      ipAddress,
      userAgent
    );
  }

  next();
};
