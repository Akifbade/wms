// Legacy Sequelize layer removed in favor of Prisma.
// This file remains as a placeholder to avoid breaking relative imports from older scripts.
export const connectDatabase = async () => {
  console.warn('connectDatabase (legacy) called: Prisma handles connections automatically.');
};

export const syncDatabase = async () => {
  console.warn('syncDatabase (legacy) called: Prisma migrations manage the schema.');
};
