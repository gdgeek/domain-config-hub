/**
 * ConfigRepository
 * 
 * 配置数据访问层
 * 负责与 configs 表交互
 */

import { Config, ConfigAttributes, ConfigCreationAttributes } from '../models/Config';
import { DatabaseError } from '../errors/DatabaseError';
import { logger } from '../config/logger';

/**
 * 分页参数接口
 */
export interface Pagination {
  page: number;
  pageSize: number;
}

/**
 * ConfigRepository 类
 */
export class ConfigRepository {
  /**
   * 创建配置
   */
  async create(data: ConfigCreationAttributes): Promise<Config> {
    try {
      const config = await Config.create(data);
      logger.info('配置创建成功', { configId: config.id });
      return config;
    } catch (error: any) {
      logger.error('创建配置失败', { error: error.message, data });
      throw new DatabaseError('创建配置失败', 'DB_CREATE_ERROR', error);
    }
  }

  /**
   * 通过 ID 查询配置
   */
  async findById(id: number): Promise<Config | null> {
    try {
      return await Config.findByPk(id);
    } catch (error: any) {
      logger.error('查询配置失败', { error: error.message, id });
      throw new DatabaseError('查询配置失败', 'DB_QUERY_ERROR', error);
    }
  }

  /**
   * 查询所有配置（分页）
   */
  async findAll(pagination: Pagination): Promise<Config[]> {
    try {
      const { page, pageSize } = pagination;
      const offset = (page - 1) * pageSize;

      return await Config.findAll({
        limit: pageSize,
        offset,
        order: [['id', 'DESC']],
      });
    } catch (error: any) {
      logger.error('查询配置列表失败', { error: error.message, pagination });
      throw new DatabaseError('查询配置列表失败', 'DB_QUERY_ERROR', error);
    }
  }

  /**
   * 统计配置总数
   */
  async count(): Promise<number> {
    try {
      return await Config.count();
    } catch (error: any) {
      logger.error('统计配置数量失败', { error: error.message });
      throw new DatabaseError('统计配置数量失败', 'DB_QUERY_ERROR', error);
    }
  }

  /**
   * 更新配置
   */
  async update(id: number, data: Partial<ConfigAttributes>): Promise<Config | null> {
    try {
      const config = await Config.findByPk(id);
      if (!config) {
        return null;
      }

      await config.update(data);
      logger.info('配置更新成功', { configId: id });
      return config;
    } catch (error: any) {
      logger.error('更新配置失败', { error: error.message, id, data });
      throw new DatabaseError('更新配置失败', 'DB_UPDATE_ERROR', error);
    }
  }

  /**
   * 删除配置
   */
  async delete(id: number): Promise<boolean> {
    try {
      const config = await Config.findByPk(id);
      if (!config) {
        return false;
      }

      await config.destroy();
      logger.info('配置删除成功', { configId: id });
      return true;
    } catch (error: any) {
      logger.error('删除配置失败', { error: error.message, id });
      throw new DatabaseError('删除配置失败', 'DB_DELETE_ERROR', error);
    }
  }
}

export default new ConfigRepository();
