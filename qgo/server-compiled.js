const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5555;  // QGO PORT

app.use(cors({
  origin: 'http://72.60.215.188:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'QGO Backend is running', version: '1.0', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@qgo.com' && password === 'admin123') {
    return res.json({ token: 'qgo-jwt-' + Date.now(), user: { id: '1', email, role: 'admin', displayName: 'Admin' } });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.use((req, res) => res.status(404).json({ error: 'Not Found' }));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

app.listen(PORT, () => {
  console.log(\ QGO Backend running on port \\);
  console.log(' API: http://localhost:' + PORT + '/api');
});
