const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    // Check if admin exists
    const existing = await prisma.user.findUnique({
      where: { email: 'admin@demo.com' }
    });

    if (existing) {
      console.log('❌ Admin already exists!');
      process.exit(0);
    }

    // Create admin user
    const hash = await bcrypt.hash('demo123', 10);
    const admin = await prisma.user.create({
      data: {
        email: 'admin@demo.com',
        username: 'admin',
        name: 'Admin User',
        password: hash,
        role: 'SUPER_ADMIN'
      }
    });

    console.log('✅ Admin created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password: demo123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
