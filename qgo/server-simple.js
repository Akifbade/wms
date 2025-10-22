const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.API_PORT || 5000;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'QGO Server is running!' });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Login endpoint (dummy)
app.post('/api/auth/login', (req, res) => {
  res.json({ 
    token: 'test-token', 
    user: { id: '1', email: 'test@example.com', role: 'admin' } 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 QGO Server running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
});
