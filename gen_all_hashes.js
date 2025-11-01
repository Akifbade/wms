const bcrypt = require('bcryptjs');
console.log('aaaaaa:', bcrypt.hashSync('aaaaaa', 10));
console.log('admin123:', bcrypt.hashSync('admin123', 10));
