const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/dashboard/stats',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWhicnptdmUwMDAyZHlxMW92azkyenZoIiwiY29tcGFueUlkIjoiY21oYnJ4OGU5MDAwMGR5cTFyeWMwdWVsMyIsImlhdCI6MTczMzgyMDQ2OSwiZXhwIjoxNzM0NDI1MjY5fQ.VnC_dLYPpEPNZ3aVlOQxQ-uBIBvX19fPGF3eLJQoXGQ'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data.substring(0, 500));
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.end();
