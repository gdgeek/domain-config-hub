import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';

describe('docker-compose.yml', () => {
  let dockerCompose: any;

  beforeAll(() => {
    const content = readFileSync(join(__dirname, '../docker-compose.yml'), 'utf-8');
    dockerCompose = parse(content);
  });

  describe('Application Service', () => {
    it('should have app service configured', () => {
      expect(dockerCompose.services.app).toBeDefined();
    });

    it('should build from Dockerfile with production target', () => {
      expect(dockerCompose.services.app.build).toBeDefined();
      expect(dockerCompose.services.app.build.dockerfile).toBe('Dockerfile');
      expect(dockerCompose.services.app.build.target).toBe('production');
    });

    it('should have proper environment variables', () => {
      const env = dockerCompose.services.app.environment;
      expect(env.NODE_ENV).toBeDefined();
      expect(env.PORT).toBeDefined();
      expect(env.DB_HOST).toBe('mysql');
      expect(env.REDIS_HOST).toBe('redis');
    });

    it('should depend on MySQL with health check', () => {
      expect(dockerCompose.services.app.depends_on).toBeDefined();
      expect(dockerCompose.services.app.depends_on.mysql).toBeDefined();
      expect(dockerCompose.services.app.depends_on.mysql.condition).toBe('service_healthy');
    });

    it('should have health check configured', () => {
      expect(dockerCompose.services.app.healthcheck).toBeDefined();
      expect(dockerCompose.services.app.healthcheck.test).toBeDefined();
    });

    it('should expose port 3000', () => {
      expect(dockerCompose.services.app.ports).toContain('${PORT:-3000}:3000');
    });

    it('should have restart policy', () => {
      expect(dockerCompose.services.app.restart).toBe('unless-stopped');
    });

    it('should have volumes for logs', () => {
      expect(dockerCompose.services.app.volumes).toContain('app-logs:/app/logs');
    });
  });

  describe('MySQL Service', () => {
    it('should have mysql service configured', () => {
      expect(dockerCompose.services.mysql).toBeDefined();
    });

    it('should use MySQL 8.0 image', () => {
      expect(dockerCompose.services.mysql.image).toBe('mysql:8.0');
    });

    it('should have proper environment variables', () => {
      const env = dockerCompose.services.mysql.environment;
      expect(env.MYSQL_ROOT_PASSWORD).toBeDefined();
      expect(env.MYSQL_DATABASE).toBeDefined();
    });

    it('should have health check configured', () => {
      expect(dockerCompose.services.mysql.healthcheck).toBeDefined();
      expect(dockerCompose.services.mysql.healthcheck.test).toBeDefined();
    });

    it('should expose port 3306', () => {
      expect(dockerCompose.services.mysql.ports).toContain('${DB_PORT:-3306}:3306');
    });

    it('should have persistent volume for data', () => {
      expect(dockerCompose.services.mysql.volumes).toContain('mysql-data:/var/lib/mysql');
    });

    it('should mount initialization script', () => {
      const volumes = dockerCompose.services.mysql.volumes;
      const initScript = volumes.find((v: string) => v.includes('docker-entrypoint-initdb.d'));
      expect(initScript).toBeDefined();
    });

    it('should have proper MySQL configuration', () => {
      const command = dockerCompose.services.mysql.command;
      expect(command).toContain('--default-authentication-plugin=mysql_native_password');
      expect(command).toContain('--character-set-server=utf8mb3');
      expect(command).toContain('--collation-server=utf8mb3_unicode_ci');
    });
  });

  describe('Redis Service (Optional)', () => {
    it('should have redis service configured', () => {
      expect(dockerCompose.services.redis).toBeDefined();
    });

    it('should use Redis 7 Alpine image', () => {
      expect(dockerCompose.services.redis.image).toBe('redis:7-alpine');
    });

    it('should be optional with profile', () => {
      expect(dockerCompose.services.redis.profiles).toContain('with-redis');
    });

    it('should have health check configured', () => {
      expect(dockerCompose.services.redis.healthcheck).toBeDefined();
      expect(dockerCompose.services.redis.healthcheck.test).toContain('redis-cli');
    });

    it('should expose port 6379', () => {
      expect(dockerCompose.services.redis.ports).toContain('${REDIS_PORT:-6379}:6379');
    });

    it('should have persistent volume for data', () => {
      expect(dockerCompose.services.redis.volumes).toContain('redis-data:/data');
    });

    it('should support password authentication', () => {
      const command = dockerCompose.services.redis.command;
      expect(command).toContain('REDIS_PASSWORD');
      expect(command).toContain('requirepass');
    });
  });

  describe('Network Configuration', () => {
    it('should have network defined', () => {
      expect(dockerCompose.networks).toBeDefined();
      expect(dockerCompose.networks['domain-config-network']).toBeDefined();
    });

    it('should use bridge driver', () => {
      expect(dockerCompose.networks['domain-config-network'].driver).toBe('bridge');
    });

    it('should connect all services to the network', () => {
      expect(dockerCompose.services.app.networks).toContain('domain-config-network');
      expect(dockerCompose.services.mysql.networks).toContain('domain-config-network');
      expect(dockerCompose.services.redis.networks).toContain('domain-config-network');
    });
  });

  describe('Volume Configuration', () => {
    it('should have all required volumes defined', () => {
      expect(dockerCompose.volumes).toBeDefined();
      expect(dockerCompose.volumes['mysql-data']).toBeDefined();
      expect(dockerCompose.volumes['redis-data']).toBeDefined();
      expect(dockerCompose.volumes['app-logs']).toBeDefined();
    });

    it('should use local driver for volumes', () => {
      expect(dockerCompose.volumes['mysql-data'].driver).toBe('local');
      expect(dockerCompose.volumes['redis-data'].driver).toBe('local');
      expect(dockerCompose.volumes['app-logs'].driver).toBe('local');
    });
  });

  describe('Environment Variable Support', () => {
    it('should support customizable ports', () => {
      const appPorts = dockerCompose.services.app.ports[0];
      const mysqlPorts = dockerCompose.services.mysql.ports[0];
      const redisPorts = dockerCompose.services.redis.ports[0];
      
      expect(appPorts).toContain('${PORT:-3000}');
      expect(mysqlPorts).toContain('${DB_PORT:-3306}');
      expect(redisPorts).toContain('${REDIS_PORT:-6379}');
    });

    it('should support customizable database credentials', () => {
      const env = dockerCompose.services.app.environment;
      expect(env.DB_NAME).toContain('${DB_NAME:-domain_config}');
      expect(env.DB_USER).toContain('${DB_USER:-root}');
      expect(env.DB_PASSWORD).toContain('${DB_PASSWORD:-password}');
    });

    it('should support Redis configuration', () => {
      const env = dockerCompose.services.app.environment;
      expect(env.REDIS_ENABLED).toContain('${REDIS_ENABLED:-true}');
      expect(env.REDIS_TTL).toContain('${REDIS_TTL:-3600}');
    });
  });
});
