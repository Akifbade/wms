import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db';

export class Company extends Model {
  public id!: string;
  public name!: string;
  public email!: string;
  public phone?: string;
  public address?: string;
  public website?: string;
  public logo?: string;
  public plan!: string;
  public ratePerDay!: number;
  public currency!: string;
  public isActive!: boolean;
  public primaryColor?: string;
  public secondaryColor?: string;
  public accentColor?: string;
  public showCompanyName!: boolean;
  public logoSize?: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Company.init(
  {
    id: {
      type: DataTypes.STRING(191),
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(191),
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    logo: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    plan: {
      type: DataTypes.STRING(191),
      allowNull: false,
      defaultValue: 'BASIC',
    },
    ratePerDay: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 2.0,
    },
    currency: {
      type: DataTypes.STRING(191),
      allowNull: false,
      defaultValue: 'KWD',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    primaryColor: {
      type: DataTypes.STRING(191),
      allowNull: true,
      defaultValue: '#4F46E5',
    },
    secondaryColor: {
      type: DataTypes.STRING(191),
      allowNull: true,
      defaultValue: '#7C3AED',
    },
    accentColor: {
      type: DataTypes.STRING(191),
      allowNull: true,
      defaultValue: '#10B981',
    },
    showCompanyName: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    logoSize: {
      type: DataTypes.STRING(191),
      allowNull: true,
      defaultValue: 'medium',
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
    modelName: 'Company',
    tableName: 'companies',
    timestamps: true,
    underscored: false,
  }
);

export default Company;
