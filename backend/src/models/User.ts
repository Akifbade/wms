import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db';

export class User extends Model {
  public id!: string;
  public email!: string;
  public password!: string;
  public name!: string;
  public phone?: string;
  public role!: string;
  public skills?: string;
  public isActive!: boolean;
  public isDummy!: boolean;
  public permissions?: string;
  public companyId!: string;
  public avatar?: string;
  public position?: string;
  public department?: string;
  public lastLoginAt?: Date;
  public resetToken?: string;
  public resetTokenExpiry?: Date;
  public createdAt!: Date;
  public updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.STRING(191),
      primaryKey: true,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(191),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('ADMIN', 'MANAGER', 'DRIVER', 'WORKER', 'SCANNER', 'PACKER', 'LABOR'),
      allowNull: false,
      defaultValue: 'WORKER',
    },
    skills: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isDummy: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    permissions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    companyId: {
      type: DataTypes.STRING(191),
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id',
      },
    },
    avatar: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    position: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE(3),
      allowNull: true,
    },
    resetToken: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    resetTokenExpiry: {
      type: DataTypes.DATE(3),
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    underscored: false,
  }
);

export default User;
