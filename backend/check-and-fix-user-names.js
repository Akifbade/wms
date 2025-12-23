const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndFixUserNames() {
  console.log('🔍 Checking users without names...\n');
  
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  });

  const usersWithoutNames = allUsers.filter(u => !u.name || u.name.trim() === '');

  console.log(`Found ${usersWithoutNames.length} users without names:\n`);
  
  for (const user of usersWithoutNames) {
    console.log(`- ${user.email} (${user.role})`);
    
    // Generate a default name from email
    const defaultName = user.email.split('@')[0]
      .split(/[._-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    console.log(`  → Updating name to: "${defaultName}"\n`);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { name: defaultName }
    });
  }

  console.log('\n✅ All users now have names!\n');
  
  // Show updated users
  const updatedUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    },
    take: 10
  });
  
  console.log('📋 Current users:');
  console.table(updatedUsers);
}

checkAndFixUserNames()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
