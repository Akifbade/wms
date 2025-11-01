import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db';

export class Rack extends Model {
  public id!: string;
  public code!: string;
  public qrCode!: string;
  public rackType!: string;
  public category?: string;
  public location?: string;
  public length?: number;
  public width?: number;
  public height?: number;
  public dimensionUnit!: string;
  public capacityTotal!: number;
  public capacityUsed!: number;
  public status!: string;
  public companyId!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Rack.init(
  {
    id: {
      type: DataTypes.STRING(191),
      primaryKey: true,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    qrCode: {
      type: DataTypes.STRING(191),
      allowNull: false,
      unique: true,
    },
    rackType: {
      type: DataTypes.STRING(191),
      allowNull: false,
      defaultValue: 'STORAGE',
    },
    // NEW FIELDS - Category and Dimensions
    category: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'DIOR, COMPANY_MATERIAL, JAZEERA, OTHERS',
    },
    location: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    length: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    width: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    height: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    dimensionUnit: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'METERS',
    },
    // END NEW FIELDS
    capacityTotal: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 100,
    },
    capacityUsed: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    companyId: {
      type: DataTypes.STRING(191),
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id',
      },
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
    modelName: 'Rack',
    tableName: 'racks',
    timestamps: true,
    underscored: false,
  }
);

export default Rack;
