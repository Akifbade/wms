const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearJobs() {
  try {
    const deletedJobs = await prisma.jobFile.deleteMany({});
    console.log( Deleted  job records from database);
    
    const remainingJobs = await prisma.jobFile.count();
    console.log( Remaining jobs: );
    
    process.exit(0);
  } catch (error) {
    console.error(' Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.();
  }
}

clearJobs();
