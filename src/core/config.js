/**
 * Configuration management for emoji-linter
 */

const fs = require('fs');
const path = require('path');
const { DEFAULT_CONFIG } = require('../config/defaults');
const { shouldIgnoreLine, shouldIgnoreFile: shouldIgnoreFileContent } = require('../utils/ignore');

/**
 * Custom error classes
 */
class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

class ConfigValidationError extends ConfigError {
  constructor(message) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Configuration management class
 */
class Config {
  constructor(options = {}) {
    this.config = this.mergeWithDefaults(options);
    this.validateConfig(this.config);
  }

  /**
   * Load configuration from file
   * @param {string} configPath - Path to config file (optional)
   * @throws {ConfigError} When file cannot be read or parsed
   * @throws {ConfigValidationError} When config is invalid
   */
  loadConfig(configPath) {
    // Validate configPath parameter first if provided
    if (configPath) {
      try {
        const stat = fs.statSync(configPath);
        if (!stat.isFile()) {
          throw new ConfigError(`Config path is not a file: ${configPath}`);
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new ConfigError(`Config file not found: ${configPath}`);
        }
        throw new ConfigError(`Cannot access config file: ${error.message}`);
      }
    }

    const filePath = configPath || this.findConfigFile();
    
    if (!filePath || !this.fileExists(filePath)) {
      // Use defaults when config file doesn't exist
      this.config = this.mergeWithDefaults({});
      return;
    }

    try {
      const configContent = fs.readFileSync(filePath, 'utf8');
      const userConfig = JSON.parse(configContent);
      this.config = this.mergeWithDefaults(userConfig);
      this.validateConfig(this.config);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ConfigError(`Invalid JSON in config file: ${error.message}`);
      }
      if (error instanceof ConfigValidationError) {
        throw error; // Re-throw validation errors as-is
      }
      throw new ConfigError(`Failed to read config file: ${error.message}`);
    }
  }

  /**
   * Check if a file should be ignored based on glob patterns
   * @param {string} filePath - Path to the file
   * @param {string} content - File content (optional, for inline ignore checking)
   * @returns {boolean} True if file should be ignored
   */
  shouldIgnoreFile(filePath, content) {
    // Check for inline file-level ignore comment
    if (content && shouldIgnoreFileContent(content)) {
      return true;
    }

    // Check glob patterns
    const patterns = this.config.ignore.files;
    const normalizedPath = this.normalizePath(filePath);
    
    return patterns.some(pattern => this.matchGlob(normalizedPath, pattern));
  }

  /**
   * Check if an emoji should be ignored
   * @param {string} emoji - The emoji to check
   * @returns {boolean} True if emoji should be ignored
   */
  shouldIgnoreEmoji(emoji) {
    return this.config.ignore.emojis.includes(emoji);
  }

  /**
   * Check if a line should be ignored based on inline comments
   * @param {string} line - The line to check
   * @returns {boolean} True if line should be ignored
   */
  shouldIgnoreLine(line) {
    return shouldIgnoreLine(line);
  }

  /**
   * Deep merge user configuration with defaults
   * @param {object} userConfig - User configuration
   * @returns {object} Merged configuration
   */
  mergeWithDefaults(userConfig) {
    if (!userConfig || typeof userConfig !== 'object') {
      return this.deepClone(DEFAULT_CONFIG);
    }

    return this.deepMerge(this.deepClone(DEFAULT_CONFIG), userConfig);
  }

  /**
   * Validate configuration object
   * @param {object} config - Configuration to validate
   * @throws {ConfigValidationError} When configuration is invalid
   */
  validateConfig(config) {
    this.validateDetectionConfig(config.detection);
    this.validateOutputConfig(config.output);
    this.validateIgnoreConfig(config.ignore);
    this.validateCleanupConfig(config.cleanup);
  }

  /**
   * Find configuration file in current directory
   * @returns {string|null} Path to config file or null if not found
   */
  findConfigFile() {
    const configFiles = ['.emoji-linter.config.json', '.emoji-linter.json', 'emoji-linter.config.json'];
    
    for (const filename of configFiles) {
      const filePath = path.join(process.cwd(), filename);
      if (this.fileExists(filePath)) {
        return filePath;
      }
    }
    
    return null;
  }

  /**
   * Check if file exists
   * @param {string} filePath - Path to check
   * @returns {boolean} True if file exists
   */
  fileExists(filePath) {
    try {
      return fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  }

  /**
   * Normalize file path for consistent matching
   * @param {string} filePath - Path to normalize
   * @returns {string} Normalized path
   */
  normalizePath(filePath) {
    if (path.isAbsolute(filePath)) {
      return path.relative(process.cwd(), filePath);
    }
    return filePath.replace(/\\/g, '/'); // Normalize separators
  }

  /**
   * Simple glob pattern matching (without external dependencies)
   * @param {string} filePath - File path to test
   * @param {string} pattern - Glob pattern
   * @returns {boolean} True if pattern matches
   */
  matchGlob(filePath, pattern) {
    // Handle simple exact matches
    if (pattern === filePath) {
      return true;
    }

    // Convert glob pattern to regex
    let regexPattern = pattern
      .replace(/\./g, '\\.')  // Escape dots
      .replace(/\*\*/g, '###DOUBLESTAR###')  // Temporary placeholder for **
      .replace(/\*/g, '[^/]*')  // Single * matches anything except path separator
      .replace(/###DOUBLESTAR###/g, '.*')  // ** matches everything including path separators
      .replace(/\?/g, '[^/]');  // ? matches single character except path separator

    // Handle leading ** patterns
    if (pattern.startsWith('**/')) {
      regexPattern = regexPattern.replace(/^\.\*\//, '(.*\\/)?');
    }

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }

  /**
   * Deep clone object
   * @param {object} obj - Object to clone
   * @returns {object} Cloned object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    
    const cloned = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * Deep merge two objects
   * @param {object} target - Target object
   * @param {object} source - Source object
   * @returns {object} Merged object
   */
  deepMerge(target, source) {
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {};
          }
          this.deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
    return target;
  }

  /**
   * Validate detection configuration
   * @param {object} detection - Detection config
   * @throws {ConfigValidationError} When invalid
   */
  validateDetectionConfig(detection) {
    if (!detection || typeof detection !== 'object') {
      throw new ConfigValidationError('Detection config must be an object');
    }

    const booleanFields = ['unicode', 'shortcodes', 'sequences', 'skinTones'];
    for (const field of booleanFields) {
      if (Object.prototype.hasOwnProperty.call(detection, field) && typeof detection[field] !== 'boolean') {
        throw new ConfigValidationError(`Detection.${field} must be a boolean`);
      }
    }
  }

  /**
   * Validate output configuration
   * @param {object} output - Output config
   * @throws {ConfigValidationError} When invalid
   */
  validateOutputConfig(output) {
    if (!output || typeof output !== 'object') {
      throw new ConfigValidationError('Output config must be an object');
    }

    if (Object.prototype.hasOwnProperty.call(output, 'format')) {
      const validFormats = ['table', 'json', 'csv'];
      if (!validFormats.includes(output.format)) {
        throw new ConfigValidationError(`Output format must be one of: ${validFormats.join(', ')}`);
      }
    }

    if (Object.prototype.hasOwnProperty.call(output, 'showContext') && typeof output.showContext !== 'boolean') {
      throw new ConfigValidationError('Output.showContext must be a boolean');
    }

    if (Object.prototype.hasOwnProperty.call(output, 'maxContextLines')) {
      if (typeof output.maxContextLines !== 'number' || output.maxContextLines < 0) {
        throw new ConfigValidationError('Output.maxContextLines must be a non-negative number');
      }
    }
  }

  /**
   * Validate ignore configuration
   * @param {object} ignore - Ignore config
   * @throws {ConfigValidationError} When invalid
   */
  validateIgnoreConfig(ignore) {
    if (!ignore || typeof ignore !== 'object') {
      throw new ConfigValidationError('Ignore config must be an object');
    }

    const arrayFields = ['files', 'emojis', 'patterns'];
    for (const field of arrayFields) {
      if (Object.prototype.hasOwnProperty.call(ignore, field)) {
        if (!Array.isArray(ignore[field])) {
          throw new ConfigValidationError(`Ignore.${field} must be an array`);
        }
        
        // Validate array contents are strings
        if (!ignore[field].every(item => typeof item === 'string')) {
          throw new ConfigValidationError(`All items in ignore.${field} must be strings`);
        }
      }
    }
  }

  /**
   * Validate cleanup configuration
   * @param {object} cleanup - Cleanup config
   * @throws {ConfigValidationError} When invalid
   */
  validateCleanupConfig(cleanup) {
    if (!cleanup || typeof cleanup !== 'object') {
      throw new ConfigValidationError('Cleanup config must be an object');
    }

    const booleanFields = ['preserveWhitespace', 'createBackup'];
    for (const field of booleanFields) {
      if (Object.prototype.hasOwnProperty.call(cleanup, field) && typeof cleanup[field] !== 'boolean') {
        throw new ConfigValidationError(`Cleanup.${field} must be a boolean`);
      }
    }
  }
}

module.exports = {
  Config,
  ConfigError,
  ConfigValidationError
};