/**
 * Dockerfile Validation Tests
 * 
 * These tests verify that the Dockerfile meets the technical requirements:
 * - Multi-stage build
 * - Non-root user
 * - Health check
 * 
 * Validates: Requirements - Technical Stack (Docker deployment)
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Dockerfile Validation', () => {
  let dockerfileContent: string;

  beforeAll(() => {
    // Read Dockerfile from project root
    dockerfileContent = readFileSync(join(__dirname, '..', 'Dockerfile'), 'utf-8');
  });

  describe('Multi-stage Build', () => {
    it('should have a builder stage', () => {
      expect(dockerfileContent).toMatch(/FROM\s+node:[\d.]+-alpine\s+AS\s+builder/i);
    });

    it('should have a production stage', () => {
      expect(dockerfileContent).toMatch(/FROM\s+node:[\d.]+-alpine\s+AS\s+production/i);
    });

    it('should copy built artifacts from builder stage', () => {
      expect(dockerfileContent).toMatch(/COPY\s+--from=builder/);
    });

    it('should build TypeScript in builder stage', () => {
      expect(dockerfileContent).toMatch(/RUN\s+npm\s+run\s+build/);
    });

    it('should prune devDependencies in builder stage', () => {
      expect(dockerfileContent).toMatch(/RUN\s+npm\s+prune\s+--production/);
    });
  });

  describe('Non-root User', () => {
    it('should create a non-root user', () => {
      expect(dockerfileContent).toMatch(/addgroup.*nodejs/);
      expect(dockerfileContent).toMatch(/adduser.*nodejs/);
    });

    it('should switch to non-root user', () => {
      expect(dockerfileContent).toMatch(/USER\s+nodejs/);
    });

    it('should set proper ownership for application files', () => {
      expect(dockerfileContent).toMatch(/--chown=nodejs:nodejs/);
    });

    it('should use UID 1001 for the nodejs user', () => {
      expect(dockerfileContent).toMatch(/-u\s+1001/);
    });
  });

  describe('Health Check', () => {
    it('should have a HEALTHCHECK instruction', () => {
      expect(dockerfileContent).toMatch(/HEALTHCHECK/);
    });

    it('should check the /health endpoint', () => {
      expect(dockerfileContent).toMatch(/\/health/);
    });

    it('should have proper health check intervals', () => {
      expect(dockerfileContent).toMatch(/--interval=/);
      expect(dockerfileContent).toMatch(/--timeout=/);
      expect(dockerfileContent).toMatch(/--retries=/);
    });

    it('should have a start period for initialization', () => {
      expect(dockerfileContent).toMatch(/--start-period=/);
    });
  });

  describe('Best Practices', () => {
    it('should use Alpine Linux for smaller image size', () => {
      expect(dockerfileContent).toMatch(/node:[\d.]+-alpine/);
    });

    it('should expose port 3000', () => {
      expect(dockerfileContent).toMatch(/EXPOSE\s+3000/);
    });

    it('should use dumb-init for proper signal handling', () => {
      expect(dockerfileContent).toMatch(/dumb-init/);
      expect(dockerfileContent).toMatch(/ENTRYPOINT.*dumb-init/);
    });

    it('should set working directory', () => {
      expect(dockerfileContent).toMatch(/WORKDIR\s+\/app/);
    });

    it('should use npm ci for reproducible builds', () => {
      expect(dockerfileContent).toMatch(/RUN\s+npm\s+ci/);
    });

    it('should start the application with node', () => {
      expect(dockerfileContent).toMatch(/CMD.*node.*dist\/index\.js/);
    });
  });

  describe('Security', () => {
    it('should not run as root in production stage', () => {
      const lines = dockerfileContent.split('\n');
      const productionStageIndex = lines.findIndex(line => 
        line.match(/FROM.*AS\s+production/i)
      );
      const userIndex = lines.findIndex((line, idx) => 
        idx > productionStageIndex && line.match(/USER\s+nodejs/)
      );
      const cmdIndex = lines.findIndex((line, idx) => 
        idx > productionStageIndex && line.match(/CMD/)
      );
      
      expect(userIndex).toBeGreaterThan(productionStageIndex);
      expect(userIndex).toBeLessThan(cmdIndex);
    });

    it('should use specific Node.js version', () => {
      expect(dockerfileContent).toMatch(/node:24-alpine/);
    });
  });

  describe('Migration Support', () => {
    it('should copy migration files', () => {
      expect(dockerfileContent).toMatch(/COPY.*migrations/);
    });
  });
});
