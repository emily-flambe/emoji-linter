/**
 * Tests for default configuration
 */

describe('Config Defaults', () => {
  test('should load default configuration', () => {
    const { DEFAULT_CONFIG } = require('../../../src/config/defaults');
    expect(DEFAULT_CONFIG).toBeDefined();
    expect(DEFAULT_CONFIG.ignore).toBeDefined();
    expect(DEFAULT_CONFIG.ignore.files).toBeInstanceOf(Array);
    expect(DEFAULT_CONFIG.ignore.emojis).toBeInstanceOf(Array);
    expect(DEFAULT_CONFIG.output).toBeDefined();
    expect(DEFAULT_CONFIG.output.format).toBe('table');
  });
  
  test('should have expected default ignore patterns', () => {
    const { DEFAULT_CONFIG } = require('../../../src/config/defaults');
    expect(DEFAULT_CONFIG.ignore.files).toContain('**/node_modules/**');
    expect(DEFAULT_CONFIG.ignore.files).toContain('.git/**');
  });
});