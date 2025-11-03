const bcrypt = require('bcryptjs');

async function generateHash() {
  // Password: demo123
  const password = 'demo123';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password: demo123');
  console.log('Hash:', hash);
}

generateHash();
