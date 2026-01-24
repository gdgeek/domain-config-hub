/**
 * Domain 模型 V2
 * 
 * 域名表，存储域名和配置的关联关系
 * 多个域名可以关联到同一个配置
 */

import { Model, DataTypes, Optional, Association } from 'sequelize';
import { sequelize } from '../config/database';
import { Config, ConfigAttributes } from './Config';

/**
 * Domain 属性接口
 */
export interface DomainV2Attributes {
  id: number;
  domain: string;
  configId: number;
  createdAt?: Date;
  updatedAt?: Date;
  // 关联的配置（通过 JOIN 查询时填充）
  config?: ConfigAttributes;
}

/**
 * Domain 创建属性接口（id 为可选）
 */
export interface DomainV2CreationAttributes extends Optional<DomainV2Attributes, 'id'> {}

/**
 * Domain 模型类
 */
export class DomainV2 extends Model<DomainV2Attributes, DomainV2CreationAttributes> implements DomainV2Attributes {
  declare id: number;
  declare domain: string;
  declare configId: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  
  // 关联
  declare config?: Config;
  
  // 关联定义
  declare static associations: {
    config: Association<DomainV2, Config>;
  };
}

/**
 * 初始化 Domain 模型
 */
DomainV2.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    domain: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    configId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'config_id',
      references: {
        model: 'configs',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'domains',
    timestamps: true,
    underscored: true,
  }
);

/**
 * 定义关联关系
 */
DomainV2.belongsTo(Config, {
  foreignKey: 'configId',
  as: 'config',
});

Config.hasMany(DomainV2, {
  foreignKey: 'configId',
  as: 'domains',
});

export default DomainV2;
