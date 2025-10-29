import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test data...');

  // Create a test company
  let company = await prisma.company.create({
    data: {
      name: 'Test Company',
      phone: '03001234567',
      email: 'test@company.com',
      address: 'Test Address',
      plan: 'PRO',
    },
  }).catch(async () => {
    // If exists, fetch it
    const existing = await prisma.company.findFirst({ where: { name: 'Test Company' } });
    return existing;
  });

  if (!company) {
    console.error('❌ Failed to create/find company');
    process.exit(1);
  }

  console.log('✅ Company created:', company.id);

  // Create a test user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      isActive: true,
      companyId: company.id,
    },
  });

  console.log('✅ User created:', user.email);
  console.log('Credentials: email: admin@test.com, password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
