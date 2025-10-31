import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test data...');

  // Create a test company
  let company = await prisma.company.create({
    data: {
      name: 'Demo Warehouse Co.',
      phone: '+965 1234 5678',
      email: 'admin@demowarehouse.com',
      address: 'Kuwait City, Kuwait',
      plan: 'PRO',
    },
  }).catch(async () => {
    // If exists, fetch it
    const existing = await prisma.company.findFirst({ where: { name: 'Demo Warehouse Co.' } });
    return existing;
  });

  if (!company) {
    console.error('❌ Failed to create/find company');
    process.exit(1);
  }

  console.log('✅ Company ready:', company.id);

  // Create a test user
  const hashedPassword = await bcrypt.hash('demo123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      isActive: true,
      companyId: company.id,
    },
  });

  console.log('✅ User created:', user.email);
  console.log('Credentials: email: admin@demo.com, password: demo123');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
