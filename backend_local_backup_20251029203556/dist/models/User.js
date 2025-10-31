"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
class User extends sequelize_1.Model {
}
exports.User = User;
User.init({
    id: {
        type: sequelize_1.DataTypes.STRING(191),
        primaryKey: true,
        allowNull: false,
    },
    email: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: false,
        unique: true,
    },
    password: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: false,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: false,
    },
    phone: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: true,
    },
    role: {
        type: sequelize_1.DataTypes.ENUM('ADMIN', 'MANAGER', 'DRIVER', 'WORKER', 'SCANNER', 'PACKER', 'LABOR'),
        allowNull: false,
        defaultValue: 'WORKER',
    },
    skills: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: true,
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    isDummy: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    permissions: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    companyId: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: false,
        references: {
            model: 'companies',
            key: 'id',
        },
    },
    avatar: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: true,
    },
    position: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: true,
    },
    department: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: true,
    },
    lastLoginAt: {
        type: sequelize_1.DataTypes.DATE(3),
        allowNull: true,
    },
    resetToken: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: true,
    },
    resetTokenExpiry: {
        type: sequelize_1.DataTypes.DATE(3),
        allowNull: true,
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE(3),
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE(3),
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
}, {
    sequelize: db_1.sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    underscored: false,
});
exports.default = User;
