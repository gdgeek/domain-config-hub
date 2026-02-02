/**
 * Translation 模型
 * 
 * 翻译内容表，存储配置的多语言版本
 * 每个配置可以有多个不同语言的翻译
 */

import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { Config } from './Config';

/**
 * Translation 属性接口
 */
export interface TranslationAttributes {
  id: number;
  configId: number;
  languageCode: string;
  title: string;
  author: string;
  description: string;
  keywords: string[]; // JSON array stored as string in DB
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Translation 创建属性接口（id 为可选）
 */
export interface TranslationCreationAttributes extends Optional<TranslationAttributes, 'id'> {}

/**
 * Translation 模型类
 */
export class Translation extends Model<TranslationAttributes, TranslationCreationAttributes> implements TranslationAttributes {
  declare id: number;
  declare configId: number;
  declare languageCode: string;
  declare title: string;
  declare author: string;
  declare description: string;
  declare keywords: string[];
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

/**
 * 初始化 Translation 模型
 */
Translation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    configId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'config_id',
      references: {
        model: 'configs',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    languageCode: {
      type: DataTypes.STRING(10),
      allowNull: false,
      field: 'language_code',
      validate: {
        notEmpty: true,
        is: /^[a-z]{2}-[a-z]{2}$/i, // BCP 47 format: zh-CN, en-US, ja-JP
      },
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200],
      },
    },
    author: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    description: {
      type: DataTypes.STRING(1000),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 1000],
      },
    },
    keywords: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const raw = this.getDataValue('keywords');
        if (!raw) {
          return [];
        }
        try {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      },
      set(value: string[]) {
        if (!Array.isArray(value)) {
          throw new Error('Keywords must be an array');
        }
        this.setDataValue('keywords', JSON.stringify(value) as any);
      },
      validate: {
        isValidJSON(value: any) {
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              if (!Array.isArray(parsed)) {
                throw new Error('Keywords must be a JSON array');
              }
              // Validate all elements are strings
              if (!parsed.every((item: any) => typeof item === 'string')) {
                throw new Error('All keywords must be strings');
              }
            } catch (error) {
              if (error instanceof Error) {
                throw new Error(`Invalid keywords JSON: ${error.message}`);
              }
              throw error;
            }
          }
        },
      },
    },
  },
  {
    sequelize,
    tableName: 'translations',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['config_id', 'language_code'],
        name: 'unique_config_language',
      },
      {
        fields: ['language_code'],
        name: 'idx_language_code',
      },
    ],
  }
);

/**
 * 配置模型关联关系
 */
Translation.belongsTo(Config, {
  foreignKey: 'configId',
  as: 'config',
});

Config.hasMany(Translation, {
  foreignKey: 'configId',
  as: 'translations',
});

export default Translation;
