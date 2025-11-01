const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

(async () => {
  const prisma = new PrismaClient();
  try {
    // Delete existing user if exists
    await prisma.user.deleteMany({
      where: { email: 'admin@test.com' }
    }).catch(() => {});
    
    // Create admin user
    const user = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: await bcrypt.hash('admin@test.com', 10),
        name: 'Test Admin',
        phone: '+1234567890',
        role: 'ADMIN',
        isActive: true,
        companyId: 'company-test-001'
      }
    });
    console.log('✅ User created:', user.email, 'with ID:', user.id);
  } catch (e) {
    console.log('❌ Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
