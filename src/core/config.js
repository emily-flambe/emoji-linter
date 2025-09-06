/**
 * Configuration management for emoji-linter
 */

const fs = require('fs');
const path = require('path');
const { minimatch } = require('minimatch');

const DEFAULT_CONFIG = {
  ignore: {
    files: [
      '**/node_modules/**',
      '**/.git/**', 
      '**/dist/**',
      '**/build/**',
      '**/coverage/**'
    ],
    emojis: [],
    patterns: []
  },
  output: {
    format: 'table',
    useColors: process.stdout.isTTY
  }
};

/**
 * Configuration class for emoji-linter settings
 */
class Config {
  constructor(configPath) {
    this.config = this.loadConfig(configPath);
  }

  /**
   * Load configuration from file
   * @param {string} [configPath] - Path to config file
   * @returns {Object} Configuration object
   */
  loadConfig(configPath) {
    if (!configPath) {
      configPath = path.join(process.cwd(), '.emoji-linter.config.json');
    }

    if (!fs.existsSync(configPath)) {
      return DEFAULT_CONFIG;
    }

    try {
      const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return {
        ignore: { ...DEFAULT_CONFIG.ignore, ...userConfig.ignore },
        output: { ...DEFAULT_CONFIG.output, ...userConfig.output }
      };
    } catch (error) {
      throw new Error(`Invalid config file: ${error.message}`);
    }
  }

  /**
   * Check if file should be ignored
   * @param {string} filePath - File path to check
   * @param {string} [content] - File content (unused, for CLI compatibility)
   * @returns {boolean} True if file should be ignored
   */
  shouldIgnoreFile(filePath, content) {
    const patterns = this.config.ignore?.files || [];
    const normalized = filePath.replace(/\\/g, '/');
    
    return patterns.some(pattern => {
      // Use minimatch for proper glob pattern matching
      return minimatch(normalized, pattern, { matchBase: false });
    });
  }

  /**
   * Check if emoji should be ignored
   * @param {string} emoji - Emoji to check
   * @returns {boolean} True if emoji should be ignored
   */
  shouldIgnoreEmoji(emoji) {
    const ignored = this.config.ignore?.emojis || [];
    return ignored.includes(emoji);
  }

  /**
   * Check if line should be ignored based on ignore comments
   * @param {string} line - Line content
   * @returns {boolean} True if line should be ignored
   */
  shouldIgnoreLine(line) {
    return line.includes('emoji-linter-ignore-line') || 
           line.includes('emoji-linter-ignore-next-line');
  }
}

module.exports = { Config };