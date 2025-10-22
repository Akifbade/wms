const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5555;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'QGO Backend v1.0 - Running', timestamp: new Date().toISOString() });
});

// Simple jobs endpoint (for testing)
app.get('/api/jobs', (req, res) => {
  console.log('GET /api/jobs called with params:', req.query);
  
  // Parse query params
  const skip = parseInt(req.query.skip || '0');
  const take = parseInt(req.query.take || '20');
  
  // Return empty jobs list (backend database is clean)
  res.json({
    jobs: [],
    total: 0,
    skip,
    take,
    message: 'Jobs endpoint is working! Database is clean.'
  });
});

// POST jobs endpoint (for file restore)
app.post('/api/jobs', (req, res) => {
  console.log('POST /api/jobs called with job:', req.body?.jfn);
  
  // For now, just echo back the job to confirm it was received
  const job = req.body;
  
  if (!job || !job.jfn) {
    return res.status(400).json({ error: 'Job data or JFN missing' });
  }
  
  // TODO: Save to database
  res.status(201).json({
    ...job,
    id: job.id || `job-${Date.now()}`,
    message: 'Job received and would be saved to database'
  });
});

// PUT endpoint to update a job
app.put('/api/jobs/:id', (req, res) => {
  console.log('PUT /api/jobs/:id called with id:', req.params.id);
  
  const job = req.body;
  
  if (!job) {
    return res.status(400).json({ error: 'Job data missing' });
  }
  
  res.json({
    ...job,
    id: req.params.id,
    message: 'Job updated'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ QGO Backend running on port ${PORT}`);
  console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
  console.log(`💚 Health: http://localhost:${PORT}/api/health`);
});
