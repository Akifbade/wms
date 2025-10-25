import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testLogin() {
  console.log('\n🔐 Testing Login Credentials...\n');
  
  try {
    // Find the admin user
    const user = await prisma.user.findUnique({
      where: { email: 'admin@demo.com' },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      console.log('❌ User not found: admin@demo.com');
      console.log('\n📋 Available users:');
      const allUsers = await prisma.user.findMany({
        select: { email: true, role: true },
      });
      allUsers.forEach(u => console.log(`   - ${u.email} (${u.role})`));
      return;
    }

    console.log('✅ User found:', user.email);
    console.log('   Name:', user.name);
    console.log('   Role:', user.role);
    console.log('   Active:', user.isActive);
    console.log('   Has password:', user.password ? 'Yes' : 'No');
    console.log('   Password length:', user.password?.length);

    // Test password
    const testPassword = 'demo123';
    const isMatch = await bcrypt.compare(testPassword, user.password);
    
    console.log('\n🔑 Password Test:');
    console.log('   Testing password:', testPassword);
    console.log('   Match:', isMatch ? '✅ Correct' : '❌ Wrong');

    if (!isMatch) {
      console.log('\n🔧 Fixing password...');
      const newHashedPassword = await bcrypt.hash('demo123', 10);
      await prisma.user.update({
        where: { email: 'admin@demo.com' },
        data: { password: newHashedPassword },
      });
      console.log('✅ Password updated to: demo123');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
