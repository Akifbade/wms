"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rack = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
class Rack extends sequelize_1.Model {
}
exports.Rack = Rack;
Rack.init({
    id: {
        type: sequelize_1.DataTypes.STRING(191),
        primaryKey: true,
        allowNull: false,
    },
    code: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: false,
    },
    qrCode: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: false,
        unique: true,
    },
    rackType: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: false,
        defaultValue: 'STORAGE',
    },
    // NEW FIELDS - Category and Dimensions
    category: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        comment: 'DIOR, COMPANY_MATERIAL, JAZEERA, OTHERS',
    },
    location: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: true,
    },
    length: {
        type: sequelize_1.DataTypes.DOUBLE,
        allowNull: true,
    },
    width: {
        type: sequelize_1.DataTypes.DOUBLE,
        allowNull: true,
    },
    height: {
        type: sequelize_1.DataTypes.DOUBLE,
        allowNull: true,
    },
    dimensionUnit: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'METERS',
    },
    // END NEW FIELDS
    capacityTotal: {
        type: sequelize_1.DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 100,
    },
    capacityUsed: {
        type: sequelize_1.DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE'),
        allowNull: false,
        defaultValue: 'ACTIVE',
    },
    companyId: {
        type: sequelize_1.DataTypes.STRING(191),
        allowNull: false,
        references: {
            model: 'companies',
            key: 'id',
        },
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
    modelName: 'Rack',
    tableName: 'racks',
    timestamps: true,
    underscored: false,
});
exports.default = Rack;
