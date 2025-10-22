const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = 5555;
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'QGO Backend v2.0 - With Prisma', timestamp: new Date().toISOString() });
});

// Get all jobs
app.get('/api/jobs', async (req, res) => {
  try {
    console.log('GET /api/jobs called with params:', req.query);
    
    const skip = parseInt(req.query.skip || '0');
    const take = parseInt(req.query.take || '20');
    
    // Fetch from database
    const jobs = await prisma.jobFile.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { 
        charges: true,
        createdBy: true,
        checkedBy: true,
        approvedBy: true,
        rejectedBy: true
      }
    });
    
    // Parse JSON fields in response
    const parseJob = (job) => ({
      ...job,
      cl: job.cl ? (typeof job.cl === 'string' ? JSON.parse(job.cl) : job.cl) : [],
      pt: job.pt ? (typeof job.pt === 'string' ? JSON.parse(job.pt) : job.pt) : [],
      ch: job.charges || [],
      // Use createdBy displayName, fallback to pb (Prepared By), then lastUpdatedBy, then Unknown
      createdBy: job.createdBy?.displayName || job.pb || job.lastUpdatedBy || 'Unknown',
      checkedBy: job.checkedBy?.displayName || null,
      approvedBy: job.approvedBy?.displayName || null,
      rejectedBy: job.rejectedBy?.displayName || null
    });
    
    const parsedJobs = jobs.map(parseJob);
    
    const total = await prisma.jobFile.count();
    
    res.json({
      jobs: parsedJobs,
      total,
      skip,
      take,
      message: `Found ${parsedJobs.length} jobs`
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get single job
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const job = await prisma.jobFile.findUnique({
      where: { id: req.params.id },
      include: { 
        charges: true,
        createdBy: true,
        checkedBy: true,
        approvedBy: true,
        rejectedBy: true
      }
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Parse JSON fields
    const responseJob = {
      ...job,
      cl: job.cl ? (typeof job.cl === 'string' ? JSON.parse(job.cl) : job.cl) : [],
      pt: job.pt ? (typeof job.pt === 'string' ? JSON.parse(job.pt) : job.pt) : [],
      ch: job.charges || [],
      // Use createdBy displayName, fallback to pb (Prepared By), then lastUpdatedBy, then Unknown
      createdBy: job.createdBy?.displayName || job.pb || job.lastUpdatedBy || 'Unknown',
      checkedBy: job.checkedBy?.displayName || null,
      approvedBy: job.approvedBy?.displayName || null,
      rejectedBy: job.rejectedBy?.displayName || null
    };
    
    res.json(responseJob);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Create job
app.post('/api/jobs', async (req, res) => {
  try {
    console.log('POST /api/jobs called with job:', req.body?.jfn);
    
    const job = req.body;
    
    if (!job || !job.jfn) {
      return res.status(400).json({ error: 'Job data or JFN missing' });
    }
    
    // Check if job already exists
    const existing = await prisma.jobFile.findUnique({
      where: { jfn: job.jfn }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Job with this JFN already exists' });
    }
    
    // Helper to convert arrays/objects to JSON strings
    const stringifyIfArray = (value) => {
      if (Array.isArray(value)) {
        return JSON.stringify(value);
      } else if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return String(value || '');
    };
    
    // Create new job with all fields preserved
    const jobData = {
      jfn: job.jfn,
      d: job.d || new Date().toISOString().split('T')[0],
      billingDate: job.billingDate || null,
      po: job.po || null,
      cl: stringifyIfArray(job.cl || job.clients || []), // Convert to JSON string
      pt: stringifyIfArray(job.pt || []), // Convert to JSON string
      in: job.in || null,
      bd: job.bd || null,
      sm: job.sm || null,
      sh: job.sh || null,
      co: job.co || null,
      mawb: job.mawb || null,
      hawb: job.hawb || null,
      ts: job.ts || null,
      or: job.or || null,
      pc: String(job.pc || ''),
      gw: String(job.gw || ''),
      de: job.de || null,
      vw: String(job.vw || ''),
      dsc: job.dsc || null,
      ca: job.ca || null,
      tn: job.tn || null,
      vn: job.vn || null,
      fv: job.fv || null,
      cn: job.cn || null,
      re: job.re || null,
      pb: job.pb || null,
      status: job.status || 'pending',
      totalCost: parseFloat(job.totalCost) || 0,
      totalSelling: parseFloat(job.totalSelling) || 0,
      totalProfit: parseFloat(job.totalProfit) || 0,
      // POD and delivery fields
      deliveryAssigned: job.deliveryAssigned || false,
      deliveryStatus: job.deliveryStatus || 'Pending',
      deliveryAssignedAt: job.deliveryAssignedAt || null,
      driverUid: job.driverUid || null,
      driverName: job.driverName || null,
      driverMobile: job.driverMobile || null,
      isExternal: job.isExternal || false,
      deliveryLocation: job.deliveryLocation || null,
      deliveryNotes: job.deliveryNotes || null,
      completedAt: job.completedAt || null,
      receiverName: job.receiverName || null,
      receiverMobile: job.receiverMobile || null,
      signatureDataUrl: job.signatureDataUrl || null,
      photoDataUrl: job.photoDataUrl || null,
      latitude: job.latitude || null,
      longitude: job.longitude || null,
      geolocationName: job.geolocationName || null,
      feedbackStatus: job.feedbackStatus || 'pending',
      isManual: job.isManual || false
    };

    // Create job with charges
    const createdJob = await prisma.jobFile.create({
      data: {
        ...jobData,
        charges: {
          create: (job.ch || []).map((charge) => ({
            l: charge.l || charge.description || '',
            c: String(charge.c || charge.cost || '0'),
            s: String(charge.s || charge.selling || '0'),
            n: charge.n || charge.notes || ''
          }))
        }
      },
      include: { charges: true }
    });
    
    // Parse JSON fields back for response
    const responseJob = {
      ...createdJob,
      cl: createdJob.cl ? (typeof createdJob.cl === 'string' ? JSON.parse(createdJob.cl) : createdJob.cl) : [],
      pt: createdJob.pt ? (typeof createdJob.pt === 'string' ? JSON.parse(createdJob.pt) : createdJob.pt) : [],
      ch: createdJob.charges || []
    };
    
    res.status(201).json({
      ...responseJob,
      message: 'Job successfully created and saved to database'
    });
  } catch (error) {
    console.error('Error creating job:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Job with this JFN already exists' });
    }
    res.status(500).json({ error: 'Failed to create job', details: error.message });
  }
});

// Update job
app.put('/api/jobs/:id', async (req, res) => {
  try {
    console.log('🔓 PUT /api/jobs/:id - PUBLIC UPDATE ENDPOINT');
    console.log('📝 Request ID:', req.params.id);
    console.log('📦 Request body keys:', Object.keys(req.body));
    
    const job = req.body;
    
    if (!job) {
      return res.status(400).json({ error: 'Job data missing' });
    }
    
    // Check if job exists
    const existing = await prisma.jobFile.findUnique({
      where: { id: req.params.id }
    });
    
    if (!existing) {
      console.log('❌ Job not found:', req.params.id);
      return res.status(404).json({ error: 'Job not found' });
    }
    
    console.log('✅ Existing job found:', existing.jfn);
    
    // Normalize incoming values to expected DB types
    const normalizeNumber = (v, fallback = 0) => {
      if (v === null || v === undefined || v === '') return fallback;
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };

    const normalizeString = (v, fallback = null) => {
      if (v === undefined) return fallback;
      if (v === null) return null;
      return String(v);
    };

    const normalizeJsonString = (v, fallback) => {
      if (v === undefined || v === null) return fallback;
      // If already a string, assume it's stored JSON
      if (typeof v === 'string') return v;
      try {
        return JSON.stringify(v);
      } catch (e) {
        return fallback;
      }
    };

    // Prepare update payload
    const updateData = {
      jfn: job.jfn || existing.jfn,
      d: job.d || existing.d,
      billingDate: job.billingDate || existing.billingDate,
      po: normalizeString(job.po, existing.po),
      cl: normalizeJsonString(job.cl || job.clients, existing.cl),
      status: job.status || existing.status,
      totalCost: normalizeNumber(job.totalCost, existing.totalCost),
      totalSelling: normalizeNumber(job.totalSelling, existing.totalSelling),
      totalProfit: normalizeNumber(job.totalProfit, existing.totalProfit),
      // POD-related fields (only update if provided)
      deliveryAssigned: typeof job.deliveryAssigned === 'boolean' ? job.deliveryAssigned : existing.deliveryAssigned,
      deliveryStatus: job.deliveryStatus || existing.deliveryStatus,
      deliveryAssignedAt: job.deliveryAssignedAt ? new Date(job.deliveryAssignedAt) : existing.deliveryAssignedAt,
      driverUid: normalizeString(job.driverUid, existing.driverUid),
      driverName: normalizeString(job.driverName, existing.driverName),
      driverMobile: normalizeString(job.driverMobile, existing.driverMobile),
      isExternal: typeof job.isExternal === 'boolean' ? job.isExternal : existing.isExternal,
      deliveryLocation: normalizeString(job.deliveryLocation, existing.deliveryLocation),
      deliveryNotes: normalizeString(job.deliveryNotes, existing.deliveryNotes),
      completedAt: job.completedAt ? new Date(job.completedAt) : existing.completedAt,
      receiverName: normalizeString(job.receiverName, existing.receiverName),
      receiverMobile: normalizeString(job.receiverMobile, existing.receiverMobile),
      signatureDataUrl: normalizeString(job.signatureDataUrl, existing.signatureDataUrl),
      photoDataUrl: normalizeString(job.photoDataUrl, existing.photoDataUrl),
      latitude: job.latitude !== undefined && job.latitude !== null ? Number(job.latitude) : existing.latitude,
      longitude: job.longitude !== undefined && job.longitude !== null ? Number(job.longitude) : existing.longitude,
      geolocationName: normalizeString(job.geolocationName, existing.geolocationName),
      feedbackStatus: job.feedbackStatus || existing.feedbackStatus,
      isManual: typeof job.isManual === 'boolean' ? job.isManual : existing.isManual,
      lastUpdatedBy: job.lastUpdatedBy || existing.lastUpdatedBy
    };

    // Update job
    const updatedJob = await prisma.jobFile.update({
      where: { id: req.params.id },
      data: updateData
    });
    
    console.log('✅ Job updated successfully:', updatedJob.jfn, '- deliveryStatus:', updatedJob.deliveryStatus);
    res.json({
      ...updatedJob,
      message: 'Job successfully updated'
    });
  } catch (error) {
    console.error('❌ Error updating job:', error.message);
    res.status(500).json({ error: 'Failed to update job', details: error.message || String(error) });
  }
});

// Delete job
app.delete('/api/jobs/:id', async (req, res) => {
  try {
    await prisma.jobFile.delete({
      where: { id: req.params.id }
    });
    
    res.json({ message: 'Job successfully deleted' });
  } catch (error) {
    console.error('Error deleting job:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// ==================== CLIENTS ENDPOINTS ====================

// Get all clients
app.get('/api/clients', async (req, res) => {
  try {
    console.log('GET /api/clients called');
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        address: true,
        contactPerson: true,
        phone: true,
        email: true,
        type: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.json({ clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients', details: error.message || String(error) });
  }
});

// Create client
app.post('/api/clients', async (req, res) => {
  try {
    console.log('POST /api/clients called with body:', req.body);
    const { name, address, contactPerson, phone, email, type } = req.body;
    const client = await prisma.client.create({
      data: {
        name,
        address: address || null,
        contactPerson: contactPerson || null,
        phone: phone || null,
        email: email || null,
        type: type || null
      }
    });
    res.json(client);
  } catch (error) {
    console.error('Error creating client:', error);
    // If unique constraint failure, return 400 with message
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Client with this name or email already exists', details: error.message });
    }
    res.status(500).json({ error: 'Failed to create client', details: error.message || String(error) });
  }
});

// Delete client
app.delete('/api/clients/:id', async (req, res) => {
  try {
    console.log('DELETE /api/clients/:id called with id:', req.params.id);
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ message: 'Client deleted' });
  } catch (error) {
    console.error('Error deleting client:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.status(500).json({ error: 'Failed to delete client', details: error.message || String(error) });
  }
});

// ==================== CUSTOM LINKS ENDPOINTS ====================

// Get all custom links
app.get('/api/links', async (req, res) => {
  try {
    const links = await prisma.customLink.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ links });
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({ error: 'Failed to fetch links' });
  }
});

// Create custom link
app.post('/api/links', async (req, res) => {
  try {
    const { name, url } = req.body;
    const link = await prisma.customLink.create({
      data: { name, url }
    });
    res.json(link);
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({ error: 'Failed to create link' });
  }
});

// Delete custom link
app.delete('/api/links/:id', async (req, res) => {
  try {
    await prisma.customLink.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Link deleted' });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

// ==================== APP SETTINGS ENDPOINTS ====================

// Get all settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await prisma.appSetting.findMany();
    const settingsObj = {};
    settings.forEach(s => {
      try {
        settingsObj[s.key] = JSON.parse(s.value);
      } catch {
        settingsObj[s.key] = s.value;
      }
    });
    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Save settings
app.post('/api/settings', async (req, res) => {
  try {
    const settingsData = req.body;
    
    // Save entire AppSettings object as single record
    const result = await prisma.appSetting.upsert({
      where: { key: 'appSettings' },
      update: { 
        value: JSON.stringify(settingsData),
        updatedAt: new Date()
      },
      create: { 
        key: 'appSettings',
        value: JSON.stringify(settingsData)
      }
    });
    
    console.log('✅ Settings saved successfully');
    res.json({ message: 'Settings saved', data: result });
  } catch (error) {
    console.error('❌ Error saving settings:', error.message || error);
    res.status(500).json({ error: `Failed to save settings: ${error.message || 'Unknown error'}` });
  }
});

// ==================== USER ENDPOINTS ====================

// Create user (register)
app.post('/api/users', async (req, res) => {
  try {
    const { email, displayName, passwordHash, role } = req.body;
    
    if (!email || !displayName) {
      return res.status(400).json({ error: 'Email and display name are required' });
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    }).catch(err => null);
    
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Create new user with all required fields
    // New users start with waiting_for_approval status until admin approves
    const user = await prisma.user.create({
      data: {
        uid: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email: email.toLowerCase(),
        displayName,
        passwordHash: passwordHash || '',
        role: 'user',  // Always 'user' role for new registrations
        status: 'waiting_for_approval'  // Require admin approval
      }
    });
    
    console.log(`✅ User registered (waiting approval): ${user.email}`);
    res.json({ message: 'Registration successful. Waiting for admin approval.', user });
  } catch (error) {
    console.error('❌ Error creating user:', error.message || error);
    res.status(500).json({ error: `Failed to create user: ${error.message || 'Unknown error'}` });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        uid: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true
      }
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin: Approve/Reject user registration
app.post('/api/users/:uid/approve', async (req, res) => {
  try {
    const { uid } = req.params;
    const { approved } = req.body;
    
    if (approved === undefined) {
      return res.status(400).json({ error: 'approved field is required (true/false)' });
    }
    
    const updatedUser = await prisma.user.update({
      where: { uid },
      data: {
        status: approved ? 'active' : 'rejected'
      }
    });
    
    console.log(`✅ User ${approved ? 'approved' : 'rejected'}: ${updatedUser.email}`);
    res.json({ message: `User ${approved ? 'approved' : 'rejected'}`, user: updatedUser });
  } catch (error) {
    console.error('❌ Error approving user:', error.message || error);
    res.status(500).json({ error: `Failed to approve user: ${error.message || 'Unknown error'}` });
  }
});

// Update user (for status, role, etc.)
app.put('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { status, role, displayName } = req.body;
    
    const updateData = {};
    if (status) updateData.status = status;
    if (role) updateData.role = role;
    if (displayName) updateData.displayName = displayName;
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'At least one field to update is required' });
    }
    
    const updatedUser = await prisma.user.update({
      where: { uid },
      data: updateData
    });
    
    console.log(`✅ User updated: ${updatedUser.email}`);
    res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    console.error('❌ Error updating user:', error.message || error);
    res.status(500).json({ error: `Failed to update user: ${error.message || 'Unknown error'}` });
  }
});

// Login endpoint - validate credentials against database
app.post('/api/users/login', async (req, res) => {
  try {
    const { email, passwordHash } = req.body;
    
    if (!email || !passwordHash) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        uid: true,
        email: true,
        displayName: true,
        passwordHash: true,
        role: true,
        status: true,
        createdAt: true
      }
    }).catch(err => null);
    
    if (!user) {
      console.log(`❌ Login attempt failed: User not found (${email})`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Validate password
    if (user.passwordHash !== passwordHash) {
      console.log(`❌ Login attempt failed: Wrong password (${email})`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      console.log(`⚠️ Login attempt failed: User not active - status: ${user.status} (${email})`);
      return res.status(403).json({ error: `Your account is ${user.status}. Please wait for admin approval.` });
    }
    
    console.log(`✅ Login successful: ${user.email}`);
    res.json({ 
      message: 'Login successful', 
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('❌ Error during login:', error.message || error);
    res.status(500).json({ error: `Login failed: ${error.message || 'Unknown error'}` });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, async () => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log(`✅ QGO Backend running on port ${PORT}`);
    console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
    console.log(`💾 Database: SQLite connected`);
    console.log(`💚 Health: http://localhost:${PORT}/api/health`);
  } catch (error) {
    console.error('Database connection failed:', error);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
