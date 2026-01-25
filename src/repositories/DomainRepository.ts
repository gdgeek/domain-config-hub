/**
 * DomainRepository
 * 
 * 域名数据访问层
 * 负责与 domains 表交互，支持关联查询 configs 表
 */

import { Domain, DomainAttributes, DomainCreationAttributes } from '../models/Domain';
import { Config } from '../models/Config';
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
 * DomainRepository 类
 */
export class DomainRepository {
  /**
   * 创建域名
   */
  async create(data: DomainCreationAttributes): Promise<Domain> {
    try {
      const domain = await Domain.create(data);
      logger.info('域名创建成功', { domainId: domain.id, domain: domain.domain });
      return domain;
    } catch (error: any) {
      logger.error('创建域名失败', { error: error.message, data });
      throw new DatabaseError('创建域名失败', 'DB_CREATE_ERROR', error);
    }
  }

  /**
   * 通过 ID 查询域名（包含关联的配置）
   */
  async findById(id: number): Promise<Domain | null> {
    try {
      return await Domain.findByPk(id, {
        include: [{
          model: Config,
          as: 'config',
        }],
      });
    } catch (error: any) {
      logger.error('查询域名失败', { error: error.message, id });
      throw new DatabaseError('查询域名失败', 'DB_QUERY_ERROR', error);
    }
  }

  /**
   * 通过域名查询（包含关联的配置）
   */
  async findByDomain(domain: string): Promise<Domain | null> {
    try {
      return await Domain.findOne({
        where: { domain },
        include: [{
          model: Config,
          as: 'config',
        }],
      });
    } catch (error: any) {
      logger.error('查询域名失败', { error: error.message, domain });
      throw new DatabaseError('查询域名失败', 'DB_QUERY_ERROR', error);
    }
  }

  /**
   * 查询所有域名（分页，包含关联的配置）
   */
  async findAll(pagination: Pagination): Promise<Domain[]> {
    try {
      const { page, pageSize } = pagination;
      const offset = (page - 1) * pageSize;

      return await Domain.findAll({
        limit: pageSize,
        offset,
        order: [['id', 'DESC']],
        include: [{
          model: Config,
          as: 'config',
        }],
      });
    } catch (error: any) {
      logger.error('查询域名列表失败', { error: error.message, pagination });
      throw new DatabaseError('查询域名列表失败', 'DB_QUERY_ERROR', error);
    }
  }

  /**
   * 统计域名总数
   */
  async count(): Promise<number> {
    try {
      return await Domain.count();
    } catch (error: any) {
      logger.error('统计域名数量失败', { error: error.message });
      throw new DatabaseError('统计域名数量失败', 'DB_QUERY_ERROR', error);
    }
  }

  /**
   * 更新域名
   */
  async update(id: number, data: Partial<DomainAttributes>): Promise<Domain | null> {
    try {
      const domain = await Domain.findByPk(id);
      if (!domain) {
        return null;
      }

      await domain.update(data);
      logger.info('域名更新成功', { domainId: id });
      
      // 重新加载以包含关联的配置
      await domain.reload({
        include: [{
          model: Config,
          as: 'config',
        }],
      });
      
      return domain;
    } catch (error: any) {
      logger.error('更新域名失败', { error: error.message, id, data });
      throw new DatabaseError('更新域名失败', 'DB_UPDATE_ERROR', error);
    }
  }

  /**
   * 删除域名
   */
  async delete(id: number): Promise<boolean> {
    try {
      const domain = await Domain.findByPk(id);
      if (!domain) {
        return false;
      }

      await domain.destroy();
      logger.info('域名删除成功', { domainId: id });
      return true;
    } catch (error: any) {
      logger.error('删除域名失败', { error: error.message, id });
      throw new DatabaseError('删除域名失败', 'DB_DELETE_ERROR', error);
    }
  }

  /**
   * 查询使用指定配置的域名数量
   */
  async countByConfigId(configId: number): Promise<number> {
    try {
      return await Domain.count({
        where: { configId },
      });
    } catch (error: any) {
      logger.error('统计配置关联域名数量失败', { error: error.message, configId });
      throw new DatabaseError('统计配置关联域名数量失败', 'DB_QUERY_ERROR', error);
    }
  }
}

export default new DomainRepository();
