import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default users
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@qgo.com' },
    update: {},
    create: {
      uid: 'admin-1',
      email: 'admin@qgo.com',
      displayName: 'Admin User',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'admin',
      status: 'active',
    },
  });

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@qgo.com' },
    update: {},
    create: {
      uid: 'user-1',
      email: 'user@qgo.com',
      displayName: 'Regular User',
      passwordHash: await bcrypt.hash('password', 10),
      role: 'user',
      status: 'active',
    },
  });

  const checkerUser = await prisma.user.upsert({
    where: { email: 'checker@qgo.com' },
    update: {},
    create: {
      uid: 'checker-1',
      email: 'checker@qgo.com',
      displayName: 'Checker User',
      passwordHash: await bcrypt.hash('password', 10),
      role: 'checker',
      status: 'active',
    },
  });

  // Create default clients
  await prisma.client.upsert({
    where: { name: 'Global Imports Co.' },
    update: {},
    create: {
      name: 'Global Imports Co.',
      address: '123 Industrial Rd',
      contactPerson: 'John Smith',
      phone: '555-1234',
      type: 'Shipper',
    },
  });

  await prisma.client.upsert({
    where: { name: 'Kuwait Retailers' },
    update: {},
    create: {
      name: 'Kuwait Retailers',
      address: '456 Market St',
      contactPerson: 'Jane Doe',
      phone: '555-5678',
      type: 'Consignee',
    },
  });

  // Create app settings
  await prisma.appSetting.upsert({
    where: { key: 'general' },
    update: {},
    create: {
      key: 'general',
      value: JSON.stringify({
        companyName: "Q'GO CARGO",
        companyLogoUrl: 'http://qgocargo.com/logo.png',
        companyAddress: "A/F Cargo Complex, Waha Mall, Ground Floor, Office # 28, Kuwait",
      }),
    },
  });

  await prisma.appSetting.upsert({
    where: { key: 'jobFile' },
    update: {},
    create: {
      key: 'jobFile',
      value: JSON.stringify({
        jfnPrefix: 'QGO/',
        defaultSalespersonId: adminUser.id,
      }),
    },
  });

  await prisma.appSetting.upsert({
    where: { key: 'pod' },
    update: {},
    create: {
      key: 'pod',
      value: JSON.stringify({
        isPhotoRequired: false,
        isGeolocationRequired: true,
        shareMessageTemplate: 'Hello, please complete the delivery for Job File {jobId} using this link: {link}',
      }),
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`📝 Sample credentials:`);
  console.log(`   Admin: admin@qgo.com / admin123`);
  console.log(`   User: user@qgo.com / password`);
  console.log(`   Checker: checker@qgo.com / password`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
