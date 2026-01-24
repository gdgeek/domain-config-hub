/**
 * 数据库迁移执行器
 * 
 * 用于执行数据库迁移脚本，初始化数据库结构
 * 
 * 需求: 数据库结构
 */

import * as fs from 'fs';
import * as path from 'path';
import { sequelize } from '../../config/database';
import { logger } from '../../config/logger';

/**
 * 迁移选项接口
 */
export interface MigrationOptions {
  /** 是否强制重新创建表（会删除现有数据） */
  force?: boolean;
  /** 迁移文件路径 */
  migrationFile?: string;
}

/**
 * 读取 SQL 迁移文件
 * 
 * @param filename SQL 文件名
 * @returns SQL 文件内容
 */
function readMigrationFile(filename: string): string {
  const filePath = path.join(__dirname, filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`迁移文件不存在: ${filePath}`);
  }
  
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * 解析 SQL 文件为独立的语句
 * 
 * @param sql SQL 文件内容
 * @returns SQL 语句数组
 */
function parseSqlStatements(sql: string): string[] {
  // 移除注释
  const withoutComments = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');
  
  // 按分号分割语句
  const statements = withoutComments
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);
  
  return statements;
}

/**
 * 执行单个 SQL 语句
 * 
 * @param statement SQL 语句
 */
async function executeSqlStatement(statement: string): Promise<void> {
  try {
    await sequelize.query(statement);
    logger.debug('SQL 语句执行成功', { statement: statement.substring(0, 100) });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('SQL 语句执行失败', {
      statement: statement.substring(0, 100),
      error: err.message,
    });
    throw err;
  }
}

/**
 * 执行数据库迁移
 * 
 * 该函数会读取 SQL 迁移文件并执行其中的 SQL 语句
 * 
 * @param options 迁移选项
 * @throws Error 如果迁移失败
 * 
 * @example
 * ```typescript
 * // 执行默认迁移
 * await runMigration();
 * 
 * // 强制重新创建表（会删除现有数据）
 * await runMigration({ force: true });
 * 
 * // 执行自定义迁移文件
 * await runMigration({ migrationFile: 'custom.sql' });
 * ```
 */
export async function runMigration(options: MigrationOptions = {}): Promise<void> {
  const { force = false, migrationFile = 'domain.sql' } = options;
  
  try {
    logger.info('开始执行数据库迁移', { migrationFile, force });
    
    // 确保数据库连接正常
    await sequelize.authenticate();
    logger.info('数据库连接验证成功');
    
    // 如果 force 为 true，先删除表
    if (force) {
      logger.warn('强制模式：将删除现有表');
      try {
        await sequelize.query('DROP TABLE IF EXISTS `domain`');
        logger.info('已删除现有表');
      } catch (error) {
        logger.warn('删除表时出错（可能表不存在）', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    
    // 读取迁移文件
    const sql = readMigrationFile(migrationFile);
    logger.info('迁移文件读取成功', { file: migrationFile });
    
    // 解析 SQL 语句
    const statements = parseSqlStatements(sql);
    logger.info(`解析到 ${statements.length} 条 SQL 语句`);
    
    // 执行每条 SQL 语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      logger.info(`执行第 ${i + 1}/${statements.length} 条语句`);
      await executeSqlStatement(statement);
    }
    
    logger.info('数据库迁移执行成功', {
      migrationFile,
      statementsExecuted: statements.length,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('数据库迁移执行失败', {
      migrationFile,
      error: err.message,
    });
    throw err;
  }
}

/**
 * 验证数据库表是否存在
 * 
 * @param tableName 表名
 * @returns 表是否存在
 */
export async function verifyTable(tableName: string): Promise<boolean> {
  try {
    const [results] = await sequelize.query(
      `SHOW TABLES LIKE '${tableName}'`
    );
    return Array.isArray(results) && results.length > 0;
  } catch (error) {
    logger.error('验证表存在性失败', {
      tableName,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * 获取表的列信息
 * 
 * @param tableName 表名
 * @returns 列信息数组
 */
export async function getTableColumns(tableName: string): Promise<any[]> {
  try {
    const [results] = await sequelize.query(`DESCRIBE ${tableName}`);
    return results as any[];
  } catch (error) {
    logger.error('获取表列信息失败', {
      tableName,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * 命令行入口
 * 
 * 使用方法:
 * ```bash
 * # 执行默认迁移
 * npm run migrate
 * 
 * # 强制重新创建表（会删除现有数据）
 * npm run migrate:force
 * 
 * # 使用 ts-node 直接运行
 * npx ts-node src/models/migrations/migrate.ts
 * 
 * # 强制模式
 * npx ts-node src/models/migrations/migrate.ts --force
 * ```
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const force = args.includes('--force') || args.includes('-f');
  
  runMigration({ force })
    .then(async () => {
      logger.info('迁移完成，验证表结构...');
      
      // 验证表是否创建成功
      const tableExists = await verifyTable('domain');
      if (tableExists) {
        logger.info('✓ domain 表创建成功');
        
        // 显示表结构
        const columns = await getTableColumns('domain');
        logger.info('表结构:', { columns });
      } else {
        logger.error('✗ domain 表创建失败');
        process.exit(1);
      }
      
      // 关闭数据库连接
      await sequelize.close();
      logger.info('数据库连接已关闭');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('迁移失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    });
}
