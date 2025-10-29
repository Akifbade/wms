"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Company = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
class Company extends sequelize_1.Model {
}
exports.Company = Company;
Company.init({
    id: {
        type: sequelize_1.DataTypes.STRING(191),
        primaryKey: true,
        allowNull: false,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: false,
    },
    email: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: false,
        unique: true,
    },
    phone: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: true,
    },
    address: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: true,
    },
    website: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: true,
    },
    logo: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: true,
    },
    plan: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: false,
        defaultValue: 'BASIC',
    },
    ratePerDay: {
        type: sequelize_1.DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 2.0,
    },
    currency: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: false,
        defaultValue: 'KWD',
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    primaryColor: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: true,
        defaultValue: '#4F46E5',
    },
    secondaryColor: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: true,
        defaultValue: '#7C3AED',
    },
    accentColor: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: true,
        defaultValue: '#10B981',
    },
    showCompanyName: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    logoSize: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: true,
        defaultValue: 'medium',
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
    modelName: 'Company',
    tableName: 'companies',
    timestamps: true,
    underscored: false,
});
exports.default = Company;
