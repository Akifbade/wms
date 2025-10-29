const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

async function resetAdminPassword() {
  const prisma = new PrismaClient();
  
  try {
    // Password to use
    const plainPassword = 'admin123';
    
    // Hash the password with bcryptjs (matching what auth.ts uses)
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    console.log('🔐 Generating bcrypt hash...');
    console.log('Plain password: admin123');
    console.log('Hashed password:', hashedPassword);
    console.log('');
    
    // First, ensure company exists
    console.log('📦 Checking company...');
    let company = await prisma.company.findFirst();
    
    if (!company) {
      console.log('✅ Creating company...');
      company = await prisma.company.create({
        data: {
          name: 'WMS Test Company',
          email: 'admin@wms.com',
          isActive: true,
          plan: 'premium',
        },
      });
      console.log('Company created:', company.id);
    } else {
      console.log('✅ Company exists:', company.id);
    }
    
    // Check if admin user exists
    console.log('\n👤 Checking admin user...');
    let adminUser = await prisma.user.findUnique({
      where: { email: 'admin@wms.com' },
    });
    
    if (adminUser) {
      console.log('✅ Admin user exists, updating password...');
      await prisma.user.update({
        where: { email: 'admin@wms.com' },
        data: { password: hashedPassword },
      });
      console.log('✅ Password updated!');
    } else {
      console.log('✅ Creating admin user...');
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@wms.com',
          password: hashedPassword,
          name: 'Admin User',
          role: 'ADMIN',
          phone: '+1234567890',
          companyId: company.id,
          isActive: true,
        },
      });
      console.log('✅ Admin user created!');
    }
    
    console.log('\n✅ SUCCESS! Login with:');
    console.log('   Email: admin@wms.com');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
