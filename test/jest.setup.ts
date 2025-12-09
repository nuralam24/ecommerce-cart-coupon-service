/**
 * Jest E2E Test Setup
 * 
 * This file runs before all E2E tests.
 * It can be used to set up global test utilities or extend Jest matchers.
 */

// Increase default timeout for E2E tests (database operations can be slow)
jest.setTimeout(30000);

// Global test utilities
beforeAll(() => {
  console.log('Starting E2E test suite...');
});

afterAll(() => {
  console.log('E2E test suite completed.');
});

