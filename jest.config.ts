import type { Config } from "jest";

const common: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: "./tsconfig.test.json" }] },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@modules/(.*)$": "<rootDir>/src/modules/$1",
    "^@read-models/(.*)$": "<rootDir>/src/read-models/$1",
    "^@shared/(.*)$": "<rootDir>/src/shared/$1",
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@middlewares/(.*)$": "<rootDir>/src/middlewares/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
  },
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["text", "lcov", "html"],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "\\.d\\.ts$",
    "<rootDir>/src/app.ts",
    "<rootDir>/src/server.ts",
    ".*\\.routes?\\.ts$",
    ".*\\.controller\\.ts$",
    ".*\\.model\\.ts$",
    ".*\\.types?\\.ts$",
    "<rootDir>/src/__tests__/",
  ],
};

const unit: Config = {
  displayName: "unit",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/unit/**/*.test.ts"],
  coverageThreshold: {
    global: { statements: 90, branches: 85, functions: 90, lines: 90 },
  },
};

const integration: Config = {
  displayName: "integration",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/integration/**/*.int.test.ts"],
  maxWorkers: 1,
  testTimeout: 30000,
};

const e2e: Config = {
  displayName: "e2e",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/e2e/**/*.e2e.test.ts"],
  globalSetup: "<rootDir>/src/__tests__/e2e/testContainers/setup.ts",
  globalTeardown: "<rootDir>/src/__tests__/e2e/testContainers/teardown.ts",
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/e2e/setup-after-env.ts"],
  maxWorkers: 1,
  testTimeout: 120000,
};

const config: Config = {
  projects: [
    { ...common, ...unit },
    { ...common, ...integration },
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/__tests__/**",
    "!**/*.d.ts",
    "!src/app.ts",
    "!src/server.ts",
    "!**/*.routes.ts",
    "!**/*.controller.ts",
    "!**/*.model.ts",
    "!**/*.types.ts",
  ],
};

export default config;
