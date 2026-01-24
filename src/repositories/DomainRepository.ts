/**
 * DomainRepository
 * 
 * 数据访问层，负责与数据库交互
 * 提供域名配置的 CRUD 操作
 * 
 * 需求: 3.1, 3.3, 3.5, 3.7
 */

import { Domain, DomainAttributes, DomainCreationAttributes } from '../models/Domain';
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
 * DomainRepository 接口
 * 定义数据访问层的所有方法
 */
export interface IDomainRepository {
  create(data: DomainCreationAttributes): Promise<Domain>;
  findById(id: number): Promise<Domain | null>;
  findByDomain(domain: string): Promise<Domain | null>;
  findAll(pagination: Pagination): Promise<Domain[]>;
  count(): Promise<number>;
  update(id: number, data: Partial<DomainAttributes>): Promise<Domain | null>;
  delete(id: number): Promise<boolean>;
}

/**
 * DomainRepository 实现类
 * 
 * 提供域名配置的数据库操作方法
 * 包含完整的错误处理和日志记录
 */
export class DomainRepository implements IDomainRepository {
  /**
   * 创建新的域名配置
   * 
   * @param data - 域名配置数据
   * @returns 创建的 Domain 实例
   * @throws DatabaseError - 数据库操作失败时抛出
   * 
   * 需求: 3.1
   */
  async create(data: DomainCreationAttributes): Promise<Domain> {
    try {
      const domain = await Domain.create(data);
      logger.info('Domain created successfully', { id: domain.id, domain: domain.domain });
      return domain;
    } catch (error) {
      logger.error('Failed to create domain', { error, data });
      
      // 处理唯一约束冲突
      if (error instanceof Error && 'name' in error && error.name === 'SequelizeUniqueConstraintError') {
        throw new DatabaseError(
          `域名 '${data.domain}' 已存在`,
          'DUPLICATE_DOMAIN',
          error
        );
      }
      
      throw new DatabaseError(
        '创建域名配置失败',
        'DATABASE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 通过 ID 查询域名配置
   * 
   * @param id - 域名配置 ID
   * @returns Domain 实例或 null（不存在时）
   * @throws DatabaseError - 数据库操作失败时抛出
   * 
   * 需求: 3.1
   */
  async findById(id: number): Promise<Domain | null> {
    try {
      const domain = await Domain.findByPk(id);
      return domain;
    } catch (error) {
      logger.error('Failed to find domain by id', { error, id });
      throw new DatabaseError(
        '查询域名配置失败',
        'DATABASE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 通过域名查询配置
   * 
   * @param domain - 域名
   * @returns Domain 实例或 null（不存在时）
   * @throws DatabaseError - 数据库操作失败时抛出
   * 
   * 需求: 3.1
   */
  async findByDomain(domain: string): Promise<Domain | null> {
    try {
      const result = await Domain.findOne({
        where: { domain },
      });
      return result;
    } catch (error) {
      logger.error('Failed to find domain by name', { error, domain });
      throw new DatabaseError(
        '查询域名配置失败',
        'DATABASE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 查询所有域名配置（分页）
   * 
   * @param pagination - 分页参数
   * @returns Domain 实例数组
   * @throws DatabaseError - 数据库操作失败时抛出
   * 
   * 需求: 3.7
   */
  async findAll(pagination: Pagination): Promise<Domain[]> {
    try {
      const { page, pageSize } = pagination;
      const offset = (page - 1) * pageSize;
      
      const domains = await Domain.findAll({
        limit: pageSize,
        offset: offset,
        order: [['id', 'ASC']],
      });
      
      return domains;
    } catch (error) {
      logger.error('Failed to find all domains', { error, pagination });
      throw new DatabaseError(
        '查询域名配置列表失败',
        'DATABASE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 统计域名配置总数
   * 
   * @returns 总数
   * @throws DatabaseError - 数据库操作失败时抛出
   * 
   * 需求: 3.7
   */
  async count(): Promise<number> {
    try {
      const total = await Domain.count();
      return total;
    } catch (error) {
      logger.error('Failed to count domains', { error });
      throw new DatabaseError(
        '统计域名配置失败',
        'DATABASE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 更新域名配置
   * 
   * @param id - 域名配置 ID
   * @param data - 要更新的数据
   * @returns 更新后的 Domain 实例或 null（不存在时）
   * @throws DatabaseError - 数据库操作失败时抛出
   * 
   * 需求: 3.3
   */
  async update(id: number, data: Partial<DomainAttributes>): Promise<Domain | null> {
    try {
      const domain = await Domain.findByPk(id);
      
      if (!domain) {
        return null;
      }
      
      // 更新字段
      await domain.update(data);
      
      logger.info('Domain updated successfully', { id, domain: domain.domain });
      return domain;
    } catch (error) {
      logger.error('Failed to update domain', { error, id, data });
      throw new DatabaseError(
        '更新域名配置失败',
        'DATABASE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 删除域名配置
   * 
   * @param id - 域名配置 ID
   * @returns true（删除成功）或 false（不存在）
   * @throws DatabaseError - 数据库操作失败时抛出
   * 
   * 需求: 3.5
   */
  async delete(id: number): Promise<boolean> {
    try {
      const domain = await Domain.findByPk(id);
      
      if (!domain) {
        return false;
      }
      
      await domain.destroy();
      
      logger.info('Domain deleted successfully', { id, domain: domain.domain });
      return true;
    } catch (error) {
      logger.error('Failed to delete domain', { error, id });
      throw new DatabaseError(
        '删除域名配置失败',
        'DATABASE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }
}

/**
 * 导出默认实例
 */
export const domainRepository = new DomainRepository();
