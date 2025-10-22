import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearJobs() {
  try {
    console.log('Starting to clear job records...');
    const deletedJobs = await prisma.jobFile.deleteMany({});
    console.log('Deleted ' + deletedJobs.count + ' job records from database');
    
    const remainingJobs = await prisma.jobFile.count();
    console.log('Remaining jobs: ' + remainingJobs);
    
    process.exit(0);
  } catch (error) {
    console.error('Error: ' + error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearJobs();
