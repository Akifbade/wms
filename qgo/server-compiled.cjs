const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5555;

app.use(cors({
  origin: 'http://72.60.215.188:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'QGO Backend v1.0 - Running', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  if (email === 'admin@qgo.com' && password === 'admin123') {
    return res.json({ token: 'qgo-jwt-' + Date.now(), user: { id: '1', email, role: 'admin', displayName: 'Admin User' } });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.use((req, res) => res.status(404).json({ error: 'Not Found' }));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

app.listen(PORT, () => {
  console.log('QGO Backend running on port ' + PORT);
  console.log('API Base URL: http://localhost:' + PORT + '/api');
  console.log('Health: http://localhost:' + PORT + '/api/health');
});
