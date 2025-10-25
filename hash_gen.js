const bcrypt = require('bcryptjs');
const h1 = bcrypt.hashSync('AAAAAA', 10);
const h2 = bcrypt.hashSync('Admin@123', 10);
console.log('HASH1=' + h1);
console.log('HASH2=' + h2);
