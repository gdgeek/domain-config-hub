/**
 * 测试数据库初始化工具
 * 
 * 提供统一的测试数据库初始化和清理功能
 * 避免多个测试套件之间的表同步冲突
 */

import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

// 导出 sequelize 实例供测试使用
export { sequelize };

/**
 * 初始化测试数据库
 * 
 * 使用原始 SQL 创建表结构，避免 Sequelize sync() 的冲突问题
 */
export async function setupTestDatabase(): Promise<void> {
  try {
    // 连接数据库
    await sequelize.authenticate();

    // 删除现有表（按依赖顺序）
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { type: QueryTypes.RAW });
    await sequelize.query('DROP TABLE IF EXISTS translations', { type: QueryTypes.RAW });
    await sequelize.query('DROP TABLE IF EXISTS domains', { type: QueryTypes.RAW });
    await sequelize.query('DROP TABLE IF EXISTS configs', { type: QueryTypes.RAW });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { type: QueryTypes.RAW });

    // 创建 configs 表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        author VARCHAR(255),
        description VARCHAR(255),
        keywords VARCHAR(255),
        links JSON,
        permissions JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, { type: QueryTypes.RAW });

    // 创建 domains 表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id INT AUTO_INCREMENT PRIMARY KEY,
        domain VARCHAR(255) NOT NULL UNIQUE,
        config_id INT NOT NULL,
        homepage VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (config_id) REFERENCES configs(id) ON DELETE CASCADE,
        INDEX idx_config_id (config_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, { type: QueryTypes.RAW });

    // 创建 translations 表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS translations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_id INT NOT NULL,
        language_code VARCHAR(10) NOT NULL,
        title VARCHAR(200) NOT NULL,
        author VARCHAR(100) NOT NULL,
        description VARCHAR(1000) NOT NULL,
        keywords TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_translation_config FOREIGN KEY (config_id) REFERENCES configs(id) ON DELETE CASCADE,
        UNIQUE KEY unique_config_language (config_id, language_code),
        INDEX idx_language_code (language_code),
        INDEX idx_config_id (config_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, { type: QueryTypes.RAW });

  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

/**
 * 清理测试数据
 * 
 * 清空所有表的数据，但保留表结构
 */
export async function cleanTestData(): Promise<void> {
  try {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { type: QueryTypes.RAW });
    await sequelize.query('TRUNCATE TABLE translations', { type: QueryTypes.RAW });
    await sequelize.query('TRUNCATE TABLE domains', { type: QueryTypes.RAW });
    await sequelize.query('TRUNCATE TABLE configs', { type: QueryTypes.RAW });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { type: QueryTypes.RAW });
  } catch (error) {
    console.error('Failed to clean test data:', error);
    throw error;
  }
}

/**
 * 关闭数据库连接
 */
export async function closeTestDatabase(): Promise<void> {
  try {
    await sequelize.close();
  } catch (error) {
    console.error('Failed to close test database:', error);
    throw error;
  }
}

/**
 * 检查表是否存在
 */
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await sequelize.query(
      `SELECT COUNT(*) as count 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = ?`,
      {
        replacements: [tableName],
        type: QueryTypes.SELECT,
      }
    );
    return (result[0] as any).count > 0;
  } catch (error) {
    console.error(`Failed to check if table ${tableName} exists:`, error);
    return false;
  }
}
