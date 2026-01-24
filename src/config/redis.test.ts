/**
 * Redis 配置模块单元测试
 * 
 * 测试 Redis 连接和断开函数
 * 测试 isRedisEnabled 检查函数
 * 
 * 需求: 2.5
 */

// Mock logger 必须在导入之前
jest.mock('./logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logError: jest.fn(),
}));

// Mock ioredis
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockQuit = jest.fn().mockResolvedValue('OK');
const mockDisconnect = jest.fn();
const mockOn = jest.fn();

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    quit: mockQuit,
    disconnect: mockDisconnect,
    on: mockOn,
    status: 'ready',
  }));
});

describe('Redis 配置模块', () => {
  const originalEnv = process.env;
  
  // 在每个测试前重新导入模块以重置状态
  let isRedisEnabled: () => boolean;
  let connectRedis: () => Promise<void>;
  let closeRedis: () => Promise<void>;
  let getRedisClient: () => unknown;
  let isRedisConnected: () => boolean;
  let reloadConfig: () => void;

  beforeEach(async () => {
    // 重置环境变量
    process.env = { ...originalEnv };
    
    // 清除 mock 调用记录
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
    mockQuit.mockResolvedValue('OK');
    
    // 重置模块缓存以获得干净的状态
    jest.resetModules();
    
    // 重新导入模块
    const envModule = await import('./env');
    const redisModule = await import('./redis');
    
    isRedisEnabled = redisModule.isRedisEnabled;
    connectRedis = redisModule.connectRedis;
    closeRedis = redisModule.closeRedis;
    getRedisClient = redisModule.getRedisClient;
    isRedisConnected = redisModule.isRedisConnected;
    reloadConfig = envModule.reloadConfig;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isRedisEnabled', () => {
    it('当 REDIS_ENABLED 为 true 时应返回 true', () => {
      process.env.REDIS_ENABLED = 'true';
      reloadConfig();
      
      expect(isRedisEnabled()).toBe(true);
    });

    it('当 REDIS_ENABLED 为 false 时应返回 false', () => {
      process.env.REDIS_ENABLED = 'false';
      reloadConfig();
      
      expect(isRedisEnabled()).toBe(false);
    });

    it('当 REDIS_ENABLED 未设置时应返回 false（默认值）', () => {
      delete process.env.REDIS_ENABLED;
      reloadConfig();
      
      expect(isRedisEnabled()).toBe(false);
    });

    it('当 REDIS_ENABLED 为 "1" 时应返回 true', () => {
      process.env.REDIS_ENABLED = '1';
      reloadConfig();
      
      expect(isRedisEnabled()).toBe(true);
    });
  });

  describe('connectRedis', () => {
    it('当 Redis 未启用时应跳过连接', async () => {
      process.env.REDIS_ENABLED = 'false';
      reloadConfig();
      
      await connectRedis();
      
      expect(getRedisClient()).toBeNull();
      expect(mockConnect).not.toHaveBeenCalled();
    });

    it('当 Redis 已启用时应建立连接', async () => {
      process.env.REDIS_ENABLED = 'true';
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      reloadConfig();
      
      await connectRedis();
      
      expect(getRedisClient()).not.toBeNull();
      expect(mockConnect).toHaveBeenCalled();
    });

    it('当已连接时应跳过重复连接', async () => {
      process.env.REDIS_ENABLED = 'true';
      reloadConfig();
      
      await connectRedis();
      const firstClient = getRedisClient();
      
      await connectRedis();
      const secondClient = getRedisClient();
      
      expect(firstClient).toBe(secondClient);
      // connect 只应该被调用一次
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('当连接失败时应抛出错误并清理实例', async () => {
      process.env.REDIS_ENABLED = 'true';
      reloadConfig();
      
      const error = new Error('Connection failed');
      mockConnect.mockRejectedValueOnce(error);
      
      await expect(connectRedis()).rejects.toThrow('Connection failed');
      expect(getRedisClient()).toBeNull();
    });
  });

  describe('closeRedis', () => {
    it('当未连接时应安全返回', async () => {
      process.env.REDIS_ENABLED = 'false';
      reloadConfig();
      
      // 不应抛出错误
      await closeRedis();
      expect(mockQuit).not.toHaveBeenCalled();
    });

    it('当已连接时应关闭连接', async () => {
      process.env.REDIS_ENABLED = 'true';
      reloadConfig();
      
      await connectRedis();
      expect(getRedisClient()).not.toBeNull();
      
      await closeRedis();
      expect(getRedisClient()).toBeNull();
      expect(mockQuit).toHaveBeenCalled();
    });

    it('当 quit 失败时应强制断开连接', async () => {
      process.env.REDIS_ENABLED = 'true';
      reloadConfig();
      
      await connectRedis();
      
      const error = new Error('Quit failed');
      mockQuit.mockRejectedValueOnce(error);
      
      await expect(closeRedis()).rejects.toThrow('Quit failed');
      expect(mockDisconnect).toHaveBeenCalled();
      expect(getRedisClient()).toBeNull();
    });
  });

  describe('getRedisClient', () => {
    it('当未连接时应返回 null', () => {
      expect(getRedisClient()).toBeNull();
    });

    it('当已连接时应返回 Redis 客户端', async () => {
      process.env.REDIS_ENABLED = 'true';
      reloadConfig();
      
      await connectRedis();
      
      const client = getRedisClient();
      expect(client).not.toBeNull();
    });
  });

  describe('isRedisConnected', () => {
    it('当未连接时应返回 false', () => {
      expect(isRedisConnected()).toBe(false);
    });

    it('当已连接且状态为 ready 时应返回 true', async () => {
      process.env.REDIS_ENABLED = 'true';
      reloadConfig();
      
      await connectRedis();
      
      expect(isRedisConnected()).toBe(true);
    });
  });
});

describe('Redis 配置模块 - 需求 2.5 验证', () => {
  const originalEnv = process.env;
  
  let isRedisEnabled: () => boolean;
  let connectRedis: () => Promise<void>;
  let getRedisClient: () => unknown;
  let isRedisConnected: () => boolean;
  let reloadConfig: () => void;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
    jest.resetModules();
    
    const envModule = await import('./env');
    const redisModule = await import('./redis');
    
    isRedisEnabled = redisModule.isRedisEnabled;
    connectRedis = redisModule.connectRedis;
    getRedisClient = redisModule.getRedisClient;
    isRedisConnected = redisModule.isRedisConnected;
    reloadConfig = envModule.reloadConfig;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('需求 2.5: WHERE Redis 缓存未启用 THEN 应直接查询数据库而不使用缓存', async () => {
    // 设置 Redis 未启用
    process.env.REDIS_ENABLED = 'false';
    reloadConfig();
    
    // 验证 Redis 未启用
    expect(isRedisEnabled()).toBe(false);
    
    // 尝试连接应该跳过
    await connectRedis();
    
    // 验证没有建立连接
    expect(getRedisClient()).toBeNull();
    expect(isRedisConnected()).toBe(false);
  });
});
