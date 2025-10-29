import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Check if company exists
    let company = await prisma.company.findFirst({
      where: { email: 'admin@wms.com' }
    });

    // Create company if it doesn't exist
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: 'WMS Admin Company',
          email: 'admin@wms.com',
          phone: '+965-12345678',
          isActive: true,
          plan: 'ENTERPRISE',
        }
      });
      console.log('✅ Created company:', company.name);
    } else {
      console.log('✅ Company already exists:', company.name);
    }

    // Check if admin user exists
    const existingUser = await prisma.user.findFirst({
      where: { email: 'admin@wms.com' }
    });

    if (existingUser) {
      console.log('✅ Admin user already exists');
      console.log('📧 Email: admin@wms.com');
      console.log('🔑 Password: admin123');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: 'admin@wms.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'ADMIN',
        companyId: company.id,
        isActive: true,
      }
    });

    console.log('\n🎉 Admin user created successfully!');
    console.log('=====================================');
    console.log('📧 Email: admin@wms.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: ADMIN');
    console.log('🏢 Company:', company.name);
    console.log('=====================================\n');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
