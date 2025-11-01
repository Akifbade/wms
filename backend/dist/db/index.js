"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = void 0;
exports.connectDatabase = connectDatabase;
exports.syncDatabase = syncDatabase;
const sequelize_1 = require("sequelize");
const path_1 = __importDefault(require("path"));
const env = process.env.NODE_ENV || 'development';
// Import config
const configFile = require(path_1.default.join(__dirname, '../../config/config.json'));
const dbConfig = configFile[env];
exports.sequelize = new sequelize_1.Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
});
// Test connection
async function connectDatabase() {
    try {
        await exports.sequelize.authenticate();
        console.log('✅ Database connected successfully');
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
}
// Sync all models
async function syncDatabase() {
    try {
        await exports.sequelize.sync({ alter: false });
        console.log('✅ Database synced');
    }
    catch (error) {
        console.error('❌ Database sync failed:', error);
        throw error;
    }
}
