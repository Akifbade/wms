"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncDatabase = exports.connectDatabase = void 0;
// Legacy Sequelize layer removed in favor of Prisma.
// This file remains as a placeholder to avoid breaking relative imports from older scripts.
const connectDatabase = async () => {
    console.warn('connectDatabase (legacy) called: Prisma handles connections automatically.');
};
exports.connectDatabase = connectDatabase;
const syncDatabase = async () => {
    console.warn('syncDatabase (legacy) called: Prisma migrations manage the schema.');
};
exports.syncDatabase = syncDatabase;
