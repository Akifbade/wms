const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

async function resetAdminPassword() {
  const prisma = new PrismaClient();
  
  try {
    // Password to use
    const plainPassword = 'demo123';
    
    // Hash the password with bcryptjs (matching what auth.ts uses)
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    console.log('🔐 Generating bcrypt hash...');
  console.log('Plain password: demo123');
    console.log('Hashed password:', hashedPassword);
    console.log('');
    
    // Update existing admin or known emails to match demo credentials
    console.log('\n� Looking for an existing admin or known emails...');
    const knownEmails = ['admin@demo.com', 'admin@wms.com', 'admin@test.com'];
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { in: knownEmails } },
          { role: 'ADMIN' },
        ],
      },
      select: { id: true, email: true },
    });

    if (existing) {
      console.log(`✅ Found existing user (${existing.email}). Updating email/password to demo credentials...`);
      await prisma.user.update({
        where: { id: existing.id },
        data: { email: 'admin@demo.com', password: hashedPassword, role: 'ADMIN', isActive: true },
      });
      console.log('✅ Demo admin credentials applied to existing user.');
    } else {
      console.log('⚠️ No existing admin/known user found. Skipping create to avoid schema mismatch.');
      console.log('   Please create a company and admin via migrations/seed, then re-run this script.');
    }
    
  console.log('\n✅ SUCCESS! Login with:');
  console.log('   Email: admin@demo.com');
  console.log('   Password: demo123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
