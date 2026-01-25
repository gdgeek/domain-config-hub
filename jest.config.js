/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/*.test.ts',
    '**/*.property.test.ts',
    '**/*.integration.ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        // 允许 JS 文件
        allowJs: true,
        // ES 模块互操作
        esModuleInterop: true,
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.property.test.ts',
    '!src/**/*.integration.ts',
    '!src/types/**/*.ts',
    '!src/index.ts',
    '!src/app.ts',
    '!src/models/migrations/**/*.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 75,
      branches: 60,
      functions: 65,
      lines: 75,
    },
  },
  // 设置文件在每个测试文件运行前执行
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // 详细输出测试结果
  verbose: true,
  // 每次测试后自动清除 mock 调用和实例
  clearMocks: true,
  // 每次测试后重置 mock 状态
  resetMocks: true,
  // 测试超时时间（毫秒）
  testTimeout: 10000,
};
