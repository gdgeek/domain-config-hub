/**
 * Config 模型
 * 
 * 配置信息表，存储网站的元数据配置
 * 可以被多个域名共享
 */

import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Config 属性接口
 */
export interface ConfigAttributes {
  id: number;
  title: string | null;
  author: string | null;
  description: string | null;
  keywords: string | null;
  links: object | null;
  permissions: object | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Config 创建属性接口（id 为可选）
 */
export interface ConfigCreationAttributes extends Optional<ConfigAttributes, 'id'> {}

/**
 * Config 模型类
 */
export class Config extends Model<ConfigAttributes, ConfigCreationAttributes> implements ConfigAttributes {
  declare id: number;
  declare title: string | null;
  declare author: string | null;
  declare description: string | null;
  declare keywords: string | null;
  declare links: object | null;
  declare permissions: object | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

/**
 * 初始化 Config 模型
 */
Config.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    author: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    keywords: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    links: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'configs',
    timestamps: true,
    underscored: true,
  }
);

export default Config;
