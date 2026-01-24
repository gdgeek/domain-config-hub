/**
 * Domain 模型
 * 
 * 定义域名配置实体的数据模型
 * 
 * 需求: 数据库结构
 */

import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Domain 属性接口
 * 定义域名配置的所有字段
 */
export interface DomainAttributes {
  id: number;
  domain: string;
  title: string | null;
  author: string | null;
  description: string | null;
  keywords: string | null;
  links: object | null;
  permissions: object | null;
}

/**
 * Domain 创建属性接口
 * 创建时 id 为可选（自增），其他字段除 domain 外也为可选
 */
export interface DomainCreationAttributes extends Optional<DomainAttributes, 'id' | 'title' | 'author' | 'description' | 'keywords' | 'links' | 'permissions'> {}

/**
 * Domain 模型类
 * 
 * 对应数据库表结构:
 * CREATE TABLE `domain` (
 *   `id` int NOT NULL AUTO_INCREMENT,
 *   `domain` varchar(255) NOT NULL UNIQUE,
 *   `title` varchar(255) DEFAULT NULL,
 *   `author` varchar(255) DEFAULT NULL,
 *   `description` varchar(255) DEFAULT NULL,
 *   `keywords` varchar(255) DEFAULT NULL,
 *   `links` json DEFAULT NULL,
 *   `permissions` json DEFAULT NULL,
 *   PRIMARY KEY (`id`),
 *   UNIQUE KEY `domain` (`domain`)
 * ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
 */
export class Domain extends Model<DomainAttributes, DomainCreationAttributes> 
  implements DomainAttributes {
  declare id: number;
  declare domain: string;
  declare title: string | null;
  declare author: string | null;
  declare description: string | null;
  declare keywords: string | null;
  declare links: object | null;
  declare permissions: object | null;
}

/**
 * 初始化 Domain 模型
 * 配置字段映射和索引
 */
Domain.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    domain: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: '域名不能为空',
        },
        len: {
          args: [1, 255],
          msg: '域名长度必须在 1-255 字符之间',
        },
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    author: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    keywords: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    links: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: '权限配置',
    },
  },
  {
    sequelize,
    tableName: 'domain',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['domain'],
        name: 'domain',
      },
    ],
  }
);

export default Domain;
