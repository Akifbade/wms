const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });
  console.log('Admin User:', admin);
  console.log('\nAdmin ID:', admin?.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
