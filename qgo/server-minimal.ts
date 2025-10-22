import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';

const app: Express = express();
const PORT = 5555;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'QGO Backend v1.0 - Running', timestamp: new Date().toISOString() });
});

// Simple jobs endpoint (for testing)
app.get('/api/jobs', (req: Request, res: Response) => {
  console.log('GET /api/jobs called with params:', req.query);
  
  // Parse query params
  const skip = parseInt((req.query.skip as string) || '0');
  const take = parseInt((req.query.take as string) || '20');
  
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
app.post('/api/jobs', (req: Request, res: Response) => {
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

// PUT jobs endpoint (for overwrite)
app.put('/api/jobs/:id', (req: Request, res: Response) => {
  console.log('PUT /api/jobs/:id called for job:', req.params.id);
  
  const job = req.body;
  res.json({
    ...job,
    message: 'Job updated (mock)'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  console.log('404:', req.method, req.path);
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 API Base URL: http://localhost:${PORT}/api`);
  console.log(`✅ Jobs endpoint ready at http://localhost:${PORT}/api/jobs`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
