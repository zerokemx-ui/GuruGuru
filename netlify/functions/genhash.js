// SECURITY WARNING: This file contains a hardcoded default password hash.
// It is used only for initial setup. Change admin123 immediately after first login.
// Run: node -e "const bcrypt=require('bcryptjs');console.log(bcrypt.hashSync('YOUR_NEW_PASSWORD',10))"
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync(process.argv[2] || 'admin123', 10);
console.log(hash);
