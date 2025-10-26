// Parse Authentication Routes (replacing Prisma auth)
import express from 'express';
import Parse from '../config/parse';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const router = express.Router();

// Parse.User extended class
Parse.Object.extend('_User');

/**
 * POST /api/auth/register
 * Register a new user with Parse
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, companyName, phone } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, password, and name are required' 
      });
    }

    // Check if user already exists
    const existingUserQuery = new Parse.Query(Parse.User);
    existingUserQuery.equalTo('email', email.toLowerCase());
    const existingUser = await existingUserQuery.first({ useMasterKey: true });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User with this email already exists' 
      });
    }

    // Create Parse.User
    const user = new Parse.User();
    user.set('username', email.toLowerCase());
    user.set('email', email.toLowerCase());
    user.set('password', password); // Parse handles password hashing
    user.set('name', name);
    user.set('phone', phone || null);
    user.set('role', 'ADMIN'); // First user is admin
    user.set('isActive', true);

    // Sign up user
    await user.signUp(null, { useMasterKey: true });

    // Create company if provided
    let companyId = null;
    if (companyName) {
      const Company = Parse.Object.extend('Company');
      const company = new Company();
      company.set('name', companyName);
      company.set('email', email);
      company.set('phone', phone || null);
      company.set('plan', 'FREE');
      company.set('isActive', true);
      company.set('ownerId', user.id);
      await company.save(null, { useMasterKey: true });
      companyId = company.id;

      // Update user with company
      user.set('companyId', companyId);
      await user.save(null, { useMasterKey: true });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.get('email'),
        role: user.get('role'),
        companyId 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Frontend expects direct token and user (not wrapped in data)
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.get('email'),
        name: user.get('name'),
        role: user.get('role'),
        companyId,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Registration failed' 
    });
  }
});

/**
 * POST /api/auth/login
 * Login with Parse.User using REST API
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    // Use Parse REST API to login (handles password verification)
    const parseServerUrl = process.env.PARSE_SERVER_URL || 'http://parse:1337/parse';
    const appId = process.env.PARSE_APP_ID || 'WMS_WAREHOUSE_APP';

    let loginResponse;
    try {
      loginResponse = await axios.get(`${parseServerUrl}/login`, {
        params: {
          username: email.toLowerCase(),
          password: password
        },
        headers: {
          'X-Parse-Application-Id': appId
        }
      });
    } catch (loginError: any) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    const parseUser = loginResponse.data;
    const userId = parseUser.objectId;

    // Get full user data with master key
    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.get(userId, { useMasterKey: true });

    // Check if user is active
    if (!user.get('isActive')) {
      return res.status(403).json({ 
        success: false, 
        error: 'Account is disabled. Contact administrator.' 
      });
    }

    // Get company if exists
    let company = null;
    const companyId = user.get('companyId');
    if (companyId) {
      const companyQuery = new Parse.Query('Company');
      company = await companyQuery.get(companyId, { useMasterKey: true });
    }

    // Update last login
    user.set('lastLoginAt', new Date());
    await user.save(null, { useMasterKey: true });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.get('email'),
        role: user.get('role'),
        companyId: companyId || null
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Frontend expects direct token and user (not wrapped in data)
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.get('email'),
        name: user.get('name'),
        role: user.get('role'),
        phone: user.get('phone'),
        isActive: user.get('isActive'),
        companyId: companyId || null,
        company: company ? {
          id: company.id,
          name: company.get('name'),
          plan: company.get('plan'),
        } : null,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(401).json({ 
      success: false, 
      error: 'Invalid email or password' 
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }

    // Verify JWT
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from Parse
    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.get(decoded.userId, { useMasterKey: true });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Get company if exists
    let company = null;
    const companyId = user.get('companyId');
    if (companyId) {
      const companyQuery = new Parse.Query('Company');
      company = await companyQuery.get(companyId, { useMasterKey: true });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.get('email'),
          name: user.get('name'),
          role: user.get('role'),
          phone: user.get('phone'),
          isActive: user.get('isActive'),
          lastLoginAt: user.get('lastLoginAt'),
          createdAt: user.get('createdAt'),
          companyId: companyId || null,
          company: company ? {
            id: company.id,
            name: company.get('name'),
            plan: company.get('plan'),
            logo: company.get('logo'),
          } : null,
        },
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token removal, but we can log it)
 */
router.post('/logout', async (req, res) => {
  try {
    // Parse doesn't need server-side logout
    // Client will remove token from localStorage
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: 'Logout failed' 
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { currentPassword, newPassword } = req.body;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Current and new password are required' 
      });
    }

    // Verify JWT
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user
    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.get(decoded.userId, { useMasterKey: true });

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.get('password'));
    
    if (!isValidPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Current password is incorrect' 
      });
    }

    // Update password
    user.set('password', newPassword); // Parse handles hashing
    await user.save(null, { useMasterKey: true });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to change password' 
    });
  }
});

export default router;
