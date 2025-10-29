const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('demo123', 10));
